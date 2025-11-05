// Example MQTT integration for Next.js Smart Farm Dashboard
// Save as: pages/api/mqtt-handler.js or lib/mqtt-client.js

import mqtt from 'mqtt';
import { createClient } from '@supabase/supabase-js';

// MQTT Configuration (update with your broker details)
const MQTT_CONFIG = {
  broker: 'mqtt://broker.hivemq.com:1883', // Change to your broker
  // For secure connection:
  // broker: 'mqtts://your-cluster.s2.eu.hivemq.cloud:8883',
  // username: 'your_username',
  // password: 'your_password',
  clientId: 'SmartFarm_Dashboard_' + Math.random().toString(16).substr(2, 8),
  options: {
    keepalive: 60,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
    will: {
      topic: 'smartfarm/dashboard/status',
      payload: JSON.stringify({ status: 'offline', timestamp: Date.now() }),
      qos: 1,
      retain: true
    }
  }
};

// Supabase Configuration (your existing setup)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Device Configuration
const DEVICE_ID = 'farm_001'; // Match your ESP32 DEVICE_ID

// MQTT Topics
const TOPICS = {
  sensors: `smartfarm/${DEVICE_ID}/sensors/data`,
  commandsOut: `smartfarm/${DEVICE_ID}/commands/incoming`,
  commandsStatus: `smartfarm/${DEVICE_ID}/commands/status`,
  status: `smartfarm/${DEVICE_ID}/status`,
  emergency: `smartfarm/${DEVICE_ID}/emergency`
};

class SmartFarmMQTT {
  constructor() {
    this.client = null;
    this.connected = false;
    this.lastSensorData = null;
    this.deviceStatus = 'unknown';
  }

  // Initialize MQTT connection
  async connect() {
    try {
      console.log('🔌 Connecting to MQTT broker...');
      
      this.client = mqtt.connect(MQTT_CONFIG.broker, MQTT_CONFIG.options);

      this.client.on('connect', () => {
        console.log('✅ MQTT Connected to broker');
        this.connected = true;
        
        // Subscribe to all device topics
        Object.values(TOPICS).forEach(topic => {
          this.client.subscribe(topic, (err) => {
            if (!err) {
              console.log(`📡 Subscribed to: ${topic}`);
            } else {
              console.error(`❌ Failed to subscribe to ${topic}:`, err);
            }
          });
        });

        // Publish dashboard online status
        this.publishDashboardStatus('online');
      });

      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });

      this.client.on('error', (error) => {
        console.error('❌ MQTT Error:', error);
        this.connected = false;
      });

      this.client.on('close', () => {
        console.log('📡 MQTT Connection closed');
        this.connected = false;
      });

