/* ============================================================
   🌿 SMART FARM - ENHANCED ESP32 CODE
   Optimized for ultra-low latency with real-time updates
   ============================================================ */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <LiquidCrystal_I2C.h>
#include <dht11.h>
#include <ESP32_Servo.h>

/* ---------------- WIFI CONFIG ---------------- */
const char* SSID = "DE-Peplink";        // ⚠️ CHANGE THIS
const char* PASS = "Dream2025!";    // ⚠️ CHANGE THIS

/* ---- API Configuration ---- */
const char* API_BASE  = "https://smart-farm-website-gamma.vercel.app/api";  // ⚠️ CHANGE THIS
const char* DEVICE_ID = "farm_001";

/* ---------------- PIN MAP ---------------- */
#define DHT11PIN        17
#define LEDPIN          27
#define SERVOPIN        26
#define FANPIN1         19
#define FANPIN2         18
#define STEAMPIN        35
#define LIGHTPIN        34
#define SOILHUMIDITYPIN 32
#define WATERLEVELPIN   33
#define RELAYPIN        25
#define BUZZERPIN       16        // Changed to pin 16 for PIR alarm compatibility
// Ultrasonic Sensor HC-SR04
#define TRIGPIN         12
#define ECHOPIN         13
// PIR Motion Sensor (for Scenario 2 enhanced detection)
#define PIRPIN          23        // PIR motion sensor on pin 23
// Emergency Stop Button
#define EMERGENCY_PIN   0         // GPIO 0 (BOOT button) - Emergency system shutdown

/* ---------------- GLOBAL OBJECTS ---------------- */
dht11 DHT11;
LiquidCrystal_I2C lcd(0x27, 16, 2);
AsyncWebServer server(80);
Servo myservo;

/* ---------------- STATE FLAGS ---------------- */
static bool ledState = false;
static bool fanState = false;
static bool servoState = false;
static bool systemReady = false;
static bool pirMotionDetected = false;
static unsigned long lastPirTrigger = 0;
static bool emergencyPressed = false;
static unsigned long emergencyPressTime = 0;
static bool emergencyShutdownActive = false;

/* ---------------- TIMERS (OPTIMIZED) ---------------- */
unsigned long lastSensorSend = 0;
unsigned long lastCommandCheck = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastLCDUpdate = 0;
unsigned long servoOpenTime = 0;      // Track when servo was opened

const long sensorInterval    = 5000;   // 5s for sensor updates (reduce cloud requests)
const long commandInterval   = 250;    // 250ms for ultra-fast command response
const long heartbeatInterval = 30000;  // 30s heartbeat
const long lcdUpdateInterval = 2000;   // 2s LCD refresh
const long servoAutoCloseInterval = 5000; // 5s auto-close for feeder
const long emergencyHoldTime = 3000;       // 3s hold time to trigger emergency shutdown

/* ---------------- CONNECTION RETRY ---------------- */
int wifiRetries = 0;
int apiFailures = 0;
const int MAX_WIFI_RETRIES = 5;
const int MAX_API_FAILURES = 3;

/* ============================================================
   HTML DASHBOARD (Local fallback)
   ============================================================ */
