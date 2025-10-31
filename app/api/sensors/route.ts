import { supabaseAdmin } from '@/lib/supabase'

// Database types
export type SensorReading = {
  id?: number
  device_id: string
  metric: string
  value: number
  timestamp?: string
}

export type Command = {
  id?: number
  device_id: string
  command: {
    action: string
    duration_ms?: number
  }
  status: 'pending' | 'ack' | 'error'
  created_at?: string
  executed_at?: string
}

export type DeviceStatus = {
  device_id: string
  is_online: boolean
  last_seen: string
  firmware_version?: string
}

// API Route: POST /api/sensors
// Receives sensor data from ESP32
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { device_id, readings } = body

    if (!device_id || !readings || !Array.isArray(readings)) {
      return Response.json(
        { error: 'Invalid payload' },
        { status: 400 }
      )
    }

    // Insert sensor readings
    const sensorData = readings.map((r: any) => ({
      device_id,
      metric: r.metric,
      value: r.value,
      timestamp: new Date().toISOString()
    }))

    const { error: sensorError } = await supabaseAdmin
      .from('sensor_readings')
      .insert(sensorData)

    if (sensorError) throw sensorError

    // Update device status
    const { error: statusError } = await supabaseAdmin
      .from('device_status')
      .upsert({
        device_id,
        is_online: true,
        last_seen: new Date().toISOString()
      })

    if (statusError) throw statusError

    return Response.json({ success: true })
  } catch (error) {
    console.error('Sensor API error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}