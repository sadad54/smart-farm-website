import { supabaseAdmin } from '@/lib/supabase'

// Plant Health API endpoint
// Stores calculated plant health metrics with recommendations

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      device_id, 
      plant_health_percentage,
      soil_score,
      temperature_score, 
      humidity_score,
      soil_moisture,
      temperature,
      humidity
    } = body

    if (!device_id || plant_health_percentage === undefined) {
      return Response.json(
        { error: 'device_id and plant_health_percentage required' },
        { status: 400 }
      )
    }

    // Calculate health status
    let health_status = 'critical'
    if (plant_health_percentage >= 90) health_status = 'excellent'
    else if (plant_health_percentage >= 75) health_status = 'good'
    else if (plant_health_percentage >= 60) health_status = 'fair'
    else if (plant_health_percentage >= 40) health_status = 'poor'

    // Calculate alert level
    let alert_level = 'none'
    if (plant_health_percentage < 40) alert_level = 'critical'
    else if (plant_health_percentage < 60) alert_level = 'high'
    else if (plant_health_percentage < 75) alert_level = 'medium'
    else if (plant_health_percentage < 90) alert_level = 'low'

    // Generate recommendations
    const recommendations = []
    if (soil_moisture < 40) {
      recommendations.push('🚰 Soil is too dry - increase watering frequency')
    } else if (soil_moisture > 80) {
      recommendations.push('💧 Soil is too wet - reduce watering or improve drainage')
    }

    if (temperature < 20) {
      recommendations.push('🌡️ Temperature is too low - consider heating or moving to warmer location')
    } else if (temperature > 30) {
      recommendations.push('🔥 Temperature is too high - increase ventilation or provide shade')
    }

    if (humidity < 50) {
      recommendations.push('💨 Air humidity is low - consider misting or humidifier')
    } else if (humidity > 80) {
      recommendations.push('💨 Air humidity is high - improve air circulation')
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Plant conditions are optimal - keep up the great work!')
    }

    // Insert plant health data
    const { data, error } = await supabaseAdmin
      .from('plant_health_metrics')
      .insert({
        device_id,
        plant_health_percentage,
        soil_score,
        temperature_score,
        humidity_score,
        soil_moisture,
        temperature,
        humidity,
        health_status,
        alert_level,
        recommendations
      })
      .select()
      .single()

    if (error) throw error

    return Response.json({ 
      success: true, 
      health_data: data,
      recommendations
    })

  } catch (error) {
    console.error('Plant Health API error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve latest plant health data
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const device_id = searchParams.get('device_id') || 'farm_001'
    const limit = parseInt(searchParams.get('limit') || '10')

    const { data, error } = await supabaseAdmin
      .from('plant_health_metrics')
      .select('*')
      .eq('device_id', device_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return Response.json({ 
      success: true, 
      health_history: data 
    })

  } catch (error) {
    console.error('Plant Health GET error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}