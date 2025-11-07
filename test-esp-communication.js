// Test ESP32 Communication Script
// Run this to test if commands are being sent properly

const testCommand = async (action, description) => {
  console.log(`\n🧪 Testing ${description} (${action})...`)
  
  try {
    const response = await fetch('http://localhost:3000/api/mqtt-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: action,
        duration_ms: 3000,
        device_id: 'farm_001'
      })
    })

    const result = await response.json()
    
    if (response.ok && result.success) {
      console.log(`✅ ${description} command sent successfully`)
      console.log(`   Command ID: ${result.command_id}`)
      console.log(`   Action: ${result.action}`)
      console.log(`   Protocol: ${result.protocol}`)
    } else {
      console.log(`❌ ${description} command failed:`, result.error)
    }
  } catch (error) {
    console.log(`❌ ${description} command error:`, error.message)
  }
}

// Test all commands
async function runTests() {
  console.log('🔧 ESP32 Communication Test Suite')
  console.log('==================================')
  
  await testCommand('A', 'Light Toggle')
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  await testCommand('B', 'Fan Toggle') 
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  await testCommand('C', 'Feed Command')
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  await testCommand('D', 'Water Pump')
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  await testCommand('E', 'Buzzer/Alarm')
  
  console.log('\n✨ Test completed! Check ESP32 serial monitor for responses.')
}

// For Node.js environment
if (typeof window === 'undefined') {
  // Add fetch polyfill for Node.js
  const fetch = require('node-fetch')
  global.fetch = fetch
  runTests()
} else {
  // For browser environment
  window.testESP32Communication = runTests
}