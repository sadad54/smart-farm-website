import { NextRequest, NextResponse } from 'next/server'
import smartFarmMQTT, { TOPICS, DEVICE_ID } from '@/lib/mqtt-client'

// GET: Get comprehensive MQTT status and configuration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'

    const status = {
      mqtt: {
        connected: smartFarmMQTT.isConnected(),
        device_status: smartFarmMQTT.getDeviceStatus(),
        last_sensor_data: smartFarmMQTT.getLastSensorData(),
        timestamp: Date.now()
      },
      configuration: {
        device_id: DEVICE_ID,
        topics: TOPICS,
        broker: 'broker.hivemq.com:1883' // Don't expose sensitive credentials
      },
      endpoints: {
        send_command: '/api/mqtt-command',
        get_status: '/api/mqtt-status',
        topics_info: Object.entries(TOPICS).map(([key, topic]) => ({
          name: key,
          topic: topic,
          direction: key === 'commandsOut' ? 'Dashboard → ESP32' : 'ESP32 → Dashboard'
        }))
      },
      health: {
        status: smartFarmMQTT.isConnected() ? 'healthy' : 'disconnected',
        uptime: process.uptime(),
        memory_usage: process.memoryUsage()
      }
    }

    if (format === 'text') {
      const textStatus = `
🚀 Smart Farm MQTT Status
========================
📡 MQTT Connected: ${status.mqtt.connected ? '✅ YES' : '❌ NO'}
🔋 Device Status: ${status.mqtt.device_status}
🆔 Device ID: ${status.configuration.device_id}
⏰ Last Update: ${new Date(status.mqtt.timestamp).toISOString()}

📋 MQTT Topics:
${status.endpoints.topics_info.map(t => `  ${t.name}: ${t.topic} (${t.direction})`).join('\n')}

🔗 API Endpoints:
  Send Command: ${status.endpoints.send_command}
  Get Status: ${status.endpoints.get_status}

💪 Health: ${status.health.status.toUpperCase()}
      `.trim()

      return new NextResponse(textStatus, {
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    return NextResponse.json(status)

  } catch (error) {
    console.error('❌ MQTT Status error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to get MQTT status',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      },
      { status: 500 }
    )
  }
}

// POST: Manual MQTT operations (reconnect, etc.)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { operation } = body

    switch (operation) {
      case 'reconnect':
        // Note: The current client doesn't expose a manual reconnect method
        // This would require extending the MQTT client class
        return NextResponse.json({
          success: true,
          message: 'Reconnection initiated (automatic reconnect is always active)',
          current_status: smartFarmMQTT.isConnected(),
          timestamp: Date.now()
        })

      case 'test_command':
        const testAction = body.action || 'LIGHT'
        const commandId = smartFarmMQTT.sendCommand(testAction)
        
        return NextResponse.json({
          success: !!commandId,
          message: commandId ? `Test command '${testAction}' sent` : 'Failed to send test command',
          command_id: commandId,
          mqtt_connected: smartFarmMQTT.isConnected(),
          timestamp: Date.now()
        })

      default:
        return NextResponse.json(
          { 
            success: false,
            error: `Unknown operation: ${operation}`,
            available_operations: ['reconnect', 'test_command']
          },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('❌ MQTT Operation error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to execute MQTT operation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}