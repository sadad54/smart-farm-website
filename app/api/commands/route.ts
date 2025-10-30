import { supabaseAdmin } from '@/lib/supabase'
import { NextRequest } from 'next/server'

// GET /api/commands?device_id=farm_001&status=pending
// ESP32 polls this to get pending commands
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const device_id = searchParams.get('device_id')
    const status = searchParams.get('status') || 'pending'

    if (!device_id) {
      return Response.json(
        { error: 'device_id required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('device_commands')
      .select('*')
      .eq('device_id', device_id)
      .eq('acknowledged', false)
      .order('created_at', { ascending: true })
      .limit(10)

    if (error) throw error

    return Response.json(data || [])
  } catch (error) {
    console.error('Commands GET error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/commands
// Dashboard uses this to send commands to ESP32
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { device_id, action, duration_ms } = body

    if (!device_id || !action) {
      return Response.json(
        { error: 'device_id and action required' },
        { status: 400 }
      )
    }

    const command = {
      action,
      duration_ms: duration_ms || 3000
    }

    const { data, error } = await supabaseAdmin
      .from('device_commands')
      .insert({
        device_id,
        command,
        acknowledged: false
      })
      .select()
      .single()

    if (error) throw error

    return Response.json({ success: true, command: data })
  } catch (error) {
    console.error('Commands POST error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/commands
// ESP32 uses this to acknowledge command execution
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { command_id, status } = body

    if (!command_id) {
      return Response.json(
        { error: 'command_id required' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('device_commands')
      .update({
        acknowledged: true,
        executed_at: new Date().toISOString()
      })
      .eq('id', command_id)

    if (error) throw error

    return Response.json({ success: true })
  } catch (error) {
    console.error('Commands PATCH error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}