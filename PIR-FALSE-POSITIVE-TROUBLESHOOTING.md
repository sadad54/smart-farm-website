# PIR Sensor False Positive Troubleshooting Guide

## 🔍 Why Your PIR Sensor is Triggering the Buzzer

Your PIR (Passive Infrared) motion sensor is detecting false positives due to several possible causes:

### **Software Issues (Fixed in Code):**
✅ **Increased Warmup Time**: PIR sensors now wait 60 seconds after startup before detecting motion
✅ **More Consecutive Readings**: Now requires 5 consecutive readings (5 seconds) instead of 3
✅ **Slower Reading Interval**: Changed from 500ms to 1000ms for more stable readings
✅ **Longer Cooldown Periods**: 
- Clear time: 8s → 15s
- Alarm cooldown: 5s → 10s

### **Hardware Issues (Need Manual Adjustment):**

## 🔧 Hardware Solutions

### 1. **PIR Sensor Sensitivity Adjustment**
Most PIR sensors (like HC-SR501) have two potentiometers on the back:

**Sensitivity Potentiometer (Sx):**
- Turn **COUNTERCLOCKWISE** to reduce sensitivity
- Start at minimum sensitivity and gradually increase
- This prevents false triggers from distant heat sources

**Time Delay Potentiometer (Tx):**
- Turn **COUNTERCLOCKWISE** to reduce trigger duration
- Set to minimum to prevent extended triggering periods

### 2. **Physical Positioning**
❌ **AVOID pointing PIR sensor at:**
- Windows (sunlight/heat changes)
- Heaters, AC vents, or fans
- Heat-producing devices (motors, lights)
- Reflective surfaces (mirrors, metal)

✅ **BEST placement:**
- Point downward at 45° angle
- Cover detection area you want to monitor
- Keep away from direct heat sources
- Mount securely to prevent vibration

### 3. **Electrical Noise Reduction**
Add filtering to reduce electrical interference:

```cpp
// In your PIR reading function, add averaging:
bool readPirMotion() {
  static int readingBuffer[5] = {0, 0, 0, 0, 0};
  static int bufferIndex = 0;
  
  // Take new reading
  int pirValue = digitalRead(PIRPIN);
  readingBuffer[bufferIndex] = pirValue;
  bufferIndex = (bufferIndex + 1) % 5;
  
  // Count HIGH readings in buffer
  int highCount = 0;
  for (int i = 0; i < 5; i++) {
    if (readingBuffer[i] == HIGH) highCount++;
  }
  
  // Only return true if majority (3 out of 5) are HIGH
  return (highCount >= 3);
}
```

### 4. **Power Supply Stabilization**
PIR sensors are sensitive to power fluctuations:

**Hardware Solution:**
- Add a 100µF capacitor between VCC and GND near the PIR sensor
- Use separate power rail if possible
- Ensure ESP32 power supply is stable (5V/2A recommended)

## 🧪 Testing Procedure

### Step 1: Verify Warmup Period
```bash
# Upload code and watch Serial Monitor
# You should see messages like:
⏳ PIR sensor warming up... 10/60 seconds
⏳ PIR sensor warming up... 20/60 seconds
...
⏳ PIR sensor warming up... 60/60 seconds
```

### Step 2: Monitor PIR State Changes
Watch for these messages in Serial Monitor:
```
🔍 PIR DEBUG - Motion: CLEAR, Alarm: OFF
👁️ PIR Motion: DETECTED (validated after 5 readings - 5 seconds)
🚨 PIR ALARM ACTIVATED - Motion detected!
```

### Step 3: Check for False Triggers
**If buzzer still triggers without motion:**

1. **Check Serial Monitor** for PIR detection messages
2. **Adjust sensitivity** - turn potentiometer counterclockwise
3. **Reposition sensor** - move away from heat/light sources
4. **Add shielding** - use cardboard/plastic to block unwanted detection zones

## 📊 Understanding PIR Sensor Behavior

### Normal PIR Behavior:
- **Warmup**: 30-60 seconds (sensor stabilizes)
- **Detection Range**: 3-7 meters (depends on model)
- **Detection Angle**: 90-120 degrees
- **Trigger Duration**: 2-5 seconds per detection

### What PIR Sensors Detect:
✅ Movement of warm objects (humans, animals)
✅ Temperature changes in detection zone
✅ Infrared radiation differences

❌ **NOT detected:** Stationary objects, slow movements

## 🛠️ Advanced Solutions

