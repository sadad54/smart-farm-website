import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Check and execute pending scheduled watering tasks
export async function GET(request: NextRequest) {
  try {
    const now = new Date().toISOString()
    
    // Find schedules that are due for execution
    const { data: pendingSchedules, error } = await supabase
      .from('watering_schedules')
      .select('*')
      .eq('is_active', true)
      .lte('next_execution', now)
      .not('next_execution', 'is', null)
    
    if (error) {
      console.error('Error fetching pending schedules:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    const executionResults = []
    
    for (const schedule of pendingSchedules || []) {
      try {
        // Execute the watering command (this would normally trigger ESP32)
        // For now, we'll log it and simulate execution
        console.log(`Executing schedule: ${schedule.name} for ${schedule.plant_type}`)
        
        // Log the execution
        const { error: logError } = await supabase
          .from('watering_schedule_logs')
          .insert({
            schedule_id: schedule.id,
            device_id: schedule.device_id,
            water_amount_ml: schedule.water_amount_ml,
            duration_ms: schedule.duration_ms,
            success: true
          })
        
        if (logError) {
          console.error('Error logging execution:', logError)
        }
        
        // Update schedule execution count and last executed
        const { error: updateError } = await supabase
          .from('watering_schedules')
          .update({
            last_executed: now,
            execution_count: schedule.execution_count + 1
          })
          .eq('id', schedule.id)
        
        if (updateError) {
          console.error('Error updating schedule:', updateError)
        }
        
        executionResults.push({
          schedule_id: schedule.id,
          name: schedule.name,
          success: true,
          executed_at: now
        })
        
      } catch (execError) {
        console.error(`Error executing schedule ${schedule.id}:`, execError)
        
        // Log the failed execution
        await supabase
          .from('watering_schedule_logs')
          .insert({
            schedule_id: schedule.id,
            device_id: schedule.device_id,
            water_amount_ml: schedule.water_amount_ml,
            duration_ms: schedule.duration_ms,
            success: false,
            error_message: String(execError)
          })
        
        executionResults.push({
          schedule_id: schedule.id,
          name: schedule.name,
          success: false,
          error: String(execError)
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      executed_count: executionResults.length,
      results: executionResults
    })
    
  } catch (error) {
    console.error('Error in schedule execution API:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to execute scheduled watering' },
      { status: 500 }
    )
  }
}

// POST - Manually execute a specific schedule
export async function POST(request: NextRequest) {
  try {
    const { schedule_id } = await request.json()
    
    if (!schedule_id) {
      return NextResponse.json(
        { success: false, error: 'Schedule ID is required' },
        { status: 400 }
      )
    }
    
    // Fetch the schedule
    const { data: schedule, error } = await supabase
      .from('watering_schedules')
      .select('*')
      .eq('id', schedule_id)
      .single()
    
    if (error || !schedule) {
      return NextResponse.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      )
    }
    
    try {
      // Here you would normally send command to ESP32
      // For now, we'll simulate the execution
      console.log(`Manually executing schedule: ${schedule.name}`)
      
      // Log the execution
      const { error: logError } = await supabase
        .from('watering_schedule_logs')
        .insert({
          schedule_id: schedule.id,
          device_id: schedule.device_id,
          water_amount_ml: schedule.water_amount_ml,
          duration_ms: schedule.duration_ms,
          success: true
        })
      
      if (logError) {
        console.error('Error logging execution:', logError)
      }
      
      // Update execution count
      const { error: updateError } = await supabase
        .from('watering_schedules')
        .update({
          execution_count: schedule.execution_count + 1
        })
        .eq('id', schedule.id)
      
      if (updateError) {
        console.error('Error updating schedule:', updateError)
      }
      
      return NextResponse.json({
        success: true,
        message: `Schedule "${schedule.name}" executed successfully`,
        execution_details: {
          plant_type: schedule.plant_type,
          water_amount_ml: schedule.water_amount_ml,
          duration_ms: schedule.duration_ms
        }
      })
      
    } catch (execError) {
      console.error(`Error executing schedule ${schedule_id}:`, execError)
      
      // Log the failed execution
      await supabase
        .from('watering_schedule_logs')
        .insert({
          schedule_id: schedule.id,
          device_id: schedule.device_id,
          water_amount_ml: schedule.water_amount_ml,
          duration_ms: schedule.duration_ms,
          success: false,
          error_message: String(execError)
        })
      
      return NextResponse.json(
        { success: false, error: 'Failed to execute watering schedule' },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('Error in manual schedule execution:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to execute schedule' },
      { status: 500 }
    )
  }
}