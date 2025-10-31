import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Fetch watering history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const { data: wateringHistory, error } = await supabaseAdmin
      .from('watering_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      data: wateringHistory || [],
      count: wateringHistory?.length || 0
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add new watering record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { device_id, duration_ms, water_amount_ml, plant_type } = body

    const { data, error } = await supabaseAdmin
      .from('watering_history')
      .insert([
        {
          device_id: device_id || 'farm_001',
          duration_ms: duration_ms || 3000,
          water_amount_ml: water_amount_ml || 250,
          plant_type: plant_type || 'crops',
          efficiency_score: Math.floor(Math.random() * 21) + 80, // 80-100%
          created_at: new Date().toISOString()
        }
      ])
      .select()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: data[0] 
    }, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}