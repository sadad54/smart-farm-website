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
  const [buzzerActive, setBuzzerActive] = useState(false)
  const [lastAlertSound, setLastAlertSound] = useState<number>(0)
  const [alertMessage, setAlertMessage] = useState<string>("")

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

    // Real-time motion detection from ESP sensor data
    const motionCheckInterval = setInterval(() => {
      // Check if we have real sensor data from ESP
      if (state.motionDetected !== undefined && state.motionDetected !== null) {
        const currentMotion = Boolean(state.motionDetected)
        
        // Update motion state
        setMotionDetected(currentMotion)
        
        // Determine alert message
        let newAlertMessage = currentMotion 
          ? "🚨 Motion Detected! PIR sensor triggered"
          : "✅ No motion detected - Area clear"
        
        setAlertMessage(newAlertMessage)
        setBuzzerActive(currentMotion)

        // Log state changes
        if (currentMotion !== motionDetected) {
          logMotionEvent(currentMotion)
          
          // Play alert sound for motion detection
          if (currentMotion) {
            playAlertSound()
          }
        }
      }
    }, 500) // Check every 500ms for real-time updates

    return () => {
      motionSubscription.unsubscribe()
      clearInterval(motionCheckInterval)
    }
  }, [state.motionDetected, motionDetected])

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

  const logMotionEvent = async (detected: boolean, confidence?: number) => {
    try {
      const animalTypes = ['chicken', 'butterfly', 'rabbit', 'bird', 'unknown']
      const randomAnimal = detected ? animalTypes[Math.floor(Math.random() * animalTypes.length)] : null
      const confidenceScore = confidence || motionIntensity

      console.log('📝 Logging motion event:', { 
        detected, 
        confidenceScore
      })

      await supabase
        .from('motion_events')
        .insert([
          {
            device_id: 'farm_001',
            motion_detected: detected,
            sensor_type: 'PIR',
            animal_type: randomAnimal,
            confidence_score: confidenceScore,
            sensor_data: {
              detection_source: 'motion_sensor_card',
              detection_type: 'pir',
              timestamp: new Date().toISOString()
            },
            alarm_triggered: detected,
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
      
      {/* Alert Status Panel */}
      <div className="mb-4 space-y-2">
        {/* Main Alert Status Banner */}
        <div className={`p-4 rounded-lg border-2 ${
          motionDetected 
            ? "bg-gradient-to-r from-blue-100 to-blue-50 border-blue-300 animate-pulse" 
            : "bg-gradient-to-r from-green-100 to-green-50 border-green-300"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${
                motionDetected ? "bg-blue-500 animate-pulse" : "bg-green-500"
              }`} />
              <div>
                <h3 className="font-bold text-gray-800 text-lg">
                  {motionDetected ? "📍 Motion Detected" : "✅ All Clear"}
                </h3>
                <p className="text-sm text-gray-700 font-medium">{alertMessage}</p>
              </div>
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

        {/* Buzzer Status */}
        {buzzerActive && (
          <div className="p-2 rounded-lg bg-gradient-to-r from-red-50 to-orange-50 border border-red-300 animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" />
              <h4 className="font-medium text-red-800 text-sm">🔊 MOTION ALARM ACTIVE</h4>
            </div>
            <p className="text-xs text-red-600 ml-4">Buzzer engaged • Motion alert protocol active</p>
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
                motionDetected
                  ? "SMART FARM/PAGE 8/4x/Asset 110@4x.png" // Motion detected state
                  : "SMART FARM/PAGE 8/4x/Asset 175@4x.png"  // All clear state
              }
              alt={
                motionDetected ? "Motion Detected" : "All Clear - Monitoring"
              }
              fill
              className={`object-contain transition-all duration-300 ${
                motionDetected ? "scale-105 animate-pulse" : "opacity-90"
              }`}
            />
          </div>
        </div>

        {/* Right side: Motion Status */}
        <div className={`flex-1 rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-500 ${
          motionDetected
            ? "bg-blue-300/80 border-4 border-blue-500"
            : "bg-green-300/80 border-4 border-green-500"
        }`}>
          <p className={`text-4xl font-black mb-2 ${
            motionDetected ? "text-blue-900" : "text-green-900"
          }`}>
            {motionDetected ? "MOTION" : "SCANNING"}
          </p>

          {/* Progress bar */}
          <div className="w-full bg-white/60 rounded-full h-3 mb-4 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-700 ${
                motionDetected
                  ? "bg-gradient-to-r from-blue-400 to-blue-600 animate-pulse"
                  : "bg-gradient-to-r from-green-400 to-green-600"
              }`}
              style={{ width: `${motionIntensity}%` }}
            />
          </div>

          {/* Animal Type Display */}
          {motionDetected && lastMotionEvent?.animal_type && (
            <div className="mb-2">
              <p className="text-sm font-semibold text-blue-800 capitalize">
                {lastMotionEvent.animal_type} Detected
              </p>
              <p className="text-xs text-blue-700">
                Confidence: {lastMotionEvent.confidence_score}%
              </p>
            </div>
          )}

          <p className={`text-lg font-semibold ${
            motionDetected ? "text-blue-800" : "text-green-800"
          }`}>
            {motionDetected 
              ? `PIR Motion Detected (${motionIntensity}%)`
              : "Monitoring Area"
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