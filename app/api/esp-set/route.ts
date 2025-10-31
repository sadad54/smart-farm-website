import { NextRequest, NextResponse } from 'next/server'

// GET/POST /api/esp-set -> proxies to ESP32 /set endpoint
export async function GET(request: NextRequest) {
  const value = request.nextUrl.searchParams.get('value')
  return forwardToESP(value)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const value = body?.value ?? null
    return forwardToESP(value)
  } catch (error: any) {
    console.error('ESP SET POST Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

async function forwardToESP(value: string | null) {
  const ESP_BASE_URL = process.env.ESP_BASE_URL || process.env.NEXT_PUBLIC_ESP_BASE_URL
  
  if (!ESP_BASE_URL) {
    console.log('ESP_BASE_URL not configured')
    return NextResponse.json({ error: 'ESP_BASE_URL not configured' }, { status: 500 })
  }
  
  if (!value) {
    return NextResponse.json({ error: 'value parameter required' }, { status: 400 })
  }

  const espUrl = `${ESP_BASE_URL.replace(/\/$/, '')}/set?value=${encodeURIComponent(value)}`
  console.log(`Proxying SET request to: ${espUrl}`)
  
  try {
    const response = await fetch(espUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined,
    })
    
    const text = await response.text().catch(() => '')
    console.log(`ESP SET Response: ${response.status} - ${text || 'OK'}`)
    
    return new NextResponse(text || 'OK', {
      status: response.status,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch (error: any) {
    console.error('ESP SET Error:', error.message)
    return NextResponse.json({ 
      error: error.message, 
      url: espUrl 
    }, { status: 502 })
  }
}