import { NextResponse } from "next/server"

// GET /api/esp/dht -> proxies to `${ESP_BASE_URL}/dht`
export async function GET() {
  const base = process.env.ESP_BASE_URL || process.env.NEXT_PUBLIC_ESP_BASE_URL
  if (!base) {
    return NextResponse.json({ error: "ESP_BASE_URL not configured" }, { status: 500 })
  }

  const url = `${base.replace(/\/$/, "")}/dht`
  try {
    const res = await fetch(url, {
      // avoid caches
      cache: "no-store",
      // 3s timeout via AbortController
      signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined,
    })
    const text = await res.text()

    // Return as text/plain for compatibility with the existing parser
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: String(err), url }, { status: 502 })
  }
}
