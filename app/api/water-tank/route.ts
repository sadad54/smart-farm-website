import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Fetch current water tank level
export async function GET(request: NextRequest) {
  try {
    // Get latest water level sensor reading
    const { data: waterLevelData, error: levelError } = await supabaseAdmin
      .from('sensor_readings')
      .select('*')
      .eq('metric', 'water_level')
      .eq('device_id', 'farm_001')
      .order('timestamp', { ascending: false })
      .limit(1)

    if (levelError) {
      console.error('Database error:', levelError)
      return NextResponse.json({ error: levelError.message }, { status: 500 })
    }

    // Get water tank capacity and other info
    const { data: tankInfo, error: tankError } = await supabaseAdmin
      .from('water_tank_info')
      .select('*')
      .eq('device_id', 'farm_001')
      .single()

    const currentLevel = waterLevelData?.[0]?.value || 68 // Default fallback
    const capacity = tankInfo?.capacity_liters || 100
    const currentLiters = Math.round((currentLevel / 100) * capacity)
    const percentage = Math.round(currentLevel)

    return NextResponse.json({
      current_level_percent: percentage,
      current_liters: currentLiters,
      capacity_liters: capacity,
      status: percentage > 80 ? 'full' : percentage > 30 ? 'medium' : 'low',
      last_refill: tankInfo?.last_refill || new Date().toISOString(),
      estimated_days_remaining: Math.max(1, Math.floor(currentLiters / 10)) // Assuming 10L/day usage
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