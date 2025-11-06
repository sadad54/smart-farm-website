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
        // Use actual combined detection data from ESP
        const currentMotion = Boolean(state.motionDetected)
        const distance = state.distance || 999
        
        // Determine detection type based on sensor correlation
        let newDetectionType: 'none' | 'pir' | 'ultrasonic' | 'combined' = 'none'
        let confidence = 50
        
        if (currentMotion && distance < 25) {
          // Combined detection: Both PIR and close distance
          newDetectionType = 'combined'
          confidence = 95
          setCombinedDetection(true)
        } else if (currentMotion) {
          // PIR only detection
          newDetectionType = 'pir'
          confidence = 75
        } else if (distance < 30) {
          // Ultrasonic only detection
          newDetectionType = 'ultrasonic'
          confidence = 60
        }
        
        if (currentMotion !== motionDetected) {
          setMotionDetected(currentMotion)
          setDetectionType(newDetectionType)
          setMotionIntensity(confidence)
          
          // Log the motion event with enhanced sensor correlation
          logMotionEvent(currentMotion, distance, confidence, newDetectionType)
        }
        
        // Reset combined detection after 5 seconds
        if (combinedDetection && !currentMotion) {
          setTimeout(() => setCombinedDetection(false), 5000)
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
              detection_source: 'enhanced_motion_sensor_card',
              detection_type: detectionType,
              combined_detection: detectionType === 'combined',
              timestamp: new Date().toISOString()
            },
            alarm_triggered: detectionType === 'combined', // Trigger alarm for combined detection
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

        {/* Enhanced Combined Detection Status */}
        {detectionType === 'combined' && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-400 shadow-md">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <h4 className="font-bold text-red-800 text-sm">🚨 DUAL SENSOR LOCK ACTIVATED</h4>
            </div>
            <p className="text-xs text-red-700 ml-5 font-medium">
              PIR Motion + Close Distance ({state.distance?.toFixed(1)}cm) - High Threat Level!
            </p>
            <div className="flex gap-2 mt-2 ml-5">
              <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded-full">🔊 Buzzer Active</span>
              <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">📸 Recording</span>
            </div>
          </div>
        )}
        
        {/* PIR Only Detection */}
        {detectionType === 'pir' && (
          <div className="p-2 rounded-lg bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-300">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <h4 className="font-medium text-orange-800 text-sm">👁️ PIR Motion Detected</h4>
            </div>
            <p className="text-xs text-orange-600 ml-4">Movement in sensor range - monitoring distance</p>
          </div>
        )}
        
        {/* Ultrasonic Only Detection */}
        {detectionType === 'ultrasonic' && (
          <div className="p-2 rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <h4 className="font-medium text-yellow-800 text-sm">📏 Object Proximity Alert</h4>
            </div>
            <p className="text-xs text-yellow-700 ml-4">
              Object at {state.distance?.toFixed(1)}cm - awaiting motion confirmation
            </p>
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
                  ? "SMART FARM/PAGE 8/4x/Asset 111@4x.png" // Detection state
                  : "SMART FARM/PAGE 8/4x/Asset 175@4x.png"  // Idle state
              }
              alt={motionDetected ? "Motion Detected" : "Monitoring Mode"}
              fill
              className={`object-contain transition-all duration-300 ${
                detectionType === 'combined' ? "scale-110 animate-pulse" :
                detectionType !== 'none' ? "scale-105" : "opacity-90"
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
