# 🚨 Emergency Button Troubleshooting Guide

## Issues Found and Fixed

### 1. **Pin Configuration Problem**
- **Your code**: Used GPIO 5 with `INPUT` mode
- **Main code**: Uses GPIO 0 with `INPUT_PULLUP` mode
- **Fix**: Use GPIO 0 (BOOT button) with `INPUT_PULLUP`

### 2. **Button Logic Problem**
- **Issue**: ESP32 with `INPUT_PULLUP` reads HIGH when released, LOW when pressed
- **Your code**: Expected HIGH when pressed
- **Fix**: Check for `LOW` when button is pressed

### 3. **Missing Debouncing**
- **Issue**: Physical buttons can cause multiple rapid triggers
- **Fix**: Added 50ms debounce delay

### 4. **Wiring Issues (if using external button)**
If you're using an external button instead of the built-in BOOT button:

```
ESP32 GPIO 5 ──── [Button] ──── GND
               │
              10kΩ
               │
              3.3V
```

## Alternative Pin Suggestions

If GPIO 0 (BOOT button) has issues, try these pins:

### **Recommended Pins for External Button:**
- **GPIO 4** - Good for buttons, no special functions
- **GPIO 5** - Your original choice, works well
- **GPIO 15** - Safe for input with pull-up
- **GPIO 21** - Good alternative

### **Pins to AVOID:**
- GPIO 1, 3 (Serial communication)
- GPIO 6-11 (Connected to flash memory)
- GPIO 0 can be problematic during boot if held LOW

## Updated Code Examples

### Simple Button Test (Fixed):
```cpp
#define ButtonPin 4  // Use GPIO 4 instead of 0
// Rest of code same as emergency_button_test.ino
```

### Main Code Pin Change:
If GPIO 0 doesn't work, change this line in the main code:
```cpp
// From:
#define EMERGENCY_PIN   0

// To:
#define EMERGENCY_PIN   4  // or 5, 15, 21
```

## Testing Steps

1. **Upload the test code** (`emergency_button_test.ino`)
2. **Open Serial Monitor** (115200 baud)
3. **Press and hold** the button
4. **Verify readings**:
   - Released: Should show `HIGH (1)`
   - Pressed: Should show `LOW (0)`

## Common Issues

### **Always reads HIGH:**
- Check wiring connections
- Verify pull-up resistor (10kΩ)
- Try different GPIO pin

### **Always reads LOW:**
- Button might be stuck
- Check for short circuits
- Verify button wiring

### **Inconsistent readings:**
- Add debouncing (already included in fixed code)
- Check for loose connections
- Use shorter wires

### **Emergency shutdown not triggering:**
- Verify 3-second hold requirement
- Check Serial Monitor for debug messages
- Ensure `checkEmergencyButton()` is called in `loop()`

## Hardware Recommendations

### **For Production Use:**
1. **Use external button** on GPIO 4 or 5
2. **Add LED indicator** to show button press
3. **Use momentary push button** (normally open)
4. **Add pull-up resistor** (10kΩ)

### **Wiring Diagram:**
```
ESP32 Pin    Component    Connection
─────────────────────────────────
GPIO 4   ──── Button ──── GND
3.3V     ──── 10kΩ   ──── GPIO 4
GPIO 2   ──── LED    ──── 220Ω ──── GND
```

## Final Notes

- The fixed code includes proper debouncing
- GPIO 0 (BOOT button) works but can interfere with programming
- For production, use GPIO 4 or 5 with external button
- Test thoroughly before deployment