import mqtt from 'mqtt'
import { supabaseAdmin } from '@/lib/supabase'

// MQTT Configuration
const MQTT_CONFIG = {
  broker: 'mqtt://test.mosquitto.org:1883',
  clientId: 'SmartFarm_Dashboard_' + Math.random().toString(16).substr(2, 8),
  options: {
    keepalive: 60,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
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

  constructor() {
    this.connect()
  }

  // Initialize MQTT connection
  public async connect() {
    try {
      console.log('🔌 Connecting to MQTT broker...')
      
      this.client = mqtt.connect(MQTT_CONFIG.broker, MQTT_CONFIG.options)

      this.client.on('connect', () => {
        console.log('✅ MQTT Connected to broker')
        this.connected = true
        
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

      this.client.on('error', (error) => {
        console.error('❌ MQTT Error:', error)
        this.connected = false
      })

      this.client.on('close', () => {
        console.log('📡 MQTT Connection closed')
        this.connected = false
      })

      this.client.on('reconnect', () => {
        console.log('🔄 MQTT Reconnecting...')
      })

    } catch (error) {
      console.error('❌ MQTT Connection failed:', error)
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
    console.log('📊 Processing sensor data:', data)
    this.lastSensorData = data
    
    // Notify all subscribers of new sensor data
    this.sensorDataCallbacks.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('❌ Error in sensor data callback:', error)
      }
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

      // Update device status
      const deviceStatus = data.status || {}
      const { error: statusError } = await supabaseAdmin
        .from('devices')
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
        console.error('❌ Error updating device status:', statusError)
      } else {
        console.log('✅ Device status updated')
      }

    } catch (error) {
      console.error('❌ Error saving sensor data:', error)
    }
  }

  // Handle command acknowledgments
  private async handleCommandStatus(data: any) {
    console.log('✅ Command completed:', data)
    
    try {
      const { error } = await supabaseAdmin
        .from('device_commands')
        .update({
          status: data.status,
          completed_at: new Date(data.completed_at)
        })
        .eq('id', data.command_id)

      if (!error) {
        console.log(`✅ Command ${data.command_id} marked as completed`)
      } else {
        console.error('❌ Error updating command status:', error)
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
        .from('devices')
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

      if (!error) {
        console.log('✅ Device heartbeat updated')
      }
    } catch (error) {
      console.error('❌ Error updating device heartbeat:', error)
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
    if (!this.connected || !this.client) {
      console.error('❌ Cannot send command - MQTT not connected')
      return null
    }

    const command = {
      action: action.toUpperCase(),
      duration_ms: duration,
      command_id: Date.now().toString(),
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
        client_id: MQTT_CONFIG.clientId
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