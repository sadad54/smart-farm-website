#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>  // For HiveMQ Cloud secure connection
// #include <HTTPClient.h>  // REMOVED: MQTT-ONLY mode - no HTTP needed
#include <ArduinoJson.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <LiquidCrystal_I2C.h>
#include <dht11.h>
#include <ESP32_Servo.h>  // Import the library of servo
#include <PubSubClient.h>  // MQTT client library

/* ---------------- WIFI CONFIG ---------------- */
const char* SSID = "DE-Peplink";        // ⚠️ CHANGE THIS
const char* PASS = "Dream2025!";    // ⚠️ CHANGE THIS

/* ---- Device Configuration (MQTT-ONLY) ---- */
const char* API_BASE = "https://mc91e0db.ala.asia-southeast1.emqxsl.com:8443/api/v5";  // REMOVED: MQTT-ONLY mode - no HTTP API needed
const char* DEVICE_ID = "farm_001";

/* ---------------- MQTT CONFIG (HiveMQ Cloud) ---------------- */
const char* MQTT_BROKER = "mc91e0db.ala.asia-southeast1.emqxsl.com";  // e.g., "smartfarm-abc123.emqxsl.com"
const int   MQTT_PORT = 8883;  // Keep same for ESP32 (native MQTT/TLS)
const char* MQTT_CLIENT_ID = "smartfarm-esp32";  // Unique identifier for this device
const char* MQTT_USER = "smartfarm-esp32";       // MQTT username
const char* MQTT_PASS = "ams54$ADAD";           // MQTT password

/* ---- MQTT Topics ---- */
const String TOPIC_SENSORS   = "smartfarm/" + String(DEVICE_ID) + "/sensors/data";
const String TOPIC_COMMANDS  = "smartfarm/" + String(DEVICE_ID) + "/commands/incoming";
const String TOPIC_STATUS    = "smartfarm/" + String(DEVICE_ID) + "/commands/status";
const String TOPIC_HEARTBEAT = "smartfarm/" + String(DEVICE_ID) + "/status";
const String TOPIC_EMERGENCY = "smartfarm/" + String(DEVICE_ID) + "/emergency";

/* ---------------- PIN MAP ---------------- */
#define DHT11PIN        17
#define LEDPIN          27
#define SERVOPIN        26        // Servo pin for intelligent feeding system
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
#define EMERGENCY_PIN   5         // GPIO 5 - Emergency system shutdown button

/* ---------------- GLOBAL OBJECTS ---------------- */
dht11 DHT11;
LiquidCrystal_I2C lcd(0x27, 16, 2);
AsyncWebServer server(80);
Servo myservo;  // create servo object to control a servo

/* ---- MQTT Objects (HiveMQ Cloud - Secure Connection) ---- */
WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);

/* ---------------- STATE FLAGS ---------------- */
static bool ledState = false;
static bool fanState = false;
static bool systemReady = false;

/* ---- INTELLIGENT FEEDING SYSTEM STATE ---- */
int pos = 0;                          // variable to store the servo position
static bool feedingBoxOpen = false;   // Track if feeding box is open or closed
static bool autoFeedingEnabled = false; // Auto mode vs Manual mode
static unsigned long lastAutoFeedTime = 0;
static unsigned long feedingCooldown = 10000; // 10 seconds between auto-feeds to prevent spam
static bool isFeeding = false;        // Prevents multiple simultaneous feeding operations
static bool emergencyPressed = false;
static unsigned long emergencyPressTime = 0;
static bool emergencyShutdownActive = false;

/* ---- MQTT State Flags ---- */
static bool mqttConnected = false;
static bool mqttEnabled = true;     // MQTT-ONLY MODE - always enabled
static unsigned long lastMqttReconnect = 0;
static unsigned long lastMqttHeartbeat = 0;
static int mqttReconnectAttempts = 0;

/* ---- Command Deduplication ---- */
static String lastCommandId = "";
static unsigned long lastCommandTime = 0;
const unsigned long commandCooldown = 1000; // 1 second cooldown between identical commands

/* ---------------- TIMERS (OPTIMIZED) ---------------- */
unsigned long lastSensorSend = 0;
unsigned long lastCommandCheck = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastLCDUpdate = 0;

const long sensorInterval    = 5000;   // 5s for sensor updates (reduce cloud requests)
const long commandInterval   = 100;    // 100ms for ultra-fast command response (faster)
const long heartbeatInterval = 30000;  // 30s heartbeat
const long lcdUpdateInterval = 2000;   // 2s LCD refresh
const long emergencyHoldTime = 3000;       // 3s hold time to trigger emergency shutdown

/* ---- MQTT Timing (MQTT-ONLY MODE - More Aggressive) ---- */
const long mqttReconnectInterval = 1000;   // 1s between MQTT reconnection attempts (very fast)  
const long mqttHeartbeatInterval = 10000;  // 10s MQTT heartbeat (very frequent)
const long mqttKeepAlive = 20;             // 20s MQTT keep-alive (very aggressive for reliability)

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
  float lightLevel;
  float distance;          // Ultrasonic - FEEDING ONLY
  bool motionDetected;     // PIR - MOTION DETECTION ONLY
  bool pirAlarmActive;     // Separated alarm status
  bool intruderAlert;      // Intruder alert status (for backward compatibility)
  bool isValid;
};

/* ---------------- FUNCTION DECLARATIONS ---------------- */
// Forward declarations for functions used in MQTT callbacks and other functions
void executeAction(String action, int duration_ms = 3000);
void acknowledgeMqttCommand(String commandId, String action);
void sendMqttStatus(String status);
void sendMqttSensorData();
void sendMqttEmergencyAlert();
SensorData readAllSensors();

/* ---------------- PIR MOTION SENSOR FUNCTION ---------------- */
bool readPirMotion() {
  static unsigned long lastReadTime = 0;
  static bool lastPirState = false;
  static int consecutiveHighReadings = 0;
  static int consecutiveLowReadings = 0;
  static unsigned long systemStartTime = millis();
  unsigned long currentTime = millis();
  
  // CRITICAL: PIR sensors need 60 seconds warmup time after power-on
  const unsigned long PIR_WARMUP_TIME = 60000; // 60 seconds
  if (currentTime - systemStartTime < PIR_WARMUP_TIME) {
    static unsigned long lastWarmupMsg = 0;
    if (currentTime - lastWarmupMsg >= 10000) {
      Serial.printf("⏳ PIR sensor warming up... %lu/%lu seconds\n", 
                   (currentTime - systemStartTime) / 1000, PIR_WARMUP_TIME / 1000);
      lastWarmupMsg = currentTime;
    }
    return false; // Ignore all readings during warmup
  }
  
  // Read PIR every 1000ms (1 second) - slower reading for more stability
  if (currentTime - lastReadTime >= 1000) {
    int pirValue = digitalRead(PIRPIN);
    bool currentReading = (pirValue == HIGH);
    
    // Require 5 consecutive HIGH readings to trigger (5 seconds total validation)
    if (currentReading) {
      consecutiveHighReadings++;
      consecutiveLowReadings = 0;
      
      if (consecutiveHighReadings >= 5 && !lastPirState) {
        lastPirState = true;
        Serial.printf("👁️ PIR Motion: DETECTED (validated after 5 readings - 5 seconds)\n");
      }
    } else {
      consecutiveLowReadings++;
      consecutiveHighReadings = 0;
      
      if (consecutiveLowReadings >= 5 && lastPirState) {
        lastPirState = false;
        Serial.printf("👁️ PIR Motion: CLEARED (validated after 5 readings - 5 seconds)\n");
      }
    }
    
    lastReadTime = currentTime;
  }
  
  return lastPirState;
}


