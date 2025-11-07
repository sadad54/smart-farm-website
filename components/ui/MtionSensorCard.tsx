"use client"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { useEspContext } from "@/components/EspProvider"
import { supabase } from "@/lib/supabase"
import Image from "next/image"

interface MotionEvent {
  id: number
  device_id: string
  motion_detected: boolean
  animal_type?: string
  confidence_score?: number
  timestamp: string
}

export default function MotionSensorCard() {
  const { state } = useEspContext()
  const [motionDetected, setMotionDetected] = useState(false)
  const [lastMotionEvent, setLastMotionEvent] = useState<MotionEvent | null>(null)
  const [motionIntensity, setMotionIntensity] = useState(75)
  const [combinedDetection, setCombinedDetection] = useState(false)
  const [detectionType, setDetectionType] = useState<'none' | 'pir' | 'ultrasonic' | 'combined'>('none')
  const [buzzerActive, setBuzzerActive] = useState(false)
  const [lastAlertSound, setLastAlertSound] = useState<number>(0)
  
  // Simplified alert system state to match ESP32
  const [intruderAlert, setIntruderAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState("")
  const [distance, setDistance] = useState<number>(999)

  // Force update when ESP state changes
  useEffect(() => {
    if (state.distance !== undefined) {
      setDistance(Number(state.distance) || 999)
    }
    if (state.motionDetected !== undefined) {
      setMotionDetected(Boolean(state.motionDetected))
    }
    if (state.intruderAlert !== undefined) {
      setIntruderAlert(Boolean(state.intruderAlert))
    }
  }, [state.distance, state.motionDetected, state.intruderAlert])

  // Real-time motion detection from ESP and database
  useEffect(() => {
    // Get initial motion data
    fetchLatestMotionEvent()

    // Real-time subscription for motion events
    const motionSubscription = supabase
      .channel('motion_events_changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'motion_events' },
        (payload) => {
          const newEvent = payload.new as MotionEvent
          setLastMotionEvent(newEvent)
          setMotionDetected(newEvent.motion_detected)
          setMotionIntensity(newEvent.confidence_score || 75)
        }
      )
      .subscribe()

    // Simplified real-time motion detection from ESP sensor data
    const motionCheckInterval = setInterval(() => {
      // Debug: Log ESP state
      console.log('🔍 ESP State:', {
        motionDetected: state.motionDetected,
        distance: state.distance,
        intruderAlert: state.intruderAlert,
        hasData: state.motionDetected !== undefined
      })
      
      // Always update distance if available from ESP32
      if (state.distance !== undefined && state.distance !== null) {
        const currentDistance = Number(state.distance) || 999
        setDistance(currentDistance)
      }
      
      // Check if we have real sensor data from ESP
      if (state.motionDetected !== undefined && state.motionDetected !== null) {
        const currentMotion = Boolean(state.motionDetected)
        const currentIntruderAlert = Boolean(state.intruderAlert)
        const currentDistance = Number(state.distance) || 999
        
        // Update states
        setIntruderAlert(currentIntruderAlert)
        
        // Determine alert message based on simplified system
        let newAlertMessage = ""
        
        if (currentIntruderAlert) {
          // ESP32 intruder alert active (either PIR motion OR ultrasonic < 5cm)
          const ultrasonicTriggered = currentDistance <= 5
          const pirTriggered = currentMotion
          
          if (ultrasonicTriggered && pirTriggered) {
            newAlertMessage = `🚨 DUAL DETECTION! PIR + Ultrasonic (${currentDistance.toFixed(1)}cm)`
          } else if (ultrasonicTriggered) {
            newAlertMessage = `🚨 CLOSE OBJECT! Ultrasonic triggered (${currentDistance.toFixed(1)}cm)`
          } else if (pirTriggered) {
            newAlertMessage = `🚨 MOTION DETECTED! PIR sensor triggered`
          } else {
            newAlertMessage = `🚨 INTRUDER ALERT! Distance: ${currentDistance.toFixed(1)}cm`
          }
          setBuzzerActive(true)
        } else if (currentMotion) {
          newAlertMessage = `Motion detected (PIR only) - Distance: ${currentDistance.toFixed(1)}cm`
          setBuzzerActive(false)
        } else {
          newAlertMessage = `All clear - Distance: ${currentDistance.toFixed(1)}cm`
          setBuzzerActive(false)
        }
        
        setAlertMessage(newAlertMessage)
        
        // Determine detection type for simplified logging
        let newDetectionType: 'none' | 'pir' | 'ultrasonic' | 'combined' = 'none'
        let confidence = 50
        
        if (currentIntruderAlert) {
          // Either PIR or ultrasonic (< 5cm) triggered
          const ultrasonicTriggered = currentDistance <= 5
          const pirTriggered = currentMotion
          
          if (ultrasonicTriggered && pirTriggered) {
            newDetectionType = 'combined'
            confidence = 95 // High confidence for dual detection
          } else if (ultrasonicTriggered) {
            newDetectionType = 'ultrasonic'
            confidence = 85 // High confidence for close object
          } else if (pirTriggered) {
            newDetectionType = 'pir'
            confidence = 80 // Good confidence for PIR motion
          } else {
            newDetectionType = 'combined'
            confidence = 75 // General intruder alert
          }
        } else if (currentMotion) {
          newDetectionType = 'pir'
          confidence = 70 // PIR only, no alarm
        }
        
        // Update states - always update distance and message for real-time updates
        setMotionDetected(currentMotion)
        setCombinedDetection(currentIntruderAlert)
        setDetectionType(newDetectionType)
        setMotionIntensity(confidence)
        
        // Log motion event only on state changes
        if (currentMotion !== motionDetected || currentIntruderAlert !== combinedDetection) {
          logMotionEvent(currentMotion, currentDistance, confidence, newDetectionType)
          
          // Play alert sound for intruder alerts
          if (currentIntruderAlert) {
            playAlertSound()
          }
        }
        
        // Auto-clear local buzzer state when ESP32 clears the alert
        if (!currentIntruderAlert && buzzerActive) {
          setBuzzerActive(false)
          console.log("🔇 Alert cleared by ESP32 - stopping local buzzer")
        }
      } else {
        // If no motion data but distance is available, still update
        if (state.distance !== undefined) {
          const currentDistance = Number(state.distance) || 999
          setDistance(currentDistance)
          setAlertMessage(`Monitoring - Distance: ${currentDistance.toFixed(1)}cm`)
        } else {
          // Fallback to simulation if no ESP data at all
          const hasMotion = Math.random() > 0.7 // 30% chance of motion
          if (hasMotion !== motionDetected) {
            setMotionDetected(hasMotion)
            setMotionIntensity(Math.floor(Math.random() * 40) + 60) // 60-100%
            logMotionEvent(hasMotion)
          }
        }
      }
    }, 500) // Check every 500ms for real-time updates

    return () => {
      motionSubscription.unsubscribe()
      clearInterval(motionCheckInterval)
    }
  }, [state.motionDetected, state.distance, state.intruderAlert, motionDetected])

  const fetchLatestMotionEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('motion_events')
        .select('*')
        .eq('device_id', 'farm_001')
        .order('timestamp', { ascending: false })
        .limit(1)

      if (!error && data?.[0]) {
        const event = data[0] as MotionEvent
        setLastMotionEvent(event)
        setMotionDetected(event.motion_detected)
        setMotionIntensity(event.confidence_score || 75)
      }
    } catch (error) {
      console.error('Failed to fetch motion events:', error)
    }
  }

  const logMotionEvent = async (detected: boolean, distance?: number, confidence?: number, detectionType?: string) => {
    try {
      const animalTypes = ['chicken', 'butterfly', 'rabbit', 'bird', 'unknown']
      const randomAnimal = detected ? animalTypes[Math.floor(Math.random() * animalTypes.length)] : null

      // Determine sensor correlation
      const pirTriggered = detected // PIR sensor detected motion
      const ultrasonicTriggered = detected && distance !== undefined && distance < 30 // Close distance indicates object
      const confidenceScore = confidence || motionIntensity

      console.log('📝 Logging enhanced motion event:', { 
        detected, 
        distance, 
        pirTriggered, 
        ultrasonicTriggered, 
        confidenceScore,
        detectionType
      })

      await supabase
        .from('motion_events')
        .insert([
          {
            device_id: 'farm_001',
            motion_detected: detected,
            sensor_type: detectionType || (ultrasonicTriggered ? 'combined' : 'PIR'),
            distance_cm: distance || null,
            pir_triggered: pirTriggered,
            ultrasonic_triggered: ultrasonicTriggered,
            animal_type: randomAnimal,
            confidence_score: confidenceScore,
            sensor_data: {
              esp_raw_distance: distance,
              detection_source: 'motion_sensor_card',
              detection_type: detectionType,
              combined_detection: detectionType === 'combined',
              intruder_alert: detected && (detectionType === 'combined' || detectionType === 'ultrasonic'),
              timestamp: new Date().toISOString()
            },
            alarm_triggered: detected && (detectionType === 'combined' || detectionType === 'ultrasonic'), // Trigger alarm for intruder alerts
            timestamp: new Date().toISOString()
          }
        ])
    } catch (error) {
      console.error('Failed to log motion event:', error)
    }
  }

  // Browser-based alert sound system
  const playAlertSound = () => {
    const now = Date.now()
    // Throttle alerts to prevent spam (minimum 3 seconds between alerts)
    if (now - lastAlertSound < 3000) return
    
    try {
      // Create a simple buzzer-like alarm sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Scarecrow-style alternating tones
      oscillator.frequency.setValueAtTime(2500, audioContext.currentTime) // High tone
      oscillator.frequency.setValueAtTime(1500, audioContext.currentTime + 0.2) // Low tone
      oscillator.frequency.setValueAtTime(2000, audioContext.currentTime + 0.4) // Mid tone
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6)
      
      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.6)
      
      setLastAlertSound(now)
      console.log("🔊 UI Alert sound played")
    } catch (error) {
      console.warn("Audio playback failed:", error)
    }
  }

  return (
    <Card className="bg-yellow-100/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-yellow-400 w-1/2 transition-all duration-500">
      {/* Header */}
      <h3 className="text-2xl font-bold text-orange-900 mb-4">Motion Detection System</h3>
      
      {/* Enhanced Alert Status Panel */}
      <div className="mb-4 space-y-2">
        {/* Main Alert Status Banner */}
        <div className={`p-4 rounded-lg border-2 ${
          intruderAlert ? "bg-gradient-to-r from-red-100 to-red-50 border-red-500 animate-pulse" :
          motionDetected ? "bg-gradient-to-r from-blue-100 to-blue-50 border-blue-300" :
          "bg-gradient-to-r from-green-100 to-green-50 border-green-300"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${
                intruderAlert ? "bg-red-600 animate-bounce" :
                motionDetected ? "bg-blue-500 animate-pulse" : "bg-green-500"
              }`} />
              <div>
                <h3 className="font-bold text-gray-800 text-lg">
                  {intruderAlert ? "🚨 INTRUDER ALERT" :
                   motionDetected ? "📍 Motion Detected" : "✅ All Clear"}
                </h3>
                <p className="text-sm text-gray-700 font-medium">{alertMessage}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-800">
                {distance.toFixed(1)}cm
              </p>
              <p className="text-sm text-gray-600">Distance</p>
            </div>
          </div>
        </div>

        {/* PIR Motion Sensor Status */}
        <div className={`flex items-center justify-between p-3 rounded-lg border ${
          motionDetected 
            ? "bg-blue-50 border-blue-300" 
            : "bg-gray-50 border-gray-300"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              motionDetected ? "bg-blue-500 animate-pulse" : "bg-gray-400"
            }`} />
            <div>
              <h4 className="font-semibold text-gray-800 text-sm">PIR Motion</h4>
              <p className="text-xs text-gray-600">
                {motionDetected ? "Motion Detected!" : "No Motion"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-base font-bold text-gray-800">{motionIntensity}%</p>
            <p className="text-xs text-gray-500">Confidence</p>
          </div>
        </div>

        {/* Ultrasonic Distance Sensor Status */}
        <div className={`flex items-center justify-between p-3 rounded-lg border ${
          distance <= 5 ? "bg-red-50 border-red-300" :
          distance <= 15 ? "bg-orange-50 border-orange-300" :
          distance <= 30 ? "bg-yellow-50 border-yellow-300" :
          "bg-gray-50 border-gray-300"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              distance <= 5 ? "bg-red-500 animate-bounce" :
              distance <= 15 ? "bg-orange-500 animate-pulse" :
              distance <= 30 ? "bg-yellow-500" : "bg-gray-400"
            }`} />
            <div>
              <h4 className="font-medium text-gray-700 text-sm">Distance Sensor</h4>
              <p className="text-xs text-gray-500">
                {distance <= 5 ? "BUZZER ZONE! (<5cm)" :
                 distance <= 15 ? "CLOSE APPROACH" :
                 distance <= 30 ? "WARNING ZONE" : "Safe Distance"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-base font-semibold text-gray-700">
              {distance.toFixed(1)}cm
            </p>
            <p className="text-xs text-gray-400">Distance</p>
          </div>
        </div>

        {/* Intruder Alert Status */}
        {intruderAlert && (
          <div className="p-3 rounded-lg border-2 bg-gradient-to-r from-red-100 to-red-50 border-red-500 animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-600 animate-bounce" />
              <h4 className="font-bold text-gray-800 text-sm">
                🚨 INTRUDER DETECTED
              </h4>
            </div>
            <p className="text-xs text-gray-700 ml-5 font-medium">
              ESP32 motion system activated • Buzzer {buzzerActive ? "ACTIVE" : "standby"}
            </p>
          </div>
        )}

        {/* Buzzer Status */}
        {buzzerActive && (
          <div className="p-2 rounded-lg bg-gradient-to-r from-red-50 to-orange-50 border border-red-300 animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" />
              <h4 className="font-medium text-red-800 text-sm">� ALARM SYSTEM ACTIVE</h4>
            </div>
            <p className="text-xs text-red-600 ml-4">ESP32 buzzer engaged • Threat response protocol active</p>
          </div>
        )}
      </div>

      {/* Content layout */}
      <div className="flex gap-6">
        {/* Left side: robot area */}
        <div className="flex-1 bg-white/80 rounded-2xl p-6 flex items-center justify-center">
          <div className="relative w-48 h-48 transition-transform duration-500 ease-in-out">
            <Image
              src={
                intruderAlert
                  ? "SMART FARM/PAGE 8/4x/Asset 111@4x.png" // Intruder alert - buzzer active
                  : motionDetected
                  ? "SMART FARM/PAGE 8/4x/Asset 110@4x.png" // PIR motion only
                  : "SMART FARM/PAGE 8/4x/Asset 175@4x.png"  // All clear state
              }
              alt={
                intruderAlert ? "Intruder Alert - Buzzer Active!" :
                motionDetected ? "PIR Motion Detected" :
                "All Clear - Monitoring"
              }
              fill
              className={`object-contain transition-all duration-300 ${
                intruderAlert ? "scale-125 animate-bounce filter brightness-110" :
                motionDetected ? "scale-105 animate-pulse" : "opacity-90"
              }`}
            />
            
            {/* Detection type indicator overlay */}
            {detectionType !== 'none' && (
              <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold animate-pulse ${
                detectionType === 'combined' ? 'bg-red-500 text-white' :
                detectionType === 'pir' ? 'bg-orange-500 text-white' :
                'bg-yellow-500 text-black'
              }`}>
                {detectionType === 'combined' ? '🚨' :
                 detectionType === 'pir' ? '👁️' : '📏'}
              </div>
            )}
          </div>
        </div>

        {/* Right side: AI status */}
        <div
          className={`flex-1 rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-500 ${
            detectionType === 'combined'
              ? "bg-red-400/90 border-4 border-red-600 animate-pulse shadow-lg shadow-red-500/50"
              : detectionType === 'pir'
              ? "bg-orange-300/80 border-4 border-orange-500"
              : detectionType === 'ultrasonic'
              ? "bg-yellow-300/80 border-4 border-yellow-500"
              : "bg-blue-300/80 border-4 border-blue-500"
          }`}
        >
          <p
            className={`text-4xl font-black mb-2 ${
              detectionType === 'combined' ? "text-red-900" :
              detectionType === 'pir' ? "text-orange-900" :
              detectionType === 'ultrasonic' ? "text-yellow-900" :
              "text-blue-900"
            }`}
          >
            {detectionType === 'combined' ? "⚠️ ALERT!" :
             detectionType === 'pir' ? "MOTION" :
             detectionType === 'ultrasonic' ? "OBJECT" :
             "SCANNING"}
          </p>

          {/* Progress bar */}
          <div className="w-full bg-white/60 rounded-full h-3 mb-4 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-700 ${
                motionDetected
                  ? "bg-gradient-to-r from-red-400 to-red-600 animate-pulse"
                  : "bg-gradient-to-r from-blue-400 to-blue-600"
              }`}
              style={{ width: `${motionIntensity}%` }}
            />
          </div>

          {/* Animal Type Display */}
          {motionDetected && lastMotionEvent?.animal_type && (
            <div className="mb-2">
              <p className="text-sm font-semibold text-red-800 capitalize">
                {lastMotionEvent.animal_type} Detected
              </p>
              <p className="text-xs text-red-700">
                Confidence: {lastMotionEvent.confidence_score}%
              </p>
            </div>
          )}

          <p
            className={`text-lg font-semibold ${
              detectionType === 'combined' ? "text-red-800" :
              detectionType === 'pir' ? "text-orange-800" :
              detectionType === 'ultrasonic' ? "text-yellow-800" :
              "text-blue-800"
            }`}
          >
            {detectionType === 'combined' ? 
              `🚨 DUAL SENSOR ALERT! (${motionIntensity}%)` :
             detectionType === 'pir' ?
              `PIR Motion Detected (${motionIntensity}%)` :
             detectionType === 'ultrasonic' ?
              `Object Nearby (${motionIntensity}%)` :
              "AI Monitoring Active"
            }
          </p>

          {/* Last Detection Time */}
          {lastMotionEvent && (
            <p className="text-xs text-gray-600 mt-2">
              Last: {new Date(lastMotionEvent.timestamp).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
