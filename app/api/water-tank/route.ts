import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import smartFarmMQTT from '@/lib/mqtt-client'

// GET - Fetch water tank metadata (capacity, refill info) - water level comes from MQTT in real-time
export async function GET(request: NextRequest) {
  try {
    // Get water tank capacity and metadata (NOT current level - that comes from MQTT)
    const { data: tankInfo, error: tankError } = await supabaseAdmin
      .from('water_tank_info')
      .select('*')
      .eq('device_id', 'farm_001')
      .single()

    if (tankError) {
      console.log('No tank info found, using defaults')
    }

    const capacity = tankInfo?.capacity_liters || 100
    const isMqttConnected = smartFarmMQTT.isConnected()
    
    console.log('🌊 Water tank API - returning metadata only (level from MQTT)')

    return NextResponse.json({
      capacity_liters: capacity,
      last_refill: tankInfo?.last_refill || new Date().toISOString(),
      mqtt_connected: isMqttConnected,
      data_source: 'mqtt-realtime',
      note: 'Current water level comes from real-time MQTT data via useEspContext'
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Update water tank info (refill, capacity changes, etc.)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, capacity_liters, refill_amount } = body

    if (action === 'refill') {
      const { error } = await supabaseAdmin
        .from('water_tank_info')
        .upsert([
          {
            device_id: 'farm_001',
            last_refill: new Date().toISOString(),
            capacity_liters: capacity_liters || 100
          }
        ])

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Log the refill event
      await supabaseAdmin
        .from('watering_history')
        .insert([
          {
            device_id: 'farm_001',
            duration_ms: 0,
            water_amount_ml: refill_amount || 0,
            plant_type: 'tank_refill',
            efficiency_score: 100,
            created_at: new Date().toISOString()
          }
        ])

      return NextResponse.json({ 
        success: true, 
        message: 'Tank refilled successfully' 
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}