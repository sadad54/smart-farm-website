"use client"

import { useState, useEffect } from 'react'
import { useEspContext } from '@/components/EspProvider'
import { Card } from '@/components/ui/card'
import { Droplets, Brain, Clock, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'

interface WateringPrediction {
  shouldWater: boolean
  hoursUntilWatering: number
  wateringDuration: number
  confidence: number
  reasoning: string
  nextCheckIn: number
}

export function PredictiveWateringAssistant() {
  const { state, sendCommand } = useEspContext()
  const [prediction, setPrediction] = useState<WateringPrediction | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [autoWateringEnabled, setAutoWateringEnabled] = useState(false)

  const getPrediction = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai-watering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sensorData: {
            temperature: state.temperature,
            humidity: state.humidity,
            soilHumidity: state.soilHumidity,
            light: state.light,
            waterLevel: state.waterLevel
          }
        })
      })

      const data = await response.json()
      setPrediction(data.prediction)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Watering prediction error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getPrediction()
    const interval = setInterval(getPrediction, 120000) // Update every 2 minutes
    return () => clearInterval(interval)
  }, [state.soilHumidity])

  // Auto-watering logic
  useEffect(() => {
    if (autoWateringEnabled && prediction?.shouldWater && prediction.confidence > 80) {
      handleAutoWater()
    }
  }, [prediction, autoWateringEnabled])

  const handleManualWater = async () => {
    try {
      await sendCommand('D', 'water_page', { 
        button_type: 'water_plant',
        ai_triggered: false,
        duration: prediction?.wateringDuration || 3
      })
      console.log('💧 Manual watering initiated')
      // Refresh prediction after watering
      setTimeout(getPrediction, 5000)
    } catch (error) {
      console.error('Manual watering failed:', error)
    }
  }

  const handleAutoWater = async () => {
    try {
      await sendCommand('D', 'water_page', { 
        button_type: 'auto_water',
        ai_triggered: true,
        duration: prediction?.wateringDuration || 3
      })
      console.log('🤖 AI auto-watering initiated')
      setTimeout(getPrediction, 5000)
    } catch (error) {
      console.error('Auto-watering failed:', error)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600'
    if (confidence >= 70) return 'text-blue-600'
    if (confidence >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getUrgencyColor = (shouldWater: boolean, hours: number) => {
    if (shouldWater) return 'from-red-400 to-red-600'
    if (hours <= 2) return 'from-orange-400 to-orange-600'
    if (hours <= 6) return 'from-yellow-400 to-yellow-600'
    return 'from-green-400 to-green-600'
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-4 border-blue-400 rounded-3xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-blue-900">AI Watering Assistant</h3>
            <p className="text-blue-600">Predictive Irrigation Intelligence</p>
          </div>
        </div>
        <button
          onClick={getPrediction}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-full transition-colors flex items-center gap-2"
        >
          {loading ? <TrendingUp className="w-4 h-4 animate-pulse" /> : <TrendingUp className="w-4 h-4" />}
          Update
        </button>
      </div>

      {prediction ? (
        <div className="space-y-6">
          {/* Main Prediction */}
          <div className="text-center">
            <div className={`inline-flex items-center gap-3 px-6 py-4 rounded-3xl bg-gradient-to-r ${getUrgencyColor(prediction.shouldWater, prediction.hoursUntilWatering)} text-white text-xl font-bold shadow-lg`}>
              {prediction.shouldWater ? (
                <>
                  <Droplets className="w-6 h-6" />
                  Water Now!
                </>
              ) : (
                <>
                  <Clock className="w-6 h-6" />
                  Water in {prediction.hoursUntilWatering.toFixed(1)} hours
                </>
              )}
            </div>
            
            <div className={`mt-4 text-lg font-medium ${getConfidenceColor(prediction.confidence)}`}>
              AI Confidence: {prediction.confidence}%
            </div>
          </div>

          {/* Watering Details */}
          <div className="bg-white/60 rounded-2xl p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Droplets className="w-4 h-4" />
              Watering Details
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Duration:</span>
                <div className="font-bold text-blue-800">{prediction.wateringDuration} seconds</div>
              </div>
              <div>
                <span className="text-gray-600">Next Check:</span>
                <div className="font-bold text-blue-800">{prediction.nextCheckIn} hours</div>
              </div>
            </div>
          </div>

          {/* AI Reasoning */}
          <div className="bg-cyan-50 rounded-2xl p-4 border border-cyan-200">
            <h4 className="font-semibold text-cyan-900 mb-2 flex items-center gap-2">
              <Brain className="w-4 h-4" />
              AI Analysis
            </h4>
            <p className="text-cyan-800">{prediction.reasoning}</p>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleManualWater}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              <Droplets className="w-5 h-5" />
              Water Now
            </button>
            
            <button
              onClick={() => setAutoWateringEnabled(!autoWateringEnabled)}
              className={`flex-1 px-6 py-3 rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg ${
                autoWateringEnabled
                  ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              {autoWateringEnabled ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              Auto-Water {autoWateringEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Current Conditions */}
          <div className="bg-white/60 rounded-2xl p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-3">Current Conditions</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Soil Moisture:</span>
                <span className="font-semibold">{state.soilHumidity?.toFixed(1) || '--'}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Temperature:</span>
                <span className="font-semibold">{state.temperature?.toFixed(1) || '--'}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Humidity:</span>
                <span className="font-semibold">{state.humidity?.toFixed(1) || '--'}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Water Level:</span>
                <span className="font-semibold">{state.waterLevel?.toFixed(1) || '--'}%</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Brain className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-pulse" />
          <p className="text-blue-600">Analyzing watering needs...</p>
        </div>
      )}

      {lastUpdate && (
        <div className="mt-4 text-center text-sm text-blue-500">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </Card>
  )
}