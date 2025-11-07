// Simple MQTT Connection Test
// Run this with: node test-mqtt.js

const mqtt = require('mqtt');

const client = mqtt.connect('wss://4dcaf2b87d5c4e18925c6939161d4a72.s1.eu.hivemq.cloud:8884/mqtt', {
  username: 'hivemq.webclient.1762484723853',
  password: 'Bg$c.@6pA:yhGQdC2H79',
  clientId: 'TestClient_' + Date.now(),
  protocol: 'wss',
  connectTimeout: 10000,
  clean: true
});

client.on('connect', () => {
  console.log('✅ SUCCESS: HiveMQ Cloud connection works!');
  console.log('🎯 Your credentials are correct');
  console.log('💡 The issue is likely multiple concurrent connections');
  client.end();
});

client.on('error', (error) => {
  console.error('❌ FAILED:', error.message);
  if (error.code === 5) {
    console.log('🚨 Error Code 5 usually means:');
    console.log('   1. Another client is already connected (ESP32?)');
    console.log('   2. Account suspended/expired');
    console.log('   3. Connection limit exceeded');
  }
});

console.log('🧪 Testing HiveMQ Cloud connection...');
console.log('⏱️ Timeout in 10 seconds...');

setTimeout(() => {
  console.log('⏰ Test timeout - no connection established');
  process.exit(1);
}, 10000);