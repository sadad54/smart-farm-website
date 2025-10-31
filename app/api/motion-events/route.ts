import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Fetch motion events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const device_id = searchParams.get('device_id') || 'farm_001'
    
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

    // Get motion statistics
    const { data: statsData, error: statsError } = await supabaseAdmin
      .from('motion_events')
      .select('motion_detected, animal_type')
      .eq('device_id', device_id)
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

    let stats = {
      total_detections: 0,
      animal_types: {} as Record<string, number>,
      detection_rate: 0
    }

    if (!statsError && statsData) {
      stats.total_detections = statsData.filter(event => event.motion_detected).length
      stats.detection_rate = Math.round((stats.total_detections / Math.max(statsData.length, 1)) * 100)
      
      statsData.forEach(event => {
        if (event.animal_type) {
          stats.animal_types[event.animal_type] = (stats.animal_types[event.animal_type] || 0) + 1
        }
      })
    }

    return NextResponse.json({ 
      data: motionEvents || [],
      count: motionEvents?.length || 0,
      stats
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add new motion event with PIR and ultrasonic correlation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      device_id = 'farm_001',
      motion_detected,
      animal_type,
      confidence_score,
      sensor_data,
      distance_cm,
      pir_triggered = false,
      ultrasonic_triggered = false,
      alarm_triggered = false,
      sensor_type = 'PIR'
    } = body

    console.log('🚨 Motion event received:', { motion_detected, sensor_type, distance_cm, pir_triggered, ultrasonic_triggered })

    // Determine if this is a combined detection event
    const isCombinedDetection = pir_triggered && ultrasonic_triggered
    const enhancedConfidence = isCombinedDetection ? Math.min(100, (confidence_score || 75) + 15) : (confidence_score || 75)

    const { data, error } = await supabaseAdmin
      .from('motion_events')
      .insert([
        {
          device_id,
          motion_detected: Boolean(motion_detected),
          sensor_type: isCombinedDetection ? 'combined' : sensor_type,
          distance_cm: distance_cm || null,
          pir_triggered: Boolean(pir_triggered),
          ultrasonic_triggered: Boolean(ultrasonic_triggered),
          animal_type: animal_type || null,
          confidence_score: enhancedConfidence,
          sensor_data: {
            ...sensor_data,
            detection_method: isCombinedDetection ? 'dual_sensor' : 'single_sensor',
            raw_distance: distance_cm,
            timestamp_ms: Date.now()
          },
          alarm_triggered: Boolean(alarm_triggered),
          timestamp: new Date().toISOString()
        }
      ])
      .select()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Motion event logged:', data[0])

    return NextResponse.json({ 
      success: true, 
      data: data[0],
      message: isCombinedDetection ? 'Combined PIR+Ultrasonic detection logged' : 'Motion detection logged'
    }, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}