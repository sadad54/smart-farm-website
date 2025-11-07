// ESP32 Communication Diagnostic Tool
// Save this as test-communication.html and open in browser

const diagnostics = {
  async testMQTTConnection() {
    console.log('🔍 Testing MQTT Connection...')
    
    try {
      const response = await fetch('/api/mqtt-command', {
        method: 'GET'
      })
      
      const result = await response.json()
      console.log('📊 MQTT Status:', result)
      
      return result.mqtt_connected
    } catch (error) {
      console.error('❌ MQTT connection test failed:', error)
      return false
    }
  },

  async testFeedCommand() {
    console.log('🍽️ Testing Feed Command (C)...')
    
    try {
      const response = await fetch('/api/mqtt-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'C',
          duration_ms: 3000,
          device_id: 'farm_001'
        })
      })

      const result = await response.json()
      console.log('📨 Feed Command Result:', result)
      
      if (result.success) {
        console.log('✅ Command sent successfully!')
        console.log('   🆔 Command ID:', result.command_id)
        console.log('   📡 Protocol:', result.protocol)
        console.log('   🔗 MQTT Connected:', result.mqtt_connected)
        
        // Wait for command acknowledgment
        console.log('⏳ Waiting for ESP32 acknowledgment...')
        setTimeout(() => {
          console.log('💡 Check ESP32 Serial Monitor for "🍽️ MANUAL FEED command received"')
        }, 2000)
        
        return true
      } else {
        console.log('❌ Command failed:', result.error)
        return false
      }
    } catch (error) {
      console.error('❌ Feed command test failed:', error)
      return false
    }
  },

  async testSensorData() {
    console.log('📊 Testing Sensor Data Reception...')
    
    try {
      const response = await fetch('/api/mqtt-sensor-data')
      const result = await response.json()
      
      console.log('📡 Sensor Data:', result)
      
      if (result.data) {
        console.log('✅ Receiving sensor data!')
        console.log('   🌡️ Temperature:', result.data.temperature, '°C')
        console.log('   📏 Distance:', result.data.distance, 'cm')
        console.log('   🍽️ Feeding Box Open:', result.data.feeding_box_open)
        console.log('   🤖 Auto Feeding Enabled:', result.data.auto_feeding_enabled)
        return true
      } else {
        console.log('⚠️ No sensor data available')
        return false
      }
    } catch (error) {
      console.error('❌ Sensor data test failed:', error)
      return false
    }
  },

  async runFullDiagnostic() {
    console.log('🔧 ESP32 Communication Full Diagnostic')
    console.log('=====================================')
    
    const results = {
      mqttConnected: await this.testMQTTConnection(),
      sensorData: await this.testSensorData(),
      feedCommand: await this.testFeedCommand()
    }
    
    console.log('\n📋 Diagnostic Summary:')
    console.log('=====================================')
    console.log('MQTT Connection:', results.mqttConnected ? '✅ Connected' : '❌ Failed')
    console.log('Sensor Data:', results.sensorData ? '✅ Receiving' : '❌ No Data')
    console.log('Feed Command:', results.feedCommand ? '✅ Sent' : '❌ Failed')
    
    if (results.mqttConnected && results.sensorData && results.feedCommand) {
      console.log('\n✅ All tests passed! Communication should be working.')
      console.log('💡 If buttons still don\'t work, check browser console for errors.')
    } else {
      console.log('\n❌ Some tests failed. Check the issues above.')
    }
    
    return results
  }
}

// Auto-run diagnostic if in browser
if (typeof window !== 'undefined') {
  window.esp32Diagnostics = diagnostics
  console.log('🔧 ESP32 Diagnostics loaded!')
  console.log('   Run: esp32Diagnostics.runFullDiagnostic()')
  console.log('   Or individual tests:')
  console.log('   - esp32Diagnostics.testMQTTConnection()')
  console.log('   - esp32Diagnostics.testSensorData()')
  console.log('   - esp32Diagnostics.testFeedCommand()')
}

export default diagnostics