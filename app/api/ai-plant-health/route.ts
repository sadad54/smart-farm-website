import { NextRequest, NextResponse } from 'next/server'
import { analyzeePlantHealth } from '@/lib/groq-client'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    
    // Enhanced payload with historical data and trends
    const enhancedData = {
      currentSensorData: payload.currentSensorData || payload,
      previousReadings: payload.previousReadings || [],
      trends: payload.trends || { improving: false, declining: false, stable: true },
      analysisHistory: payload.analysisHistory || [],
      timestamp: Date.now()
    }
    
    const analysis = await analyzeePlantHealth(enhancedData)
    
    return NextResponse.json({
      success: true,
      analysis,
      timestamp: Date.now(),
      contextUsed: {
        historicalDataPoints: enhancedData.previousReadings.length,
        trendsAnalyzed: enhancedData.trends,
        analysisHistoryDepth: enhancedData.analysisHistory.length
      }
    })
    
  } catch (error) {
    console.error('Plant health analysis API error:', error)
    
    // Enhanced fallback analysis
    const fallbackPayload = await request.json().catch(() => ({}))
    const currentData = fallbackPayload.currentSensorData || fallbackPayload
    
    const fallbackAnalysis = {
      healthScore: Math.max(30, Math.min(85, 
        ((currentData.temperature || 25) > 15 && (currentData.temperature || 25) < 35 ? 25 : 15) +
        ((currentData.humidity || 60) > 40 && (currentData.humidity || 60) < 80 ? 20 : 10) +
        ((currentData.soilHumidity || 50) > 30 ? 20 : 10) +
        ((currentData.waterLevel || 50) > 20 ? 15 : 5) +
        ((currentData.light || 50) > 30 ? 15 : 5)
      )),
      status: 'monitoring',
      immediateActions: ['Check sensor connectivity', 'Verify system status'],
      recommendations: ['Maintain current conditions', 'Monitor system recovery'],
      risks: ['AI analysis service unavailable'],
      summary: 'Using backup analysis system. AI service will resume shortly.',
      metrics: {
        temperatureScore: Math.max(0, 100 - Math.abs((currentData.temperature || 25) - 25) * 3),
        humidityScore: Math.max(0, 100 - Math.abs((currentData.humidity || 60) - 60) * 2),
        soilScore: Math.max(0, 100 - Math.abs((currentData.soilHumidity || 50) - 50) * 2),
        lightScore: Math.max(0, 100 - Math.abs((currentData.light || 50) - 50) * 1.5),
        waterScore: (currentData.waterLevel || 50) > 20 ? 100 : (currentData.waterLevel || 0) * 4
      },
      trends: { improving: false, declining: false, stable: true },
      confidence: 65
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Plant health analysis failed - using fallback system',
        analysis: fallbackAnalysis,
        fallbackUsed: true,
        timestamp: Date.now()
      }, 
      { status: 500 }
    )
  }
}