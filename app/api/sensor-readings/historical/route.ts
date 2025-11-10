import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Get time range parameters (default to last 30 minutes)
    const minutesBack = parseInt(searchParams.get('minutes') || '30')
    const deviceId = searchParams.get('device_id') || 'farm_001'
    
    // Calculate time range
    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - (minutesBack * 60 * 1000))
    
    console.log(`📊 Fetching historical sensor data for last ${minutesBack} minutes...`)
    console.log(`Time range: ${startTime.toISOString()} to ${endTime.toISOString()}`)
    
    const { data, error } = await supabase
      .from('sensor_readings')
      .select('*')
      .eq('device_id', deviceId)
      .gte('timestamp', startTime.toISOString())
      .lte('timestamp', endTime.toISOString())
      .order('timestamp', { ascending: true })
    
    if (error) {
      console.error('❌ Database error:', error)
      throw error
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ No historical sensor readings found in database')
      return NextResponse.json({ 
        readings: [],
        timeRange: {
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          minutes: minutesBack
        },
        message: 'No historical sensor readings available for the specified time range' 
      })
    }
    
    // Group readings by timestamp and create chart data points
    const readingsByTime: Record<string, any> = {}
    
    data.forEach(reading => {
      const timestamp = reading.timestamp
      if (!readingsByTime[timestamp]) {
        readingsByTime[timestamp] = {
          timestamp,
          time: new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })
        }
      }
      
      // Map database metric names to chart data keys
      const metricMapping: Record<string, string> = {
        'temperature': 'temperature',
        'humidity': 'humidity',
        'soil_moisture': 'soil_moisture',
        'water_level': 'water_level',
        'light_level': 'light_level'
      }
      
      const chartKey = metricMapping[reading.metric]
      if (chartKey) {
        readingsByTime[timestamp][chartKey] = reading.value
      }
    })
    
    // Convert to array and sort by timestamp
    const chartData = Object.values(readingsByTime).sort((a: any, b: any) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    
    // If we have too many data points, sample them to improve performance
    let sampledData = chartData
    if (chartData.length > 60) {
      const step = Math.ceil(chartData.length / 60)
      sampledData = chartData.filter((_, index) => index % step === 0)
    }
    
    console.log(`✅ Retrieved ${data.length} readings, grouped into ${sampledData.length} data points`)
    
    return NextResponse.json({ 
      readings: sampledData,
      timeRange: {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        minutes: minutesBack
      },
      totalReadings: data.length,
      dataPoints: sampledData.length,
      device_id: deviceId
    })
    
  } catch (error) {
    console.error('❌ Historical sensor readings error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch historical readings',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}