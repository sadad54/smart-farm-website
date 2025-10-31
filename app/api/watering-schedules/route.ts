import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch watering schedules
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const device_id = searchParams.get('device_id') || 'farm_001'
    const active_only = searchParams.get('active_only') === 'true'
    
    let query = supabase
      .from('watering_schedules')
      .select('*')
      .eq('device_id', device_id)
      .order('created_at', { ascending: false })
    
    if (active_only) {
      query = query.eq('is_active', true)
    }
    
    const { data: schedules, error } = await query
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      data: schedules || [],
      count: schedules?.length || 0
    })
    
  } catch (error) {
    console.error('Error in watering schedules API:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch watering schedules' },
      { status: 500 }
    )
  }
}

// POST - Create new watering schedule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      plant_type,
      water_amount_ml,
      duration_ms,
      schedule_type,
      scheduled_time,
      scheduled_days,
      start_date,
      end_date,
      timezone = 'UTC'
    } = body
    
    // Validate required fields
    if (!name || !plant_type || !schedule_type || !scheduled_time) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const { data: schedule, error } = await supabase
      .from('watering_schedules')
      .insert({
        device_id: 'farm_001',
        name,
        plant_type,
        water_amount_ml: water_amount_ml || 250,
        duration_ms: duration_ms || 3000,
        schedule_type,
        scheduled_time,
        scheduled_days,
        start_date: start_date || new Date().toISOString().split('T')[0],
        end_date,
        timezone
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating schedule:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      data: schedule,
      message: 'Watering schedule created successfully'
    })
    
  } catch (error) {
    console.error('Error in watering schedules API:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create watering schedule' },
      { status: 500 }
    )
  }
}

// PUT - Update existing watering schedule
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Schedule ID is required' },
        { status: 400 }
      )
    }
    
    const { data: schedule, error } = await supabase
      .from('watering_schedules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating schedule:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      data: schedule,
      message: 'Watering schedule updated successfully'
    })
    
  } catch (error) {
    console.error('Error in watering schedules API:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update watering schedule' },
      { status: 500 }
    )
  }
}

// DELETE - Delete watering schedule
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Schedule ID is required' },
        { status: 400 }
      )
    }
    
    const { error } = await supabase
      .from('watering_schedules')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting schedule:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Watering schedule deleted successfully'
    })
    
  } catch (error) {
    console.error('Error in watering schedules API:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete watering schedule' },
      { status: 500 }
    )
  }
}