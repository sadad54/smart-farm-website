"use client"

import { useState, useEffect } from 'react'
import { useEspContext } from '@/components/EspProvider'
import { Card } from '@/components/ui/card'
import { Bell, AlertTriangle, CheckCircle, Info, X, Volume2, VolumeX, Settings } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SmartAlert {
  id: string
  type: 'critical' | 'warning' | 'info' | 'success'
  title: string
  message: string
  recommendations: string[]
  timestamp: Date
  dismissed: boolean
  priority: number
  category: string
  actionRequired: boolean
}

export function SmartAlerts() {
  const { state } = useEspContext()
  const [alerts, setAlerts] = useState<SmartAlert[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [categories, setCategories] = useState({
    temperature: true,
    humidity: true,
    watering: true,
    light: true,
    motion: true,
    system: true
  })

  const generateAlerts = async () => {
    try {
      // Determine alert type and severity based on sensor data
      const temperature = state.temperature || 0
      const soilHumidity = state.soilHumidity || 0
      const waterLevel = state.waterLevel || 0
      
      let alertType = 'system_status'
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
      
      if (temperature > 35) {
        alertType = 'high_temperature'
        severity = 'high'
      } else if (temperature < 10) {
        alertType = 'low_temperature' 
        severity = 'high'
      } else if (soilHumidity < 20) {
        alertType = 'low_soil_moisture'
        severity = 'critical'
      } else if (waterLevel < 15) {
        alertType = 'low_water_level'
        severity = 'high'
      } else if (soilHumidity < 30) {
        alertType = 'watering_needed'
        severity = 'medium'
      }

      const response = await fetch('/api/ai-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertType,
          severity,
          sensorData: {
            temperature: state.temperature,
            humidity: state.humidity,
            soilHumidity: state.soilHumidity,
            light: state.light,
            waterLevel: state.waterLevel,
            motionDetected: state.motionDetected
          },
          deviceStates: {
            wateringActive: false, // Would need device state tracking
            lightActive: false,    // Would need device state tracking  
            fanActive: false       // Would need device state tracking
          }
        })
      })

      const data = await response.json()
      
      if (data.success && data.alert) {
        const newAlert = {
          ...data.alert,
          id: `${Date.now()}-${Math.random()}`,
          timestamp: new Date(),
          dismissed: false,
          type: severity,
          category: alertType.replace('_', ' '),
          recommendations: data.alert.actions || [],
          actionRequired: severity === 'critical' || severity === 'high'
        }

        setAlerts(prev => {
          // Remove old alerts and add new one
          const filtered = prev.filter(alert => 
            Date.now() - alert.timestamp.getTime() < 300000 // Keep for 5 minutes
          )
          return [...filtered, newAlert]
        })

        // Play sound for critical alerts
        if (soundEnabled && severity === 'critical') {
          playAlertSound()
        }
      }
    } catch (error) {
      console.error('Alert generation error:', error)
    }
  }

  const playAlertSound = () => {
    if (typeof window !== 'undefined' && soundEnabled) {
      const audio = new Audio('/alert-sound.mp3')
      audio.play().catch(() => {
        // Fallback beep sound
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.value = 800
        gainNode.gain.value = 0.3
        
        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.3)
      })
    }
  }

  useEffect(() => {
    generateAlerts()
    const interval = setInterval(generateAlerts, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [state])

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, dismissed: true } : alert
    ))
  }

  const clearAllAlerts = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, dismissed: true })))
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="w-5 h-5" />
      case 'warning': return <AlertTriangle className="w-5 h-5" />
      case 'success': return <CheckCircle className="w-5 h-5" />
      default: return <Info className="w-5 h-5" />
    }
  }

  const getAlertStyles = (type: string) => {
    switch (type) {
      case 'critical': return {
        container: 'border-red-400 bg-gradient-to-br from-red-50 to-red-100',
        icon: 'text-red-600 bg-red-100',
        badge: 'bg-red-500 text-white'
      }
      case 'warning': return {
        container: 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100',
        icon: 'text-yellow-600 bg-yellow-100',
        badge: 'bg-yellow-500 text-white'
      }
      case 'success': return {
        container: 'border-green-400 bg-gradient-to-br from-green-50 to-green-100',
        icon: 'text-green-600 bg-green-100',
        badge: 'bg-green-500 text-white'
      }
      default: return {
        container: 'border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100',
        icon: 'text-blue-600 bg-blue-100',
        badge: 'bg-blue-500 text-white'
      }
    }
  }

  const activeAlerts = alerts.filter(alert => !alert.dismissed)
  const criticalCount = activeAlerts.filter(alert => alert.type === 'critical').length
  const warningCount = activeAlerts.filter(alert => alert.type === 'warning').length

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-4 border-purple-400 rounded-3xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl">
            <Bell className="w-6 h-6 text-white" />
            {activeAlerts.length > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">{activeAlerts.length}</span>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-purple-900">Smart Alerts</h3>
            <p className="text-purple-600">AI-Powered Farm Monitoring</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-full transition-colors ${
              soundEnabled ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="flex gap-4 mb-6">
        {criticalCount > 0 && (
          <Badge className="bg-red-500 text-white px-3 py-1">
            {criticalCount} Critical
          </Badge>
        )}
        {warningCount > 0 && (
          <Badge className="bg-yellow-500 text-white px-3 py-1">
            {warningCount} Warnings
          </Badge>
        )}
        {activeAlerts.length === 0 && (
          <Badge className="bg-green-500 text-white px-3 py-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            All Good
          </Badge>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white/70 rounded-2xl p-4 mb-6 border border-purple-200">
          <h4 className="font-semibold text-purple-900 mb-3">Alert Categories</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(categories).map(([category, enabled]) => (
              <label key={category} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setCategories(prev => ({
                    ...prev,
                    [category]: e.target.checked
                  }))}
                  className="rounded"
                />
                <span className="text-sm capitalize">{category}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {activeAlerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-purple-600 font-medium">No active alerts</p>
            <p className="text-purple-400 text-sm">Your smart farm is running smoothly!</p>
          </div>
        ) : (
          <>
            {activeAlerts
              .sort((a, b) => b.priority - a.priority)
              .map((alert) => {
                const styles = getAlertStyles(alert.type)
                return (
                  <div
                    key={alert.id}
                    className={`${styles.container} rounded-2xl p-4 border-2 shadow-lg transition-all duration-300 hover:shadow-xl`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3 flex-1">
                        <div className={`p-2 rounded-full ${styles.icon}`}>
                          {getAlertIcon(alert.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold text-gray-900">{alert.title}</h4>
                            <Badge className={styles.badge}>
                              {alert.category}
                            </Badge>
                          </div>
                          <p className="text-gray-700 mb-3">{alert.message}</p>
                          
                          {alert.recommendations.length > 0 && (
                            <div className="bg-white/50 rounded-lg p-3 mt-3">
                              <h5 className="font-semibold text-gray-800 mb-2">AI Recommendations:</h5>
                              <ul className="list-disc list-inside space-y-1">
                                {alert.recommendations.map((rec, idx) => (
                                  <li key={idx} className="text-sm text-gray-700">{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-gray-500">
                              {alert.timestamp.toLocaleTimeString()}
                            </span>
                            {alert.actionRequired && (
                              <Badge variant="outline" className="text-xs">
                                Action Required
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            
            {activeAlerts.length > 0 && (
              <button
                onClick={clearAllAlerts}
                className="w-full mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold transition-colors"
              >
                Clear All Alerts
              </button>
            )}
          </>
        )}
      </div>
    </Card>
  )
}