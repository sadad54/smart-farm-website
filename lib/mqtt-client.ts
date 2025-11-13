import mqtt from 'mqtt'
import { supabaseAdmin } from '@/lib/supabase'

// MQTT Configuration - HiveMQ Cloud (Updated with new credentials)
const MQTT_CONFIG = {
  // ⚠️ CRITICAL: EMQX Serverless requires the /mqtt path
  broker: 'wss://mc91e0db.ala.asia-southeast1.emqxsl.com:8084/mqtt' ,
  options: {
    clientId: 'SmartFarm_Dashboard_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    username: 'smartfarm-dashboard',
    password: 'ams54$ADAD',
    clean: true,
    reconnectPeriod: 2000,
    keepalive: 30,
    connectTimeout: 10000,
    qos: 1,
    reschedulePings: true,
    protocol: 'wss' as const,
    rejectUnauthorized: false,
    will: {
      topic: 'smartfarm/dashboard/status',
      payload: JSON.stringify({ status: 'offline', timestamp: Date.now() }),
      qos: 1 as const,
      retain: true
    }
  }
}

// Device Configuration
const DEVICE_ID = 'farm_001'

// MQTT Topics
const TOPICS = {
  sensors: `smartfarm/${DEVICE_ID}/sensors/data`,
  commandsOut: `smartfarm/${DEVICE_ID}/commands/incoming`,
  commandsStatus: `smartfarm/${DEVICE_ID}/commands/status`,
  status: `smartfarm/${DEVICE_ID}/status`,
  emergency: `smartfarm/${DEVICE_ID}/emergency`
}

class SmartFarmMQTTClient {
  private client: mqtt.MqttClient | null = null
  private connected: boolean = false
  private lastSensorData: any = null
  private deviceStatus: string = 'unknown'
  private sensorDataCallbacks: ((data: any) => void)[] = []
  private connectionAttempts: number = 0
  private maxRetries: number = 5
  private isConnecting: boolean = false

  constructor() {
    this.connect()
  }

  // Initialize MQTT connection to HiveMQ Cloud
  public async connect() {
    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting) {
      console.log('⚠️ Connection attempt already in progress, skipping...')
      return
    }

    // Stop retrying after max attempts
    if (this.connectionAttempts >= this.maxRetries) {
      console.log(`❌ Maximum connection attempts (${this.maxRetries}) reached. Stopping retries.`)
      console.log('💡 Possible solutions:')
      console.log('   1. Check if ESP32 is disconnected (HiveMQ free tier = 1 connection max)')
      console.log('   2. Verify HiveMQ Cloud account status: https://console.hivemq.cloud/')
      console.log('   3. Check if credentials have special characters that need escaping')
      return
    }

