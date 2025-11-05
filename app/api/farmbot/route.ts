import { NextRequest, NextResponse } from 'next/server'
import { getSmartFarmResponse } from '@/lib/groq-client'

export async function POST(request: NextRequest) {
  try {
    const { message, sensorData } = await request.json()
    
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }
    
    const response = await getSmartFarmResponse(message, sensorData)
    
    return NextResponse.json({
      success: true,
      response,
      timestamp: Date.now()
    })
    
  } catch (error) {
    console.error('FarmBot API Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'FarmBot is temporarily unavailable',
        response: '🤖 FarmBot AI is currently offline. Please check your Groq API key configuration.'
      },
      { status: 500 }
    )
  }
}