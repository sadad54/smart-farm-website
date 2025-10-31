import { NextRequest, NextResponse } from 'next/server'

// GET /api/esp-dht -> proxies to ESP32 /dht endpoint
export async function GET() {
  const ESP_BASE_URL = process.env.ESP_BASE_URL || process.env.NEXT_PUBLIC_ESP_BASE_URL
  
  if (!ESP_BASE_URL) {
    console.log('ESP_BASE_URL not configured')
    return NextResponse.json({ error: 'ESP_BASE_URL not configured' }, { status: 500 })
  }

  const espUrl = `${ESP_BASE_URL.replace(/\/$/, '')}/dht`
  console.log(`Proxying DHT request to: ${espUrl}`)
  
  try {
    const response = await fetch(espUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined,
    })
    
    const text = await response.text()
    console.log(`ESP DHT Response: ${response.status} - ${text}`)
    
    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error: any) {
    console.error('ESP DHT Error:', error.message)
    return NextResponse.json({ 
      error: error.message, 
      url: espUrl 
    }, { status: 502 })
  }
}