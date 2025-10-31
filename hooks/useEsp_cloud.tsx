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
  raw?: string
}

const DEFAULT_POLL_INTERVAL = 5000 // Increased for cloud polling

export function useEsp(pollInterval = DEFAULT_POLL_INTERVAL) {
  const [state, setState] = useState<EspState>({})
  const [connected, setConnected] = useState(false)
  const pollRef = useRef<number | null>(null)
  const lastLogRef = useRef<number>(0)

  useEffect(() => {
    let mounted = true

    // Cloud-based polling function - gets data from Supabase database
    async function pollOnce() {
      if (!mounted) return

      try {
        // Get latest sensor data from database instead of ESP32 directly
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout
        
        const res = await fetch('/api/sensor-readings/latest', {
          cache: "no-store",
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
        
        const data = await res.json()
        
        if (data.readings && data.readings.length > 0) {
          // Convert database readings to ESP state format
          const latestReadings = data.readings.reduce((acc: any, reading: any) => {
            acc[reading.metric] = reading.value
            return acc
          }, {})
          
          // Map to your existing state format
          const newState: EspState = {
            temperature: latestReadings.temperature || null,
            humidity: latestReadings.humidity || null,
            soilHumidity: latestReadings.soil_moisture || null,
            waterLevel: latestReadings.water_level || null,
            light: latestReadings.light_level || null,
            steam: latestReadings.steam || null,
            distance: latestReadings.distance || null,
            raw: "cloud-database"
          }
          
          setState(newState)
          setConnected(true)
          
          console.log('📊 Cloud sensor data updated:', newState)
          
        } else {
          console.log('⚠️ No sensor readings found in database - using fallback')
          setConnected(false)
          
          // Use mock data as fallback if no database readings
          setState((s) => ({
            temperature: ((s.temperature ?? 21) as number) + (Math.random() - 0.5) * 0.2,
            humidity: ((s.humidity ?? 60) as number) + (Math.random() - 0.5) * 1,
            waterLevel: ((s.waterLevel ?? 61) as number),
            light: ((s.light ?? 43) as number) + Math.round((Math.random() - 0.5) * 2),
            soilHumidity: ((s.soilHumidity ?? 40) as number) + Math.round((Math.random() - 0.5) * 2),
            distance: ((s.distance ?? 12.8) as number) + Math.round((Math.random() - 0.5) * 0.5),
            steam: ((s.steam ?? 0) as number),
            raw: "fallback-mock"
          }))
        }
        
      } catch (error: any) {
        console.log('📡 Cloud polling error, using fallback:', error.message)
        setConnected(false)
        
        // Use mock data if cloud fails
        setState((s) => ({
          temperature: ((s.temperature ?? 21) as number) + (Math.random() - 0.5) * 0.2,
          humidity: ((s.humidity ?? 60) as number) + (Math.random() - 0.5) * 1,
          waterLevel: ((s.waterLevel ?? 61) as number),
          light: ((s.light ?? 43) as number) + Math.round((Math.random() - 0.5) * 2),
          soilHumidity: ((s.soilHumidity ?? 40) as number) + Math.round((Math.random() - 0.5) * 2),
          distance: ((s.distance ?? 12.8) as number) + Math.round((Math.random() - 0.5) * 0.5),
          steam: ((s.steam ?? 0) as number),
          raw: "offline-fallback"
        }))
      }
    }

    // initial poll immediately
    pollOnce()
    // set interval
    const id = window.setInterval(pollOnce, pollInterval)
    pollRef.current = id

    return () => {
      mounted = false
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [pollInterval])

  // Cloud-based command sending function
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
        default: return 'unknown'
      }
    }

    try {
      // Queue command for ESP32 to pick up
      const response = await fetch('/api/device-commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: 'farm_001',
          action: value.toUpperCase(),
          duration_ms: 3000,
          location: location || 'unknown'
        })
      })

      if (!response.ok) {
        throw new Error(`Command failed: HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log(`✅ Command queued successfully: ${result.command_id}`)
      
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