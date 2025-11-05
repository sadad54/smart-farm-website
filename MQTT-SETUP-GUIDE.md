# 🚀 Smart Farm MQTT Setup Guide

## ✅ MQTT Implementation Complete!

Your ESP32 Smart Farm system has been successfully converted to use MQTT protocol while maintaining all existing HTTP functionality as backup.

## 📋 What Changed

### ✨ New Features:
- **MQTT Primary Protocol**: Faster, more reliable communication
- **HTTP Fallback**: Automatic fallback when MQTT unavailable  
- **Real-time Commands**: Instant command execution via MQTT subscription
- **Enhanced Monitoring**: MQTT heartbeat and connection status
- **Emergency Alerts**: MQTT emergency shutdown notifications
- **Dual Protocol Support**: Both MQTT and HTTP work simultaneously

### 🔧 Preserved Features:
- ✅ Emergency button functionality (GPIO 5)
- ✅ All sensor readings (temperature, humidity, soil, water, light, motion, distance)
- ✅ All actuator controls (LED, fan, pump, servo feeder, buzzer)
- ✅ Local web dashboard (backup control)
- ✅ LCD display updates
- ✅ Auto-close servo functionality
- ✅ PIR motion detection and alarms
- ✅ Safe mode and emergency shutdown

---

## 🛠️ Step-by-Step Setup Instructions

### Step 1: Install Required Arduino Library

1. **Open Arduino IDE**
2. **Go to**: Tools → Manage Libraries...
3. **Search for**: `PubSubClient`
4. **Install**: "PubSubClient" by Nick O'Leary (version 2.8.0 or higher)
5. **Click Install**

### Step 2: Upload Updated Code

1. **Open** your updated `sketch_oct27a.ino` file
2. **Verify** the code compiles without errors
3. **Upload** to your ESP32
4. **Open Serial Monitor** (115200 baud) to see connection status

### Step 3: MQTT Broker Options

You have several choices for MQTT brokers:

#### 🆓 Option A: Free Public Broker (Testing Only)
**Current Default**: `broker.hivemq.com`
- ✅ **Pros**: Free, no setup required, works immediately
- ⚠️ **Cons**: Public, not secure, not reliable for production
- 🎯 **Use for**: Testing and development

#### 🏢 Option B: HiveMQ Cloud (Recommended)
**Best for Production**

