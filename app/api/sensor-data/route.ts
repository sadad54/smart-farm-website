import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST - Log sensor data from ESP32
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      device_id = 'farm_001',
      temperature,
      humidity,
      soil_moisture,
      water_level,
      light_level,
      steam,
      distance,
      motion_detected
    } = body

    console.log('📊 Received sensor data:', body)

    // Prepare sensor readings array
    const readings = []
    
    if (temperature !== undefined) {
      readings.push({
        device_id,
        metric: 'temperature',
        value: parseFloat(temperature),
        unit: '°C',
        timestamp: new Date().toISOString()
      })
    }
    
    if (humidity !== undefined) {
      readings.push({
        device_id,
        metric: 'humidity',
        value: parseFloat(humidity),
        unit: '%',
        timestamp: new Date().toISOString()
      })
    }
    
    if (soil_moisture !== undefined) {
      readings.push({
        device_id,
        metric: 'soil_moisture',
        value: parseFloat(soil_moisture),
        unit: '%',
        timestamp: new Date().toISOString()
      })
    }
    
    if (water_level !== undefined) {
      readings.push({
        device_id,
        metric: 'water_level',
        value: parseFloat(water_level),
        unit: '%',
        timestamp: new Date().toISOString()
      })
    }
    
    if (light_level !== undefined) {
      readings.push({
        device_id,
        metric: 'light_level',
        value: parseFloat(light_level),
        unit: 'lux',
        timestamp: new Date().toISOString()
      })
    }
    
    if (steam !== undefined) {
      readings.push({
        device_id,
        metric: 'steam',
        value: parseFloat(steam),
        unit: 'level',
        timestamp: new Date().toISOString()
      })
    }
    
    if (distance !== undefined) {
      readings.push({
        device_id,
        metric: 'distance',
        value: parseFloat(distance),
        unit: 'cm',
        timestamp: new Date().toISOString()
      })
    }
    
    if (motion_detected !== undefined) {
      readings.push({
        device_id,
        metric: 'motion_detected',
        value: parseInt(motion_detected),
        unit: 'boolean',
        timestamp: new Date().toISOString()
      })
    }

    if (readings.length === 0) {
      return NextResponse.json({ error: 'No valid sensor data provided' }, { status: 400 })
    }

    // Insert all readings with retry logic
    let data = null
    let lastError = null
    const maxRetries = 3
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          supabaseAdmin.from('sensor_readings').insert(readings).select(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database timeout')), 5000)
          )
        ]) as any
        
        if (result.error) {
          lastError = result.error
          console.log(`Database attempt ${attempt} failed:`, result.error.message)
          
          if (attempt === maxRetries) {
            throw new Error(result.error.message)
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 500))
          continue
        }
        
        data = result.data
        break
        
      } catch (error: any) {
        lastError = error
        console.log(`Database attempt ${attempt} failed:`, error.message)
        
        if (attempt === maxRetries) {
          console.error('Database error after retries:', {
            message: error.message,
            details: error.stack || 'No stack trace available',
            hint: 'Check Supabase connection and network connectivity',
            code: error.code || ''
          })
          
          // Return success with fallback to prevent UI errors
          return NextResponse.json({ 
            success: true,
            message: 'Sensor data received but database logging failed',
            readings_count: readings.length,
            fallback: true,
            error: error.message
          })
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 500))
      }
    }

    console.log('✅ Sensor data logged successfully:', data?.length, 'readings')

    return NextResponse.json({ 
      success: true, 
      inserted_count: data?.length || 0,
      message: 'Sensor data logged successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Fetch latest sensor readings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const device_id = searchParams.get('device_id') || 'farm_001'
    const metric = searchParams.get('metric')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    let query = supabaseAdmin
      .from('sensor_readings')
      .select('*')
      .eq('device_id', device_id)
      .order('timestamp', { ascending: false })
      .limit(limit)
    
    if (metric) {
      query = query.eq('metric', metric)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      data: data || [],
      count: data?.length || 0
    })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}