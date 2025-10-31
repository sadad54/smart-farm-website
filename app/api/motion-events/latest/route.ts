import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const device_id = searchParams.get('device_id') || 'farm_001'
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get latest motion events with sensor correlation
    const { data: motionEvents, error } = await supabaseAdmin
      .from('motion_events')
      .select('*')
      .eq('device_id', device_id)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get current sensor readings for real-time correlation
    const { data: sensorReadings, error: sensorError } = await supabaseAdmin
      .from('sensor_readings')
      .select('*')
      .eq('device_id', device_id)
      .in('metric', ['motion_detected', 'distance'])
      .order('timestamp', { ascending: false })
      .limit(20)

    if (sensorError) {
      console.warn('Sensor readings error:', sensorError)
    }

    // Get latest sensor values
    const latestReadings: Record<string, any> = {}
    if (sensorReadings) {
      sensorReadings.forEach(reading => {
        if (!latestReadings[reading.metric] || 
            new Date(reading.timestamp) > new Date(latestReadings[reading.metric].timestamp)) {
          latestReadings[reading.metric] = reading
        }
      })
    }

    // Get motion detection statistics
    const { data: statsData, error: statsError } = await supabaseAdmin
      .from('motion_events')
      .select('motion_detected, pir_triggered, ultrasonic_triggered, confidence_score, sensor_type')
      .eq('device_id', device_id)
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

    let stats = {
      total_detections: 0,
      pir_detections: 0,
      ultrasonic_detections: 0,
      combined_detections: 0,
      avg_confidence: 0,
      detection_rate: 0,
      sensor_correlation: false
    }

    if (!statsError && statsData) {
      const motionDetections = statsData.filter(event => event.motion_detected)
      stats.total_detections = motionDetections.length
      stats.pir_detections = statsData.filter(event => event.pir_triggered).length
      stats.ultrasonic_detections = statsData.filter(event => event.ultrasonic_triggered).length
      stats.combined_detections = statsData.filter(event => event.sensor_type === 'combined').length
      stats.avg_confidence = motionDetections.length > 0 
        ? Math.round(motionDetections.reduce((sum, event) => sum + (event.confidence_score || 0), 0) / motionDetections.length)
        : 0
      stats.detection_rate = statsData.length > 0 
        ? Math.round((motionDetections.length / statsData.length) * 100)
        : 0
      stats.sensor_correlation = stats.combined_detections > 0
    }

    return NextResponse.json({ 
      success: true,
      data: motionEvents || [],
      count: motionEvents?.length || 0,
      stats,
      current_sensors: {
        motion_detected: latestReadings.motion_detected?.value === 1 || false,
        distance: latestReadings.distance?.value || null,
        last_reading: latestReadings.motion_detected?.timestamp || latestReadings.distance?.timestamp
      }
    })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 })
  }
}