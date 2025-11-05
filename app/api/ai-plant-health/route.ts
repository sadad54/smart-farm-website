import { NextRequest, NextResponse } from 'next/server'
import { analyzeePlantHealth } from '@/lib/groq-client'

export async function POST(request: NextRequest) {
  try {
    const sensorData = await request.json()
    
    const analysis = await analyzeePlantHealth(sensorData)
    
    return NextResponse.json({
      success: true,
      analysis,
      timestamp: Date.now()
    })
    
  } catch (error) {
    console.error('Plant health analysis API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Plant health analysis failed',
        analysis: {
          healthScore: 75,
          status: 'good',
          immediateActions: ['Monitor sensor readings'],
          recommendations: ['Maintain optimal conditions'],
          risks: ['Check API configuration'],
          summary: 'AI analysis temporarily unavailable'
        }
      },
      { status: 500 }
    )
  }
}