### Option 1: Add Manual Enable/Disable
Add a physical switch to enable/disable PIR alarm:

```cpp
#define PIR_ENABLE_SWITCH 15  // Add a switch on GPIO 15

void checkPirMotionAlarm() {
  // Check if PIR alarm is enabled
  if (digitalRead(PIR_ENABLE_SWITCH) == LOW) {
    return; // PIR alarm disabled by switch
  }
  
  // Rest of your alarm code...
}
```

### Option 2: Time-Based Activation
Only enable PIR alarm during specific hours:

```cpp
void checkPirMotionAlarm() {
  // Get current hour (requires RTC or NTP)
  int currentHour = getCurrentHour();
  
  // Only enable PIR alarm between 10 PM and 6 AM
  if (currentHour < 22 && currentHour >= 6) {
    return; // PIR alarm disabled during daytime
  }
  
  // Rest of your alarm code...
}
```

### Option 3: Ultrasonic Confirmation
Require BOTH PIR AND ultrasonic detection (highest accuracy):

```cpp
void checkPirMotionAlarm() {
  unsigned long currentTime = millis();
  
  bool pirDetected = readPirMotion();
  float distance = readUltrasonicDistance();
  
  // Require BOTH sensors to trigger
  bool bothSensorsDetect = pirDetected && (distance > 0 && distance < 50);
  
  if (bothSensorsDetect) {
    // Activate alarm only when BOTH detect something
    if (!pirAlarmActive && (currentTime - lastPirAlarmTrigger >= ALARM_COOLDOWN)) {
      pirAlarmActive = true;
      tone(BUZZERPIN, 2500, 300);
      Serial.println("🚨 DUAL SENSOR ALARM - PIR + Ultrasonic confirmed!");
    }
  } else {
    // Clear alarm when either sensor clears
    if (pirAlarmActive) {
      pirAlarmActive = false;
      noTone(BUZZERPIN);
      Serial.println("✅ DUAL SENSOR CLEAR");
    }
  }
}
```

## 🔍 Serial Monitor Debugging

### Enable verbose PIR debugging:
```cpp
bool readPirMotion() {
  // ... existing code ...
  
  // Add detailed logging
  if (currentTime - lastReadTime >= 1000) {
    int pirValue = digitalRead(PIRPIN);
    bool currentReading = (pirValue == HIGH);
    
    Serial.printf("📊 PIR Raw: %d | Consecutive H:%d L:%d | State: %s\n",
                 pirValue, consecutiveHighReadings, consecutiveLowReadings,
                 lastPirState ? "DETECTED" : "CLEAR");
    
    // ... rest of code ...
  }
}
```

## ✅ Quick Checklist

- [ ] Uploaded updated code with 60s warmup period
- [ ] Adjusted PIR sensitivity potentiometer (turn counterclockwise)
- [ ] Repositioned sensor away from heat/light sources
- [ ] Verified stable 5V power supply to ESP32
- [ ] Added 100µF capacitor near PIR sensor (optional)
- [ ] Monitored Serial Monitor for 2 minutes
- [ ] Tested with intentional motion
- [ ] Verified no false triggers for 5 minutes

## 📞 Still Having Issues?

If buzzer still triggers without motion after all fixes:

1. **Test with different PIR sensor** - Sensor might be faulty
2. **Add physical switch** - Temporarily disable PIR alarm
3. **Use dual-sensor confirmation** - Require both PIR and ultrasonic
4. **Check for electrical interference** - Move away from motors/WiFi routers
5. **Consider different sensor type** - Try microwave radar sensor (RCWL-0516)

## 📝 Code Changes Summary

### In `sketch_oct27a.ino`:

**Line ~2074 (PIR Reading Function):**
- ✅ Added 60-second warmup period
- ✅ Increased consecutive readings: 3 → 5
- ✅ Increased reading interval: 500ms → 1000ms

**Line ~2118 (Alarm Function):**
- ✅ Increased PIR cooldown: 8s → 15s
- ✅ Increased alarm cooldown: 5s → 10s

### Upload Instructions:
1. Save all changes to `sketch_oct27a.ino`
2. Connect ESP32 via USB
3. Select correct board and port in Arduino IDE
4. Click **Upload** button
5. Open Serial Monitor (115200 baud)
6. Wait 60 seconds for warmup
7. Test motion detection

---

**Last Updated:** 2025-11-10
**Status:** Software fixes applied, hardware adjustments recommended