1. **Sign up**: Go to [console.hivemq.cloud](https://console.hivemq.cloud)
2. **Create free account** (no credit card required)
3. **Create new cluster**:
   - Choose "Serverless" (free tier)
   - Select region closest to you
   - Name your cluster (e.g., "SmartFarm")
4. **Get credentials**:
   - Note down: **Broker URL**, **Port**, **Username**, **Password**
5. **Update ESP32 code**:
   ```cpp
   const char* MQTT_BROKER = "your-cluster.s2.eu.hivemq.cloud";
   const int   MQTT_PORT = 8883;  // Secure port
   const char* MQTT_USER = "your_username";
   const char* MQTT_PASS = "your_password";
   ```

#### 🏠 Option C: Local Mosquitto Broker
**For Advanced Users**

1. **Install Mosquitto**:
   - Windows: Download from [mosquitto.org](https://mosquitto.org/download/)
   - Linux: `sudo apt install mosquitto mosquitto-clients`
   - macOS: `brew install mosquitto`

2. **Start Broker**:
   ```bash
   mosquitto -v
   ```

3. **Update ESP32 code**:
   ```cpp
   const char* MQTT_BROKER = "192.168.1.100";  // Your computer's IP
   const int   MQTT_PORT = 1883;
   const char* MQTT_USER = "";  // Empty for no auth
   const char* MQTT_PASS = "";
   ```

### Step 4: Configure Your Dashboard/Backend

Update your Next.js dashboard to handle MQTT messages:

#### Install MQTT Client for Node.js:
```bash
npm install mqtt
```

#### Add MQTT Handler to Your API:
```javascript
// pages/api/mqtt-handler.js
import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://broker.hivemq.com:1883');

// Subscribe to sensor data
client.subscribe('smartfarm/farm_001/sensors/data');

// Listen for sensor data
client.on('message', (topic, message) => {
  if (topic === 'smartfarm/farm_001/sensors/data') {
    const sensorData = JSON.parse(message.toString());
    // Store in Supabase
    console.log('Received sensor data:', sensorData);
  }
});

// Send command to ESP32
export function sendCommand(action, duration = 3000) {
  const command = {
    action: action,
    duration_ms: duration,
    command_id: Date.now().toString(),
    timestamp: Date.now()
  };
  
  client.publish('smartfarm/farm_001/commands/incoming', JSON.stringify(command));
}
```

### Step 5: Testing Your MQTT Setup

#### Monitor MQTT Messages:
1. **Install MQTT Explorer**: [mqtt-explorer.com](http://mqtt-explorer.com/)
2. **Connect** to your broker
3. **Subscribe** to: `smartfarm/farm_001/+/+`
4. **Watch** real-time messages from your ESP32

#### Test Commands:
Send this JSON to topic `smartfarm/farm_001/commands/incoming`:
```json
{
  "action": "LIGHT",
  "duration_ms": 3000,
  "command_id": "test_123"
}
```

---

## 📡 MQTT Topic Structure

Your ESP32 uses these topics:

| Topic | Direction | Purpose |
|-------|-----------|---------|
| `smartfarm/farm_001/sensors/data` | ESP32 → Dashboard | Sensor readings every 5 seconds |
| `smartfarm/farm_001/commands/incoming` | Dashboard → ESP32 | Commands (LIGHT, FAN, WATER, FEED, BUZZER) |
| `smartfarm/farm_001/commands/status` | ESP32 → Dashboard | Command acknowledgments |
| `smartfarm/farm_001/status` | ESP32 → Dashboard | Device heartbeat every 30 seconds |
| `smartfarm/farm_001/emergency` | ESP32 → Dashboard | Emergency shutdown alerts |

## 🔧 Configuration Options

### Change Device ID:
```cpp
const char* DEVICE_ID = "farm_002";  // Change this
```

### Adjust Timing:
```cpp
const long sensorInterval = 10000;     // 10s instead of 5s
const long mqttHeartbeatInterval = 60000; // 60s heartbeat
```

### Disable MQTT (HTTP Only):
```cpp
static bool mqttEnabled = false;  // Set to false
```

---

## 🚨 Troubleshooting

### ESP32 Won't Connect to MQTT:
- ✅ Check WiFi connection
- ✅ Verify broker URL and port
- ✅ Check username/password
- ✅ Monitor Serial output for error codes

### Dashboard Not Receiving Data:
- ✅ Confirm MQTT subscription topics
- ✅ Check broker connection
- ✅ Verify JSON parsing
- ✅ Monitor MQTT Explorer for messages

### Commands Not Working:
- ✅ Check command topic format
- ✅ Verify JSON structure
- ✅ Monitor ESP32 Serial for received commands
- ✅ Ensure action names are correct (LIGHT, FAN, WATER, FEED, BUZZER)

### Emergency Button Issues:
- ✅ Verify GPIO 5 wiring
- ✅ Check pull-up resistor (10kΩ)
- ✅ Test button press detection in Serial Monitor
- ✅ Confirm 3-second hold requirement

---

## 🎯 Next Steps

1. **Test Basic Functionality**: Upload code and verify MQTT connection
2. **Choose Production Broker**: Set up HiveMQ Cloud for reliability  
3. **Update Dashboard**: Add MQTT client to your Next.js app
4. **Monitor Performance**: Use MQTT Explorer to watch data flow
5. **Security**: Enable TLS/SSL for production use

## 🔒 Security Recommendations

For production deployment:
- ✅ Use TLS/SSL encryption (port 8883)
- ✅ Strong username/password authentication  
- ✅ Private MQTT broker (not public)
- ✅ Certificate-based authentication
- ✅ Topic-level access control

---

## 🎉 Success!

Your Smart Farm now supports:
- **⚡ Real-time MQTT communication**  
- **🔄 Automatic HTTP fallback**
- **📱 Dual protocol dashboard compatibility**
- **🚨 Enhanced emergency notifications**
- **📊 Better monitoring and diagnostics**

The system is backward compatible - all existing functionality is preserved while adding powerful MQTT capabilities!

**Need help?** Check the troubleshooting section or monitor the Serial output for detailed diagnostic information.