      this.client.on('reconnect', () => {
        console.log('🔄 MQTT Reconnecting...');
      });

    } catch (error) {
      console.error('❌ MQTT Connection failed:', error);
    }
  }

  // Handle incoming MQTT messages
  async handleMessage(topic, message) {
    try {
      const data = JSON.parse(message.toString());
      console.log(`📨 MQTT Message - Topic: ${topic}`);

      switch (topic) {
        case TOPICS.sensors:
          await this.handleSensorData(data);
          break;
        
        case TOPICS.commandsStatus:
          await this.handleCommandStatus(data);
          break;
        
        case TOPICS.status:
          await this.handleDeviceStatus(data);
          break;
        
        case TOPICS.emergency:
          await this.handleEmergencyAlert(data);
          break;
      }
    } catch (error) {
      console.error('❌ Error processing MQTT message:', error);
    }
  }

  // Process sensor data and save to Supabase
  async handleSensorData(data) {
    console.log('📊 Processing sensor data:', data);
    this.lastSensorData = data;

    try {
      // Save to Supabase sensor_readings table
      const { error } = await supabase
        .from('sensor_readings')
        .insert({
          device_id: data.device_id,
          temperature: data.readings?.find(r => r.metric === 'temperature')?.value,
          humidity: data.readings?.find(r => r.metric === 'humidity')?.value,
          soil_moisture: data.readings?.find(r => r.metric === 'soil_moisture')?.value,
          water_level: data.readings?.find(r => r.metric === 'water_level')?.value,
          light_level: data.readings?.find(r => r.metric === 'light_level')?.value,
          steam: data.readings?.find(r => r.metric === 'steam')?.value,
          distance: data.readings?.find(r => r.metric === 'distance')?.value,
          motion_detected: data.readings?.find(r => r.metric === 'motion_detected')?.value === 1,
          timestamp: new Date(data.timestamp)
        });

      if (error) {
        console.error('❌ Supabase insert error:', error);
      } else {
        console.log('✅ Sensor data saved to Supabase');
      }
    } catch (error) {
      console.error('❌ Error saving sensor data:', error);
    }
  }

  // Handle command acknowledgments
  async handleCommandStatus(data) {
    console.log('✅ Command completed:', data);
    
    // Update command status in database
    try {
      const { error } = await supabase
        .from('device_commands')
        .update({
          status: data.status,
          completed_at: new Date(data.completed_at)
        })
        .eq('id', data.command_id);

      if (!error) {
        console.log(`✅ Command ${data.command_id} marked as completed`);
      }
    } catch (error) {
      console.error('❌ Error updating command status:', error);
    }
  }

  // Handle device heartbeat/status
  async handleDeviceStatus(data) {
    console.log('💓 Device heartbeat:', data);
    this.deviceStatus = data.status;
    
    // Update device status in database
    try {
      const { error } = await supabase
        .from('devices')
        .upsert({
          device_id: data.device_id,
          last_seen: new Date(),
          status: data.status,
          wifi_rssi: data.wifi_rssi,
          uptime_seconds: data.uptime_seconds,
          free_heap: data.free_heap,
          mqtt_connected: data.mqtt_connected
        });

      if (!error) {
        console.log('✅ Device status updated');
      }
    } catch (error) {
      console.error('❌ Error updating device status:', error);
    }
  }

  // Handle emergency alerts
  async handleEmergencyAlert(data) {
    console.log('🚨 EMERGENCY ALERT:', data);
    
    // Save to emergency log
    try {
      const { error } = await supabase
        .from('emergency_events')
        .insert({
          device_id: data.device_id,
          alert_type: data.alert_type,
          trigger: data.trigger,
          timestamp: new Date(data.timestamp),
          uptime_seconds: data.uptime_seconds,
          wifi_rssi: data.wifi_rssi
        });

      // You could also send notifications here (email, SMS, push notification)
      
      if (!error) {
        console.log('✅ Emergency event logged');
      }
    } catch (error) {
      console.error('❌ Error logging emergency event:', error);
    }
  }

  // Send command to ESP32
  sendCommand(action, duration = 3000) {
    if (!this.connected || !this.client) {
      console.error('❌ Cannot send command - MQTT not connected');
      return false;
    }

    const command = {
      action: action.toUpperCase(),
      duration_ms: duration,
      command_id: Date.now().toString(),
      timestamp: Date.now(),
      source: 'dashboard'
    };

    this.client.publish(TOPICS.commandsOut, JSON.stringify(command), (error) => {
      if (error) {
        console.error('❌ Failed to send command:', error);
      } else {
        console.log(`✅ Command sent: ${action}`);
      }
    });

    return command.command_id;
  }

  // Publish dashboard status
  publishDashboardStatus(status) {
    if (this.client && this.connected) {
      const statusMsg = {
        status: status,
        timestamp: Date.now(),
        client_id: MQTT_CONFIG.clientId
      };

      this.client.publish('smartfarm/dashboard/status', JSON.stringify(statusMsg), { retain: true });
    }
  }

  // Get current connection status
  isConnected() {
    return this.connected && this.client && this.client.connected;
  }

  // Get latest sensor data
  getLastSensorData() {
    return this.lastSensorData;
  }

  // Disconnect
  disconnect() {
    if (this.client) {
      this.publishDashboardStatus('offline');
      this.client.end();
      this.connected = false;
    }
  }
}

// Export singleton instance
const smartFarmMQTT = new SmartFarmMQTT();

// Auto-connect when module is imported
if (typeof window === 'undefined') { // Server-side only
  smartFarmMQTT.connect();
}

export default smartFarmMQTT;

// Example usage in API routes:
export const handler = async (req, res) => {
  switch (req.method) {
    case 'POST':
      // Send command to ESP32
      const { action, duration } = req.body;
      const commandId = smartFarmMQTT.sendCommand(action, duration);
      
      res.json({ 
        success: true, 
        command_id: commandId,
        mqtt_connected: smartFarmMQTT.isConnected()
      });
      break;

    case 'GET':
      // Get current status
      res.json({
        mqtt_connected: smartFarmMQTT.isConnected(),
        device_status: smartFarmMQTT.deviceStatus,
        last_sensor_data: smartFarmMQTT.getLastSensorData()
      });
      break;

    default:
      res.status(405).json({ error: 'Method not allowed' });
  }
};

/* 
USAGE EXAMPLES:

1. In your API route (pages/api/device-command.js):
   import smartFarmMQTT from '../../lib/mqtt-client';
   
   export default function handler(req, res) {
     if (req.method === 'POST') {
       const commandId = smartFarmMQTT.sendCommand(req.body.action);
       res.json({ success: true, command_id: commandId });
     }
   }

2. In your React component:
   const handleLightToggle = async () => {
     const response = await fetch('/api/device-command', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ action: 'LIGHT' })
     });
     const result = await response.json();
     console.log('Command sent:', result);
   };

3. Environment Variables (.env.local):
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   MQTT_BROKER_URL=mqtt://broker.hivemq.com:1883
*/