import { NextRequest, NextResponse } from 'next/server'
import { generateSmartAlert } from '@/lib/groq-client'

export async function POST(request: NextRequest) {
  try {
    const { alertType, sensorData, severity } = await request.json()
    
    const alert = await generateSmartAlert(alertType, sensorData, severity)
    
    return NextResponse.json({
      success: true,
      alert,
      timestamp: Date.now()
    })
    
  } catch (error) {
    console.error('Smart alert API error:', error)
    const { alertType: fallbackType } = await request.json().catch(() => ({ alertType: 'System' }))
    return NextResponse.json(
      { 
        success: false, 
        error: 'Smart alert generation failed',
        alert: {
          title: `${fallbackType || 'System'} Alert`,
          message: 'Smart alert system temporarily unavailable',
          actions: ['Check system status', 'Review sensor readings'],
          icon: '⚠️',
          priority: 3
        }
      },
      { status: 500 }
    )
  }
}