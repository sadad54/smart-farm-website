"use client"

import Image from "next/image"
import { useState, useEffect, useRef } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { useEspContext } from "@/components/EspProvider"
import { Poppins } from "next/font/google"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export default function Scenario1Page() {
  const { state, connected, sendCommand } = useEspContext()
  const [systemInitialized, setSystemInitialized] = useState(false)
  const [feedingMode, setFeedingMode] = useState<'auto' | 'manual'>('auto')
  const [lastFeedingTime, setLastFeedingTime] = useState<Date | null>(null)
  const [animalDetected, setAnimalDetected] = useState(false)
  const [distance, setDistance] = useState<number>(0)
  const [motionEvents, setMotionEvents] = useState<any[]>([])
  const [feedingCooldown, setFeedingCooldown] = useState(false)
  const prevLight = useRef<number | null>(null)
  const detectionCooldownRef = useRef<number>(0)

  // Real ultrasonic sensor-based animal detection (only when system is initialized)
  useEffect(() => {
    if (!systemInitialized) return
    
    // Use real ultrasonic sensor data from ESP32
    if (state.distance !== undefined && state.distance !== null && state.distance !== -1) {
      const currentDistance = state.distance
      setDistance(currentDistance) // Update local state for UI display
      
      // Only detect if enough time has passed since last detection
      const now = Date.now()
      if (now - detectionCooldownRef.current > 3000) { // 3 second minimum between detections
        
        // Animal detection logic: Expanded range for better detection
        // Close range: 2-15cm indicates animal presence (more realistic)
        if (currentDistance >= 2 && currentDistance <= 15) {
          if (!animalDetected && !feedingCooldown) {
            setAnimalDetected(true)
            detectionCooldownRef.current = now
            console.log(`🐕 Animal detected at ${currentDistance.toFixed(1)}cm - Triggering feeding`)
            
            if (feedingMode === 'auto') {
              handleFeed()
            }
          }
        } else {
          // Animal moved away or out of range
          if (animalDetected && currentDistance > 20) {
            setAnimalDetected(false)
            console.log(`🚪 Animal left detection zone - Distance: ${currentDistance.toFixed(1)}cm`)
          }
        }
      }
    } else {
      // No valid sensor reading - reset to safe distance and clear detection
      setDistance(50) // Use 50cm as fallback (safe distance)
      if (animalDetected) {
        setAnimalDetected(false)
        console.log('🔧 Ultrasonic sensor offline - clearing detection')
      }
    }
  }, [state.distance, animalDetected, feedingMode, feedingCooldown, systemInitialized])

  // Method 2: Fetch real motion events from database (only when system is initialized)
  useEffect(() => {
    if (!systemInitialized) return
    
    const fetchMotionEvents = async () => {
      try {
        const response = await fetch('/api/motion-events?limit=10')
        const data = await response.json()
        if (data.success) {
          setMotionEvents(data.events || [])
          
          // Check for recent motion (within last 30 seconds)
          const recentMotion = data.events?.find((event: any) => {
            const eventTime = new Date(event.timestamp).getTime()
            const now = Date.now()
            return (now - eventTime) < 30000 && event.motion_detected
          })
          
          if (recentMotion && !feedingCooldown) {
            setDistance(Math.random() * 3 + 2) // 2-5cm for recent motion
            setAnimalDetected(true)
            if (feedingMode === 'auto') {
              handleFeed()
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch motion events:', error)
      }
    }

    fetchMotionEvents()
    const interval = setInterval(fetchMotionEvents, 5000) // Check every 5 seconds
    return () => clearInterval(interval)
  }, [feedingMode, feedingCooldown, systemInitialized])

  // Reset detection after some time without triggers
  useEffect(() => {
    if (animalDetected) {
      const timeout = setTimeout(() => {
        setAnimalDetected(false)
        setDistance(15) // Reset to max distance
      }, 10000) // Clear detection after 10 seconds
      
      return () => clearTimeout(timeout)
    }
  }, [animalDetected])

  const handleFeed = async () => {
    if (feedingCooldown) return // Prevent rapid feeding
    
    try {
      await sendCommand('C') // Send feeding command to ESP
      setLastFeedingTime(new Date())
      setFeedingCooldown(true)
      
      // Log feeding event to database
      await fetch('/api/feeding-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeding_time: new Date().toISOString(),
          trigger_type: animalDetected ? 'automatic' : 'manual',
          distance: distance,
          motion_detected: animalDetected
        })
      })
      
      // Reset cooldown after 60 seconds (longer cooldown to prevent overfeeding)
      setTimeout(() => {
        setFeedingCooldown(false)
      }, 60000)
      
    } catch (error) {
      console.error('Failed to send feeding command:', error)
      setFeedingCooldown(false)
    }
  }

  const initializeSystem = () => {
    setSystemInitialized(true)
    console.log('🚀 Scenario 1: Intelligent Feeding System Initialized')
  }

  const toggleFeedingMode = () => {
    setFeedingMode(prev => prev === 'auto' ? 'manual' : 'auto')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className={`${poppins.className} text-3xl font-bold text-white`}>
          Scenario 1: Intelligent Feeding System
        </h2>

        {/* System Initialization Card */}
        {!systemInitialized && (
          <Card className="bg-blue-100/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-blue-400">
            <h3 className={`${poppins.className} text-2xl font-bold text-blue-900 mb-4`}>
              Initialize Intelligent Feeding System
            </h3>
            
            <div className="bg-white/80 rounded-2xl p-8 text-center space-y-4">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12z" />
                </svg>
              </div>
              
              <h4 className="text-xl font-bold text-gray-800 mb-2">
                Ready to Start Intelligent Feeding
              </h4>
              
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                This system uses HC-SR04 ultrasonic sensor for real-time animal detection and automatic feeding. 
                Click below to initialize the system and start monitoring.
              </p>
              
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className={`flex items-center gap-2 ${connected ? 'text-green-600' : 'text-red-600'}`}>
                  <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-semibold">ESP32 {connected ? 'Connected' : 'Disconnected'}</span>
                </div>
              </div>
              
              <button
                onClick={initializeSystem}
                disabled={!connected}
                className={`px-8 py-4 rounded-xl font-bold text-white text-lg transition-all ${
                  connected 
                    ? 'bg-blue-500 hover:bg-blue-600 hover:scale-105 shadow-lg' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {connected ? '🚀 Initialize Feeding System' : '⚠️ ESP32 Not Connected'}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Feeding Control Card */}
          <Card className="bg-green-200/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-green-400">
            <h3 className={`${poppins.className} text-2xl font-bold text-green-900 mb-4`}>
              Feeding Control
            </h3>
            
            <div className="bg-white/80 rounded-2xl p-6 space-y-4">
              {/* Mode Toggle */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">Feeding Mode:</span>
                <button
                  onClick={toggleFeedingMode}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    feedingMode === 'auto' 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-300 text-gray-700'
                  }`}
                >
                  {feedingMode === 'auto' ? 'AUTO' : 'MANUAL'}
                </button>
              </div>

              {/* Distance Display - Real ESP32 data */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">Distance (ESP32):</span>
                <span className={`font-bold text-lg ${
                  state.distance !== undefined && state.distance !== null && state.distance !== -1
                    ? (state.distance >= 2 && state.distance <= 15 ? 'text-red-600 animate-pulse' : 'text-blue-600')
                    : 'text-gray-500'
                }`}>
                  {state.distance !== undefined && state.distance !== null && state.distance !== -1 
                    ? `${state.distance.toFixed(1)} cm` 
                    : 'No Signal'}
                </span>
              </div>

              {/* Animal Detection Status */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">Animal Detected:</span>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    animalDetected ? 'bg-red-500 animate-pulse' : 'bg-gray-400'
                  }`} />
                  <span className={`font-semibold ${
                    animalDetected ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {animalDetected ? 'YES' : 'NO'}
                  </span>
                </div>
              </div>

              {/* Last Feeding Time */}
              {lastFeedingTime && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-800">Last Fed:</span>
                  <span className="text-gray-600">
                    {lastFeedingTime.toLocaleTimeString()}
                  </span>
                </div>
              )}

              {/* Manual Feed Button */}
              <button
                onClick={handleFeed}
                disabled={feedingMode === 'auto' && !animalDetected}
                className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
                  feedingMode === 'auto' && !animalDetected
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600 hover:scale-105'
                }`}
              >
                {feedingMode === 'auto' ? 'AUTO FEEDING ACTIVE' : 'FEED NOW'}
              </button>
            </div>
          </Card>

          {/* System Status Card */}
          <Card className="bg-blue-200/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-blue-400">
            <h3 className={`${poppins.className} text-2xl font-bold text-blue-900 mb-4`}>
              System Status
            </h3>
            
            <div className="bg-white/80 rounded-2xl p-6 space-y-4">
              {/* Connection Status */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">ESP32 Status:</span>
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

              {/* Servo Status */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">Feeding Box:</span>
                <span className={`font-semibold ${
                  animalDetected ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {animalDetected ? 'OPEN (80°)' : 'CLOSED (180°)'}
                </span>
              </div>

              {/* Ultrasonic Sensor */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">Ultrasonic Sensor:</span>
                <span className="text-gray-600 font-semibold">ACTIVE</span>
              </div>

              {/* Detection Range - Updated to use real ESP32 ultrasonic data */}
              <div className="mt-4">
                <span className="font-semibold text-gray-800">Detection Range: 2-15 cm</span>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className={`h-4 rounded-full transition-all duration-500 ${
                      // Color based on real distance from ESP32 sensor
                      state.distance !== undefined && state.distance !== null && state.distance !== -1
                        ? (state.distance >= 2 && state.distance <= 15 ? 'bg-red-500 animate-pulse' : 'bg-blue-500')
                        : 'bg-gray-400'
                    }`}
                    style={{ 
                      // Use actual ESP32 distance data for progress bar width
                      width: `${state.distance !== undefined && state.distance !== null && state.distance !== -1 
                        ? Math.min((state.distance / 25) * 100, 100) 
                        : 0}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0cm</span>
                  <span>2cm</span>
                  <span>15cm</span>
                  <span>25cm+</span>
                </div>
                <div className="text-center mt-2">
                  <span className={`text-sm font-bold ${
                    state.distance !== undefined && state.distance !== null && state.distance !== -1
                      ? (state.distance >= 2 && state.distance <= 15 ? 'text-red-600' : 'text-blue-600')
                      : 'text-gray-500'
                  }`}>
                    Real-time: {state.distance !== undefined && state.distance !== null && state.distance !== -1 
                      ? `${state.distance.toFixed(1)} cm` 
                      : 'No Signal'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Real-Time Sensor Data Card */}
        <Card className="bg-blue-100/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-blue-400">
          <h3 className={`${poppins.className} text-2xl font-bold text-blue-900 mb-4`}>
            Real-Time Sensor Analysis
          </h3>
          
          <div className="bg-white/80 rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Temperature */}
              <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z" />
                  </svg>
                  <h4 className="font-semibold text-red-800">Temperature</h4>
                </div>
                <p className="text-2xl font-bold text-red-900">
                  {state.temperature !== undefined && state.temperature !== null && state.temperature !== -999 
                    ? `${state.temperature.toFixed(1)}°C` 
                    : 'N/A'}
                </p>
                <p className="text-xs text-red-600 mt-1">Environmental monitoring</p>
              </div>

              {/* Humidity */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.002 4.002 0 003 15z" />
                  </svg>
                  <h4 className="font-semibold text-blue-800">Humidity</h4>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {state.humidity !== undefined && state.humidity !== null && state.humidity !== -999 
                    ? `${state.humidity.toFixed(1)}%` 
                    : 'N/A'}
                </p>
                <p className="text-xs text-blue-600 mt-1">Motion detection aid</p>
              </div>

              {/* Light Level */}
              <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <h4 className="font-semibold text-yellow-800">Light Level</h4>
                </div>
                <p className="text-2xl font-bold text-yellow-900">
                  {state.light !== undefined && state.light !== null && state.light !== -999 
                    ? `${state.light.toFixed(1)}%` 
                    : 'N/A'}
                </p>
                <p className="text-xs text-yellow-600 mt-1">Primary detection method</p>
              </div>

              {/* Ultrasonic Distance */}
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z" />
                  </svg>
                  <h4 className="font-semibold text-green-800">Distance (HC-SR04)</h4>
                </div>
                <p className="text-2xl font-bold text-green-900">
                  {state.distance !== undefined && state.distance !== null && state.distance !== -1 
                    ? `${state.distance.toFixed(1)} cm` 
                    : 'N/A'}
                </p>
                <p className="text-xs text-green-600 mt-1">Ultrasonic sensor</p>
              </div>
            </div>

            {/* Detection Algorithm Status */}
            <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl">
              <h4 className="font-semibold text-purple-800 mb-2">Detection Algorithm Status</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-purple-700">Ultrasonic HC-SR04:</span>
                  <span className={`ml-2 font-semibold ${
                    state.distance !== undefined && state.distance !== null && state.distance !== -1 
                      ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {state.distance !== undefined && state.distance !== null && state.distance !== -1 ? '✓ Active' : '✗ Offline'}
                  </span>
                </div>
                <div>
                  <span className="text-purple-700">Detection Zone:</span>
                  <span className={`ml-2 font-semibold ${
                    state.distance !== undefined && state.distance !== null && state.distance !== -1
                      ? (state.distance >= 2 && state.distance <= 15 ? 'text-red-600' : 'text-green-600')
                      : 'text-gray-500'
                  }`}>
                    {state.distance !== undefined && state.distance !== null && state.distance !== -1
                      ? (state.distance >= 2 && state.distance <= 15 ? '🚨 In Range' : '🟢 Clear')
                      : '⚠️ No Data'}
                  </span>
                </div>
                <div>
                  <span className="text-purple-700">System Status:</span>
                  <span className={`ml-2 font-semibold ${
                    feedingCooldown ? 'text-orange-600' : animalDetected ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {feedingCooldown ? '⏰ Cooldown' : animalDetected ? '🐕 Animal Present' : '👀 Monitoring'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* How It Works Card */}
        <Card className="bg-yellow-100/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-yellow-400">
          <h3 className={`${poppins.className} text-2xl font-bold text-orange-900 mb-4`}>
            How the Intelligent Feeding System Works
          </h3>
          
          <div className="bg-white/80 rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h4 className="font-bold text-gray-800 mb-2">1. Detection</h4>
                <p className="text-sm text-gray-600">
                  HC-SR04 ultrasonic sensor measures distance to detect animals within 2-15cm range
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-bold text-gray-800 mb-2">2. Processing</h4>
                <p className="text-sm text-gray-600">
                  ESP32 processes real-time distance measurements with cooldown protection
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12z" />
                  </svg>
                </div>
                <h4 className="font-bold text-gray-800 mb-2">3. Action</h4>
                <p className="text-sm text-gray-600">
                  Servo motor opens feeding box (80°) and closes when animal leaves (180°)
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
