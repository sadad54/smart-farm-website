"use client"

import Image from "next/image"
import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { useEspContext } from "@/components/EspProvider"
import { Poppins } from "next/font/google"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"]
})

interface EnvironmentalRule {
  id: string
  name: string
  description: string
  conditions: {
    temperature?: { min?: number; max?: number }
    humidity?: { min?: number; max?: number }
    soilMoisture?: { min?: number; max?: number }
    lightLevel?: { min?: number; max?: number }
    distance?: { min?: number; max?: number }
  }
  actions: {
    fan?: boolean
    led?: boolean
    watering?: boolean
    buzzer?: boolean
    feeding?: boolean
  }
  enabled: boolean
  priority: number
}

const defaultRules: EnvironmentalRule[] = [
  {
    id: "temp_control",
    name: "Temperature Control",
    description: "Auto fan activation when too hot",
    conditions: { temperature: { max: 28 } },
    actions: { fan: true },
    enabled: true,
    priority: 1
  },
  {
    id: "drought_protection",
    name: "Drought Protection",
    description: "Auto watering when soil is dry",
    conditions: { soilMoisture: { max: 30 } },
    actions: { watering: true },
    enabled: true,
    priority: 2
  },
  {
    id: "night_lighting",
    name: "Night Lighting",
    description: "LED lighting when dark",
    conditions: { lightLevel: { max: 20 } },
    actions: { led: true },
    enabled: true,
    priority: 3
  },
  {
    id: "intruder_alert",
    name: "Intruder Alert",
    description: "Buzzer when something is too close",
    conditions: { distance: { max: 10 } },  // Alert when distance is less than 10cm
    actions: { buzzer: true },
    enabled: true,
    priority: 4
  },
  {
    id: "emergency_protocol",
    name: "Emergency Protocol",
    description: "Full system alert for extreme conditions",
    conditions: { 
      temperature: { max: 35 },
      humidity: { min: 80 }
    },
    actions: { fan: true, buzzer: true, led: true },
    enabled: true,
    priority: 0
  }
]

