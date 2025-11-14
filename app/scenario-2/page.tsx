"use client"

import Image from "next/image"
import { useState, useEffect, useRef, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { useEspContext } from "@/components/EspProvider"
import { Poppins } from "next/font/google"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"]
})

export default function Scenario2Page() {
  const { state, connected, sendCommand } = useEspContext()
  const [protectionActive, setProtectionActive] = useState(false)
  const [alerts, setAlerts] = useState<string[]>([])
  const [actionLog, setActionLog] = useState<{time: string, action: string, reason: string}[]>([])
  const lastActionTimes = useRef<{[key: string]: number}>({})

  // Helper function to add action log entry
  const addActionLog = useCallback((action: string, reason: string) => {
    const currentTime = new Date().toLocaleTimeString()
    setActionLog(prev => [{
      time: currentTime,
      action,
      reason
    }, ...prev.slice(0, 9)])
  }, [])

  // Smart Greenhouse Protection Logic
  useEffect(() => {
    if (!protectionActive || !connected) return

    const newAlerts: string[] = []
    const now = Date.now()

    // 1. Temperature Protection (> 30°C = Too Hot)
    if (state.temperature && state.temperature > 30) {
      newAlerts.push("🌡️ High Temperature Alert")
      if (!lastActionTimes.current["Fan"] || now - lastActionTimes.current["Fan"] > 10000) {
        sendCommand('B') // Activate fan
        lastActionTimes.current["Fan"] = now
        addActionLog("Fan Activated", `Temperature too high: ${state.temperature?.toFixed(1)}°C`)
      }
    }

    // 2. Soil Moisture Protection (< 20% = Too Dry)
    if (state.soilHumidity && state.soilHumidity < 20) {
      newAlerts.push("💧 Low Soil Moisture Alert")
      if (!lastActionTimes.current["Water"] || now - lastActionTimes.current["Water"] > 15000) {
        sendCommand('D') // Activate watering
        lastActionTimes.current["Water"] = now
        addActionLog("Watering Started", `Soil too dry: ${state.soilHumidity?.toFixed(1)}%`)
      }
    }

    // 3. Light Protection (< 15% = Too Dark, > 25% = Normal)
    if (state.light && state.light < 15) {
      newAlerts.push("💡 Low Light Alert")
      if (!lastActionTimes.current["Light"] || now - lastActionTimes.current["Light"] > 20000) {
        sendCommand('A') // Activate LED lights
        lastActionTimes.current["Light"] = now
        addActionLog("Grow Lights On", `Light level too low: ${state.light?.toFixed(1)}%`)
      }
    } else if (state.light && state.light > 25) {
      // Turn off grow lights when light levels return to normal
      if (lastActionTimes.current["Light"] && now - lastActionTimes.current["Light"] > 5000) {
        sendCommand('A') // Turn off LED lights (toggle)
        lastActionTimes.current["LightOff"] = now
        addActionLog("Grow Lights Off", `Light level normal: ${state.light?.toFixed(1)}%`)
        delete lastActionTimes.current["Light"] // Clear the on-state tracking
      }
    }

    // 4. Intrusion Detection (< 10cm = Something too close)
    if (state.distance && state.distance < 5) {
      newAlerts.push("🚨 Intrusion Alert")
      if (!lastActionTimes.current["Alarm"] || now - lastActionTimes.current["Alarm"] > 5000) {
        sendCommand('E') // Activate alarm
        lastActionTimes.current["Alarm"] = now
        addActionLog("Security Alarm", `Object detected: ${state.distance?.toFixed(1)}cm away`)
      }
    }

    // 5. Motion Detection (Unexpected movement)
    if (state.motionDetected) {
      newAlerts.push("👁️ Motion Detected")
      if (!lastActionTimes.current["Motion"] || now - lastActionTimes.current["Motion"] > 8000) {
        sendCommand('E') // Brief alarm
        setTimeout(() => sendCommand('A'), 500) // Flash lights ON
        setTimeout(() => sendCommand('A'), 2000) // Turn lights OFF after flash (security mode)
        lastActionTimes.current["Motion"] = now
        addActionLog("Motion Alert", "Security sequence: Alarm → Flash → Lights OFF")
      }
    }

    setAlerts(newAlerts)
  }, [state, protectionActive, connected, sendCommand, addActionLog])

  const toggleProtection = () => {
    setProtectionActive(!protectionActive)
    if (!protectionActive) {
      // Clear previous action times when starting
      lastActionTimes.current = {}
      addActionLog("System Started", "Smart Greenhouse Protection activated")
    } else {
      setAlerts([])
      setActionLog([])
      lastActionTimes.current = {}
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className={`${poppins.className} text-3xl font-bold text-white`}>
          Scenario 2: Smart Greenhouse Protection System
        </h2>

        {/* System Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Control */}
          <Card className="bg-green-100/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-green-400">
            <h3 className={`${poppins.className} text-2xl font-bold text-green-900 mb-4`}>
              Protection System
            </h3>
            
            <div className="bg-white/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">Status:</span>
                <button
                  onClick={toggleProtection}
                  className={`px-4 py-2 rounded-lg font-bold text-white transition-all ${
                    protectionActive 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : 'bg-gray-500 hover:bg-gray-600'
                  }`}
                >
                  {protectionActive ? 'ACTIVE' : 'INACTIVE'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">ESP32:</span>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className={`font-semibold ${connected ? 'text-green-600' : 'text-red-600'}`}>
                    {connected ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">Active Alerts:</span>
                <span className="text-2xl font-bold text-red-600">
                  {alerts.length}
                </span>
              </div>

              {protectionActive && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800 font-semibold">
                    🛡️ Greenhouse Protection Active
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Monitoring temperature, soil, light, and security
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Current Alerts */}
          <Card className="bg-red-100/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-red-400">
            <h3 className={`${poppins.className} text-2xl font-bold text-red-900 mb-4`}>
              Current Alerts
            </h3>
            
            <div className="bg-white/80 rounded-2xl p-6">
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {alerts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">✅ All systems normal</p>
                ) : (
                  alerts.map((alert, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
                      <span className="text-sm font-semibold text-red-800">{alert}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          {/* Live Sensor Data */}
          <Card className="bg-blue-100/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-blue-400">
            <h3 className={`${poppins.className} text-2xl font-bold text-blue-900 mb-4`}>
              Sensor Readings
            </h3>
            
            <div className="bg-white/80 rounded-2xl p-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Temperature:</span>
                <span className={`text-lg font-bold ${
                  state.temperature && state.temperature > 30 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {state.temperature?.toFixed(1) || '--'}°C
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Soil Moisture:</span>
                <span className={`text-lg font-bold ${
                  state.soilHumidity && state.soilHumidity < 20 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {state.soilHumidity?.toFixed(1) || '--'}%
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Light Level:</span>
                <span className={`text-lg font-bold ${
                  state.light && state.light < 15 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {state.light?.toFixed(1) || '--'}%
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Distance:</span>
                <span className={`text-lg font-bold ${
                  state.distance && state.distance < 10 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {state.distance?.toFixed(1) || '--'}cm
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Motion:</span>
                <span className={`text-lg font-bold ${
                  state.motionDetected ? 'text-red-600' : 'text-green-600'
                }`}>
                  {state.motionDetected ? 'DETECTED' : 'CLEAR'}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Protection Rules Guide */}
        <Card className="bg-indigo-100/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-indigo-400">
          <h3 className={`${poppins.className} text-2xl font-bold text-indigo-900 mb-4`}>
            🤖 Smart Protection Rules
          </h3>
          
          <div className="bg-white/80 rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Temperature Rule */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🌡️</span>
                  <span className="font-bold text-red-800">Temperature</span>
                </div>
                <p className="text-sm text-red-700">
                  <strong>IF</strong> Temperature &gt; 30°C<br/>
                  <strong>THEN</strong> Activate cooling fan
                </p>
              </div>

              {/* Soil Moisture Rule */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">💧</span>
                  <span className="font-bold text-blue-800">Soil Moisture</span>
                </div>
                <p className="text-sm text-blue-700">
                  <strong>IF</strong> Soil Moisture &lt; 20%<br/>
                  <strong>THEN</strong> Start watering system
                </p>
              </div>

              {/* Light Rule */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">💡</span>
                  <span className="font-bold text-yellow-800">Light Control</span>
                </div>
                <p className="text-sm text-yellow-700">
                  <strong>IF</strong> Light &lt; 15% → Lights ON<br/>
                  <strong>IF</strong> Light &gt; 25% → Lights OFF
                </p>
              </div>

              {/* Security Rule */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🚨</span>
                  <span className="font-bold text-purple-800">Intrusion</span>
                </div>
                <p className="text-sm text-purple-700">
                  <strong>IF</strong> Object &lt; 5cm away<br/>
                  <strong>THEN</strong> Trigger security alarm
                </p>
              </div>

              {/* Motion Rule */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">👁️</span>
                  <span className="font-bold text-orange-800">Motion</span>
                </div>
                <p className="text-sm text-orange-700">
                  <strong>IF</strong> Movement detected<br/>
                  <strong>THEN</strong> Alert + flash lights
                </p>
              </div>

              {/* System Info */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">⚙️</span>
                  <span className="font-bold text-green-800">System</span>
                </div>
                <p className="text-sm text-green-700">
                  <strong>Automated</strong> responses<br/>
                  <strong>Real-time</strong> monitoring
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <p className="text-sm text-indigo-800 text-center">
                <strong>🎯 How it works:</strong> Toggle "Protection System" ON to activate automated monitoring. 
                The system will watch all sensors and take action when thresholds are crossed!
              </p>
            </div>
          </div>
        </Card>

        {/* Action Log */}
        <Card className="bg-orange-100/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-orange-400">
          <h3 className={`${poppins.className} text-2xl font-bold text-orange-900 mb-4`}>
            Protection Actions Log
          </h3>
          
          <div className="bg-white/80 rounded-2xl p-6">
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {actionLog.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No actions taken yet. Activate protection system to begin monitoring.
                </p>
              ) : (
                actionLog.map((entry, index) => (
                  <div key={index} className="border-l-4 border-orange-400 pl-4 py-3 bg-gray-50 rounded-r-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{entry.action}</div>
                        <div className="text-xs text-gray-600 mt-1">{entry.reason}</div>
                      </div>
                      <div className="text-xs text-gray-500">{entry.time}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* Manual Controls */}
        <Card className="bg-purple-100/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-purple-400">
          <h3 className={`${poppins.className} text-2xl font-bold text-purple-900 mb-4`}>
            Manual Override Controls
          </h3>
          
          <div className="bg-white/80 rounded-2xl p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <button
                onClick={() => sendCommand('B')}
                disabled={!connected}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-4 px-4 rounded-lg transition-all hover:scale-105 disabled:hover:scale-100"
              >
                🌪️<br />Fan
              </button>
              
              <button
                onClick={() => sendCommand('A')}
                disabled={!connected}
                className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white font-bold py-4 px-4 rounded-lg transition-all hover:scale-105 disabled:hover:scale-100"
              >
                💡<br />Lights
              </button>
              
              <button
                onClick={() => sendCommand('D')}
                disabled={!connected}
                className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-400 text-white font-bold py-4 px-4 rounded-lg transition-all hover:scale-105 disabled:hover:scale-100"
              >
                💧<br />Water
              </button>
              
              <button
                onClick={() => sendCommand('E')}
                disabled={!connected}
                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-bold py-4 px-4 rounded-lg transition-all hover:scale-105 disabled:hover:scale-100"
              >
                🔊<br />Alarm
              </button>
              
              <button
                onClick={() => sendCommand('C')}
                disabled={!connected}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-4 px-4 rounded-lg transition-all hover:scale-105 disabled:hover:scale-100"
              >
                🍽️<br />Feed
              </button>
            </div>
            
            {!connected && (
              <p className="text-sm text-red-600 mt-4 text-center">
                ESP32 not connected - Manual controls disabled
              </p>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}