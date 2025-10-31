import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST - Log button/command action
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      device_id = 'farm_001',
      action_type,
      command,
      duration_ms,
      location,
      metadata = {}
    } = body

    console.log('🎛️ Logging action:', { action_type, command, location })

    const { data, error } = await supabaseAdmin
      .from('device_actions')
      .insert([
        {
          device_id,
          action_type, // 'water', 'fan', 'light', 'feed', 'buzzer'
          command, // 'A', 'B', 'C', 'D', 'E'
          duration_ms: duration_ms || null,
          location, // 'dashboard', 'water_page', 'temperature_page', etc.
          metadata,
          timestamp: new Date().toISOString()
        }
      ])
      .select()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Action logged successfully')

    return NextResponse.json({ 
      success: true, 
      data: data[0] 
    }, { status: 201 })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Fetch action history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const device_id = searchParams.get('device_id') || 'farm_001'
    const action_type = searchParams.get('action_type')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    let query = supabaseAdmin
      .from('device_actions')
      .select('*')
      .eq('device_id', device_id)
      .order('timestamp', { ascending: false })
      .limit(limit)
    
    if (action_type) {
      query = query.eq('action_type', action_type)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      data: data || [],
      count: data?.length || 0
    })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}