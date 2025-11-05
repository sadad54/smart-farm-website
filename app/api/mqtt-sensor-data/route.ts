import { NextResponse } from 'next/server'
import smartFarmMQTT from '@/lib/mqtt-client'

export async function GET() {
  try {
    // Get the latest sensor data from MQTT client
    const latestData = smartFarmMQTT.getLastSensorData()
    const isConnected = smartFarmMQTT.isConnected()
    
    if (!latestData) {
      return NextResponse.json({
        connected: isConnected,
        data: null,
        message: 'No sensor data available'
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
      motionDetected: latestData.motion === 1,
      timestamp: latestData.timestamp,
      raw: "live-mqtt"
    }
    
    return NextResponse.json({
      connected: isConnected,
      data: sensorData,
      message: 'Live MQTT data'
    })
    
  } catch (error) {
    console.error('❌ Error getting MQTT sensor data:', error)
    return NextResponse.json(
      { 
        connected: false,
        data: null,
        error: 'Failed to get sensor data',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}