/* ---------------- MOTION-TRIGGERED BUZZER SYSTEM ---------------- */
static bool pirAlarmActive = false;
static unsigned long lastPirAlarmTrigger = 0;
static unsigned long pirAlarmStartTime = 0;

void checkPirMotionAlarm() {
  unsigned long currentTime = millis();
  
  // ENHANCED PIR-only thresholds to prevent false positives
  const unsigned long PIR_COOLDOWN = 15000;  // 15 seconds clear time (increased from 8s)
  const unsigned long ALARM_DURATION = 2000; // 2 seconds alarm duration
  const unsigned long ALARM_COOLDOWN = 10000; // 10 seconds between alarms (increased from 5s)
  
  bool pirDetected = readPirMotion();
  
  // Debug logging every 5 seconds
  static unsigned long lastDebugTime = 0;
  if (currentTime - lastDebugTime >= 5000) {
    Serial.printf("🔍 PIR DEBUG - Motion: %s, Alarm: %s\n", 
                 pirDetected ? "ACTIVE" : "CLEAR",
                 pirAlarmActive ? "ON" : "OFF");
    lastDebugTime = currentTime;
  }
  
  // Activate alarm ONLY on PIR motion
  if (pirDetected) {
    if (!pirAlarmActive && (currentTime - lastPirAlarmTrigger >= ALARM_COOLDOWN)) {
      pirAlarmActive = true;
      pirAlarmStartTime = currentTime;
      lastPirAlarmTrigger = currentTime;
      
      // Start alarm
      tone(BUZZERPIN, 2500, 300);
      Serial.println("🚨 PIR ALARM ACTIVATED - Motion detected!");
    }
  } else {
    // Clear alarm after PIR_COOLDOWN
    static unsigned long pirClearStartTime = 0;
    
    if (pirClearStartTime == 0 && pirAlarmActive) {
      pirClearStartTime = currentTime;
      Serial.println("🕐 No PIR motion - starting clear timer");
    }
    
    if (pirAlarmActive && pirClearStartTime > 0 && 
        (currentTime - pirClearStartTime >= PIR_COOLDOWN)) {
      pirAlarmActive = false;
      pirClearStartTime = 0;
      noTone(BUZZERPIN);
      Serial.println("✅ PIR ALL CLEAR - Buzzer reset");
    }
    
    if (pirDetected) {
      pirClearStartTime = 0; // Reset clear timer if motion detected again
    }
  }
  
  // Manage alarm duration
  if (pirAlarmActive && (currentTime - pirAlarmStartTime >= ALARM_DURATION)) {
    pirAlarmActive = false;
    noTone(BUZZERPIN);
    Serial.println("🔇 PIR alarm timeout - 2 seconds completed");
  }
}


/* ---------------- BUZZER TEST FUNCTION ---------------- */
void testBuzzerSystem() {
  Serial.println("🔊 MANUAL BUZZER TEST - Testing simplified alarm system...");
  
  // Simple test tone sequence
  Serial.println("🚨 Playing test alarm sequence...");
  
  // Test the same alarm pattern used in motion detection
  tone(BUZZERPIN, 2500, 300);
  delay(400);
  tone(BUZZERPIN, 2000, 300);
  delay(400);
  tone(BUZZERPIN, 2500, 300);
  delay(400);
  
  noTone(BUZZERPIN);
  Serial.println("✅ Buzzer test completed - 3-tone sequence finished!");
}

/* ============================================================
   INTELLIGENT FEEDING SYSTEM - SCENARIO 1
   ============================================================ */

// Open feeding box using your exact tested servo movement
// void openFeedingBox() {
//   if (feedingBoxOpen || isFeeding) {
//     Serial.println("⚠️ Feeding box already open or operation in progress");
//     return;
//   }
  
//   isFeeding = true;
//   Serial.println("🍽️ SCENARIO 1: Opening feeding box door...");
//   Serial.printf("📍 Servo moving from 180° to 80° (OPEN)\n");
  
//   // Your exact tested movement: 80 to 179 degrees (opening)
//   for (pos = 80; pos <= 179; pos += 1) {
//     myservo.write(pos);
//     delay(15); // Your tested 15ms timing
//   }
  
//   feedingBoxOpen = true;
//   isFeeding = false;
//   Serial.println("✅ Feeding box OPENED successfully at 179°");
//   Serial.printf("🕐 Box opened at: %lu ms\n", millis());
// }

// // Close feeding box using your exact tested servo movement  
// void closeFeedingBox() {
//   if (!feedingBoxOpen || isFeeding) {
//     Serial.println("⚠️ Feeding box already closed or operation in progress");
//     return;
//   }
  
//   isFeeding = true;
//   Serial.println("🚪 SCENARIO 1: Closing feeding box door...");
//   Serial.printf("📍 Servo moving from 179° to 80° (CLOSE)\n");
  
//   // Your exact tested movement: 180 to 81 degrees (closing)
//   for (pos = 180; pos >= 81; pos -= 1) {
//     myservo.write(pos);
//     delay(15); // Your tested 15ms timing
//   }
  
//   feedingBoxOpen = false;
//   isFeeding = false;
//   Serial.println("✅ Feeding box CLOSED successfully at 81°");
//   Serial.printf("🕐 Box closed at: %lu ms\n", millis());
// }

// // Complete feeding cycle (open -> wait -> close) - Auto Mode
// void performAutoFeeding() {
//   if (isFeeding) {
//     Serial.println("⚠️ Auto feeding already in progress, skipping...");
//     return;
//   }
  
//   Serial.println("🤖 AUTO FEEDING: Ultrasonic sensor triggered intelligent feeding");
  
//   // Open the feeding box
//   openFeedingBox();
  
//   if (feedingBoxOpen) {
//     Serial.println("⏱️ Auto feeding: Keeping box open for 3 seconds...");
//     delay(3000); // Keep open for 3 seconds for animal to access food
    
//     // Close the feeding box
//     closeFeedingBox();
    
//     // Update cooldown timer
//     lastAutoFeedTime = millis();
//     Serial.printf("✅ AUTO FEEDING COMPLETE - Next auto feed available in %lu seconds\n", 
//                  feedingCooldown / 1000);
//   }
// }

// // Manual feeding (dashboard/button triggered) - Manual Mode
// void performManualFeeding() {
//   Serial.println("👆 MANUAL FEEDING: User requested feeding operation");
  