const char index_html[] PROGMEM = R"rawliteral(
<!DOCTYPE HTML><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Smart Farm Local</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);
min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.container{background:#fff;border-radius:20px;padding:30px;max-width:600px;width:100%;
box-shadow:0 20px 60px rgba(0,0,0,0.3)}
h1{color:#333;margin-bottom:20px;text-align:center}
.status{background:#f0f0f0;padding:15px;border-radius:10px;margin-bottom:20px}
.sensor{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}
.sensor-card{background:#f8f9fa;padding:15px;border-radius:10px;text-align:center}
.sensor-card h3{color:#666;font-size:14px;margin-bottom:5px}
.sensor-card .value{font-size:24px;font-weight:bold;color:#667eea}
.btn-group{display:grid;grid-template-columns:1fr 1fr;gap:10px}
button{padding:15px;font-size:16px;font-weight:bold;border:none;border-radius:10px;
cursor:pointer;transition:all 0.3s;color:#fff}
button:active{transform:scale(0.95)}
.btn-light{background:linear-gradient(135deg,#f093fb 0%,#f5576c 100%)}
.btn-fan{background:linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)}
.btn-feed{background:linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)}
.btn-water{background:linear-gradient(135deg,#fa709a 0%,#fee140 100%)}
button:hover{opacity:0.9;transform:translateY(-2px);box-shadow:0 5px 15px rgba(0,0,0,0.2)}
.offline{color:#f5576c;font-weight:bold}
.online{color:#43e97b;font-weight:bold}
</style></head>
<body>
<div class="container">
<h1>🌿 Smart Farm Control</h1>
<div class="status">
<div id="status">Status: <span class="online">Connected</span></div>
<div id="ip">IP: Loading...</div>
</div>
<div class="sensor" id="sensors">
<div class="sensor-card"><h3>🌡️ Temperature</h3><div class="value" id="temp">--°C</div></div>
<div class="sensor-card"><h3>💧 Humidity</h3><div class="value" id="hum">--%</div></div>
<div class="sensor-card"><h3>🌱 Soil</h3><div class="value" id="soil">--%</div></div>
<div class="sensor-card"><h3>💦 Water</h3><div class="value" id="water">--%</div></div>
</div>
<div class="btn-group">
<button class="btn-light" onclick="cmd('light')">💡 Light</button>
<button class="btn-fan" onclick="cmd('fan')">🌀 Fan</button>
<button class="btn-feed" onclick="cmd('feed')">🌾 Feed</button>
<button class="btn-water" onclick="cmd('water')">💧 Water</button>
</div>
</div>
<script>
function cmd(a){fetch('/cmd?action='+a).then(()=>console.log(a));}
function updateData(){fetch('/data').then(r=>r.json()).then(d=>{
document.getElementById('temp').textContent=d.temp+'°C';
document.getElementById('hum').textContent=d.hum+'%';
document.getElementById('soil').textContent=d.soil+'%';
document.getElementById('water').textContent=d.water+'%';
document.getElementById('ip').textContent='IP: '+d.ip;
}).catch(()=>document.getElementById('status').innerHTML='Status: <span class="offline">Offline</span>');}
setInterval(updateData,1000);updateData();
</script>
</body></html>
)rawliteral";

/* ============================================================
   SENSOR READING FUNCTIONS
   ============================================================ */
struct SensorData {
  float temperature;
  float humidity;
  float soilMoisture;
  float waterLevel;
  float steam;
  float lightLevel;  // Changed from int to float
  float distance;    // Ultrasonic sensor distance in cm
  bool motionDetected; // PIR motion sensor
  bool isValid;
};

/* ---------------- PIR MOTION SENSOR FUNCTION ---------------- */
bool readPirMotion() {
  int pirValue = digitalRead(PIRPIN);
  unsigned long currentTime = millis();
  
  if (pirValue == HIGH) {
    if (!pirMotionDetected || (currentTime - lastPirTrigger > 2000)) { // Debounce for 2 seconds
      pirMotionDetected = true;
      lastPirTrigger = currentTime;
      Serial.println("🚨 PIR Motion Detected - Intruder Alert!");
      return true;
    }
  } else {
    if (pirMotionDetected && (currentTime - lastPirTrigger > 5000)) { // Clear after 5 seconds
      pirMotionDetected = false;
      Serial.println("✅ PIR Motion Cleared");
    }
  }
  
  return pirMotionDetected;
}

/* ---------------- EMERGENCY SHUTDOWN FUNCTION ---------------- */
void checkEmergencyButton() {
  int buttonState = digitalRead(EMERGENCY_PIN);
  unsigned long currentTime = millis();
  
  // Button is pressed (LOW on ESP32 BOOT button)
  if (buttonState == LOW) {
    if (!emergencyPressed) {
      // Start of button press
      emergencyPressed = true;
      emergencyPressTime = currentTime;
      Serial.println("🚨 EMERGENCY BUTTON PRESSED - Hold for 3 seconds to shutdown");
    } else {
      // Button still held down - check if held long enough
      if ((currentTime - emergencyPressTime) >= emergencyHoldTime && !emergencyShutdownActive) {
        emergencyShutdownActive = true;
        emergencySystemShutdown();
      }
    }
  } else {
    // Button released
    if (emergencyPressed) {
      unsigned long holdDuration = currentTime - emergencyPressTime;
      if (holdDuration < emergencyHoldTime) {
        Serial.printf("⚠️ Emergency button released early (held %lums / %lums required)\n", holdDuration, emergencyHoldTime);
      }
      emergencyPressed = false;
      emergencyPressTime = 0;
    }
  }
}

void emergencySystemShutdown() {
  Serial.println("\n╔═══════════════════════════════════════╗");
  Serial.println("║  🚨 EMERGENCY SHUTDOWN ACTIVATED 🚨  ║");
  Serial.println("╚═══════════════════════════════════════╝");
  
  // Flash LED rapidly to indicate emergency mode
  for (int i = 0; i < 10; i++) {
    digitalWrite(LEDPIN, HIGH);
    delay(100);
    digitalWrite(LEDPIN, LOW);
    delay(100);
  }
  
  // Emergency alarm sound
  Serial.println("🚨 Sounding emergency alarm...");
  for (int i = 0; i < 3; i++) {
    tone(BUZZERPIN, 3000, 200);
    delay(250);
    tone(BUZZERPIN, 2000, 200);
    delay(250);
  }
  noTone(BUZZERPIN);
  
  // Safely turn off all actuators
  Serial.println("🔌 Shutting down all actuators...");
  digitalWrite(LEDPIN, LOW);        // Turn off LED
  digitalWrite(FANPIN1, LOW);       // Turn off fan
  digitalWrite(FANPIN2, LOW);
  digitalWrite(RELAYPIN, LOW);      // Turn off water pump
  digitalWrite(BUZZERPIN, LOW);     // Turn off buzzer
  myservo.write(180);               // Close feeder servo
  
  // Update LCD with emergency message
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("EMERGENCY STOP!");
  lcd.setCursor(0, 1);
  lcd.print("System Halted");
  
  // Send emergency shutdown notification to cloud (if connected)
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("📤 Sending emergency shutdown notification to cloud...");
    
    HTTPClient http;
    http.setTimeout(5000);
    
    String url = String(API_BASE) + "/device-actions";
    
    if (http.begin(url)) {
      http.addHeader("Content-Type", "application/json");
      
      StaticJsonDocument<256> doc;
      doc["device_id"] = DEVICE_ID;
      doc["action_type"] = "emergency_shutdown";
      doc["command"] = "EMERGENCY_STOP";
      doc["location"] = "esp32_hardware";
      doc["metadata"]["shutdown_reason"] = "emergency_button_pressed";
      doc["metadata"]["uptime_seconds"] = millis() / 1000;
      doc["metadata"]["wifi_rssi"] = WiFi.RSSI();
      doc["timestamp"] = millis();
      
      String payload;
      serializeJson(doc, payload);
      
      int code = http.POST(payload);
      if (code > 0) {
        Serial.printf("✅ Emergency notification sent → HTTP %d\n", code);
      } else {
        Serial.printf("❌ Failed to send emergency notification: %s\n", http.errorToString(code).c_str());
      }
      http.end();
    }
    
    // Disconnect WiFi
    WiFi.disconnect();
    Serial.println("📶 WiFi disconnected");
  }
  
  // Final shutdown sequence
  Serial.println("🛑 Flushing serial buffers...");
  Serial.flush();
  
  Serial.println("🔄 System will restart in 5 seconds...");
  Serial.println("   Press and hold EMERGENCY button again during startup to prevent restart");
  
  // Wait 5 seconds, checking if emergency button is still held
  for (int i = 5; i > 0; i--) {
    Serial.printf("   Restart in %d seconds...\n", i);
    
    // Check if emergency button is still pressed
    if (digitalRead(EMERGENCY_PIN) == LOW) {
      Serial.println("\n🚨 EMERGENCY BUTTON STILL HELD - ENTERING SAFE MODE");
      enterSafeMode();
      return; // This will never execute, but good practice
    }
    
    delay(1000);
  }
  
  // Final messages
  Serial.println("\n🔄 RESTARTING ESP32...");
  Serial.flush();
  
  // Restart the ESP32
  ESP.restart();
}

void enterSafeMode() {
  Serial.println("\n╔═══════════════════════════════════════╗");
  Serial.println("║     🛡️ ENTERING SAFE MODE 🛡️      ║");
  Serial.println("╚═══════════════════════════════════════╝");
  Serial.println("ℹ️ All actuators disabled. System halted.");
  Serial.println("ℹ️ Power cycle ESP32 to restart normally.");
  Serial.println("ℹ️ Emergency button will remain active.");
  
  // Update LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("SAFE MODE");
  lcd.setCursor(0, 1);
  lcd.print("Power Cycle to Exit");
  
  // Safe mode loop - only monitor emergency button, do nothing else
  while (true) {
    // Slow blink LED to indicate safe mode
    digitalWrite(LEDPIN, HIGH);
    delay(1000);
    digitalWrite(LEDPIN, LOW);
    delay(1000);
    
    // Still monitor emergency button for potential restart
    if (digitalRead(EMERGENCY_PIN) == HIGH) {
      // Wait for button release then restart
      delay(2000);
      if (digitalRead(EMERGENCY_PIN) == HIGH) {
        Serial.println("🔄 Emergency button released - restarting...");
        ESP.restart();
      }
    }
    
    // Feed watchdog to prevent auto-restart
    yield();
  }
}

/* ---------------- ULTRASONIC SENSOR FUNCTION ---------------- */
float readUltrasonicDistance() {
  // Take multiple readings for better accuracy
  float validReadings[3];
  int validCount = 0;
  
  for (int i = 0; i < 3; i++) {
    // Clear the trigPin
    digitalWrite(TRIGPIN, LOW);
    delayMicroseconds(2);
    
    // Set the trigPin high for 10 microseconds
    digitalWrite(TRIGPIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIGPIN, LOW);
    
    // Read the echoPin, returns the sound wave travel time in microseconds
    unsigned long duration = pulseIn(ECHOPIN, HIGH, 25000); // 25ms timeout (reduced for faster readings)
    
    // Calculate distance in cm (speed of sound = 343 m/s)
    // Distance = (duration * 0.034) / 2
    float distance = (duration * 0.034) / 2;
    
    // Validate reading (HC-SR04 range: 2cm - 400cm)
    if (duration > 0 && distance >= 1 && distance <= 300) { // Relaxed range
      validReadings[validCount] = distance;
      validCount++;
    }
    
    delay(30); // Small delay between readings
  }
  
  if (validCount == 0) {
    Serial.println("⚠️ Ultrasonic sensor: No valid readings - check wiring on pins 12 & 13");
    return 50.0; // Return safe distance instead of -1 to keep system working
  }
  
  // Calculate average of valid readings
  float avgDistance = 0;
  for (int i = 0; i < validCount; i++) {
    avgDistance += validReadings[i];
  }
  avgDistance = avgDistance / validCount;
  
  Serial.printf("📏 Ultrasonic - Valid readings: %d/3, Average: %.1f cm\n", validCount, avgDistance);
  
  // Special debugging for animal detection range
  if (avgDistance >= 1 && avgDistance <= 15) {
    Serial.printf("🚨 DETECTION ZONE: %.1f cm - Animal detection possible!\n", avgDistance);
  }
  
  return avgDistance;
}

SensorData readAllSensors() {
  SensorData data;
  data.isValid = true;
  
  // Read DHT11 with retry logic
  int chk = DHT11.read(DHT11PIN);
  int retry_count = 0;
  
  // Retry up to 3 times if sensor fails
  while (chk != 0 && retry_count < 3) {
    delay(100);  // Wait a bit before retry
    chk = DHT11.read(DHT11PIN);
    retry_count++;
  }
  
  if (chk == 0) {
    data.temperature = DHT11.temperature;
    data.humidity = DHT11.humidity;
  } else {
    Serial.printf("⚠️ DHT11 Error: %d (after %d retries)\n", chk, retry_count);
    data.temperature = -999;
    data.humidity = -999;
    data.isValid = false;
  }
  
  // Read analog sensors with averaging (reduce noise)
  const int samples = 3;
  long soilSum = 0, waterSum = 0, steamSum = 0, lightSum = 0;
  
  for(int i = 0; i < samples; i++) {
    int soilReading = analogRead(SOILHUMIDITYPIN);
    int waterReading = analogRead(WATERLEVELPIN);  
    int steamReading = analogRead(STEAMPIN);
    int lightReading = analogRead(LIGHTPIN);
    
    soilSum += soilReading;
    waterSum += waterReading;
    steamSum += steamReading;
    lightSum += lightReading;
    
    // Debug individual readings
    if (i == 0) {
      Serial.printf("📊 Sensor readings - Soil: %d, Water: %d, Steam: %d, Light: %d\n", 
                    soilReading, waterReading, steamReading, lightReading);
    }
    
    delay(10);
  }
  
  // Calculate sensor percentages with debug info
  float rawSoil = soilSum / samples;
  float rawWater = waterSum / samples;
  float rawSteam = steamSum / samples;
  float rawLight = lightSum / samples;
  
  data.soilMoisture = min((rawSoil / 4095.0 * 100 * 2.3), 100.0);
  data.waterLevel = min((rawWater / 4095.0 * 100 * 2.5), 100.0);
  data.steam = rawSteam / 4095.0 * 100;
  data.lightLevel = (rawLight / 4095.0 * 100);
  
  // Debug logging for all analog sensors
  Serial.printf("🌱 Soil Debug - Raw ADC: %.0f, Calculated: %.1f%%\n", rawSoil, data.soilMoisture);
  Serial.printf("💧 Water Debug - Raw ADC: %.0f, Calculated: %.1f%%\n", rawWater, data.waterLevel);
  Serial.printf("💨 Steam Debug - Raw ADC: %.0f, Calculated: %.1f%%\n", rawSteam, data.steam);
  Serial.printf("🔆 Light Debug - Raw ADC: %.0f, Calculated: %.1f%%\n", rawLight, data.lightLevel);
  
  // Read Ultrasonic Sensor HC-SR04
  data.distance = readUltrasonicDistance();
  
  // Read PIR Motion Sensor
  data.motionDetected = readPirMotion();
  
  return data;
}

/* ============================================================
   JSON BUILDERS
   ============================================================ */
String getSensorDataHTML() {
  SensorData data = readAllSensors();
  
  // Debug: Print what we're about to send for light
  Serial.printf("🔍 HTML Debug - Light value before string conversion: %.1f\n", data.lightLevel);
  String lightStr = String(data.lightLevel, 1);
  Serial.printf("🔍 HTML Debug - Light as string: '%s'\n", lightStr.c_str());
  
  // Format exactly matching dashboard parser regex patterns
  String html = "<h3>📊 Live Sensors</h3>";
  html += "Temperature:</b> <b>" + String(data.temperature, 1) + "</b>°C<br/>";
  html += "Humidity:</b> <b>" + String(data.humidity, 1) + "</b>%<br/>";
  html += "SoilHumidity:</b> <b>" + String(data.soilMoisture, 1) + "</b>%<br/>";
  html += "WaterLevel:</b> <b>" + String(data.waterLevel, 1) + "</b>%<br/>";
  html += "Steam:</b> <b>" + String(data.steam, 1) + "</b>%<br/>";
  html += "Light:</b> <b>" + lightStr + "</b><br/>";
  html += "Distance:</b> <b>" + String(data.distance, 1) + "</b>cm<br/>";
  html += "Motion:</b> <b>" + String(data.motionDetected ? "DETECTED" : "None") + "</b>";
  
  Serial.printf("🔍 Final HTML: %s\n", html.c_str());
  return html;
}

String getSensorDataJSON() {
  SensorData data = readAllSensors();
  
  StaticJsonDocument<256> doc;
  doc["temp"] = data.temperature;
  doc["hum"] = data.humidity;
  doc["soil"] = data.soilMoisture;
  doc["water"] = data.waterLevel;
  doc["steam"] = data.steam;
  doc["light"] = data.lightLevel;
  doc["distance"] = data.distance;
  doc["motion"] = data.motionDetected;
  doc["ip"] = WiFi.localIP().toString();
  
  String output;
  serializeJson(doc, output);
  return output;
}

JsonDocument createAPIPayload() {
  SensorData data = readAllSensors();
  
  JsonDocument doc;
  doc["device_id"] = DEVICE_ID;
  doc["timestamp"] = millis();
  
  JsonArray readings = doc["readings"].to<JsonArray>();
  
  JsonObject temp = readings.add<JsonObject>();
  temp["metric"] = "temperature";
  temp["value"] = data.temperature;
  
  JsonObject hum = readings.add<JsonObject>();
  hum["metric"] = "humidity";
  hum["value"] = data.humidity;
  
  JsonObject soil = readings.add<JsonObject>();
  soil["metric"] = "soil_moisture";
  soil["value"] = data.soilMoisture;
  
  JsonObject light = readings.add<JsonObject>();
  light["metric"] = "light_level";
  light["value"] = data.lightLevel;
  
  JsonObject water = readings.add<JsonObject>();
  water["metric"] = "water_level";
  water["value"] = data.waterLevel;
  
  JsonObject steam = readings.add<JsonObject>();
  steam["metric"] = "steam";
  steam["value"] = data.steam;
  
  JsonObject distance = readings.add<JsonObject>();
  distance["metric"] = "distance";
  distance["value"] = data.distance;
  
  JsonObject motion = readings.add<JsonObject>();
  motion["metric"] = "motion_detected";
  motion["value"] = data.motionDetected ? 1 : 0;
  
  // Add device status
  JsonObject status = doc["status"].to<JsonObject>();
  status["led"] = ledState;
  status["fan"] = fanState;
  status["servo"] = servoState;
  status["wifi_rssi"] = WiFi.RSSI();
  status["uptime"] = millis() / 1000;
  
  return doc;
}

/* ============================================================
   COMMAND EXECUTION
   ============================================================ */
void executeAction(String action, int duration_ms = 3000) {
  Serial.printf("⚡ Executing: %s (duration: %dms)\n", action.c_str(), duration_ms);
  
  // Convert action to uppercase for consistent comparison
  action.toUpperCase();
  
  if (action == "WATER" || action == "D") {
    digitalWrite(RELAYPIN, HIGH);
    delay(duration_ms);
    digitalWrite(RELAYPIN, LOW);
    Serial.println("✅ Water pump executed");
  }
  else if (action == "FAN" || action == "B") {
    fanState = !fanState;
    if (fanState) {
      digitalWrite(FANPIN1, HIGH);
      digitalWrite(FANPIN2, LOW);
    } else {
      digitalWrite(FANPIN1, LOW);
      digitalWrite(FANPIN2, LOW);
    }
    Serial.printf("✅ Fan %s\n", fanState ? "ON" : "OFF");
  }
  else if (action == "LIGHT" || action == "A") {
    ledState = !ledState;
    digitalWrite(LEDPIN, ledState ? HIGH : LOW);
    Serial.printf("✅ Light %s\n", ledState ? "ON" : "OFF");
  }
  else if (action == "FEED" || action == "C") {
    // Always open the feeder when feed command is received
    servoState = true;
    myservo.write(80); // Open position
    servoOpenTime = millis(); // Record when it was opened
    Serial.println("✅ Feeder OPENED - will auto-close in 5 seconds");
  }
  else if (action == "FEED_CLOSE" || action == "CLOSE_FEEDER") {
    // Manual close command (optional)
    servoState = false;
    myservo.write(180); // Closed position
    servoOpenTime = 0;  // Reset timer
    Serial.println("✅ Feeder MANUALLY CLOSED");
  }
  else if (action == "BUZZER" || action == "E") {
    // Enhanced alarm system - combines scarecrow with PIR alarm pattern
    Serial.println("🚨 Activating enhanced intruder alarm!");
    
    // Flash LED during alarm
    digitalWrite(LEDPIN, HIGH);
    
    // PIR-style sweeping alarm (rising frequency)
    for(int i = 200; i <= 1000; i += 10){ 
      tone(BUZZERPIN, i);
      delay(10);
    }
    
    digitalWrite(LEDPIN, LOW);
    delay(100);
    digitalWrite(LEDPIN, HIGH);
    
    // PIR-style sweeping alarm (falling frequency)
    for(int i = 1000; i >= 200; i -= 10){ 
      tone(BUZZERPIN, i);
      delay(10);
    }
    
    // Additional high-intensity alarm bursts
    for (int burst = 0; burst < 2; burst++) {
      for (int i = 0; i < 5; i++) {
        tone(BUZZERPIN, 2500, 100);
        delay(150);
        tone(BUZZERPIN, 1500, 100);
        delay(150);
      }
      delay(300);
    }
    
    digitalWrite(LEDPIN, LOW);
    noTone(BUZZERPIN);
    Serial.println("✅ Enhanced intruder alarm completed - threat neutralized!");
  }
  else if (action == "PIR_ALARM" || action == "P") {
    // PIR-triggered automatic alarm (can be called by motion detection)
    Serial.println("🚨 PIR Motion Alarm - Automatic Trigger!");
    
    digitalWrite(LEDPIN, HIGH);
    
    // Quick PIR alarm pattern
    for(int i = 200; i <= 800; i += 20){ 
      tone(BUZZERPIN, i);
      delay(5);
    }
    
    digitalWrite(LEDPIN, LOW);
    
    for(int i = 800; i >= 200; i -= 20){ 
      tone(BUZZERPIN, i);
      delay(5);
    }
    
    noTone(BUZZERPIN);
    Serial.println("✅ PIR alarm completed");
  }
  else {
    Serial.printf("⚠️ Unknown action: %s\n", action.c_str());
  }
}

/* ============================================================
   CLOUD API FUNCTIONS (ULTRA-OPTIMIZED)
   ============================================================ */
void sendSensorData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi disconnected");
    return;
  }
  
  HTTPClient http;
  http.setTimeout(8000); // Increased timeout for cloud requests
  http.setReuse(false);  // Don't reuse for cloud reliability
  
  // Send to Vercel sensor-data endpoint
  String url = String(API_BASE) + "/sensor-data";
  
  if (!http.begin(url)) {
    apiFailures++;
    Serial.println("❌ Failed to begin HTTP connection");
    return;
  }
  
  http.addHeader("Content-Type", "application/json");
  
  // Create sensor data payload matching your existing API format
  SensorData data = readAllSensors();
  StaticJsonDocument<512> doc;
  
  doc["device_id"] = DEVICE_ID;
  doc["temperature"] = data.temperature;
  doc["humidity"] = data.humidity;
  doc["soil_moisture"] = data.soilMoisture;
  doc["water_level"] = data.waterLevel;
  doc["light_level"] = data.lightLevel;
  doc["steam"] = data.steam;
  doc["distance"] = data.distance;
  doc["motion_detected"] = data.motionDetected ? 1 : 0;
  
  String payload;
  serializeJson(doc, payload);
  
  Serial.printf("📤 Sending to cloud: %s\n", payload.c_str());
  
  int code = http.POST(payload);
  
  if (code > 0) {
    String response = http.getString();
    Serial.printf("📤 Cloud data sent → HTTP %d: %s\n", code, response.c_str());
    apiFailures = 0; // Reset on success
  } else {
    apiFailures++;
    Serial.printf("❌ Cloud POST failed: %s\n", http.errorToString(code).c_str());
  }
  
  http.end();
  
  // Failsafe: If too many failures, restart
  if (apiFailures >= MAX_API_FAILURES) {
    Serial.println("🔄 Too many API failures, restarting...");
    delay(5000);
    ESP.restart();
  }
}

void checkCommands() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  http.setTimeout(2000); // Faster timeout for command checking
  http.setReuse(true);   // Reuse connection for faster commands
  
  String url = String(API_BASE) + "/device-commands?device_id=" + DEVICE_ID + "&status=pending";
  
  if (!http.begin(url)) {
    Serial.println("❌ Failed to begin command check");
    return;
  }
  
  int code = http.GET();
  
  if (code == 200) {
    String payload = http.getString();
    Serial.printf("📥 Command response: %s\n", payload.c_str());
    
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, payload);
    
    if (error) {
      Serial.printf("❌ Command JSON parse error: %s\n", error.c_str());
      http.end();
      return;
    }
    
    // Handle both single command and array of commands
    if (doc.is<JsonArray>()) {
      JsonArray cmds = doc.as<JsonArray>();
      if (cmds.size() > 0) {
        Serial.printf("📥 Processing %d command(s)\n", cmds.size());
        for (JsonObject cmd : cmds) {
          processCommand(cmd);
        }
      }
    } else if (doc.is<JsonObject>()) {
      JsonObject cmd = doc.as<JsonObject>();
      if (cmd.containsKey("command") || cmd.containsKey("action")) {
        Serial.println("📥 Processing single command");
        processCommand(cmd);
      }
    }
  } else if (code != 204) { // 204 = No commands pending
    Serial.printf("⚠️ Command check failed → HTTP %d\n", code);
  }
  
  http.end();
}

void processCommand(JsonObject cmd) {
  String action;
  int id = -1;
  int duration = 3000;
  
  // Handle different command formats
  if (cmd.containsKey("id")) {
    id = cmd["id"];
  }
  
  if (cmd.containsKey("command") && cmd["command"].is<JsonObject>()) {
    JsonObject command = cmd["command"];
    action = command["action"].as<String>();
    duration = command["duration_ms"] | 3000;
  } else if (cmd.containsKey("action")) {
    action = cmd["action"].as<String>();
    duration = cmd["duration_ms"] | 3000;
  }
  
  if (action.length() > 0) {
    Serial.printf("⚡ Executing cloud command: %s (ID: %d)\n", action.c_str(), id);
    executeAction(action, duration);
    
    if (id > 0) {
      acknowledgeCommand(id);
    }
  } else {
    Serial.println("⚠️ Invalid command format");
  }
}

void acknowledgeCommand(int id) {
  if (id <= 0) return; // Invalid ID
  
  HTTPClient http;
  http.setTimeout(5000);
  
  String url = String(API_BASE) + "/device-commands";
  
  if (!http.begin(url)) {
    Serial.printf("❌ Failed to begin ACK for command %d\n", id);
    return;
  }
  
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<128> doc;
  doc["command_id"] = id;
  doc["status"] = "completed";
  doc["device_id"] = DEVICE_ID;
  doc["completed_at"] = millis();
  
  String payload;
  serializeJson(doc, payload);
  
  int code = http.PATCH(payload);
  
  if (code > 0) {
    Serial.printf("✅ Command %d acknowledged → HTTP %d\n", id, code);
  } else {
    Serial.printf("❌ Failed to ACK command %d: %s\n", id, http.errorToString(code).c_str());
  }
  
  http.end();
}

/* ============================================================
   LOCAL WEB SERVER HANDLERS
   ============================================================ */
void handleRoot(AsyncWebServerRequest *request) {
  request->send_P(200, "text/html", index_html);
}

void handleData(AsyncWebServerRequest *request) {
  request->send(200, "application/json", getSensorDataJSON());
}

void handleDHT(AsyncWebServerRequest *request) {
  // Return sensor data in HTML format for dashboard compatibility
  String html = getSensorDataHTML();
  request->send(200, "text/html", html);
  Serial.println("📊 DHT endpoint called - returning HTML sensor data");
}

void handleSet(AsyncWebServerRequest *request) {
  // Handle commands via /set?value=X format (dashboard compatibility)
  if (request->hasParam("value")) {
    String value = request->getParam("value")->value();
    Serial.printf("🎮 SET command received: %s\n", value.c_str());
    executeAction(value, 3000);
    request->send(200, "text/plain", "OK");
  } else {
    request->send(400, "text/plain", "Missing value parameter");
  }
}

void handleCommand(AsyncWebServerRequest *request) {
  if (request->hasParam("action")) {
    String action = request->getParam("action")->value();
    executeAction(action, 3000);
    request->send(200, "text/plain", "OK");
  } else {
    request->send(400, "text/plain", "Missing action");
  }
}

void handleNotFound(AsyncWebServerRequest *request) {
  request->send(404, "text/plain", "Not Found");
}

/* ============================================================
   LCD UPDATE
   ============================================================ */
void updateLCD() {
  SensorData data = readAllSensors();
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("T:");
  lcd.print(data.temperature, 1);
  lcd.print("C H:");
  lcd.print(data.humidity, 0);
  lcd.print("%");
  
  lcd.setCursor(0, 1);
  lcd.print("S:");
  lcd.print(data.soilMoisture, 0);
  lcd.print("% W:");
  lcd.print(data.waterLevel, 0);
  lcd.print("%");
}

/* ============================================================
   WIFI CONNECTION
   ============================================================ */
bool connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASS);
  
  Serial.print("Connecting to WiFi");
  wifiRetries = 0;
  
  while (WiFi.status() != WL_CONNECTED && wifiRetries < MAX_WIFI_RETRIES * 10) {
    delay(500);
    Serial.print(".");
    wifiRetries++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected!");
    Serial.printf("📍 IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("📶 Signal: %d dBm\n", WiFi.RSSI());
    return true;
  }
  
  Serial.println("\n❌ WiFi connection failed!");
  return false;
}

/* ============================================================
   SETUP
   ============================================================ */
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n");
  Serial.println("╔═══════════════════════════════╗");
  Serial.println("║   🌿 SMART FARM SYSTEM v2.0  ║");
  Serial.println("╚═══════════════════════════════╝\n");
  
  // Emergency button early check (before any initialization)
  pinMode(EMERGENCY_PIN, INPUT_PULLUP);
  if (digitalRead(EMERGENCY_PIN) == LOW) {
    Serial.println("🚨 EMERGENCY BUTTON DETECTED AT STARTUP!");
    Serial.println("🛡️ Entering safe mode immediately...");
    
    // Basic LCD setup for safe mode message
    lcd.init();
    lcd.backlight();
    enterSafeMode(); // This will loop forever or restart
  }
  
  // Pin initialization
  Serial.println("🔧 Initializing pins...");
  pinMode(LEDPIN, OUTPUT);
  pinMode(FANPIN1, OUTPUT);
  pinMode(FANPIN2, OUTPUT);
  pinMode(RELAYPIN, OUTPUT);
  pinMode(BUZZERPIN, OUTPUT);
  pinMode(STEAMPIN, INPUT);
  pinMode(LIGHTPIN, INPUT);
  pinMode(SOILHUMIDITYPIN, INPUT);
  pinMode(WATERLEVELPIN, INPUT);
  
  // Ultrasonic sensor pins
  pinMode(TRIGPIN, OUTPUT);
  pinMode(ECHOPIN, INPUT);
  
  // PIR motion sensor pin
  pinMode(PIRPIN, INPUT);
  
  // Emergency button pin (internal pull-up enabled)
  pinMode(EMERGENCY_PIN, INPUT_PULLUP);
  Serial.println("🚨 Emergency button initialized on GPIO 0 (BOOT button)");
  
  // Set initial states
  digitalWrite(LEDPIN, LOW);
  digitalWrite(FANPIN1, LOW);
  digitalWrite(FANPIN2, LOW);
  digitalWrite(RELAYPIN, LOW);
  digitalWrite(BUZZERPIN, LOW);
  
  // Servo setup
  Serial.println("🔧 Initializing servo...");
  myservo.attach(SERVOPIN);
  myservo.write(180); // Closed position
  servoState = false; // Ensure state matches position
  servoOpenTime = 0;  // Initialize timer
  delay(500);
  
  // LCD setup
  Serial.println("🔧 Initializing LCD...");
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Smart Farm v2.0");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  
  // WiFi connection
  Serial.println("🔧 Connecting to WiFi...");
  if (connectWiFi()) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected!");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());
    
    // Web server setup
    Serial.println("🔧 Starting web server...");
    server.on("/", HTTP_GET, handleRoot);
    server.on("/data", HTTP_GET, handleData);
    server.on("/dht", HTTP_GET, handleDHT);  // New endpoint for dashboard compatibility
    server.on("/set", HTTP_GET, handleSet);  // New endpoint for command compatibility
    server.on("/cmd", HTTP_GET, handleCommand);
    server.onNotFound(handleNotFound);
    server.begin();
    
    Serial.println("✅ Web server started!");
    Serial.printf("🌐 Access at: http://%s\n", WiFi.localIP().toString().c_str());
    
    systemReady = true;
  } else {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Failed!");
    lcd.setCursor(0, 1);
    lcd.print("Local Mode");
    
    systemReady = false;
  }
  
  delay(2000);
  WiFi.setSleep(false);
  Serial.println("\n✅ System Ready!");
  Serial.println("==========================================");
  Serial.println("🚨 EMERGENCY SHUTDOWN:");
  Serial.println("   Hold BOOT button (GPIO 0) for 3 seconds");
  Serial.println("   to trigger emergency system shutdown");
  Serial.println("==========================================\n");
}

/* ============================================================
   MAIN LOOP (ULTRA-OPTIMIZED)
   ============================================================ */
void loop() {
  unsigned long now = millis();
  
  // WiFi reconnection check
  if (WiFi.status() != WL_CONNECTED) {
    if (now - lastHeartbeat >= heartbeatInterval) {
      Serial.println("🔄 WiFi disconnected, reconnecting...");
      connectWiFi();
      lastHeartbeat = now;
    }
    delay(100);
    return;
  }
  
  // Send sensor data to cloud
  if (systemReady && now - lastSensorSend >= sensorInterval) {
    sendSensorData();
    lastSensorSend = now;
  }
  
  // Check for commands (ULTRA-FAST - 250ms interval)
  if (systemReady && now - lastCommandCheck >= commandInterval) {
    checkCommands();
    lastCommandCheck = now;
  }
  
  // Update LCD display
  if (now - lastLCDUpdate >= lcdUpdateInterval) {
    updateLCD();
    lastLCDUpdate = now;
  }
  
  // Auto-close servo feeder after timeout
  if (servoState && servoOpenTime > 0 && (now - servoOpenTime >= servoAutoCloseInterval)) {
    servoState = false;
    myservo.write(180); // Closed position
    servoOpenTime = 0;  // Reset timer
    Serial.println("✅ Feeder AUTO-CLOSED after 5 seconds");
  }
  
  // Check emergency button (CRITICAL - always check)
  checkEmergencyButton();
  
  // Small delay to prevent watchdog issues
  delay(10);
}

/* ============================================================
   END OF CODE
   ============================================================ */