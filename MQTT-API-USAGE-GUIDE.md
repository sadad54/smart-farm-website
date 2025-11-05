# 🚀 MQTT API Integration Guide

## ✅ MQTT APIs Successfully Created!

Your Next.js Smart Farm dashboard now has comprehensive MQTT integration with the following new API endpoints:

## 📋 New API Endpoints

### 1. **`/api/mqtt-command`** - Direct MQTT Commands
Send commands directly via MQTT protocol.

```typescript
// POST: Send command via MQTT
const response = await fetch('/api/mqtt-command', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'LIGHT',        // LIGHT, FAN, FEED, WATER, BUZZER, PIR_ALARM
    duration_ms: 3000,      // Optional, defaults to 3000
    device_id: 'farm_001'   // Optional, defaults to farm_001
  })
})

// Example Response:
{
  "success": true,
  "message": "Command 'LIGHT' sent via MQTT",
  "command_id": "1730742123456",
  "action": "LIGHT",
  "duration_ms": 3000,
  "device_id": "farm_001",
  "protocol": "mqtt",
  "mqtt_connected": true,
  "timestamp": 1730742123456
}
```

```typescript
// GET: Check MQTT status
const status = await fetch('/api/mqtt-command?include_data=true')
const data = await status.json()
// Returns: mqtt_connected, device_status, last_sensor_data
```

### 2. **`/api/smart-command`** - Intelligent Command Routing
Automatically chooses MQTT or HTTP based on availability (RECOMMENDED).

```typescript
// POST: Send smart command (MQTT first, HTTP fallback)
const response = await fetch('/api/smart-command', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'FAN',
    duration_ms: 5000,
    // force_protocol: 'mqtt'  // Optional: force specific protocol
  })
})

// Example Response:
{
  "success": true,
  "message": "Command 'FAN' sent successfully",
  "command_id": "1730742123456",
  "action": "FAN",
  "protocol_used": "mqtt",
  "fallback_used": false,
  "mqtt_connected": true,
  "sent_at": 1730742123456
}
```

```typescript
// GET: Command history and protocol statistics
const history = await fetch('/api/smart-command?device_id=farm_001&limit=20')
const data = await history.json()
// Returns: recent commands, protocol statistics, current status
```

### 3. **`/api/mqtt-status`** - Comprehensive MQTT Monitoring
Get detailed MQTT status, configuration, and health information.

```typescript
// GET: Detailed MQTT status
const status = await fetch('/api/mqtt-status')
const data = await status.json()

// GET: Human-readable status
const textStatus = await fetch('/api/mqtt-status?format=text')
const text = await textStatus.text()
```

```typescript
// POST: MQTT operations
const reconnect = await fetch('/api/mqtt-status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    operation: 'reconnect'  // or 'test_command'
  })
})
```

## 🔧 Integration Examples

### React Component Usage

