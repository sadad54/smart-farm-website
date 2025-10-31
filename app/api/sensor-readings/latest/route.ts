import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    console.log('📊 Fetching latest sensor readings from database...')
    
    const { data, error } = await supabase
      .from('sensor_readings')
      .select('*')
      .eq('device_id', 'farm_001')
      .order('timestamp', { ascending: false })
      .limit(20) // Get more readings to ensure we have all metrics
    
    if (error) {
      console.error('❌ Database error:', error)
      throw error
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ No sensor readings found in database')
      return NextResponse.json({ 
        readings: [],
        message: 'No sensor readings available' 
      })
    }
    
    // Group by metric and get the latest value for each
    const latestReadings: Record<string, any> = {}
    
    data.forEach(reading => {
      const metric = reading.metric
      if (!latestReadings[metric] || new Date(reading.timestamp) > new Date(latestReadings[metric].timestamp)) {
        latestReadings[metric] = reading
      }
    })
    
    // Convert to array format
    const readings = Object.values(latestReadings)
    
    console.log(`✅ Retrieved ${readings.length} latest sensor readings:`, readings.map(r => `${r.metric}: ${r.value}`))
    
    return NextResponse.json({ 
      readings,
      timestamp: new Date().toISOString(),
      device_id: 'farm_001'
    })
    
  } catch (error) {
    console.error('❌ Latest sensor readings error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch latest readings',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}