# Smart Farm ESP32 Pin Configuration

## Current Pin Mapping (Updated)

### Digital I/O Pins
- **DHT11 Sensor**: Pin 17
- **LED Control**: Pin 27
- **Servo Motor**: Pin 26
- **Fan Motor Pin 1**: Pin 19
- **Fan Motor Pin 2**: Pin 18
- **Relay (Water Pump)**: Pin 25
- **Buzzer (Scarecrow)**: Pin 23

### Analog Input Pins
- **Steam Sensor**: Pin 35
- **Light Sensor (LDR)**: Pin 34
- **Soil Moisture**: Pin 32
- **Water Level**: Pin 33

### Ultrasonic Sensor HC-SR04
- **TRIG Pin**: Pin 12 ✅ (Updated)
- **ECHO Pin**: Pin 13 ✅ (Updated)

## Sensor Data Available
- Temperature (°C)
- Humidity (%)
- Soil Moisture (%)
- Water Level (%)
- Light Level (%)
- Steam Detection (%)
- Distance (cm) - HC-SR04 Ultrasonic

## Communication
- **WiFi**: Built-in ESP32 module
- **Local Server**: Port 80
- **API Endpoints**:
  - `/dht` - Sensor data in HTML format
  - `/data` - Sensor data in JSON format
  - `/set?value=X` - Command execution
  - `/cmd?action=X` - Alternative command format

## Notes
- All pin configurations are correctly set in `sketch_oct27a.ino`
- Ultrasonic sensor pins updated to match physical board layout
- System supports both local HTTP and cloud API communication