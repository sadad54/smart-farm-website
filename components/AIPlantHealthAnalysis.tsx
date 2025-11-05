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
}

export function AIPlantHealthAnalysis() {
  const { state } = useEspContext()
  const [analysis, setAnalysis] = useState<PlantHealthAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const analyzeHealth = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai-plant-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temperature: state.temperature,
          humidity: state.humidity,
          soilHumidity: state.soilHumidity,
          light: state.light,
          waterLevel: state.waterLevel
        })
      })

      const data = await response.json()
      setAnalysis(data.analysis)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('AI health analysis error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    analyzeHealth()
    const interval = setInterval(analyzeHealth, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [state.temperature, state.humidity, state.soilHumidity])

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
            <p className="text-purple-600">Powered by Advanced AI</p>
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