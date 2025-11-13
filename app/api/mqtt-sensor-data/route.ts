import { NextResponse } from 'next/server'
import smartFarmMQTT from '@/lib/mqtt-client'

export async function GET() {
  try {
    // MQTT-ONLY: Get the latest sensor data directly from MQTT client
    const latestData = smartFarmMQTT.getLastSensorData()
    const isConnected = smartFarmMQTT.isConnected()
    
    // Debug logging to see what data structure we're getting
    console.log('🔍 MQTT API Debug - Connection:', isConnected)
    console.log('🔍 MQTT API Debug - Raw Data:', JSON.stringify(latestData, null, 2))
    
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
    
    // Convert MQTT data format to dashboard format - handle multiple ESP32 formats
    const sensorData = {
      // Handle both direct properties and readings array format
      temperature: latestData.temp || latestData.temperature || 
        (latestData.readings && latestData.readings.find((r: any) => r.metric === 'temperature')?.value) || null,
      humidity: latestData.hum || latestData.humidity ||
        (latestData.readings && latestData.readings.find((r: any) => r.metric === 'humidity')?.value) || null,
      soilHumidity: latestData.soil || latestData.soilHumidity ||
        (latestData.readings && latestData.readings.find((r: any) => r.metric === 'soilHumidity')?.value) || null,
      waterLevel: latestData.water || latestData.waterLevel ||
        (latestData.readings && latestData.readings.find((r: any) => r.metric === 'waterLevel')?.value) || null,
      light: latestData.light || latestData.lightLevel ||
        (latestData.readings && latestData.readings.find((r: any) => r.metric === 'light')?.value) || null,
      distance: latestData.distance || latestData.dist ||
        (latestData.readings && latestData.readings.find((r: any) => r.metric === 'distance')?.value) || null,
      // Motion detection - handle various formats
      motionDetected: latestData.motion === 1 || latestData.motion === true || latestData.pir === 1,
      intruderAlert: latestData.intruder_alert === 1 || latestData.alarm === 1,
      alertLevel: latestData.alert_level || 0,
      // Servo state
      servo: typeof latestData.servo !== 'undefined' ? latestData.servo : null,
      timestamp: latestData.timestamp || new Date().toISOString(),
      raw: JSON.stringify(latestData) // Include raw data for debugging
    }
    
    console.log('🔄 MQTT API Debug - Converted Data:', JSON.stringify(sensorData, null, 2))
    
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