//   if (feedingBoxOpen) {
//     // If already open, close it
//     closeFeedingBox();
//   } else {
//     // If closed, open it (user can manually close later or it auto-closes)
//     openFeedingBox();
//     Serial.println("💡 Manual mode: Box opened - will auto-close in 5 seconds or use close command");
    
//     // Optional: Auto-close after 5 seconds in manual mode
//     delay(5000);
//     if (feedingBoxOpen) {
//       Serial.println("🕐 Manual feeding: Auto-closing after 5 seconds...");
//       closeFeedingBox();
//     }
//   }
// }

// // Check if auto-feeding should trigger based on ultrasonic sensor
// void checkAutoFeeding(float distance) {
//   if (!autoFeedingEnabled || isFeeding) {
//     return; // Auto mode disabled or already feeding
//   }
  
//   unsigned long currentTime = millis();
  
//   // Check cooldown to prevent spam feeding
//   if (currentTime - lastAutoFeedTime < feedingCooldown) {
//     return; // Still in cooldown period
//   }
  
//   // AUTO FEEDING TRIGGER CONDITIONS for Scenario 1
//   const float FEEDING_TRIGGER_DISTANCE = 7.0; // Animal within 5cm triggers feeding (realistic close approach)
//   const float FEEDING_MAX_DISTANCE = 50.0;     // Maximum range to consider (ignore far objects)
  
//   // Trigger auto feeding when animal approaches
//   if (distance > 0 && distance <= FEEDING_TRIGGER_DISTANCE && distance >= 2.0) {
//     Serial.printf("🐾 ANIMAL DETECTED! Distance: %.1fcm - Triggering intelligent feeding\n", distance);
//     Serial.println("🤖 AUTO MODE: Initiating feeding sequence for detected animal");
    
//     performAutoFeeding();
//   }
  
//   // Debug info for feeding range (every 30 seconds)
//   static unsigned long lastFeedingDebug = 0;
//   if (currentTime - lastFeedingDebug >= 30000) {
//     Serial.printf("🍽️ Auto Feeding Status - Enabled: %s, Distance: %.1fcm, Trigger: <%.0fcm\n", 
//                  autoFeedingEnabled ? "YES" : "NO", distance, FEEDING_TRIGGER_DISTANCE);
//     if (currentTime - lastAutoFeedTime < feedingCooldown) {
//       unsigned long remainingCooldown = feedingCooldown - (currentTime - lastAutoFeedTime);
//       Serial.printf("⏳ Cooldown active: %lu seconds remaining\n", remainingCooldown / 1000);
//     } else {
//       Serial.println("✅ Auto feeding ready - waiting for animal detection");
//     }
//     lastFeedingDebug = currentTime;
//   }
// }


void openFeedingBox() {
  if (feedingBoxOpen || isFeeding) {
    Serial.println("⚠️ Feeding box already open");
    return;
  }
  
  isFeeding = true;
  Serial.println("🍽️ Opening feeding box...");
  
  // Attach servo only when needed
  myservo.attach(SERVOPIN);
  
  // Add timeout protection
  unsigned long startTime = millis();
  const unsigned long TIMEOUT = 5000; // 5 second timeout
  
  // Servo movement: 180 to 80 degrees (opening - sliding door opens by moving down)
  for (pos = 180; pos >= 80; pos -= 1) {
    myservo.write(pos);
    delay(15);
    
    // Check for timeout
    if (millis() - startTime > TIMEOUT) {
      Serial.println("⚠️ Opening operation timed out!");
      break;
    }
  }
  
  // Small delay to let servo reach position
  delay(100);
  
  // Detach servo after movement
  myservo.detach();
  
  feedingBoxOpen = true;
  isFeeding = false;
  Serial.println("✅ Feeding box OPENED at 80°");
}

// Close feeding box
void closeFeedingBox() {
  if (!feedingBoxOpen || isFeeding) {
    Serial.println("⚠️ Feeding box already closed");
    return;
  }
  
  isFeeding = true;
  Serial.println("🚪 Closing feeding box...");
  
  // Attach servo only when needed
  myservo.attach(SERVOPIN);
  
  // Add timeout protection
  unsigned long startTime = millis();
  const unsigned long TIMEOUT = 5000; // 5 second timeout
  
  // Servo movement: 80 to 180 degrees (closing - sliding door closes by moving up)
  for (pos = 80; pos <= 180; pos += 1) {
    myservo.write(pos);
    delay(15);
    
    // Check for timeout
    if (millis() - startTime > TIMEOUT) {
      Serial.println("⚠️ Closing operation timed out!");
      break;
    }
  }
  
  // Small delay to let servo reach position
  delay(100);
  
  // Detach servo after movement
  myservo.detach();
  
  feedingBoxOpen = false;
  isFeeding = false;
  Serial.println("✅ Feeding box CLOSED at 180°");
}

// Auto feeding cycle
void performAutoFeeding() {
  if (isFeeding) {
    Serial.println("⚠️ Auto feeding already in progress");
    return;
  }
  
  Serial.println("🤖 AUTO FEEDING triggered by ultrasonic sensor");
  
  openFeedingBox();
  
  if (feedingBoxOpen) {
    delay(3000); // Keep open for 3 seconds
    closeFeedingBox();
    lastAutoFeedTime = millis();
    Serial.println("✅ AUTO FEEDING COMPLETE");
  }
}

// Manual feeding - always performs complete open-close cycle
void performManualFeeding() {
  Serial.println("👆 MANUAL FEEDING requested");
  
  // If already open, close it first to reset to known state
  if (feedingBoxOpen) {
    Serial.println("⚠️ Door was open, closing first...");
    closeFeedingBox();
    delay(500); // Brief pause before reopening
  }
  
  // Perform the feeding cycle: open -> wait -> close
  openFeedingBox();
  
  if (feedingBoxOpen) {
    Serial.println("⏱️ Keeping door open for 5 seconds...");
    delay(5000); // Keep open for 5 seconds
    closeFeedingBox();
    Serial.println("✅ Manual feeding cycle complete");
  }
}

// Test the complete feeding system
void testIntelligentFeeding() {
  Serial.println("🔧 INTELLIGENT FEEDING SYSTEM TEST");
  Serial.println("═════════════════════════════════════");
  Serial.printf("📍 Using servo on pin %d\n", SERVOPIN);
  Serial.println("🧪 Testing your exact servo movement pattern...");
  
  // Test complete feeding cycle
  Serial.println("🍽️ Testing OPEN sequence...");
  openFeedingBox();
  
  delay(2000); // Wait 2 seconds
  
  Serial.println("🚪 Testing CLOSE sequence...");
  closeFeedingBox();
  
  Serial.println("✅ Intelligent Feeding System test complete!");
  Serial.println("🤖 Auto mode: Triggers when object detected within 7cm (very close approach)");
  Serial.println("👆 Manual mode: Dashboard button or FEED command");
}