```typescript
// components/MqttControls.tsx
'use client'

import { useState } from 'react'

export default function MqttControls() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<any>(null)

  const sendCommand = async (action: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/smart-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      
      const result = await response.json()
      console.log('Command result:', result)
      
      if (result.success) {
        alert(`✅ ${action} command sent via ${result.protocol_used.toUpperCase()}`)
      } else {
        alert(`❌ Failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Command error:', error)
      alert('❌ Network error')
    } finally {
      setLoading(false)
    }
  }

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/mqtt-status')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Status error:', error)
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">🚀 MQTT Smart Farm Controls</h2>
      
      {/* Status Display */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <button onClick={checkStatus} className="mb-2 px-4 py-2 bg-blue-500 text-white rounded">
          🔄 Check Status
        </button>
        
        {status && (
          <div className="text-sm">
            <p>📡 MQTT: {status.mqtt.connected ? '✅ Connected' : '❌ Disconnected'}</p>
            <p>🔋 Device: {status.mqtt.device_status}</p>
            <p>⏰ Last Update: {new Date(status.mqtt.timestamp).toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['LIGHT', 'FAN', 'FEED', 'WATER', 'BUZZER'].map((action) => (
          <button
            key={action}
            onClick={() => sendCommand(action)}
            disabled={loading}
            className="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50"
          >
            {loading ? '⏳' : getActionIcon(action)} {action}
          </button>
        ))}
      </div>
    </div>
  )
}

function getActionIcon(action: string) {
  const icons: Record<string, string> = {
    LIGHT: '💡',
    FAN: '🌀', 
    FEED: '🌾',
    WATER: '💧',
    BUZZER: '🔔'
  }
  return icons[action] || '⚡'
}
```

### API Route Integration

```typescript
// app/api/dashboard-command/route.ts - Wrapper for your existing dashboard
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Use smart command API internally
    const commandResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/smart-command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    
    const result = await commandResponse.json()
    
    // Log for analytics
    console.log(`Dashboard command: ${body.action} via ${result.protocol_used}`)
    
    return NextResponse.json(result)
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Dashboard command failed' },
      { status: 500 }
    )
  }
}
```

### Server Action Integration

```typescript
// lib/actions.ts - Server actions for your forms
'use server'

export async function sendFarmCommand(action: string, duration?: number) {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/smart-command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: action.toUpperCase(),
        duration_ms: duration || 3000
      })
    })
    
    const result = await response.json()
    return { success: result.success, data: result }
    
  } catch (error) {
    return { success: false, error: 'Failed to send command' }
  }
}
```

## 🎯 Recommended Usage Pattern

### For Your Dashboard Components:
```typescript
// Use smart-command API (recommended for UI)
const response = await fetch('/api/smart-command', {
  method: 'POST',
  body: JSON.stringify({ action: 'LIGHT' })
})
```

**Benefits:**
- ✅ Automatic MQTT/HTTP fallback
- ✅ Database logging included  
- ✅ Protocol statistics tracking
- ✅ Error handling built-in

### For Direct MQTT Testing:
```typescript
// Use mqtt-command API (for testing/debugging)
const response = await fetch('/api/mqtt-command', {
  method: 'POST', 
  body: JSON.stringify({ action: 'FAN' })
})
```

**Benefits:**
- ✅ Direct MQTT control
- ✅ Immediate feedback
- ✅ Protocol-specific testing

## 📊 Monitoring & Debugging

### Check Overall System Health:
```bash
curl http://localhost:3000/api/mqtt-status?format=text
```

### Monitor Command Success Rates:
```bash
curl http://localhost:3000/api/smart-command?limit=50
```

### Test MQTT Connection:
```bash
curl -X POST http://localhost:3000/api/mqtt-status \
  -H "Content-Type: application/json" \
  -d '{"operation":"test_command","action":"LIGHT"}'
```

## 🚨 Error Handling

### Common Error Responses:

```typescript
// MQTT not connected
{
  "success": false,
  "error": "MQTT client not connected", 
  "mqtt_connected": false,
  "suggestion": "MQTT broker may be down, try HTTP fallback endpoint"
}

// Invalid action
{
  "success": false,
  "error": "Invalid action. Must be one of: LIGHT, FAN, FEED, WATER, BUZZER, PIR_ALARM",
  "received": "INVALID_ACTION"
}

// Both protocols failed
{
  "success": false,
  "error": "Both MQTT and HTTP methods failed",
  "mqtt_connected": false,
  "fallback_attempted": true
}
```

## 🎉 Ready to Use!

Your MQTT integration is now complete with:

- ✅ **3 new API endpoints** for different use cases
- ✅ **Automatic MQTT client** running in background  
- ✅ **Real-time sensor data** processing
- ✅ **Intelligent command routing** with fallback
- ✅ **Comprehensive monitoring** and debugging tools
- ✅ **TypeScript support** with proper types
- ✅ **Error handling** and status reporting

**Start using it immediately:** The MQTT client connects automatically when your Next.js app starts!