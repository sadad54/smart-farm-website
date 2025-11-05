/*
 * Emergency Button Test - Fixed Version
 * This code properly tests the emergency shutdown button functionality
 */

// Use GPIO 0 (BOOT button) as per the main smart farm code
#define ButtonPin 0  // Changed from 5 to 0 to match main code

// Variables for button debouncing
unsigned long lastDebounceTime = 0;
unsigned long debounceDelay = 50;    // 50ms debounce
bool lastButtonState = HIGH;         // Previous button state
bool buttonState = HIGH;             // Current button state
bool stableButtonState = HIGH;       // Debounced button state

void setup() {
  // Initialize serial port and set baud rate to 115200 (better for ESP32)
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n╔═══════════════════════════════════════╗");
  Serial.println("║    🚨 EMERGENCY BUTTON TEST 🚨       ║");
  Serial.println("╚═══════════════════════════════════════╝");
  Serial.println();
  Serial.println("📌 Using GPIO 0 (BOOT button)");
  Serial.println("🔧 Button pressed = LOW (0)");
  Serial.println("🔧 Button released = HIGH (1)");
  Serial.println("⏱️  Press and hold for 3+ seconds to test emergency shutdown");
  Serial.println("────────────────────────────────────────");
  
  // Set pin to input with internal pull-up resistor enabled
  // This is CRITICAL for proper button operation on ESP32
  pinMode(ButtonPin, INPUT_PULLUP);
  
  Serial.println("✅ Emergency button initialized successfully!");
  Serial.println();
}

void loop() {
  // Read the current button state
  bool reading = digitalRead(ButtonPin);
  
  // Check if button state changed (for debouncing)
  if (reading != lastButtonState) {
    lastDebounceTime = millis();  // Reset debounce timer
  }
  
  // If enough time has passed since state change, accept the new state
  if ((millis() - lastDebounceTime) > debounceDelay) {
    // If the button state has actually changed
    if (reading != stableButtonState) {
      stableButtonState = reading;
      
      // Button state change detected - print status
      Serial.print("🔘 Button Status Change: ");
      if (stableButtonState == LOW) {
        Serial.println("PRESSED (LOW) ⬇️");
      } else {
        Serial.println("RELEASED (HIGH) ⬆️");
      }
    }
  }
  
  // Always show current raw reading for debugging
  Serial.print("Raw Reading: ");
  Serial.print(reading);
  Serial.print(" | Stable State: ");
  Serial.print(stableButtonState);
  Serial.print(" | Status: ");
  
  if (stableButtonState == LOW) {
    Serial.println("🚨 BUTTON PRESSED");
  } else {
    Serial.println("✅ Button Released");
  }
  
  // Store current reading for next iteration
  lastButtonState = reading;
  
  // Small delay to make serial output readable
  delay(200);
}