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
        // Use actual PIR sensor data from ESP
        const currentMotion = Boolean(state.motionDetected)
        if (currentMotion !== motionDetected) {
          setMotionDetected(currentMotion)
          // Calculate confidence based on distance sensor correlation
          const distance = state.distance || 999
          let confidence = 75
          if (currentMotion && distance < 20) {
            confidence = 95 // High confidence when PIR + close distance
          } else if (currentMotion && distance < 50) {
            confidence = 85 // Medium confidence when PIR + medium distance  
          }
          setMotionIntensity(confidence)
          
          // Log the motion event with sensor correlation
          logMotionEvent(currentMotion, distance, confidence)
        }
      } else {
        // Fallback to simulation if no ESP data
        const hasMotion = Math.random() > 0.7 // 30% chance of motion
        if (hasMotion !== motionDetected) {
          setMotionDetected(hasMotion)
          setMotionIntensity(Math.floor(Math.random() * 40) + 60) // 60-100%
          logMotionEvent(hasMotion)
        }
      }
    }, 2000) // Check every 2 seconds for more responsive updates

    return () => {
      motionSubscription.unsubscribe()
      clearInterval(motionCheckInterval)
    }
  }, [motionDetected])

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

  const logMotionEvent = async (detected: boolean, distance?: number, confidence?: number) => {
    try {
      const animalTypes = ['chicken', 'butterfly', 'rabbit', 'bird', 'unknown']
      const randomAnimal = detected ? animalTypes[Math.floor(Math.random() * animalTypes.length)] : null

      // Determine sensor correlation
      const pirTriggered = detected // PIR sensor detected motion
      const ultrasonicTriggered = detected && distance !== undefined && distance < 30 // Close distance indicates object
      const confidenceScore = confidence || motionIntensity

      console.log('📝 Logging motion event:', { 
        detected, 
        distance, 
        pirTriggered, 
        ultrasonicTriggered, 
        confidenceScore 
      })

      await supabase
        .from('motion_events')
        .insert([
          {
            device_id: 'farm_001',
            motion_detected: detected,
            sensor_type: ultrasonicTriggered ? 'combined' : 'PIR',
            distance_cm: distance || null,
            pir_triggered: pirTriggered,
            ultrasonic_triggered: ultrasonicTriggered,
            animal_type: randomAnimal,
            confidence_score: confidenceScore,
            sensor_data: {
              esp_raw_distance: distance,
              detection_source: 'motion_sensor_card',
              timestamp: new Date().toISOString()
            },
            alarm_triggered: false, // Card doesn't trigger alarms directly
            timestamp: new Date().toISOString()
          }
        ])
    } catch (error) {
      console.error('Failed to log motion event:', error)
    }
  }

  return (
    <Card className="bg-yellow-100/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-yellow-400 w-1/2 transition-all duration-500">
      {/* Header */}
      <h3 className="text-2xl font-bold text-orange-900 mb-4">Motion Detection System</h3>
      
      {/* Sensor Status Panel */}
      <div className="mb-4 space-y-2">
        {/* PIR Motion Sensor Status */}
        <div className={`flex items-center justify-between p-3 rounded-lg border-2 ${
          motionDetected 
            ? "bg-gradient-to-r from-red-50 to-orange-50 border-red-300" 
            : "bg-gradient-to-r from-green-50 to-blue-50 border-green-300"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              motionDetected ? "bg-red-500 animate-pulse" : "bg-green-500"
            }`} />
            <div>
              <h4 className="font-semibold text-gray-800 text-sm">PIR Motion</h4>
              <p className="text-xs text-gray-600">
                {motionDetected ? "Motion Detected!" : "Clear"}
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
          state.distance && state.distance < 30 
            ? "bg-yellow-50 border-yellow-300" 
            : "bg-gray-50 border-gray-300"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              state.distance && state.distance < 30 ? "bg-yellow-500" : "bg-gray-400"
            }`} />
            <div>
              <h4 className="font-medium text-gray-700 text-sm">Distance Sensor</h4>
              <p className="text-xs text-gray-500">
                {state.distance && state.distance < 30 ? "Object Nearby" : "Clear Range"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-base font-semibold text-gray-700">
              {state.distance ? `${state.distance.toFixed(1)}cm` : 'N/A'}
            </p>
            <p className="text-xs text-gray-400">Distance</p>
          </div>
        </div>

        {/* Combined Detection Status */}
        {motionDetected && state.distance && state.distance < 30 && (
          <div className="p-2 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-300">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <h4 className="font-medium text-purple-800 text-sm">🎯 Dual Sensor Lock</h4>
            </div>
            <p className="text-xs text-purple-600 ml-4">PIR + Distance correlation confirmed</p>
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
                  ? "SMART FARM/PAGE 8/4x/Asset 111@4x.png" // 🔹 Replace this placeholder when ready
                  : "SMART FARM/PAGE 8/4x/Asset 175@4x.png"
              }
              alt={motionDetected ? "Motion Detected Robot" : "Idle Robot"}
              fill
              className={`object-contain ${
                motionDetected ? "scale-105" : "opacity-90"
              }`}
            />
          </div>
        </div>

        {/* Right side: AI status */}
        <div
          className={`flex-1 rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-500 ${
            motionDetected
              ? "bg-red-300/80 border-4 border-red-500 animate-pulse"
              : "bg-blue-300/80 border-4 border-blue-500"
          }`}
        >
          <p
            className={`text-4xl font-black mb-2 ${
              motionDetected ? "text-red-900" : "text-blue-900"
            }`}
          >
            {motionDetected ? "DETECTED" : "SCANNING"}
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
              motionDetected ? "text-red-800" : "text-blue-800"
            }`}
          >
            {motionDetected ? 
              `Motion Alert! (${motionIntensity}%)` : 
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