// Ultrasonic sensor reading
float readUltrasonicDistance() {
  float validReadings[3];
  int validCount = 0;
  
  for (int i = 0; i < 3; i++) {
    digitalWrite(TRIGPIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIGPIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIGPIN, LOW);
    
    unsigned long duration = pulseIn(ECHOPIN, HIGH, 25000);
    float distance = (duration * 0.034) / 2;
    
    if (duration > 0 && distance >= 1 && distance <= 300) {
      validReadings[validCount] = distance;
      validCount++;
    }
    
    delay(30);
  }
  
  if (validCount == 0) {
    return 50.0;
  }
  
  float avgDistance = 0;
  for (int i = 0; i < validCount; i++) {
    avgDistance += validReadings[i];
  }
  avgDistance = avgDistance / validCount;
  
  if (avgDistance >= 1 && avgDistance <= 7) {
    Serial.printf("🍽️ FEEDING ZONE: %.1f cm\n", avgDistance);
  }
  
  return avgDistance;
}

// Check if auto-feeding should trigger
void checkAutoFeeding(float distance) {
  if (!autoFeedingEnabled || isFeeding) {
    return;
  }
  
  unsigned long currentTime = millis();
  
  if (currentTime - lastAutoFeedTime < feedingCooldown) {
    return;
  }
  
  const float FEEDING_TRIGGER_DISTANCE = 7.0;
  
  if (distance > 0 && distance <= FEEDING_TRIGGER_DISTANCE && distance >= 2.0) {
    Serial.printf("🐾 ANIMAL DETECTED! Distance: %.1fcm\n", distance);
    performAutoFeeding();
  }
  
  static unsigned long lastFeedingDebug = 0;
  if (currentTime - lastFeedingDebug >= 30000) {
    Serial.printf("🍽️ Feeding: %s, Distance: %.1fcm\n", 
                 autoFeedingEnabled ? "ENABLED" : "DISABLED", distance);
    lastFeedingDebug = currentTime;
  }
}


/* ---------------- EMERGENCY SHUTDOWN FUNCTION ---------------- */
void checkEmergencyButton() {
  static unsigned long lastDebounceTime = 0;
  static bool lastButtonState = HIGH;
  static bool stableButtonState = HIGH;
  static unsigned long lastStatusPrint = 0;
  const unsigned long debounceDelay = 50;    // 50ms debounce
  const unsigned long statusInterval = 1000; // Print status every 1 second while holding
  
  int reading = digitalRead(EMERGENCY_PIN);
  unsigned long currentTime = millis();
  
  // Debounce the button reading
  if (reading != lastButtonState) {
    lastDebounceTime = currentTime;
  }
  
  if ((currentTime - lastDebounceTime) > debounceDelay) {
    // If the button state has actually changed after debouncing
    if (reading != stableButtonState) {
      stableButtonState = reading;
      
      // Print button state change for debugging
      Serial.print("🔘 Emergency Button: ");
      if (stableButtonState == LOW) {
        Serial.println("PRESSED ⬇️");
      } else {
        Serial.println("RELEASED ⬆️");
      }
    }
    
    // Button is pressed (LOW with INPUT_PULLUP)
    if (stableButtonState == LOW) {
      if (!emergencyPressed) {
        // Start of button press
        emergencyPressed = true;
        emergencyPressTime = currentTime;
        lastStatusPrint = currentTime;
        Serial.println("🚨 EMERGENCY BUTTON PRESSED - Hold for 3 seconds to shutdown");
        Serial.printf("📍 Using GPIO %d | Button state: %d (LOW = pressed)\n", EMERGENCY_PIN, reading);
        
        // Flash LED to indicate button press detected
        for (int i = 0; i < 3; i++) {
          digitalWrite(LEDPIN, HIGH);
          delay(50);
          digitalWrite(LEDPIN, LOW);
          delay(50);
        }
      } else {
        // Button still held down - check if held long enough
        unsigned long holdDuration = currentTime - emergencyPressTime;
        
        if (holdDuration >= emergencyHoldTime && !emergencyShutdownActive) {
          emergencyShutdownActive = true;
          Serial.printf("🚨 EMERGENCY SHUTDOWN TRIGGERED! (held for %lums)\n", holdDuration);
          emergencySystemShutdown();
        } else {
          // Show progress every second while holding
          if ((currentTime - lastStatusPrint) >= statusInterval) {
            Serial.printf("⏳ Holding button: %lu/%lu ms (%.1f%%)\n", 
                         holdDuration, emergencyHoldTime, 
                         (float)holdDuration / emergencyHoldTime * 100.0);
            lastStatusPrint = currentTime;
            
            // Pulse LED to show progress
            digitalWrite(LEDPIN, HIGH);
            delay(100);
            digitalWrite(LEDPIN, LOW);
          }
        }
      }
    } else {
      // Button released
      if (emergencyPressed) {
        unsigned long holdDuration = currentTime - emergencyPressTime;
        if (holdDuration < emergencyHoldTime) {
          Serial.printf("⚠️ Emergency button released early (held %lums / %lums required)\n", 
                       holdDuration, emergencyHoldTime);
          Serial.println("💡 Hold button for full 3 seconds to trigger emergency shutdown");
        }
        emergencyPressed = false;
        emergencyPressTime = 0;
        lastStatusPrint = 0;
      }
    }
  }
  
  // Update last button state for next debounce cycle
  lastButtonState = reading;
}

