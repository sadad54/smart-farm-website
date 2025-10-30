import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client for dashboard (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Admin client for API routes (uses service role key)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

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