    try {
      this.isConnecting = true
      this.connectionAttempts++

      console.log(`🌩️ Connecting to HiveMQ Cloud MQTT broker... (Attempt ${this.connectionAttempts}/${this.maxRetries})`)
      console.log(`📍 Broker: ${MQTT_CONFIG.broker}`)
      console.log(`👤 Username: ${MQTT_CONFIG.options.username}`)
      console.log(`🆔 Client ID: ${MQTT_CONFIG.options.clientId}`)
      console.log(`🔧 Protocol: ${MQTT_CONFIG.options.protocol}`)
      console.log(`⏱️ Connect Timeout: ${MQTT_CONFIG.options.connectTimeout}ms`)
      
      // Validate broker URL format
      if (!MQTT_CONFIG.broker.startsWith('wss://')) {
        throw new Error('Invalid broker URL - must use wss:// for web clients')
      }
      
      this.client = mqtt.connect(MQTT_CONFIG.broker, MQTT_CONFIG.options)

      this.client.on('connect', () => {
        console.log('✅ HiveMQ Cloud MQTT Connected successfully!')
        console.log('🔒 Secure WebSocket connection established')
        this.connected = true
        this.isConnecting = false
        this.connectionAttempts = 0 // Reset on successful connection
        
        // Subscribe to all device topics
        Object.values(TOPICS).forEach(topic => {
          this.client?.subscribe(topic, (err) => {
            if (!err) {
              console.log(`📡 Subscribed to: ${topic}`)
            } else {
              console.error(`❌ Failed to subscribe to ${topic}:`, err)
            }
          })
        })

        // Publish dashboard online status
        this.publishDashboardStatus('online')
      })

      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message)
      })

      this.client.on('error', (error: any) => {
        console.error('❌ HiveMQ Cloud MQTT Error:', error)
        
        // Enhanced error diagnostics
        if (error.code === 5) {
          console.error('� MQTT Error Code 5: Connection refused - Not authorized')
          console.error('   ❌ Username or password is incorrect')
          console.error('   ❌ Account may be suspended or expired')
          console.error('   ❌ Client limit may be exceeded')
          console.error('   💡 Check HiveMQ Cloud console: https://console.hivemq.cloud/')
        } else if (error.code === 4) {
          console.error('🚨 MQTT Error Code 4: Connection refused - Bad username or password')
        } else if (error.code === 3) {
          console.error('🚨 MQTT Error Code 3: Connection refused - Server unavailable')
        } else if (error.code === 2) {
          console.error('🚨 MQTT Error Code 2: Connection refused - Identifier rejected')
        } else if (error.code === 1) {
          console.error('🚨 MQTT Error Code 1: Connection refused - Unacceptable protocol version')
        }
        
        console.error(`🔍 Full error details:`, {
          code: error.code,
          message: error.message,
          name: error.name,
          stack: error.stack?.split('\n')[0]
        })
        
        this.connected = false
      })

      this.client.on('close', () => {
        console.log('📡 HiveMQ Cloud MQTT Connection closed')
        this.connected = false
      })

      this.client.on('reconnect', () => {
        console.log('🔄 HiveMQ Cloud MQTT Reconnecting...')
        console.log(`🔄 Attempt with Client ID: ${MQTT_CONFIG.options.clientId}`)
      })

      this.client.on('disconnect', () => {
        console.log('🔌 HiveMQ Cloud MQTT Disconnected')
        this.connected = false
      })

      this.client.on('offline', () => {
        console.log('📴 HiveMQ Cloud MQTT Client offline')
        this.connected = false
      })

    } catch (error) {
      console.error('❌ HiveMQ Cloud MQTT Connection failed:', error)
      console.error('💡 Verify HiveMQ Cloud credentials and cluster availability')
    }
  }

  // Handle incoming MQTT messages
  private async handleMessage(topic: string, message: Buffer) {
    try {
      const data = JSON.parse(message.toString())
      console.log(`📨 MQTT Message - Topic: ${topic}`)

      switch (topic) {
        case TOPICS.sensors:
          await this.handleSensorData(data)
          break
        
        case TOPICS.commandsStatus:
          await this.handleCommandStatus(data)
          break
        
        case TOPICS.status:
          await this.handleDeviceStatus(data)
          break
        
        case TOPICS.emergency:
          await this.handleEmergencyAlert(data)
          break
      }
    } catch (error) {
      console.error('❌ Error processing MQTT message:', error)
    }
  }

  // Process sensor data and save to Supabase
  private async handleSensorData(data: any) {
    console.log('📊 Processing sensor data:', JSON.stringify(data, null, 2))
    console.log('🔍 Data structure keys:', Object.keys(data))
    
    // Update local cache immediately with timestamp
    this.lastSensorData = {
      ...data,
      lastUpdated: new Date().toISOString(),
      receivedAt: Date.now()
    }
    console.log('✅ Updated lastSensorData cache at', new Date().toLocaleTimeString())
    
    // Notify subscribers immediately with new data
    this.sensorDataCallbacks.forEach(callback => {
      queueMicrotask(() => {
        try {
          callback(data)
        } catch (error) {
          console.error('❌ Error in sensor data callback:', error)
        }
      })
    })

    try {
      // Extract readings from the ESP32 format
      const readings = data.readings || []
      
      // Prepare individual sensor readings for database
      const sensorReadings = []
      
      for (const reading of readings) {
        sensorReadings.push({
          device_id: data.device_id,
          metric: reading.metric,
          value: parseFloat(reading.value),
          unit: this.getUnitForMetric(reading.metric),
          timestamp: new Date(data.timestamp)
        })
      }

      // Insert sensor readings
      if (sensorReadings.length > 0) {
        const { error: readingsError } = await supabaseAdmin
          .from('sensor_readings')
          .insert(sensorReadings)

        if (readingsError) {
          console.error('❌ Error saving sensor readings:', readingsError)
        } else {
          console.log(`✅ Saved ${sensorReadings.length} sensor readings to database`)
        }
      }

      // Update device status (optional - table may not exist)
      try {
        const deviceStatus = data.status || {}
        const { error: statusError } = await supabaseAdmin
          .from('device_status')
          .upsert({
            device_id: data.device_id,
            last_seen: new Date(),
            led_state: deviceStatus.led || false,
            fan_state: deviceStatus.fan || false,
            servo_state: deviceStatus.servo || false,
            wifi_rssi: deviceStatus.wifi_rssi || null,
            uptime_seconds: deviceStatus.uptime || null
          }, {
            onConflict: 'device_id'
          })
          
        if (statusError) {
          // Don't flood console with table errors - this is optional functionality
          console.log('📝 Device status tracking not configured (optional feature)')
        } else {
          console.log('✅ Device status updated')
        }
      } catch (err) {
        // Silently ignore device status table errors - this is optional functionality
      }

    } catch (error) {
      console.error('❌ Error saving sensor data:', error)
    }
  }

  // Handle command acknowledgments
  private async handleCommandStatus(data: any) {
    console.log('✅ Command completed:', data)
    
    try {
      // First try to find the command by MQTT command ID (preferred method)
      let { data: command, error: fetchError } = await supabaseAdmin
        .from('device_commands')
        .select('*')
        .eq('mqtt_command_id', data.command_id)
        .eq('device_id', data.device_id || 'farm_001')
        .single()

      // If not found by MQTT ID, fall back to finding recent pending command
      if (fetchError || !command) {
        console.log('⚠️ Command not found by MQTT ID, trying fallback method...')
        
        const { data: commands, error: fallbackError } = await supabaseAdmin
          .from('device_commands')
          .select('*')
          .eq('device_id', data.device_id || 'farm_001')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)

        if (fallbackError || !commands || commands.length === 0) {
          console.log('⚠️ No pending commands found to update')
          return
        }
        
        command = commands[0]
      }
      
      // Update the found command
      const { error: updateError } = await supabaseAdmin
        .from('device_commands')
        .update({
          status: data.status,
          completed_at: new Date(data.completed_at || Date.now()),
          updated_at: new Date()
        })
        .eq('id', command.id)

      if (!updateError) {
        console.log(`✅ Database command ${command.id} marked as ${data.status} (MQTT ID: ${data.command_id})`)
      } else {
        console.error('❌ Error updating command status:', updateError)
      }
    } catch (error) {
      console.error('❌ Error updating command status:', error)
    }
  }

  // Handle device heartbeat/status
  private async handleDeviceStatus(data: any) {
    console.log('💓 Device heartbeat:', data)
    this.deviceStatus = data.status
    
    try {
      const { error } = await supabaseAdmin
        .from('device_status')
        .upsert({
          device_id: data.device_id,
          last_seen: new Date(),
          status: data.status,
          wifi_rssi: data.wifi_rssi,
          uptime_seconds: data.uptime_seconds,
          free_heap: data.free_heap,
          mqtt_connected: data.mqtt_connected
        }, {
          onConflict: 'device_id'
        })

      if (error) {
        console.log('📝 Device status tracking not configured (optional feature)')
      } else {
        console.log('✅ Device heartbeat updated')
      }
    } catch (error) {
      // Silently ignore device status table errors - this is optional functionality
    }
  }

  // Handle emergency alerts
  private async handleEmergencyAlert(data: any) {
    console.log('🚨 EMERGENCY ALERT:', data)
    
    try {
      const { error } = await supabaseAdmin
        .from('emergency_events')
        .insert({
          device_id: data.device_id,
          alert_type: data.alert_type,
          trigger: data.trigger,
          timestamp: new Date(data.timestamp),
          uptime_seconds: data.uptime_seconds,
          wifi_rssi: data.wifi_rssi
        })

      if (!error) {
        console.log('✅ Emergency event logged')
      }
    } catch (error) {
      console.error('❌ Error logging emergency event:', error)
    }
  }

  // Send command to ESP32
  public sendCommand(action: string, duration: number = 3000): string | null {
    return this.sendCommandWithId(action, duration, Date.now().toString())
  }

  // Send command to ESP32 with specific command ID
  public sendCommandWithId(action: string, duration: number = 3000, commandId: string): string | null {
    if (!this.connected || !this.client) {
      console.error('❌ Cannot send command - MQTT not connected')
      return null
    }

    const command = {
      action: action.toUpperCase(),
      duration_ms: duration,
      command_id: commandId,
      timestamp: Date.now(),
      source: 'dashboard'
    }

    this.client.publish(TOPICS.commandsOut, JSON.stringify(command), (error) => {
      if (error) {
        console.error('❌ Failed to send command:', error)
      } else {
        console.log(`✅ Command sent: ${action}`)
      }
    })

    return command.command_id
  }

  // Publish dashboard status
  private publishDashboardStatus(status: string) {
    if (this.client && this.connected) {
      const statusMsg = {
        status: status,
        timestamp: Date.now(),
        client_id: MQTT_CONFIG.options.clientId
      }

      this.client.publish('smartfarm/dashboard/status', JSON.stringify(statusMsg), { retain: true })
    }
  }

  // Get helper method for units
  private getUnitForMetric(metric: string): string {
    const unitMap: Record<string, string> = {
      temperature: '°C',
      humidity: '%',
      soil_moisture: '%',
      water_level: '%',
      light_level: '%',
      steam: '%',
      distance: 'cm',
      motion_detected: 'boolean'
    }
    return unitMap[metric] || ''
  }

  // Public getters
  public isConnected(): boolean {
    return this.connected && this.client?.connected === true
  }

  public getLastSensorData(): any {
    return this.lastSensorData
  }

  public getDeviceStatus(): string {
    return this.deviceStatus
  }

  // Subscribe to live sensor data updates
  public onSensorData(callback: (data: any) => void): () => void {
    this.sensorDataCallbacks.push(callback)
    // Return unsubscribe function
    return () => {
      const index = this.sensorDataCallbacks.indexOf(callback)
      if (index > -1) {
        this.sensorDataCallbacks.splice(index, 1)
      }
    }
  }

  // Disconnect
  public disconnect() {
    if (this.client) {
      this.publishDashboardStatus('offline')
      this.client.end()
      this.connected = false
    }
  }
}

// Export singleton instance
const smartFarmMQTT = new SmartFarmMQTTClient()

export default smartFarmMQTT
export { TOPICS, DEVICE_ID }