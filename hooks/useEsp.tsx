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

const DEFAULT_POLL_INTERVAL = 3000 // Increased to 3 seconds for DHT22 stability

export function useEsp(pollInterval = DEFAULT_POLL_INTERVAL) {
  const [state, setState] = useState<EspState>({})
  const [connected, setConnected] = useState(false)
  const baseRef = useRef<string | null>(null)
  const pollRef = useRef<number | null>(null)
  const lastLogRef = useRef<number>(0)

  // Throttled logging to Supabase (max once per 10 seconds)
  const logSensorDataToDatabase = async (sensorData: EspState) => {
    const now = Date.now()
    if (now - lastLogRef.current < 10000) return // Throttle to 10 seconds
    lastLogRef.current = now

    try {
      await fetch('/api/sensor-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: 'farm_001',
          temperature: sensorData.temperature,
          humidity: sensorData.humidity,
          soil_moisture: sensorData.soilHumidity,
          water_level: sensorData.waterLevel,
          light_level: sensorData.light,
          steam: sensorData.steam,
          distance: sensorData.distance
        })
      })
    } catch (error) {
      console.error('Failed to log sensor data:', error)
    }
  }

  useEffect(() => {
  // Prefer proxy endpoints when available
  baseRef.current = process.env.NEXT_PUBLIC_ESP_BASE_URL || null

    let mounted = true

    // Parser for the ESP /dht HTML-ish response
    function parseDhtText(text: string): EspState {
      const result: EspState = { raw: text }

      // crude regexes to extract numbers after labels used in ESP code
      const tempMatch = text.match(/Temperature:\s*<\/b>\s*<b>([0-9.\-]+)/i)
      const humMatch = text.match(/Humidity:\s*<\/b>\s*<b>([0-9.\-]+)/i)
      const waterMatch = text.match(/WaterLevel:\s*<\/b>\s*<b>([0-9.\-]+)/i)
      const steamMatch = text.match(/Steam:\s*<\/b>\s*<b>([0-9.\-]+)/i)
      const lightMatch = text.match(/Light:\s*<\/b>\s*<b>([0-9.\-]+)/i)
      const soilMatch = text.match(/SoilHumidity:\s*<\/b>\s*<b>([0-9.\-]+)/i)
      const distanceMatch = text.match(/Distance:\s*<\/b>\s*<b>([0-9.\-]+)/i)

      if (tempMatch) result.temperature = Number(tempMatch[1])
      if (humMatch) result.humidity = Number(humMatch[1])
      if (waterMatch) result.waterLevel = Number(waterMatch[1])
      if (steamMatch) result.steam = Number(steamMatch[1])
      if (lightMatch) result.light = Number(lightMatch[1])
      if (soilMatch) result.soilHumidity = Number(soilMatch[1])
      if (distanceMatch) result.distance = Number(distanceMatch[1])

      return result
    }

    // polling function
    async function pollOnce() {
      if (!mounted) return

      const base = baseRef.current
      if (!base) {
        // mock data mode
        setConnected(true)
        setState((s) => ({
          temperature: ((s.temperature ?? 21) as number) + (Math.random() - 0.5) * 0.2,
          humidity: ((s.humidity ?? 60) as number) + (Math.random() - 0.5) * 1,
          waterLevel: ((s.waterLevel ?? 61) as number),
          light: ((s.light ?? 850) as number) + Math.round((Math.random() - 0.5) * 10),
          soilHumidity: ((s.soilHumidity ?? 40) as number) + Math.round((Math.random() - 0.5) * 2),
          raw: "mock"
        }))
        return
      }

      try {
        // Try proxy first (with better error handling)
        let res: Response;
        let text: string;
        
        try {
          // Create AbortController for timeout compatibility
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second timeout for proxy
          
          res = await fetch(`/api/esp-dht`, { 
            cache: "no-store",
            signal: controller.signal
          })
          
          clearTimeout(timeoutId);
          text = await res.text()
          
          // Check if response indicates fallback data
          const isFallback = res.headers.get('X-Fallback-Data') === 'true'
          if (isFallback) {
            console.log('📡 Using fallback sensor data due to ESP32 connectivity issues')
            setConnected(false) // Mark as disconnected when using fallback
          } else {
            setConnected(true) // Connected successfully
          }
        } catch (proxyError) {
          console.log('📡 Proxy failed, trying direct ESP32 connection...')
          // Fallback to direct device URL with timeout
          const directController = new AbortController();
          const directTimeoutId = setTimeout(() => directController.abort(), 4000); // 4 second timeout for direct
          
          try {
            res = await fetch(`${base.replace(/\/$/, "")}/dht`, { 
              cache: "no-store",
              signal: directController.signal
            })
            clearTimeout(directTimeoutId);
            
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            text = await res.text()
            setConnected(true)
          } catch (directError) {
            clearTimeout(directTimeoutId);
            throw directError;
          }
        }
        
        const parsed = parseDhtText(text)
        
        // Only update state if there are meaningful changes to prevent infinite loops
        setState(prevState => {
          // Check if any sensor values have actually changed (with tolerance for -999 values)
          const hasChanged = 
            (prevState.temperature !== parsed.temperature && parsed.temperature !== -999) ||
            (prevState.humidity !== parsed.humidity && parsed.humidity !== -999) ||
            prevState.waterLevel !== parsed.waterLevel ||
            prevState.steam !== parsed.steam ||
            prevState.light !== parsed.light ||
            prevState.soilHumidity !== parsed.soilHumidity ||
            prevState.distance !== parsed.distance ||
            prevState.raw !== parsed.raw
          
          return hasChanged ? parsed : prevState
        })
        
        // Only log sensor data if we have valid readings (not -999 values)
        if (parsed.temperature !== -999 && parsed.humidity !== -999) {
          logSensorDataToDatabase(parsed)
        }
        
      } catch (err) {
        console.error('📡 ESP32 connection completely failed:', err)
        // connection error - mark disconnected but keep last known values
        setConnected(false)
        
        // Optional: Reduce polling frequency when disconnected to avoid spam
        // This could be implemented with a dynamic interval adjustment
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

  async function sendCommand(value: string, location?: string, metadata?: any) {
    const base = process.env.NEXT_PUBLIC_ESP_BASE_URL || null
    
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

    // Log action to database
    const logAction = async () => {
      try {
        await fetch('/api/device-actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id: 'farm_001',
            action_type: getActionType(value),
            command: value.toUpperCase(),
            location: location || 'unknown',
            metadata: metadata || {}
          })
        })
      } catch (error) {
        console.error('Failed to log action:', error)
      }
    }

    if (!base) {
      // mock ack
      console.log("[useEsp] mock sendCommand", value)
      await logAction()
      return { ok: true }
    }

    try {
      // Try proxy first, fall back to direct
      let res = await fetch(`/api/esp-set?value=${encodeURIComponent(value)}`)
      if (!res.ok) {
        res = await fetch(`${base.replace(/\/$/, "")}/set?value=${encodeURIComponent(value)}`)
      }
      
      // Log successful action
      if (res.ok) {
        await logAction()
      }
      
      return { ok: res.ok, status: res.status }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }

  return { state, connected, sendCommand }
}

export default useEsp
