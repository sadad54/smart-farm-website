import { NextRequest, NextResponse } from 'next/server'
import { predictWateringNeeds } from '@/lib/groq-client'

export async function POST(request: NextRequest) {
  try {
    const { sensorData, historicalData } = await request.json()
    
    const prediction = await predictWateringNeeds(sensorData, historicalData)
    
    return NextResponse.json({
      success: true,
      prediction,
      timestamp: Date.now()
    })
    
  } catch (error) {
    console.error('Watering prediction API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Watering prediction failed',
        prediction: {
          shouldWater: false,
          hoursUntilWatering: 4,
          wateringDuration: 3,
          confidence: 50,
          reasoning: 'AI prediction temporarily unavailable',
          nextCheckIn: 2
        }
      },
      { status: 500 }
    )
  }
}