"use client"

import { useEffect, useRef, useState } from "react"

export type EspState = {
  temperature?: number | null
  humidity?: number | null
  waterLevel?: number | null
  steam?: number | null
  light?: number | null
  soilHumidity?: number | null
  raw?: string
}

const DEFAULT_POLL_INTERVAL = 1000

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
          steam: sensorData.steam
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

      if (tempMatch) result.temperature = Number(tempMatch[1])
      if (humMatch) result.humidity = Number(humMatch[1])
      if (waterMatch) result.waterLevel = Number(waterMatch[1])
      if (steamMatch) result.steam = Number(steamMatch[1])
      if (lightMatch) result.light = Number(lightMatch[1])
      if (soilMatch) result.soilHumidity = Number(soilMatch[1])

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
        // Try proxy first, then fall back to direct device URL
        let res = await fetch(`/api/esp-dht`, { cache: "no-store" })
        if (!res.ok) {
          res = await fetch(`${base.replace(/\/$/, "")}/dht`, { cache: "no-store" })
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()
        const parsed = parseDhtText(text)
        setState(parsed)
        setConnected(true)
        
        // Log sensor data to Supabase (throttled to avoid excessive API calls)
        logSensorDataToDatabase(parsed)
      } catch (err) {
        // connection error - mark disconnected
        setConnected(false)
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
