import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aaqieimnajzklfpzyqll.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhcWllaW1uYWp6a2xmcHp5cWxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMDk0ODgsImV4cCI6MjA3NjY4NTQ4OH0._NkSBisVj5FxsxsvuBd7wpvHS9TJk7M5JFnjPxbS0xA'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhcWllaW1uYWp6a2xmcHp5cWxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTEwOTQ4OCwiZXhwIjoyMDc2Njg1NDg4fQ.OLK1fQPXacsHKYQVwd0Di0PEM8YyrDS1EErMBWgWTiM'

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