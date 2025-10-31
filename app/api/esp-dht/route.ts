import { NextRequest, NextResponse } from 'next/server'

// Retry utility function
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return response;
      }
      
      // If not OK but not a network error, don't retry
      if (attempt === maxRetries + 1) {
        return response;
      }
      
    } catch (error: any) {
      lastError = error;
      console.log(`ESP32 connection attempt ${attempt} failed:`, error.message);
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries + 1) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 500));
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

// GET /api/esp-dht -> proxies to ESP32 /dht endpoint with retry logic
export async function GET() {
  const ESP_BASE_URL = process.env.ESP_BASE_URL || process.env.NEXT_PUBLIC_ESP_BASE_URL
  
  if (!ESP_BASE_URL) {
    console.log('ESP_BASE_URL not configured')
    return NextResponse.json({ error: 'ESP_BASE_URL not configured' }, { status: 500 })
  }

  const espUrl = `${ESP_BASE_URL.replace(/\/$/, '')}/dht`
  console.log(`Proxying DHT request to: ${espUrl}`)
  
  try {
    const response = await fetchWithRetry(espUrl, {
      cache: 'no-store',
      headers: {
        'Accept': 'text/html,text/plain,*/*',
        'User-Agent': 'SmartFarm-Dashboard/1.0',
      }
    });
    
    const text = await response.text()
    console.log(`ESP DHT Response: ${response.status} - ${text.substring(0, 100)}...`)
    
    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error: any) {
    console.error('ESP DHT Error after retries:', error.message)
    
    // Return a fallback response with last known good values or default values
    const fallbackData = `<h3>📊 Live Sensors</h3>Temperature:</b> <b>25.0</b>°C<br/>Humidity:</b> <b>50.0</b>%<br/>SoilHumidity:</b> <b>0.0</b>%<br/>WaterLevel:</b> <b>0.0</b>%<br/>Steam:</b> <b>0.0</b>%<br/>Light:</b> <b>40.0</b><br/>Distance:</b> <b>15.0</b>cm`;
    
    return new NextResponse(fallbackData, {
      status: 200, // Return 200 with fallback data to prevent UI errors
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'X-Fallback-Data': 'true', // Indicate this is fallback data
      },
    })
  }
}