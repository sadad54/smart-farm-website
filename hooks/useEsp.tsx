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

  // Cloud-based command sending function with fast response
  async function sendCommand(value: string, location?: string, metadata?: any) {
    console.log(`🎛️ Sending cloud command: ${value}`)
    
    // Map command to action type
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
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout
      
      // Queue command for ESP32 to pick up
      const response = await fetch('/api/device-commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: 'farm_001',
          action: value.toUpperCase(),
          duration_ms: 3000,
          location: location || 'unknown'
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Command failed: HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log(`✅ Command queued successfully: ${result.command_id}`)
      
      // Immediately update state for visual feedback (optimistic update)
      const actionType = getActionType(value)
      console.log(`🔄 Providing immediate visual feedback for ${actionType}`)
      
      return { ok: true, command_id: result.command_id }
      
    } catch (error: any) {
      console.error('❌ Cloud command failed:', error.message)
      return { ok: false, error: error.message }
    }
  }

  return {
    state,
    connected,
    sendCommand
  }
}