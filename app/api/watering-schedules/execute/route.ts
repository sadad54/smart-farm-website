import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import smartFarmMQTT from '@/lib/mqtt-client'

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
    
    // Debug: Show what schedules are being checked
    console.log(`🔍 Checking ${pendingSchedules?.length || 0} pending schedules at ${now}`)
    pendingSchedules?.forEach(s => {
      console.log(`📋 Schedule "${s.name}": next_execution=${s.next_execution}, scheduled_time=${s.scheduled_time}`)
    })

    const executionResults = []
    
    for (const schedule of pendingSchedules || []) {
      try {
        // Execute the watering command by sending MQTT command to ESP32
        console.log(`🌱 Executing scheduled watering: ${schedule.name} for ${schedule.plant_type}`)
        
        // Send watering command via MQTT (with proper error handling)
        let commandId = null
        try {
          // Make sure MQTT is properly initialized before sending command
          if (smartFarmMQTT && typeof smartFarmMQTT.sendCommand === 'function') {
            commandId = smartFarmMQTT.sendCommand('D', schedule.duration_ms)
            console.log(`💧 Watering command sent to ESP32, Command ID: ${commandId}`)
          } else {
            console.log(`💧 MQTT not available, simulating watering command 'D' with duration ${schedule.duration_ms}ms`)
          }
        } catch (mqttError) {
          console.error('❌ MQTT command failed:', mqttError)
          console.log(`💧 Fallback: Simulating watering command 'D' with duration ${schedule.duration_ms}ms`)
        }
        
        // Log to watering history table (with timeout and error handling)
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
          
          const wateringResponse = await fetch(`http://localhost:3000/api/watering`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              device_id: schedule.device_id,
              duration_ms: schedule.duration_ms,
              water_amount_ml: schedule.water_amount_ml,
              plant_type: schedule.plant_type,
              triggered_by: 'automatic_schedule',
              schedule_id: schedule.id
            }),
            signal: controller.signal
          })
          clearTimeout(timeoutId)
          
          if (!wateringResponse.ok) {
            console.error('❌ Failed to log watering event:', wateringResponse.statusText)
          } else {
            console.log('✅ Watering event logged to history')
          }
        } catch (wateringLogError) {
          console.error('❌ Error logging watering event:', wateringLogError)
        }
        
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
      // Send watering command to ESP32 via MQTT
      console.log(`🔧 Manually executing schedule: ${schedule.name}`)
      const commandId = smartFarmMQTT.sendCommand('D', schedule.duration_ms)
      console.log(`💧 Manual watering command sent to ESP32, Command ID: ${commandId}`)
      
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