import { NextRequest, NextResponse } from 'next/server'
import smartFarmMQTT from '@/lib/mqtt-client'
import { supabaseAdmin } from '@/lib/supabase'

// POST: Intelligent command sender (MQTT first, HTTP fallback)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      action, 
      duration_ms = 3000, 
      device_id = 'farm_001',
      force_protocol = null // 'mqtt' or 'http' to force a specific protocol
    } = body

    console.log(`🎯 Smart command: ${action} for ${device_id}`)

    // Validate action (accept both long names and single letters)
    const validActions = ['LIGHT', 'FAN', 'FEED', 'WATER', 'BUZZER', 'PIR_ALARM', 'AUTO_ON', 'AUTO_OFF', 'A', 'B', 'C', 'D', 'E', 'P']
    const upperAction = action?.toString().toUpperCase()
    
    if (!validActions.includes(upperAction)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid action. Must be one of: ${validActions.join(', ')} (or single letters A,B,C,D,E,P)`,
          received: action
        },
        { status: 400 }
      )
    }

    let commandResult: any = null
    let protocolUsed = 'unknown'
    let fallbackUsed = false

    // Try MQTT first (unless HTTP is forced)
    if (force_protocol !== 'http' && smartFarmMQTT.isConnected()) {
      console.log('📡 Attempting MQTT command...')
      
      const commandId = smartFarmMQTT.sendCommand(upperAction, duration_ms)
      
      if (commandId) {
        protocolUsed = 'mqtt'
        commandResult = {
          command_id: commandId,
          protocol: 'mqtt',
          sent_at: Date.now()
        }
        
        // Log to database for tracking
        try {
          await supabaseAdmin
            .from('device_commands')
            .insert({
              device_id,
              command: { action: upperAction, duration_ms },
              status: 'sent_mqtt',
              created_at: new Date()
            })
        } catch (dbError) {
          console.warn('⚠️ Failed to log MQTT command to database:', dbError)
        }
      }
    }

    // HTTP Fallback (if MQTT failed or was forced)
    if (!commandResult || force_protocol === 'http') {
      if (commandResult) {
        console.log('🔄 Using HTTP as requested (force_protocol=http)')
      } else {
        console.log('🔄 MQTT failed, falling back to HTTP...')
        fallbackUsed = true
      }
      
      // Use your existing HTTP command API
      try {
        const httpResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/device-commands`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id,
            command: { action: upperAction, duration_ms },
            status: 'pending'
          })
        })

        if (httpResponse.ok) {
          const httpResult = await httpResponse.json()
          protocolUsed = 'http'
          commandResult = {
            command_id: httpResult.id || Date.now().toString(),
            protocol: 'http',
            sent_at: Date.now(),
            http_response: httpResult
          }
        } else {
          throw new Error(`HTTP command failed: ${httpResponse.status}`)
        }
      } catch (httpError) {
        console.error('❌ HTTP fallback also failed:', httpError)
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Both MQTT and HTTP methods failed',
            mqtt_connected: smartFarmMQTT.isConnected(),
            details: httpError instanceof Error ? httpError.message : 'Unknown HTTP error',
            fallback_attempted: true
          },
          { status: 503 }
        )
      }
    }

    // Return comprehensive response
    return NextResponse.json({
      success: true,
      message: `Command '${action}' sent successfully`,
      command_id: commandResult.command_id,
      action: upperAction,
      duration_ms,
      device_id,
      protocol_used: protocolUsed,
      fallback_used: fallbackUsed,
      mqtt_connected: smartFarmMQTT.isConnected(),
      sent_at: commandResult.sent_at,
      timestamp: Date.now(),
      ...(commandResult.http_response && { http_details: commandResult.http_response })
    })

  } catch (error) {
    console.error('❌ Smart command error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        mqtt_connected: smartFarmMQTT.isConnected()
      },
      { status: 500 }
    )
  }
}

// GET: Get command history and protocol statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const device_id = searchParams.get('device_id') || 'farm_001'
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get recent commands from database
    const { data: commands, error } = await supabaseAdmin
      .from('device_commands')
      .select('*')
      .eq('device_id', device_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    // Calculate protocol statistics
    const mqttCommands = commands.filter(cmd => cmd.status?.includes('mqtt')).length
    const httpCommands = commands.filter(cmd => !cmd.status?.includes('mqtt')).length
    
    return NextResponse.json({
      device_id,
      current_status: {
        mqtt_connected: smartFarmMQTT.isConnected(),
        device_status: smartFarmMQTT.getDeviceStatus(),
        last_sensor_data: smartFarmMQTT.getLastSensorData()
      },
      recent_commands: commands.map(cmd => ({
        id: cmd.id,
        action: cmd.command?.action,
        status: cmd.status,
        protocol: cmd.status?.includes('mqtt') ? 'mqtt' : 'http',
        created_at: cmd.created_at,
        completed_at: cmd.completed_at
      })),
      statistics: {
        total_commands: commands.length,
        mqtt_commands: mqttCommands,
        http_commands: httpCommands,
        mqtt_percentage: commands.length > 0 ? (mqttCommands / commands.length * 100).toFixed(1) : '0'
      },
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('❌ Command history error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to get command history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}