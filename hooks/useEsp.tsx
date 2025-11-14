"use client"

import { useState, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'

export type EspState = {
  temperature?: number | null
  humidity?: number | null
  waterLevel?: number | null
  steam?: number | null
  light?: number | null
  soilHumidity?: number | null
  distance?: number | null
  motionDetected?: boolean | null
  intruderAlert?: boolean | null
  alertLevel?: number | null
  raw?: string
}

const DEFAULT_POLL_INTERVAL = 2000 // Faster polling for responsive UI

export function useEsp(pollInterval = DEFAULT_POLL_INTERVAL) {
  const [state, setState] = useState<EspState>({})
  const [connected, setConnected] = useState(false)
  const pollRef = useRef<number | null>(null)
  const lastLogRef = useRef<number>(0)
  const previousStateRef = useRef<EspState>({})

  useEffect(() => {
    let mounted = true

    // Fast polling function for live MQTT sensor data
    async function pollMqttData() {
      if (!mounted) return

      try {
        const abortController = new AbortController()
        const timeoutId = setTimeout(() => abortController.abort(), 5000) // Increased to 5s timeout

        const response = await fetch('/api/mqtt-sensor-data', {
          cache: "no-store",
          signal: abortController.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const result = await response.json()
        
        if (result.data) {
          // Only update state if data has actually changed
          const hasChanged = JSON.stringify(previousStateRef.current) !== JSON.stringify(result.data)
          
          if (hasChanged) {
            console.log('📊 Live MQTT sensor data received:', result.data)
            console.log('🔄 Distance value:', result.data.distance, 'Motion:', result.data.motionDetected)
            
            previousStateRef.current = result.data
            
            // Batch state updates
            flushSync(() => {
              setState(result.data)
              setConnected(result.connected)
            })
            console.log('✅ State updated in useEsp hook')
          } else {
            // Just update connected status if data hasn't changed
            if (connected !== result.connected) {
              setConnected(result.connected)
            }
          }
        } else {
          console.log('⚠️ No MQTT sensor data available')
          setConnected(result.connected || false)
        }
        
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('❌ Error fetching MQTT sensor data:', error)
        }
        setConnected(false)
      }
    }

    // Initial poll immediately  
    pollMqttData()
    
    // Set up fast polling for real-time updates (every 1 second for responsive UI)
    const pollInterval = setInterval(pollMqttData, 1000)

    return () => {
      mounted = false
      clearInterval(pollInterval)
    }
  }, [])

  // MQTT-ONLY command sending function
  async function sendCommand(value: string, location?: string, metadata?: any) {
    console.log(`🎛️ MQTT Command Request - Input: "${value}" (type: ${typeof value})`)
    
    // Map command to action type for logging
    const getActionType = (cmd: string) => {
      switch(cmd.toUpperCase()) {
        case 'A': return 'light'
        case 'B': return 'fan'
        case 'C': return 'feed'
        case 'D': return 'water'
        case 'E': return 'buzzer'
        case 'P': return 'pir_alarm'
        default: return 'unknown'
      }
    }

    const actionType = getActionType(value)
    console.log(`📋 Command mapping: "${value}" -> "${actionType}"`)

    try {
      // Use AbortController for faster timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // Increased to 10 seconds for debugging
      
      console.log('📤 Sending HTTP request to /api/mqtt-command...')
      
      const requestBody = {
        action: value.toUpperCase(),
        duration_ms: 3000,
        device_id: 'farm_001'
      }
      console.log('📦 Request body:', JSON.stringify(requestBody, null, 2))
      
      // Send command directly via MQTT (no HTTP fallback)
      const response = await fetch('/api/mqtt-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      
      console.log(`📨 HTTP Response: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        const errorData = await response.json()
        console.log('❌ Error response data:', errorData)
        throw new Error(`MQTT command failed: ${errorData.error || 'Unknown error'}`)
      }

      const result = await response.json()
      console.log(`✅ MQTT API Response:`, result)
      console.log(`🆔 Command ID: ${result.command_id}`)
      console.log(`📡 Protocol: ${result.protocol}`)
      console.log(`🔗 MQTT Connected: ${result.mqtt_connected}`)
      
      // Immediately update state for visual feedback (optimistic update)
      console.log(`🔄 Command "${actionType}" sent via ${result.protocol} - awaiting ESP32 response`)
      
      return { ok: true, command_id: result.command_id, protocol: result.protocol, result: result }
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('⏰ MQTT command timeout - request took longer than 10 seconds')
        return { ok: false, error: 'Command timeout', protocol: 'mqtt' }
      } else {
        console.error('❌ MQTT command failed:', error.message)
        return { ok: false, error: error.message, protocol: 'mqtt' }
      }
    }
  }

  return {
    state,
    connected,
    sendCommand
  }
}