// Test function to verify emergency button wiring and functionality
void testEmergencyButton() {
  Serial.println("\n🔧 EMERGENCY BUTTON TEST MODE");
  Serial.println("────────────────────────────────");
  Serial.printf("📍 Using GPIO %d\n", EMERGENCY_PIN);
  Serial.println("🔘 Press and release the emergency button to test...");
  Serial.println("❌ Type 'exit' in Serial Monitor to stop test\n");
  
  while (true) {
    int buttonState = digitalRead(EMERGENCY_PIN);
    static int lastState = HIGH;
    static unsigned long lastChange = 0;
    
    if (buttonState != lastState) {
      unsigned long now = millis();
      if (now - lastChange > 50) { // Simple debounce
        Serial.print("Button: ");
        if (buttonState == LOW) {
          Serial.println("PRESSED ⬇️");
        } else {
          Serial.println("RELEASED ⬆️");
        }
        lastChange = now;
      }
      lastState = buttonState;
    }
    
    // Check for exit command (simplified)
    if (Serial.available()) {
      String input = Serial.readString();
      input.trim();
      if (input.equals("exit") || input.equals("EXIT")) {
        Serial.println("✅ Exiting test mode...\n");
        break;
      }
    }
    
    delay(10);
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
  myservo.write(180);              // Emergency: Close feeding box to safe position
  
  // Update LCD with emergency message
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("EMERGENCY STOP!");
  lcd.setCursor(0, 1);
  lcd.print("System Halted");
  
  // Send emergency shutdown notification to cloud (if connected)
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("📤 Sending emergency shutdown notification...");
    
    // MQTT-ONLY: Emergency notification via MQTT only
    if (mqttConnected && mqttClient.connected()) {
      sendMqttEmergencyAlert();
      Serial.println("✅ Emergency notification sent via MQTT-ONLY");
    } else {
      Serial.println("⚠️ MQTT-ONLY: Cannot send emergency notification - MQTT not connected");
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

/* ============================================================
   MQTT FUNCTIONS (MQTT-ONLY MODE)
   ============================================================ */

/* ---------------- MQTT HEALTH CHECK FUNCTION ---------------- */
bool mqttHealthCheck() {
  if (!mqttClient.connected()) {
    if (mqttConnected) {
      Serial.println("🚨 MQTT-ONLY: Connection lost - health check failed");
      mqttConnected = false;
    }
    return false;
  }
  
  // Additional health checks
  static unsigned long lastPingTime = 0;
  unsigned long now = millis();
  
  // Send ping every 30 seconds to verify connection
  if (now - lastPingTime >= 30000) {
    if (mqttClient.loop()) {
      lastPingTime = now;
      return true;
    } else {
      Serial.println("🚨 MQTT-ONLY: Loop failed - connection unhealthy");
      mqttConnected = false;
      return false;
    }
  }
  
  return true;
}

/* ---------------- MQTT CALLBACK (Handle incoming messages) ---------------- */
void mqttCallback(char* topic, uint8_t* payload, unsigned int length) {
  // Convert payload to string
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  String topicStr = String(topic);
  
  // Enhanced logging for command debugging
  static int messageCount = 0;
  messageCount++;
  Serial.printf("📨 MQTT Message #%d - Topic: %s\n", messageCount, topic);
  Serial.printf("    📄 Payload: %s\n", message.c_str());
  Serial.printf("    🕐 Timestamp: %lu\n", millis());
  Serial.printf("🔍 DEBUG - Expected topic: %s\n", TOPIC_COMMANDS.c_str());
  Serial.printf("🔍 DEBUG - Topic match: %s\n", (topicStr == TOPIC_COMMANDS) ? "YES" : "NO");
  
  // Handle command messages
  if (topicStr == TOPIC_COMMANDS) {
    Serial.println("⚡ Processing MQTT command...");
    Serial.printf("🎯 FEEDING COMMAND DETECTED - This should trigger servo!\n");
    
    // Parse JSON command
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, message);
    
    if (error) {
      Serial.printf("❌ MQTT JSON parse error: %s\n", error.c_str());
      return;
    }
    
    // Extract command information
    String action = "";
    int duration = 3000;
    String commandId = "";
    
    if (doc.containsKey("action")) {
      action = doc["action"].as<String>();
    }
    
    if (doc.containsKey("duration_ms")) {
      duration = doc["duration_ms"];
    }
    
    if (doc.containsKey("command_id")) {
      commandId = doc["command_id"].as<String>();
    }
    
    if (action.length() > 0) {
      // Command deduplication - prevent executing same command multiple times
      unsigned long currentTime = millis();
      if (commandId == lastCommandId && (currentTime - lastCommandTime) < commandCooldown) {
        Serial.printf("⚠️ Duplicate command ignored: %s (ID: %s) - too recent\n", 
                     action.c_str(), commandId.c_str());
        return;
      }
      
      Serial.printf("⚡ Executing MQTT command: %s (Duration: %dms, ID: %s)\n", 
                   action.c_str(), duration, commandId.c_str());
      
      // Update deduplication tracking
      lastCommandId = commandId;
      lastCommandTime = currentTime;
      
      // Execute the action
      executeAction(action, duration);
      
      // Send acknowledgment via MQTT
      if (commandId.length() > 0) {
        acknowledgeMqttCommand(commandId, action);
      }
    }
  }
}

/* ---------------- MQTT CONNECTION FUNCTION (HiveMQ Cloud) ---------------- */
bool connectMQTT() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected, cannot connect to MQTT");
    return false;
  }
  
  // Configure secure client for HiveMQ Cloud
  espClient.setInsecure(); // Skip certificate verification for simplicity (use with caution in production)
  
  // Configure MQTT client with aggressive settings for MQTT-only mode
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setKeepAlive(mqttKeepAlive);
  mqttClient.setSocketTimeout(15); // 15 second socket timeout for secure connection
  
  Serial.printf("🔌 HiveMQ Cloud: Connecting to broker: %s:%d (Secure)\n", MQTT_BROKER, MQTT_PORT);
  Serial.printf("📋 Client ID: %s (Attempt #%d)\n", MQTT_CLIENT_ID, mqttReconnectAttempts + 1);
  Serial.printf("👤 Username: %s\n", MQTT_USER);
  
  // HiveMQ Cloud requires authentication
  bool connected = mqttClient.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASS);
  
  if (connected) {
    Serial.println("✅ HiveMQ Cloud: Connected successfully!");
    mqttConnected = true;
    mqttReconnectAttempts = 0;
    
    // Subscribe to command topic with QoS 1 for reliability
    String commandTopic = TOPIC_COMMANDS;
    if (mqttClient.subscribe(commandTopic.c_str(), 1)) {
      Serial.printf("📡 HiveMQ Cloud: Subscribed to: %s (QoS 1)\n", commandTopic.c_str());
    } else {
      Serial.printf("❌ HiveMQ Cloud: Failed to subscribe to: %s\n", commandTopic.c_str());
    }
    
    // Send connection status
    sendMqttStatus("connected_hivemq_cloud");
    
    return true;
  } else {
    // Detailed MQTT error codes
    int state = mqttClient.state();
    Serial.printf("❌ HiveMQ Cloud Connection failed (attempt #%d), state: %d ", mqttReconnectAttempts + 1, state);
    switch(state) {
      case -4: Serial.println("(MQTT_CONNECTION_TIMEOUT)"); break;
      case -3: Serial.println("(MQTT_CONNECTION_LOST)"); break;
      case -2: Serial.println("(MQTT_CONNECT_FAILED)"); break;
      case -1: Serial.println("(MQTT_DISCONNECTED)"); break;
      case  1: Serial.println("(MQTT_CONNECT_BAD_PROTOCOL)"); break;
      case  2: Serial.println("(MQTT_CONNECT_BAD_CLIENT_ID)"); break;
      case  3: Serial.println("(MQTT_CONNECT_UNAVAILABLE)"); break;
      case  4: Serial.println("(MQTT_CONNECT_BAD_CREDENTIALS)"); break;
      case  5: Serial.println("(MQTT_CONNECT_UNAUTHORIZED)"); break;
      default: Serial.printf("(UNKNOWN_ERROR_%d)\n", state); break;
    }
    
    mqttConnected = false;
    
    // In MQTT-only mode, never give up - keep trying different strategies
    if (mqttReconnectAttempts >= 20) {
      Serial.println("� MQTT-ONLY: Extended failures, trying broker alternatives...");
      // Could try different MQTT brokers here if configured
    }
    
    return false;
  }
}

