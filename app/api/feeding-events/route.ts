import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { feeding_time, trigger_type, distance, motion_detected } = body
    
    // Log feeding event to database
    const { data, error } = await supabase
      .from('feeding_events')
      .insert({
        device_id: 'farm_001',
        feeding_time,
        trigger_type,
        distance,
        motion_detected,
        timestamp: new Date().toISOString()
      })
      .select()
    
    if (error) {
      console.error('Error logging feeding event:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      data: data?.[0],
      message: 'Feeding event logged successfully'
    })
    
  } catch (error) {
    console.error('Error in feeding events API:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to log feeding event' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    
    // Fetch recent feeding events
    const { data: feedingEvents, error } = await supabase
      .from('feeding_events')
      .select('*')
      .eq('device_id', 'farm_001')
      .order('timestamp', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Error fetching feeding events:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      events: feedingEvents || [],
      count: feedingEvents?.length || 0
    })
    
  } catch (error) {
    console.error('Error in feeding events API:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch feeding events' },
      { status: 500 }
    )
  }
}