"use client"

import { useEffect, useRef, useState } from "react"

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

  useEffect(() => {
    let mounted = true

    // Fast polling function for live MQTT sensor data
    async function pollMqttData() {
      if (!mounted) return

      try {
        const response = await fetch('/api/mqtt-sensor-data', {
          cache: "no-store"
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const result = await response.json()
        
        if (result.data) {
          console.log('📊 Live MQTT sensor data received:', result.data)
          setState(result.data)
          setConnected(result.connected)
        } else {
          console.log('⚠️ No MQTT sensor data available')
          setConnected(result.connected || false)
        }
        
      } catch (error) {
        console.error('❌ Error fetching MQTT sensor data:', error)
        setConnected(false)
      }
    }

    // Initial poll immediately  
    pollMqttData()
    
    // Set up fast polling for real-time updates (every 2 seconds)
    const pollInterval = setInterval(pollMqttData, 2000)

    return () => {
      mounted = false
      clearInterval(pollInterval)
    }
  }, [])

  // MQTT-ONLY command sending function
  async function sendCommand(value: string, location?: string, metadata?: any) {
    console.log(`🎛️ Sending MQTT-ONLY command: ${value}`)
    
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

    try {
      // Use AbortController for faster timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout for MQTT
      
      // Send command directly via MQTT (no HTTP fallback)
      const response = await fetch('/api/mqtt-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: value.toUpperCase(),
          duration_ms: 3000,
          device_id: 'farm_001'
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`MQTT command failed: ${errorData.error || 'Unknown error'}`)
      }

      const result = await response.json()
      console.log(`✅ MQTT command sent successfully: ${result.command_id}`)
      
      // Immediately update state for visual feedback (optimistic update)
      const actionType = getActionType(value)
      console.log(`🔄 MQTT command confirmed for ${actionType}`)
      
      return { ok: true, command_id: result.command_id, protocol: 'mqtt' }
      
    } catch (error: any) {
      console.error('❌ MQTT command failed:', error.message)
      return { ok: false, error: error.message, protocol: 'mqtt' }
    }
  }

  return {
    state,
    connected,
    sendCommand
  }
}