/* ---------------- MQTT RECONNECTION HANDLER (MQTT-ONLY MODE) ---------------- */
void handleMqttReconnection() {
  unsigned long now = millis();
  
  // MQTT-ONLY MODE: Never disable MQTT, always try to reconnect
  if (!mqttConnected && (now - lastMqttReconnect >= mqttReconnectInterval)) {
    lastMqttReconnect = now;
    mqttReconnectAttempts++;
    
    Serial.printf("🔄 MQTT-ONLY: Attempting reconnection #%d...\n", mqttReconnectAttempts);
    
    // Try different reconnection strategies based on attempt count
    if (mqttReconnectAttempts % 10 == 0) {
      Serial.println("🔄 Aggressive reconnection: Restarting WiFi connection");
      WiFi.disconnect();
      delay(1000);
      connectWiFi();
    }
    
    connectMQTT();
  }
}

/* ---------------- MQTT PUBLISH FUNCTIONS ---------------- */
bool publishMqttMessage(String topic, String payload, bool retained = false) {
  if (!mqttConnected || !mqttClient.connected()) {
    Serial.printf("❌ Cannot publish - MQTT not connected (topic: %s)\n", topic.c_str());
    return false;
  }
  
  bool success = mqttClient.publish(topic.c_str(), payload.c_str(), retained);
  
  if (success) {
    Serial.printf("📤 MQTT Published - Topic: %s, Size: %d bytes\n", topic.c_str(), payload.length());
  } else {
    Serial.printf("❌ MQTT Publish failed - Topic: %s\n", topic.c_str());
  }
  
  return success;
}

void sendMqttSensorData() {
  if (!mqttConnected) {
    Serial.println("⚠️ MQTT not connected");
    return;
  }
  
  SensorData data = readAllSensors();
  
  StaticJsonDocument<320> doc;
  doc["device_id"] = DEVICE_ID;
  doc["temp"] = data.temperature;
  doc["hum"] = data.humidity;
  doc["soil"] = data.soilMoisture;
  doc["water"] = data.waterLevel;
  doc["light"] = data.lightLevel;
  doc["distance"] = data.distance;              // For feeding system
  doc["motion"] = data.motionDetected ? 1 : 0;  // For motion detection
  doc["intruder_alert"] = data.pirAlarmActive ? 1 : 0; // PIR alarm status
  doc["feeding_box_open"] = feedingBoxOpen;
  doc["auto_feeding_enabled"] = autoFeedingEnabled;
  doc["timestamp"] = millis();
  
  String payload;
  serializeJson(doc, payload);
  
  publishMqttMessage(TOPIC_SENSORS, payload);
  Serial.println("✅ Sensor data published");
}

void sendMqttStatus(String status) {
  if (!mqttConnected) return;
  
  JsonDocument doc;
  doc["device_id"] = DEVICE_ID;
  doc["status"] = status;
  doc["communication_mode"] = "mqtt_only";
  doc["timestamp"] = millis();
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["uptime_seconds"] = millis() / 1000;
  doc["free_heap"] = ESP.getFreeHeap();
  doc["mqtt_connected"] = mqttConnected;
  doc["mqtt_reconnect_attempts"] = mqttReconnectAttempts;
  
  String payload;
  serializeJson(doc, payload);
  
  publishMqttMessage(TOPIC_HEARTBEAT, payload, true); // Retained message
}

void acknowledgeMqttCommand(String commandId, String action) {
  if (!mqttConnected) return;
  
  JsonDocument doc;
  doc["command_id"] = commandId;
  doc["device_id"] = DEVICE_ID;
  doc["status"] = "completed";
  doc["action"] = action;
  doc["completed_at"] = millis();
  
  String payload;
  serializeJson(doc, payload);
  
  publishMqttMessage(TOPIC_STATUS, payload);
  Serial.printf("✅ MQTT Command acknowledged: %s\n", commandId.c_str());
}

void sendMqttEmergencyAlert() {
  if (!mqttConnected) return;
  
  JsonDocument doc;
  doc["device_id"] = DEVICE_ID;
  doc["alert_type"] = "emergency_shutdown";
  doc["timestamp"] = millis();
  doc["uptime_seconds"] = millis() / 1000;
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["trigger"] = "emergency_button";
  
  String payload;
  serializeJson(doc, payload);
  
  publishMqttMessage(TOPIC_EMERGENCY, payload, true);
  Serial.println("🚨 Emergency alert sent via MQTT");
}

/* ---------------- ULTRASONIC SENSOR FUNCTION ---------------- */
// Note: readUltrasonicDistance() is defined earlier in the file (around line 2411)
// Duplicate definition removed to fix compilation error

SensorData readAllSensors() {
  SensorData data;
  data.isValid = true;
  
  // Read DHT11 with retry
  int chk = DHT11.read(DHT11PIN);
  int retry_count = 0;
  
  while (chk != 0 && retry_count < 3) {
    delay(100);
    chk = DHT11.read(DHT11PIN);
    retry_count++;
  }
  
  if (chk == 0) {
    data.temperature = DHT11.temperature;
    data.humidity = DHT11.humidity;
  } else {
    Serial.printf("⚠️ DHT11 Error: %d\n", chk);
    data.temperature = -999;
    data.humidity = -999;
    data.isValid = false;
  }
  
  // Read analog sensors
  const int samples = 3;
  long soilSum = 0, waterSum = 0, steamSum = 0, lightSum = 0;
  
  for(int i = 0; i < samples; i++) {
    soilSum += analogRead(SOILHUMIDITYPIN);
    waterSum += analogRead(WATERLEVELPIN);
    steamSum += analogRead(STEAMPIN);
    lightSum += analogRead(LIGHTPIN);
    delay(10);
  }
  
  float rawSoil = soilSum / samples;
  float rawWater = waterSum / samples;
  float rawSteam = steamSum / samples;
  float rawLight = lightSum / samples;
  
  data.soilMoisture = min((rawSoil / 4095.0 * 100 * 2.3), 100.0);
  data.waterLevel = min((rawWater / 4095.0 * 100 * 2.5), 100.0);
  data.steam = rawSteam / 4095.0 * 100;
  data.lightLevel = (rawLight / 4095.0 * 100);
  
  // SEPARATED SENSORS:
  data.distance = readUltrasonicDistance();      // For feeding only
  data.motionDetected = readPirMotion();         // For motion detection only
  data.pirAlarmActive = pirAlarmActive;          // Alarm status
  data.intruderAlert = pirAlarmActive;           // For backward compatibility
  
  return data;
}/* ============================================================
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
  html += "Motion:</b> <b>" + String(data.motionDetected ? "DETECTED" : "None") + "</b><br/>";
  html += "IntruderAlert:</b> <b>" + String(data.intruderAlert ? "ACTIVE" : "None") + "</b>";
  
  Serial.printf("🔍 Final HTML: %s\n", html.c_str());
  return html;
}

String getSensorDataJSON() {
  SensorData data = readAllSensors();
  
  StaticJsonDocument<320> doc; // Increased size for new fields
  doc["temp"] = data.temperature;
  doc["hum"] = data.humidity;
  doc["soil"] = data.soilMoisture;
  doc["water"] = data.waterLevel;
  doc["steam"] = data.steam;
  doc["light"] = data.lightLevel;
  doc["distance"] = data.distance;
  doc["motion"] = data.motionDetected;
  doc["intruder_alert"] = data.intruderAlert;
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
  
  JsonObject intruder = readings.add<JsonObject>();
  intruder["metric"] = "intruder_alert";
  intruder["value"] = data.intruderAlert ? 1 : 0;
  
  // Add device status
  JsonObject status = doc["status"].to<JsonObject>();
  status["led"] = ledState;
  status["fan"] = fanState;
  status["feeding_box_open"] = feedingBoxOpen;
  status["auto_feeding_enabled"] = autoFeedingEnabled;
  status["wifi_rssi"] = WiFi.RSSI();
  status["uptime"] = millis() / 1000;
  
  return doc;
}

/* ============================================================
   COMMAND EXECUTION
   ============================================================ */
