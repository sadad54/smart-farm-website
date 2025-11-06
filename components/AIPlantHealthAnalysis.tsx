"use client"

import { useState, useEffect } from 'react'
import { useEspContext } from '@/components/EspProvider'
import { Card } from '@/components/ui/card'
import { Brain, Activity, AlertTriangle, CheckCircle, Zap, Droplets } from 'lucide-react'

interface PlantHealthAnalysis {
  healthScore: number
  status: string
  immediateActions: string[]
  recommendations: string[]
  risks: string[]
  summary: string
  metrics: {
    temperatureScore: number
    humidityScore: number
    soilScore: number
    lightScore: number
    waterScore: number
  }
  trends: {
    improving: boolean
    declining: boolean
    stable: boolean
  }
  confidence: number
}

interface AIPlantHealthAnalysisProps {
  onAnalysisUpdate?: (analysis: PlantHealthAnalysis | null) => void
}

export function AIPlantHealthAnalysis({ onAnalysisUpdate }: AIPlantHealthAnalysisProps = {}) {
  const { state } = useEspContext()
  const [analysis, setAnalysis] = useState<PlantHealthAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [previousReadings, setPreviousReadings] = useState<any[]>([])
  const [analysisHistory, setAnalysisHistory] = useState<PlantHealthAnalysis[]>([])
  const [lastApiCall, setLastApiCall] = useState<number>(0)
  const [rateLimitHit, setRateLimitHit] = useState(false)

  const analyzeHealth = async () => {
    // Rate limiting: Prevent API calls if we hit rate limit recently
    const now = Date.now()
    const timeSinceLastCall = now - lastApiCall
    const minInterval = rateLimitHit ? 180000 : 30000 // 3 minutes if rate limited, 30 seconds normally
    
    if (timeSinceLastCall < minInterval) {
      console.log(`⏱️ Rate limiting: ${Math.round((minInterval - timeSinceLastCall) / 1000)}s remaining`)
      // Use fallback analysis instead
      const fallbackAnalysis = generateFallbackAnalysis(state)
      setAnalysis(fallbackAnalysis)
      if (onAnalysisUpdate) {
        onAnalysisUpdate(fallbackAnalysis)
      }
      return
    }

    setLoading(true)
    setLastApiCall(now)
    
    try {
      // Create current reading
      const currentReading = {
        temperature: state.temperature || 0,
        humidity: state.humidity || 0,
        soilHumidity: state.soilHumidity || 0,
        light: state.light || 0,
        waterLevel: state.waterLevel || 0,
        timestamp: Date.now()
      }

      // Calculate trends from historical data
      const recentReadings = [...previousReadings.slice(-5), currentReading]
      const trends = calculateTrends(recentReadings)

      const response = await fetch('/api/ai-plant-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...currentReading,
          historicalData: previousReadings.slice(-10), // Last 10 readings for context
          trends: trends,
          previousAnalysis: analysisHistory.slice(-3) // Last 3 analyses for continuity
        })
      })

      const data = await response.json()
      
      if (data.success && data.analysis) {
        setAnalysis(data.analysis)
        setAnalysisHistory(prev => [...prev.slice(-9), data.analysis]) // Keep last 10 analyses
        setLastUpdate(new Date())
        // Notify parent component of analysis update
        if (onAnalysisUpdate) {
          onAnalysisUpdate(data.analysis)
        }
      }

      // Update readings history
      setPreviousReadings(prev => [...prev.slice(-19), currentReading]) // Keep last 20 readings
      
    } catch (error) {
      console.error('AI health analysis error:', error)
      
      // Check if it's a rate limit error
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('rate_limit_exceeded') || errorMessage.includes('429')) {
        setRateLimitHit(true)
        console.warn('🚫 Rate limit exceeded - using fallback analysis for 3 minutes')
        // Reset rate limit flag after 3 minutes
        setTimeout(() => {
          setRateLimitHit(false)
          console.log('✅ Rate limit cooldown completed')
        }, 180000)
      }
      
      // Provide fallback analysis
      const fallbackAnalysis = generateFallbackAnalysis(state)
      setAnalysis(fallbackAnalysis)
      // Notify parent component of fallback analysis
      if (onAnalysisUpdate) {
        onAnalysisUpdate(fallbackAnalysis)
      }
    } finally {
      setLoading(false)
    }
  }

  // Helper function to calculate trends
  const calculateTrends = (readings: any[]) => {
    if (readings.length < 3) return { improving: false, declining: false, stable: true }

    const recent = readings.slice(-3)
    const avgRecent = recent.reduce((acc, r) => acc + (r.temperature + r.humidity + r.soilHumidity + r.light + r.waterLevel) / 5, 0) / recent.length
    
    const older = readings.slice(-6, -3)
    if (older.length === 0) return { improving: false, declining: false, stable: true }
    
    const avgOlder = older.reduce((acc, r) => acc + (r.temperature + r.humidity + r.soilHumidity + r.light + r.waterLevel) / 5, 0) / older.length

    const trend = avgRecent - avgOlder
    return {
      improving: trend > 2,
      declining: trend < -2,
      stable: Math.abs(trend) <= 2
    }
  }

  // Enhanced fallback analysis with better scoring
  const generateFallbackAnalysis = (sensorData: any): PlantHealthAnalysis => {
    const temp = sensorData.temperature || 0
    const humidity = sensorData.humidity || 0
    const soil = sensorData.soilHumidity || 0
    const light = sensorData.light || 0
    const water = sensorData.waterLevel || 0

    // Advanced scoring system
    const tempScore = Math.max(0, 100 - Math.abs(temp - 25) * 2.5)
    const humidityScore = Math.max(0, 100 - Math.abs(humidity - 65) * 1.5)
    const soilScore = Math.max(0, 100 - Math.abs(soil - 50) * 2)
    const lightScore = Math.max(0, 100 - Math.abs(light - 55) * 1.2)
    const waterScore = water > 20 ? 100 : Math.max(0, water * 5)

    const overallScore = Math.round(
      (tempScore * 0.25) + (humidityScore * 0.15) + (soilScore * 0.35) + (lightScore * 0.15) + (waterScore * 0.10)
    )

    let status: string
    if (overallScore >= 90) status = 'excellent'
    else if (overallScore >= 75) status = 'good'
    else if (overallScore >= 60) status = 'fair'
    else if (overallScore >= 40) status = 'poor'
    else status = 'critical'

    const immediateActions = []
    const recommendations = []
    const risks = []

    if (temp < 18 || temp > 32) {
      immediateActions.push(`Adjust temperature (currently ${temp}°C)`)
      risks.push('Temperature stress affecting plant growth')
    }
    if (soil < 30) {
      immediateActions.push('Water plants - soil moisture critically low')
      risks.push('Plant dehydration risk')
    }
    if (water < 20) {
      immediateActions.push('Refill water tank immediately')
      risks.push('Water supply shortage')
    }

    if (humidity < 50) recommendations.push('Increase humidity levels')
    if (light < 40) recommendations.push('Provide additional lighting')
    if (soil > 75) recommendations.push('Reduce watering frequency')

    return {
      healthScore: overallScore,
      status,
      immediateActions,
      recommendations: recommendations.length ? recommendations : ['Monitor current conditions'],
      risks: risks.length ? risks : ['No immediate risks detected'],
      summary: `Plant health is ${status}. Score: ${overallScore}%. ${immediateActions.length ? 'Immediate attention required.' : 'Conditions are stable.'}`,
      metrics: {
        temperatureScore: Math.round(tempScore),
        humidityScore: Math.round(humidityScore),
        soilScore: Math.round(soilScore),
        lightScore: Math.round(lightScore),
        waterScore: Math.round(waterScore)
      },
      trends: {
        improving: false,
        declining: overallScore < 60,
        stable: overallScore >= 60
      },
      confidence: 85
    }
  }

  useEffect(() => {
    analyzeHealth()
    // Rate-limit friendly updates - every 60 seconds (reduced from 20s)
    const interval = setInterval(analyzeHealth, 60000)
    return () => clearInterval(interval)
  }, [state.temperature, state.humidity, state.soilHumidity, state.light, state.waterLevel])

  // Trigger immediate analysis when significant sensor changes occur
  useEffect(() => {
    if (previousReadings.length > 0) {
      const lastReading = previousReadings[previousReadings.length - 1]
      const significantChange = 
        Math.abs((state.temperature || 0) - lastReading.temperature) > 2 ||
        Math.abs((state.soilHumidity || 0) - lastReading.soilHumidity) > 5 ||
        Math.abs((state.waterLevel || 0) - lastReading.waterLevel) > 10

      if (significantChange && !loading) {
        console.log('Significant sensor change detected, triggering immediate analysis')
        analyzeHealth()
      }
    }
  }, [state.temperature, state.soilHumidity, state.waterLevel, loading])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="w-6 h-6 text-green-500" />
      case 'good': return <CheckCircle className="w-6 h-6 text-blue-500" />
      case 'fair': return <AlertTriangle className="w-6 h-6 text-yellow-500" />
      case 'poor': return <AlertTriangle className="w-6 h-6 text-orange-500" />
      case 'critical': return <AlertTriangle className="w-6 h-6 text-red-500" />
      default: return <Activity className="w-6 h-6 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'from-green-400 to-emerald-600'
      case 'good': return 'from-blue-400 to-blue-600'  
      case 'fair': return 'from-yellow-400 to-yellow-600'
      case 'poor': return 'from-orange-400 to-orange-600'
      case 'critical': return 'from-red-400 to-red-600'
      default: return 'from-gray-400 to-gray-600'
    }
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-4 border-purple-400 rounded-3xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-purple-900">AI Plant Health Analysis</h3>
            <p className="text-purple-600">
              {rateLimitHit ? '⚠️ Rate Limited - Using Fallback Analysis' : 'Powered by Advanced AI'}
            </p>
          </div>
        </div>
        <button
          onClick={analyzeHealth}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white rounded-full transition-colors flex items-center gap-2"
        >
          {loading ? <Zap className="w-4 h-4 animate-pulse" /> : <Zap className="w-4 h-4" />}
          {loading ? 'Analyzing...' : 'Refresh Analysis'}
        </button>
      </div>

      {analysis ? (
        <div className="space-y-6">
          {/* Health Score */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              {getStatusIcon(analysis.status)}
              <div>
                <div className="text-4xl font-bold text-gray-800">{analysis.healthScore}%</div>
                <div className={`text-lg font-semibold capitalize bg-gradient-to-r ${getStatusColor(analysis.status)} bg-clip-text text-transparent`}>
                  {analysis.status}
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getStatusColor(analysis.status)} transition-all duration-1000 ease-out`}
                style={{ width: `${analysis.healthScore}%` }}
              ></div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white/60 rounded-2xl p-4 border border-purple-200">
            <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              AI Summary
            </h4>
            <p className="text-gray-700">{analysis.summary}</p>
          </div>

          {/* Immediate Actions */}
          {analysis.immediateActions.length > 0 && (
            <div className="bg-red-50 rounded-2xl p-4 border border-red-200">
              <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Immediate Actions Required
              </h4>
              <ul className="space-y-2">
                {analysis.immediateActions.map((action, index) => (
                  <li key={index} className="flex items-start gap-2 text-red-700">
                    <span className="text-red-500 font-bold">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
            <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              AI Recommendations
            </h4>
            <ul className="space-y-2">
              {analysis.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-green-700">
                  <span className="text-green-500 font-bold">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Risks */}
          {analysis.risks.length > 0 && (
            <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-200">
              <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Potential Risks
              </h4>
              <ul className="space-y-2">
                {analysis.risks.map((risk, index) => (
                  <li key={index} className="flex items-start gap-2 text-yellow-700">
                    <span className="text-yellow-500 font-bold">•</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <Brain className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-pulse" />
          <p className="text-purple-600">Loading AI analysis...</p>
        </div>
      )}

      {lastUpdate && (
        <div className="mt-4 text-center text-sm text-purple-500">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </Card>
  )
}