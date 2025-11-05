import { NextRequest, NextResponse } from 'next/server'
import smartFarmMQTT from '@/lib/mqtt-client'

// POST: Send command to ESP32 via MQTT
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, duration_ms = 3000, device_id = 'farm_001' } = body

    console.log(`⚡ MQTT Command request: ${action} (${duration_ms}ms) for device ${device_id}`)

    // Validate action
    const validActions = ['LIGHT', 'FAN', 'FEED', 'WATER', 'BUZZER', 'PIR_ALARM']
    if (!validActions.includes(action?.toUpperCase())) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
          received: action
        },
        { status: 400 }
      )
    }

    // Check MQTT connection
    if (!smartFarmMQTT.isConnected()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'MQTT client not connected',
          mqtt_connected: false,
          suggestion: 'MQTT broker may be down, try HTTP fallback endpoint'
        },
        { status: 503 }
      )
    }

    // Send command via MQTT
    const commandId = smartFarmMQTT.sendCommand(action.toUpperCase(), duration_ms)

    if (!commandId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to send MQTT command',
          mqtt_connected: smartFarmMQTT.isConnected()
        },
        { status: 500 }
      )
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: `Command '${action}' sent via MQTT`,
      command_id: commandId,
      action: action.toUpperCase(),
      duration_ms,
      device_id,
      protocol: 'mqtt',
      mqtt_connected: true,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('❌ MQTT Command error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET: Get MQTT connection status and device info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeData = searchParams.get('include_data') === 'true'

    const response: any = {
      mqtt_connected: smartFarmMQTT.isConnected(),
      device_status: smartFarmMQTT.getDeviceStatus(),
      timestamp: Date.now(),
      protocol: 'mqtt'
    }

    if (includeData) {
      response.last_sensor_data = smartFarmMQTT.getLastSensorData()
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ MQTT Status error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to get MQTT status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}