void executeAction(String action, int duration_ms) {
  Serial.printf("⚡ Executing: %s (duration: %dms)\n", action.c_str(), duration_ms);
  Serial.printf("🔍 DEBUG - Raw action: '%s' (length: %d)\n", action.c_str(), action.length());
  
  // Convert action to uppercase for consistent comparison
  action.toUpperCase();
  Serial.printf("🔍 DEBUG - Uppercase action: '%s'\n", action.c_str());
  
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
    // SCENARIO 1: Intelligent Feeding System - Manual Mode
    Serial.println("🍽️ MANUAL FEED command received - Scenario 1 activated");
    Serial.printf("🔧 DEBUG - isFeeding: %s, feedingBoxOpen: %s\n", 
                 isFeeding ? "TRUE" : "FALSE", feedingBoxOpen ? "TRUE" : "FALSE");
    performManualFeeding();
    Serial.println("✅ Manual feeding operation completed");
  }
  else if (action == "FEED_AUTO_ON" || action == "AUTO_ON") {
    // Enable auto-feeding mode
    autoFeedingEnabled = true;
    Serial.println("🤖 AUTO FEEDING MODE: ENABLED - Will trigger when animals detected");
  }
  else if (action == "FEED_AUTO_OFF" || action == "AUTO_OFF") {
    // Disable auto-feeding mode  
    autoFeedingEnabled = false;
    Serial.println("🤖 AUTO FEEDING MODE: DISABLED - Manual control only");
  }
  else if (action == "FEED_CLOSE" || action == "CLOSE_FEED") {
    // Manual close command for feeding box
    if (feedingBoxOpen) {
      Serial.println("🚪 Manual close command received");
      closeFeedingBox();
    } else {
      Serial.println("⚠️ Feeding box already closed");
    }
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
  
  // MQTT-ONLY Communication - No HTTP fallback
  if (mqttConnected && mqttClient.connected()) {
    Serial.println("📡 Sending sensor data via MQTT (MQTT-ONLY MODE)...");
    sendMqttSensorData();
    apiFailures = 0; // Reset failures on successful MQTT
  } else {
    Serial.println("❌ MQTT not connected - MQTT-ONLY MODE, no fallback");
    apiFailures++;
    
    // If MQTT fails repeatedly, try to reconnect
    if (apiFailures >= 3) {
      Serial.println("� Multiple MQTT failures, attempting reconnection...");
      connectMQTT();
      apiFailures = 0; // Reset after reconnect attempt
    }
  }
}

void checkCommands() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  // MQTT-ONLY Command Processing - No HTTP fallback
  if (mqttConnected && mqttClient.connected()) {
    // MQTT handles all commands, maintain connection and process messages
    mqttClient.loop();
    return;
  }
  
  // If MQTT not connected, try to reconnect (no HTTP fallback)
  Serial.println("❌ MQTT not connected for commands - attempting reconnection");
  connectMQTT();
}

// REMOVED: processCommand() and acknowledgeCommand() functions
// These were causing HTTP database polling in MQTT-only mode
// All commands now come exclusively through MQTT callback

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
  Serial.printf("🚨 Emergency button initialized on GPIO %d\n", EMERGENCY_PIN);
  Serial.println("💡 Press and hold for 3 seconds to trigger emergency shutdown");
  
  // Set initial states
  digitalWrite(LEDPIN, LOW);
  digitalWrite(FANPIN1, LOW);
  digitalWrite(FANPIN2, LOW);
  digitalWrite(RELAYPIN, LOW);
  digitalWrite(BUZZERPIN, LOW);
  
  // Test buzzer functionality
  Serial.println("🔊 Testing buzzer system...");
  digitalWrite(BUZZERPIN, HIGH);
  delay(200);
  digitalWrite(BUZZERPIN, LOW);
  delay(100);
  digitalWrite(BUZZERPIN, HIGH);
  delay(200);
  digitalWrite(BUZZERPIN, LOW);
  Serial.println("✅ Buzzer test complete");
  
  // Intelligent Feeding System Setup (Scenario 1)
  Serial.println("🔧 Initializing Intelligent Feeding System...");
  Serial.printf("📍 Servo pin: %d\n", SERVOPIN);
  
  myservo.attach(SERVOPIN);   // attaches the servo on pin 26 to the servo object
  myservo.write(180);         // Initialize to closed position (your tested code)
  delay(2000);                // Your tested 2 second delay
  
  feedingBoxOpen = false;     // Ensure state matches position (closed)
  isFeeding = false;         // Clear any operation flags
  lastAutoFeedTime = 0;      // Reset cooldown timer
  
  Serial.println("✅ Intelligent Feeding System initialized successfully");
  Serial.printf("🤖 Auto feeding: %s (triggers at <7cm)\n", autoFeedingEnabled ? "ENABLED" : "DISABLED");
  Serial.println("👆 Manual feeding: Available via FEED command or dashboard");
  
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
    
    // MQTT connection
    Serial.println("🔧 Connecting to MQTT broker...");
    if (connectMQTT()) {
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("MQTT Connected!");
      lcd.setCursor(0, 1);
      lcd.print("Broker Online");
      delay(2000);
    } else {
      Serial.println("⚠️ MQTT connection failed - MQTT-ONLY mode requires connection");
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("MQTT Failed");
      lcd.setCursor(0, 1);
      lcd.print("Reconnecting...");
      delay(2000);
    }
    
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
  Serial.println("� MQTT-ONLY MODE ACTIVE:");
  Serial.println("   ✅ All commands via MQTT only");
  Serial.println("   ✅ All sensor data via MQTT only");
  Serial.println("   ❌ No HTTP fallback available");
  Serial.println("�🚨 EMERGENCY SHUTDOWN:");
  Serial.println("   Hold BOOT button (GPIO 0) for 3 seconds");
  Serial.println("   to trigger emergency system shutdown");
  Serial.println("==========================================\n");
}

/* ============================================================
   MAIN LOOP (ULTRA-OPTIMIZED)
   ============================================================ */