export default function Scenario2Page() {
  const { state, connected, sendCommand } = useEspContext()
  const [systemInitialized, setSystemInitialized] = useState(false)
  const [rules, setRules] = useState<EnvironmentalRule[]>(defaultRules)
  const [activeRules, setActiveRules] = useState<string[]>([])
  const [systemMode, setSystemMode] = useState<'auto' | 'manual'>('auto')
  const [executionLog, setExecutionLog] = useState<any[]>([])
  const [systemStats, setSystemStats] = useState({
    actionsExecuted: 0,
    rulesTriggered: 0,
    uptime: 0
  })

  // Rule evaluation engine (only when system is initialized)
  useEffect(() => {
    if (!systemInitialized || systemMode !== 'auto' || !connected) {
      setActiveRules([])
      return
    }

    const currentActiveRules: string[] = []
    
    rules
      .filter(rule => rule.enabled)
      .sort((a, b) => a.priority - b.priority) // Higher priority (lower number) first
      .forEach(rule => {
        const conditions = rule.conditions
        let conditionsMet = true

        // Check temperature conditions
        if (conditions.temperature) {
          if (conditions.temperature.min && (state.temperature ?? 0) < conditions.temperature.min) {
            conditionsMet = false
          }
          if (conditions.temperature.max && (state.temperature ?? 0) > conditions.temperature.max) {
            conditionsMet = false
          }
        }

        // Check humidity conditions
        if (conditions.humidity) {
          if (conditions.humidity.min && (state.humidity ?? 0) < conditions.humidity.min) {
            conditionsMet = false
          }
          if (conditions.humidity.max && (state.humidity ?? 0) > conditions.humidity.max) {
            conditionsMet = false
          }
        }

        // Check soil moisture conditions
        if (conditions.soilMoisture) {
          if (conditions.soilMoisture.min && (state.soilHumidity ?? 0) < conditions.soilMoisture.min) {
            conditionsMet = false
          }
          if (conditions.soilMoisture.max && (state.soilHumidity ?? 0) > conditions.soilMoisture.max) {
            conditionsMet = false
          }
        }

        // Check light level conditions
        if (conditions.lightLevel) {
          if (conditions.lightLevel.min && (state.light ?? 0) < conditions.lightLevel.min) {
            conditionsMet = false
          }
          if (conditions.lightLevel.max && (state.light ?? 0) > conditions.lightLevel.max) {
            conditionsMet = false
          }
        }

        // Check distance conditions
        if (conditions.distance) {
          const currentDistance = state.distance ?? 0
          if (rule.id === 'intruder_alert') {
            console.log(`🔍 Intruder Alert Check - Distance: ${currentDistance}cm, Min: ${conditions.distance.min}, Max: ${conditions.distance.max}`)
          }
          if (conditions.distance.min && currentDistance < conditions.distance.min) {
            conditionsMet = false
          }
          if (conditions.distance.max && currentDistance > conditions.distance.max) {
            conditionsMet = false
          }
        }

        if (conditionsMet) {
          currentActiveRules.push(rule.id)
        }
      })

    // Only update if there's an actual change to prevent unnecessary re-renders
    setActiveRules(prev => {
      const hasChanged = prev.length !== currentActiveRules.length || 
                        prev.some(id => !currentActiveRules.includes(id)) ||
                        currentActiveRules.some(id => !prev.includes(id))
      
      if (hasChanged) {
        // Execute actions for newly active rules
        currentActiveRules.forEach(ruleId => {
          if (!prev.includes(ruleId)) {
            const rule = rules.find(r => r.id === ruleId)
            if (rule) {
              executeRuleActions(rule)
            }
          }
        })
        
        return currentActiveRules
      }
      
      return prev
    })
  }, [state, rules, systemMode, connected, systemInitialized])

  const executeRuleActions = useCallback(async (rule: EnvironmentalRule) => {
    const actions = rule.actions
    const timestamp = new Date()
    
    try {
      // Execute each action (using correct ESP32 command mapping)
      if (actions.fan) {
        await sendCommand('B')  // ESP32 expects 'B' for fan
        console.log(`🌪️ Fan activated by rule: ${rule.name}`)
      }
      
      if (actions.led) {
        await sendCommand('A')  // ESP32 expects 'A' for LED/light
        console.log(`💡 LED activated by rule: ${rule.name}`)
      }
      
      if (actions.watering) {
        await sendCommand('D')  // ESP32 expects 'D' for water
        console.log(`💧 Watering activated by rule: ${rule.name}`)
      }
      
      if (actions.buzzer) {
        await sendCommand('E')  // ESP32 expects 'E' for buzzer/scarecrow alarm
        console.log(`🔊 Buzzer activated by rule: ${rule.name}`)
      }
      
      if (actions.feeding) {
        await sendCommand('C')
        console.log(`🍽️ Feeding activated by rule: ${rule.name}`)
      }

      // Log the execution
      const logEntry = {
        id: Date.now(),
        timestamp: timestamp.toISOString(),
        ruleName: rule.name,
        actions: Object.keys(actions).filter(key => actions[key as keyof typeof actions]),
        sensorValues: {
          temperature: state.temperature,
          humidity: state.humidity,
          soilMoisture: state.soilHumidity,
          lightLevel: state.light,
          distance: state.distance
        }
      }

      setExecutionLog(prev => [logEntry, ...prev.slice(0, 9)]) // Keep last 10 entries
      setSystemStats(prev => ({
        ...prev,
        actionsExecuted: prev.actionsExecuted + Object.keys(actions).filter(key => actions[key as keyof typeof actions]).length,
        rulesTriggered: prev.rulesTriggered + 1
      }))

    } catch (error) {
      console.error(`Failed to execute actions for rule ${rule.name}:`, error)
    }
  }, [sendCommand, state.temperature, state.humidity, state.soilHumidity, state.light, state.distance])

  const toggleRule = (ruleId: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId 
        ? { ...rule, enabled: !rule.enabled }
        : rule
    ))
  }

  const initializeSystem = () => {
    setSystemInitialized(true)
    console.log('🚀 Scenario 2: Environmental Auto-Control System Initialized')
  }

  const toggleSystemMode = () => {
    setSystemMode(prev => prev === 'auto' ? 'manual' : 'auto')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className={`${poppins.className} text-3xl font-bold text-white`}>
          Scenario 2: Environmental Auto-Control System
        </h2>

        {/* System Initialization Card */}
        {!systemInitialized && (
          <Card className="bg-purple-100/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-purple-400">
            <h3 className={`${poppins.className} text-2xl font-bold text-purple-900 mb-4`}>
              Initialize Environmental Auto-Control System
            </h3>
            
            <div className="bg-white/80 rounded-2xl p-8 text-center space-y-4">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z" />
                </svg>
              </div>
              
              <h4 className="text-xl font-bold text-gray-800 mb-2">
                Ready to Start Environmental Control
              </h4>
              
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                This advanced system monitors multiple sensors (temperature, humidity, soil moisture, light, distance) 
                and automatically triggers actions based on customizable rules. Click below to initialize the system.
              </p>
              
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className={`flex items-center gap-2 ${connected ? 'text-green-600' : 'text-red-600'}`}>
                  <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-semibold">ESP32 {connected ? 'Connected' : 'Disconnected'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6">
                <div className="text-center p-2 bg-red-50 rounded">
                  <div className="text-xs font-semibold text-red-700">Temperature</div>
                  <div className="text-sm text-red-600">
                    {state.temperature?.toFixed(1) || '--'}°C
                  </div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="text-xs font-semibold text-blue-700">Humidity</div>
                  <div className="text-sm text-blue-600">
                    {state.humidity?.toFixed(1) || '--'}%
                  </div>
                </div>
                <div className="text-center p-2 bg-brown-50 rounded">
                  <div className="text-xs font-semibold text-amber-700">Soil</div>
                  <div className="text-sm text-amber-600">
                    {state.soilHumidity?.toFixed(1) || '--'}%
                  </div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="text-xs font-semibold text-yellow-700">Light</div>
                  <div className="text-sm text-yellow-600">
                    {state.light?.toFixed(1) || '--'}%
                  </div>
                </div>
                <div className="text-center p-2 bg-purple-50 rounded">
                  <div className="text-xs font-semibold text-purple-700">Distance</div>
                  <div className="text-sm text-purple-600">
                    {state.distance?.toFixed(1) || '--'}cm
                  </div>
                </div>
              </div>
              
              <button
                onClick={initializeSystem}
                disabled={!connected}
                className={`px-8 py-4 rounded-xl font-bold text-white text-lg transition-all ${
                  connected 
                    ? 'bg-purple-500 hover:bg-purple-600 hover:scale-105 shadow-lg' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {connected ? '🚀 Initialize Environmental Control' : '⚠️ ESP32 Not Connected'}
              </button>
              
              {!connected && (
                <p className="text-sm text-red-600 mt-2">
                  Please ensure ESP32 is connected before initializing the system
                </p>
              )}
            </div>
          </Card>
        )}

        {systemInitialized && (
          <>
        {/* System Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Control */}
          <Card className="bg-blue-100/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-blue-400">
            <h3 className={`${poppins.className} text-2xl font-bold text-blue-900 mb-4`}>
              System Control
            </h3>
            
            <div className="bg-white/80 rounded-2xl p-6 space-y-4">
              {/* System Mode Toggle */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">Mode:</span>
                <button
                  onClick={toggleSystemMode}
                  className={`px-4 py-2 rounded-lg font-bold text-white transition-all ${
                    systemMode === 'auto' 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : 'bg-gray-500 hover:bg-gray-600'
                  }`}
                >
                  {systemMode === 'auto' ? 'AUTO' : 'MANUAL'}
                </button>
              </div>

              {/* Connection Status */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">ESP32:</span>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    connected ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className={`font-semibold ${
                    connected ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {connected ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
              </div>

              {/* Active Rules Count */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">Active Rules:</span>
                <span className="text-2xl font-bold text-blue-600">
                  {activeRules.length}
                </span>
              </div>

              {/* System Stats */}
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Actions Executed:</span>
                  <span className="font-semibold">{systemStats.actionsExecuted}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Rules Triggered:</span>
                  <span className="font-semibold">{systemStats.rulesTriggered}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Current Sensor Status */}
          <Card className="bg-green-100/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-green-400">
            <h3 className={`${poppins.className} text-2xl font-bold text-green-900 mb-4`}>
              Live Sensor Data
            </h3>
            
            <div className="bg-white/80 rounded-2xl p-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Temperature:</span>
                <span className="text-lg font-bold text-red-600">
                  {state.temperature !== undefined && state.temperature !== null && state.temperature !== -999 
                    ? `${state.temperature.toFixed(1)}°C` 
                    : 'N/A'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Humidity:</span>
                <span className="text-lg font-bold text-blue-600">
                  {state.humidity !== undefined && state.humidity !== null && state.humidity !== -999 
                    ? `${state.humidity.toFixed(1)}%` 
                    : 'N/A'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Soil Moisture:</span>
                <span className="text-lg font-bold text-brown-600">
                  {state.soilHumidity !== undefined && state.soilHumidity !== null && state.soilHumidity !== -999 
                    ? `${state.soilHumidity.toFixed(1)}%` 
                    : 'N/A'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Light Level:</span>
                <span className="text-lg font-bold text-yellow-600">
                  {state.light !== undefined && state.light !== null && state.light !== -999 
                    ? `${state.light.toFixed(1)}%` 
                    : 'N/A'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Distance:</span>
                <span className="text-lg font-bold text-purple-600">
                  {state.distance !== undefined && state.distance !== null && state.distance !== -1 
                    ? `${state.distance.toFixed(1)}cm` 
                    : 'N/A'}
                </span>
              </div>
            </div>
          </Card>

          {/* System Activity */}
          <Card className="bg-orange-100/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-orange-400">
            <h3 className={`${poppins.className} text-2xl font-bold text-orange-900 mb-4`}>
              Recent Activity
            </h3>
            
            <div className="bg-white/80 rounded-2xl p-6">
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {executionLog.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No activity yet</p>
                ) : (
                  executionLog.map(entry => (
                    <div key={entry.id} className="border-l-4 border-orange-400 pl-3 py-2">
                      <div className="text-sm font-semibold text-gray-800">
                        {entry.ruleName}
                      </div>
                      <div className="text-xs text-gray-600">
                        Actions: {entry.actions.join(', ')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Environmental Rules Configuration */}
        <Card className="bg-purple-100/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-purple-400">
          <h3 className={`${poppins.className} text-2xl font-bold text-purple-900 mb-4`}>
            Environmental Control Rules
          </h3>
          
          <div className="bg-white/80 rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules.map(rule => (
                <div key={rule.id} className={`border-2 rounded-xl p-4 ${
                  rule.enabled ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'
                } ${activeRules.includes(rule.id) ? 'ring-2 ring-red-400 bg-red-50' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-gray-800">{rule.name}</h4>
                    <div className="flex items-center gap-2">
                      {activeRules.includes(rule.id) && (
                        <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full animate-pulse">
                          ACTIVE
                        </span>
                      )}
                      <button
                        onClick={() => toggleRule(rule.id)}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          rule.enabled ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                          rule.enabled ? 'translate-x-7' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
                  
                  <div className="text-xs space-y-1">
                    <div className="font-medium text-gray-700">Conditions:</div>
                    {Object.entries(rule.conditions).map(([key, value]) => (
                      <div key={key} className="text-gray-600 pl-2">
                        {key}: {value.min && `min ${value.min}`} {value.max && `max ${value.max}`}
                      </div>
                    ))}
                    
                    <div className="font-medium text-gray-700 mt-2">Actions:</div>
                    <div className="text-gray-600 pl-2">
                      {Object.entries(rule.actions)
                        .filter(([_, active]) => active)
                        .map(([action]) => action)
                        .join(', ') || 'None'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* How It Works */}
        <Card className="bg-yellow-100/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-yellow-400">
          <h3 className={`${poppins.className} text-2xl font-bold text-orange-900 mb-4`}>
            How the Environmental Auto-Control System Works
          </h3>
          
          <div className="bg-white/80 rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z" />
                  </svg>
                </div>
                <h4 className="font-bold text-gray-800 mb-2">1. Monitoring</h4>
                <p className="text-sm text-gray-600">
                  Continuously reads all sensor data (temperature, humidity, soil, light, distance)
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h4 className="font-bold text-gray-800 mb-2">2. Rule Engine</h4>
                <p className="text-sm text-gray-600">
                  Evaluates predefined environmental rules against current sensor readings
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="font-bold text-gray-800 mb-2">3. Auto-Actions</h4>
                <p className="text-sm text-gray-600">
                  Automatically triggers appropriate responses (fan, LED, watering, buzzer, feeding)
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-bold text-gray-800 mb-2">4. Logging</h4>
                <p className="text-sm text-gray-600">
                  Records all actions and maintains system statistics for monitoring
                </p>
              </div>
            </div>
          </div>
        </Card>
        </>
        )}

      </div>
    </DashboardLayout>
  )
}
