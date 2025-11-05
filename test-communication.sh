#!/bin/bash

echo "🔧 SMART FARM COMMUNICATION TEST"
echo "================================"

# Test 1: Check if dashboard is running
echo ""
echo "1. Testing Dashboard API endpoints..."
curl -s "http://localhost:3000/api/sensor-data" || echo "❌ Dashboard not running on localhost:3000"

# Test 2: Test Vercel deployment
echo ""
echo "2. Testing Vercel API..."
curl -s "https://smart-farm-website-gamma.vercel.app/api/sensor-data" -X POST \
  -H "Content-Type: application/json" \
  -d '{"device_id":"farm_001","temperature":25.5,"humidity":60.0}' || echo "❌ Vercel API failed"

# Test 3: Check MQTT broker connectivity
echo ""
echo "3. Testing MQTT broker connectivity..."
ping -c 3 broker.hivemq.com || echo "❌ Cannot reach MQTT broker"

echo ""
echo "📋 Next Steps:"
echo "   1. Check Arduino Serial Monitor at 115200 baud"
echo "   2. Verify WiFi connection and IP address"
echo "   3. Look for MQTT connection messages"
echo "   4. Start dashboard with: npm run dev"