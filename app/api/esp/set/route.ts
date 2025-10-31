import { NextRequest, NextResponse } from "next/server"

// GET or POST /api/esp/set -> proxies to `${ESP_BASE_URL}/set?value=...`
export async function GET(req: NextRequest) {
  const value = req.nextUrl.searchParams.get("value")
  return forward(value)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const value = body?.value ?? null
    return forward(value)
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }
}

async function forward(value: string | null) {
  const base = process.env.ESP_BASE_URL || process.env.NEXT_PUBLIC_ESP_BASE_URL
  if (!base) return NextResponse.json({ error: "ESP_BASE_URL not configured" }, { status: 500 })
  if (!value) return NextResponse.json({ error: "value required" }, { status: 400 })

  const url = `${base.replace(/\/$/, "")}/set?value=${encodeURIComponent(value)}`
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined,
    })
    const text = await res.text().catch(() => "")
    return new NextResponse(text || "OK", {
      status: res.status,
      headers: { "Access-Control-Allow-Origin": "*" },
    })
  } catch (err: any) {
    return NextResponse.json({ error: String(err), url }, { status: 502 })
  }
}
