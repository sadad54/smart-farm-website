import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import smartFarmMQTT from '@/lib/mqtt-client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: Fetch pending commands for ESP32
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const device_id = searchParams.get('device_id') || 'farm_001'
    const status = searchParams.get('status') || 'pending'
    
    console.log(`📥 Fetching ${status} commands for device: ${device_id}`)
    
    const { data, error } = await supabase
      .from('device_commands')
      .select('*')
      .eq('device_id', device_id)
      .eq('status', status)
      .order('created_at', { ascending: true })
      .limit(10) // Limit to prevent overload
    
    if (error) {
      console.error('❌ Database error fetching commands:', error)
      throw error
    }
    
    if (!data || data.length === 0) {
      // Return 204 No Content for no pending commands
      return new NextResponse(null, { status: 204 })
    }
    
    console.log(`✅ Found ${data.length} ${status} commands`)
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('❌ GET commands error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch commands',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// POST: Queue new command from dashboard
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { device_id = 'farm_001', action, duration_ms = 3000, location = 'unknown' } = body
    
    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' }, 
        { status: 400 }
      )
    }
    
    console.log(`📤 Queuing command: ${action} for device: ${device_id}`)
    
    // Insert into device_commands table
    const { data: commandData, error: commandError } = await supabase
      .from('device_commands')
      .insert([
        {
          device_id,
          command: {
            action,
            duration_ms
          },
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single()
    
    if (commandError) {
      console.error('❌ Error inserting command:', commandError)
      throw commandError
    }
    
    // Also log to device_actions for history
    const { error: actionError } = await supabase
      .from('device_actions')
      .insert([
        {
          device_id,
          action_type: getActionType(action),
          command: action,
          location,
          timestamp: new Date().toISOString()
        }
      ])
    
    if (actionError) {
      console.error('⚠️ Warning: Failed to log action history:', actionError)
      // Don't fail the command queuing if history logging fails
    }
    
    // Also send the command via MQTT to the ESP32
    try {
      const commandId = smartFarmMQTT.sendCommand(action, duration_ms);
      if (commandId) {
        console.log(`📡 MQTT command sent successfully: ${action} (ID: ${commandId})`);
      } else {
        console.error('❌ MQTT command failed - not connected');
      }
    } catch (mqttError) {
      console.error('❌ Error sending MQTT command:', mqttError);
      // Continue even if MQTT fails - we still have the database command
    }

    console.log(`✅ Command queued successfully: ID ${commandData.id}`)
    
    return NextResponse.json({
      success: true,
      command_id: commandData.id,
      message: `Command ${action} queued for device ${device_id}`
    }, { status: 201 })
    
  } catch (error) {
    console.error('❌ POST command error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to queue command',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// PATCH: Update command status (ESP32 acknowledgment)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { command_id, status = 'completed', device_id, completed_at } = body
    
    if (!command_id) {
      return NextResponse.json(
        { error: 'Missing required field: command_id' }, 
        { status: 400 }
      )
    }
    
    console.log(`📝 Updating command ${command_id} status to: ${status}`)
    
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }
    
    if (completed_at) {
      updateData.completed_at = new Date(completed_at).toISOString()
    }
    
    const { data, error } = await supabase
      .from('device_commands')
      .update(updateData)
      .eq('id', command_id)
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error updating command status:', error)
      throw error
    }
    
    console.log(`✅ Command ${command_id} status updated to: ${status}`)
    
    return NextResponse.json({
      success: true,
      command: data,
      message: `Command status updated to ${status}`
    })
    
  } catch (error) {
    console.error('❌ PATCH command error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update command status',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// Helper function to determine action type
function getActionType(action: string): string {
  const actionMap: Record<string, string> = {
    'A': 'light',
    'B': 'fan', 
    'C': 'feed',
    'D': 'water',
    'E': 'buzzer',
    'P': 'pir_alarm',
    'light': 'light',
    'fan': 'fan',
    'feed': 'feed',
    'water': 'water',
    'buzzer': 'buzzer',
    'pir_alarm': 'pir_alarm'
  }
  
  return actionMap[action] || 'unknown'
}