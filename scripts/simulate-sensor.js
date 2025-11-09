// scripts/simulate-sensor.js
// Simulates MQTT CO2 sensor data for testing

const mqtt = require('mqtt');

// Configuration
const BROKER_URL = 'mqtt://localhost:1883';
const TOPIC = 'sensor/co2';
const PUBLISH_INTERVAL = 2000; // 2 seconds

// Connect to MQTT broker
const client = mqtt.connect(BROKER_URL);

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker');
  console.log('📡 Publishing to topic:', TOPIC);
  console.log('⏱️  Interval:', PUBLISH_INTERVAL / 1000, 'seconds');
  console.log('');
  
  // Start publishing
  simulateSensor();
});

client.on('error', (error) => {
  console.error('❌ MQTT Error:', error.message);
  process.exit(1);
});

function simulateSensor() {
  let baseCO2 = 600;
  let direction = 1;
  
  setInterval(() => {
    // Simulate realistic CO2 fluctuation
    const variation = Math.random() * 50 - 25; // ±25 ppm random variation
    baseCO2 += (direction * 5) + variation;
    
    // Reverse direction at boundaries
    if (baseCO2 > 1200) direction = -1;
    if (baseCO2 < 500) direction = 1;
    
    // Ensure within realistic range
    const co2 = Math.max(400, Math.min(2000, Math.round(baseCO2)));
    
    // Create sensor reading
    const reading = {
      co2: co2,
      status: 'OK',
      timestamp: new Date().toISOString(),
      sensor: 'MH-Z19'
    };
    
    // Publish to MQTT
    client.publish(TOPIC, JSON.stringify(reading), { qos: 1 }, (error) => {
      if (error) {
        console.error('❌ Publish error:', error);
      } else {
        console.log('📨 Published:', JSON.stringify(reading));
      }
    });
  }, PUBLISH_INTERVAL);
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping sensor simulation...');
  client.end();
  process.exit();
});

console.log('🚀 CO2 Sensor Simulator Starting...');
console.log('Press Ctrl+C to stop\n');
