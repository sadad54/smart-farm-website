import { NextResponse } from 'next/server'
import smartFarmMQTT from '@/lib/mqtt-client'

export async function GET() {
  try {
    // MQTT-ONLY: Get the latest sensor data directly from MQTT client
    const latestData = smartFarmMQTT.getLastSensorData()
    const isConnected = smartFarmMQTT.isConnected()
    
    if (!isConnected) {
      return NextResponse.json({
        connected: false,
        data: null,
        message: 'MQTT not connected - MQTT-ONLY mode requires active connection',
        protocol: 'mqtt-only'
      })
    }
    
    if (!latestData) {
      return NextResponse.json({
        connected: isConnected,
        data: null,
        message: 'MQTT connected but no sensor data available yet',
        protocol: 'mqtt-only'
      })
    }
    
    // Convert MQTT data format to dashboard format
    const sensorData = {
      temperature: latestData.temp || null,
      humidity: latestData.hum || null,
      soilHumidity: latestData.soil || null,
      waterLevel: latestData.water || null,
      light: latestData.light || null,
      distance: latestData.distance || null,
      // Expose servo state if device includes it in MQTT sensor payload
      servo: typeof latestData.servo !== 'undefined' ? latestData.servo : null,
      motionDetected: latestData.motion === 1,
      intruderAlert: latestData.intruder_alert === 1,
      alertLevel: latestData.alert_level || 0,
      timestamp: latestData.timestamp,
      raw: "mqtt-only-live"
    }
    
    return NextResponse.json({
      connected: isConnected,
      data: sensorData,
      message: 'Live MQTT-ONLY data',
      protocol: 'mqtt-only'
    })
    
  } catch (error) {
    console.error('❌ Error getting MQTT-ONLY sensor data:', error)
    return NextResponse.json(
      { 
        connected: false,
        data: null,
        error: 'Failed to get MQTT sensor data',
        message: error instanceof Error ? error.message : 'Unknown error',
        protocol: 'mqtt-only'
      }, 
      { status: 500 }
    )
  }
}