void loop() {
  unsigned long now = millis();
  
  // Handle serial commands
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    if (command == "test_buzzer") {
      testBuzzerSystem();
    } else if (command == "test_feeding") {
      testIntelligentFeeding();
    } else if (command == "feed") {
      performManualFeeding();
    } else if (command == "auto_on") {
      autoFeedingEnabled = true;
      Serial.println("🤖 Auto feeding enabled");
    } else if (command == "auto_off") {
      autoFeedingEnabled = false;
      Serial.println("🤖 Auto feeding disabled");
    }
  }
  
  // WiFi reconnection
  if (WiFi.status() != WL_CONNECTED) {
    if (now - lastHeartbeat >= heartbeatInterval) {
      Serial.println("🔄 WiFi disconnected, reconnecting...");
      connectWiFi();
      lastHeartbeat = now;
    }
    delay(100);
    return;
  }
  
  // MQTT connection management
  handleMqttReconnection();
  
  if (mqttConnected && mqttHealthCheck()) {
    mqttClient.loop();
    yield();
    mqttClient.loop();
    yield();
    mqttClient.loop();
  }
  
  // Send sensor data
  if (systemReady && now - lastSensorSend >= sensorInterval) {
    sendSensorData();
    lastSensorSend = now;
  }
  
  // SCENARIO 1: Intelligent Feeding (Ultrasonic only)
  if (systemReady && autoFeedingEnabled) {
    float currentDistance = readUltrasonicDistance();
    checkAutoFeeding(currentDistance);
  }
  
  // SCENARIO 2: Motion Detection Alarm (PIR only)
  if (systemReady) {
    checkPirMotionAlarm();
  }
  
  // MQTT heartbeat
  if (mqttConnected && now - lastMqttHeartbeat >= mqttHeartbeatInterval) {
    sendMqttStatus("mqtt_only_online");
    lastMqttHeartbeat = now;
    
    if (!mqttClient.connected()) {
      Serial.println("🚨 MQTT connection lost during heartbeat!");
      mqttConnected = false;
    }
  }
  
  // Check commands
  if (systemReady && now - lastCommandCheck >= commandInterval) {
    checkCommands();
    lastCommandCheck = now;
  }
  
  // Extra MQTT processing
  if (mqttConnected && mqttClient.connected()) {
    static unsigned long lastExtraMqttLoop = 0;
    if (now - lastExtraMqttLoop >= 50) {
      mqttClient.loop();
      lastExtraMqttLoop = now;
    }
  }
  
  // Update LCD
  if (now - lastLCDUpdate >= lcdUpdateInterval) {
    updateLCD();
    lastLCDUpdate = now;
  }
  
  // Emergency button check
  checkEmergencyButton();
  
  delay(10);
}








// void loop() {
//   unsigned long now = millis();
  
//   // Handle serial commands for testing
//   if (Serial.available()) {
//     String command = Serial.readStringUntil('\n');
//     command.trim();
//     if (command == "test_buzzer") {
//       testBuzzerSystem();
//     } else if (command == "test_feeding") {
//       testIntelligentFeeding();
//     } else if (command == "feed") {
//       performManualFeeding();
//     } else if (command == "auto_on") {
//       autoFeedingEnabled = true;
//       Serial.println("🤖 Auto feeding enabled via serial command");
//     } else if (command == "auto_off") {
//       autoFeedingEnabled = false;
//       Serial.println("🤖 Auto feeding disabled via serial command");
//     } else if (command == "help") {
//       Serial.println("📋 Available commands:");
//       Serial.println("   test_buzzer - Test the motion detection buzzer system");
//       Serial.println("   test_feeding - Test complete intelligent feeding system");
//       Serial.println("   feed - Manual feed operation");
//       Serial.println("   auto_on - Enable auto-feeding mode");
//       Serial.println("   auto_off - Disable auto-feeding mode");
//       Serial.println("   help - Show this help message");
//     }
//   }
  
//   // WiFi reconnection check
//   if (WiFi.status() != WL_CONNECTED) {
//     if (now - lastHeartbeat >= heartbeatInterval) {
//       Serial.println("🔄 WiFi disconnected, reconnecting...");
//       connectWiFi();
//       lastHeartbeat = now;
//     }
//     delay(100);
//     return;
//   }
  
//   // MQTT-ONLY: Aggressive connection management and keep-alive
//   handleMqttReconnection();
  
//   if (mqttConnected && mqttHealthCheck()) {
//     // Multiple MQTT loop calls for maximum responsiveness in MQTT-only mode
//     mqttClient.loop(); // Process incoming MQTT messages
//     yield(); // Allow ESP32 to process other tasks
//     mqttClient.loop(); // Process any additional messages
//     yield(); // Additional yield for stability
//     mqttClient.loop(); // Third loop for ultra-responsive command processing
//   } else {
//     mqttConnected = false;
//     // In MQTT-only mode, system is not functional without MQTT
//     static unsigned long lastMqttWarning = 0;
//     if (now - lastMqttWarning >= 5000) {
//       Serial.println("⚠️ MQTT-ONLY: System non-functional without MQTT connection");
//       lastMqttWarning = now;
//     }
//   }
  
//   // Send sensor data to cloud
//   if (systemReady && now - lastSensorSend >= sensorInterval) {
//     sendSensorData();
//     lastSensorSend = now;
//   }
  
//   // SCENARIO 1: Intelligent Feeding System - Auto Mode Monitor
//   if (systemReady && autoFeedingEnabled) {
//     // Read current distance for auto-feeding logic
//     float currentDistance = readUltrasonicDistance();
//     checkAutoFeeding(currentDistance);
//   }
  
//   // Send MQTT heartbeat with health check
//   if (mqttConnected && now - lastMqttHeartbeat >= mqttHeartbeatInterval) {
//     sendMqttStatus("mqtt_only_online");
//     lastMqttHeartbeat = now;
    
//     // MQTT-ONLY health check
//     if (!mqttClient.connected()) {
//       Serial.println("🚨 MQTT-ONLY: Connection lost during heartbeat!");
//       mqttConnected = false;
//     }
//   }
  
//   // Check for commands (ULTRA-FAST - 100ms interval)
//   if (systemReady && now - lastCommandCheck >= commandInterval) {
//     checkCommands();
//     lastCommandCheck = now;
//   }
  
//   // Extra MQTT processing for better responsiveness  
//   if (mqttConnected && mqttClient.connected()) {
//     static unsigned long lastExtraMqttLoop = 0;
//     if (now - lastExtraMqttLoop >= 50) { // Extra MQTT loop every 50ms
//       mqttClient.loop();
//       lastExtraMqttLoop = now;
//     }
//   }
  
//   // Update LCD display
//   if (now - lastLCDUpdate >= lcdUpdateInterval) {
//     updateLCD();
//     lastLCDUpdate = now;
//   }
  

  
//   // Check emergency button (CRITICAL - always check)
//   checkEmergencyButton();
  
//   // Small delay to prevent watchdog issues
//   delay(10);
// }

/* ============================================================
   END OF CODE
   ============================================================ */