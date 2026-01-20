// scripts/mqtt-mongodb-bridge.js
// MQTT to MongoDB Bridge - Listens to MQTT sensor data and stores to MongoDB Atlas
// Run with: node scripts/mqtt-mongodb-bridge.js

import mqtt from 'mqtt';
import dotenv from 'dotenv';
import co2StorageService from '../js/db/co2Storage.service.js';

// Load environment variables
dotenv.config();

// Configuration
const CONFIG = {
  // MQTT Broker settings
  MQTT_BROKER_URL: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  MQTT_WS_URL: process.env.MQTT_WS_URL || 'ws://localhost:9001',
  MQTT_TOPIC: process.env.MQTT_TOPIC || 'sensor/co2',
  MQTT_CLIENT_ID: 'mqtt-mongodb-bridge-' + Math.random().toString(16).substr(2, 8),

  // MongoDB settings
  MONGODB_URI: process.env.MONGODB_URI || '',

  // Data storage settings
  LOCATION: process.env.LOCATION || 'default',
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE || '10'), // Batch insert size
  BATCH_TIMEOUT: parseInt(process.env.BATCH_TIMEOUT || '5000'), // ms before flushing batch
};

// Batch buffer for storing readings before bulk insert
let batchBuffer = [];
let batchTimeout = null;

/**
 * Flush the batch buffer to MongoDB
 */
async function flushBatch() {
  if (batchBuffer.length === 0) {
    return;
  }

  const readings = [...batchBuffer];
  batchBuffer = [];

  try {
    await co2StorageService.saveReadings(readings, CONFIG.LOCATION);
    console.log(`💾 Batch saved: ${readings.length} readings to MongoDB Atlas`);
  } catch (error) {
    console.error('❌ Error saving batch:', error.message);
    // Re-add failed readings to buffer
    batchBuffer.unshift(...readings);
  }
}

/**
 * Schedule a batch flush
 */
function scheduleBatchFlush() {
  if (batchTimeout) {
    clearTimeout(batchTimeout);
  }

  batchTimeout = setTimeout(() => {
    flushBatch();
  }, CONFIG.BATCH_TIMEOUT);
}

/**
 * Handle incoming MQTT message
 */
function handleMessage(topic, message) {
  try {
    const messageStr = message.toString();
    console.log(`📨 Received on [${topic}]:`, messageStr);

    // Parse JSON
    const data = JSON.parse(messageStr);

    // Validate data
    if (!validateData(data)) {
      console.warn('⚠️  Invalid data format, skipping');
      return;
    }

    // Add to batch buffer
    batchBuffer.push(data);
    console.log(`📦 Buffer size: ${batchBuffer.length}/${CONFIG.BATCH_SIZE}`);

    // Flush immediately if batch is full
    if (batchBuffer.length >= CONFIG.BATCH_SIZE) {
      flushBatch();
    } else {
      scheduleBatchFlush();
    }

  } catch (error) {
    console.error('❌ Error handling message:', error.message);
  }
}

/**
 * Validate CO2 sensor data
 */
function validateData(data) {
  if (typeof data.co2 !== 'number') {
    console.warn('⚠️  Invalid co2 value');
    return false;
  }

  if (data.co2 < 300 || data.co2 > 5000) {
    console.warn(`⚠️  CO2 value out of range: ${data.co2}`);
    return false;
  }

  if (!data.status) {
    console.warn('⚠️  Missing status field');
    return false;
  }

  if (!data.timestamp) {
    console.warn('⚠️  Missing timestamp field');
    return false;
  }

  return true;
}

/**
 * Start the MQTT-MongoDB bridge
 */
async function start() {
  console.log('========================================');
  console.log('🌉 MQTT to MongoDB Bridge');
  console.log('========================================');
  console.log(`📡 MQTT Broker: ${CONFIG.MQTT_BROKER_URL}`);
  console.log(`📡 MQTT WebSocket: ${CONFIG.MQTT_WS_URL}`);
  console.log(`📡 MQTT Topic: ${CONFIG.MQTT_TOPIC}`);
  console.log(`📍 Location: ${CONFIG.LOCATION}`);
  console.log(`📦 Batch Size: ${CONFIG.BATCH_SIZE}`);
  console.log('========================================\n');

  // Check MongoDB connection string
  if (!CONFIG.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in environment variables!');
    console.log('📝 Please create a .env file with your MongoDB connection string:');
    console.log('   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority\n');
    console.log('📖 Get your connection string from MongoDB Atlas:');
    console.log('   Data → Connect → Connect your application → Driver: Node.js\n');
    process.exit(1);
  }

  // Initialize MongoDB connection
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await co2StorageService.init();
    console.log('✅ MongoDB connection established\n');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check your MONGODB_URI in .env file');
    console.log('   2. Ensure your IP is whitelisted in MongoDB Atlas');
    console.log('   3. Verify your username/password are correct\n');
    process.exit(1);
  }

  // Determine which URL to use (try WebSocket first, fallback to MQTT)
  const brokerUrl = CONFIG.MQTT_WS_URL || CONFIG.MQTT_BROKER_URL;
  console.log(`🔌 Connecting to MQTT broker: ${brokerUrl}`);

  // Create MQTT client
  const client = mqtt.connect(brokerUrl, {
    clientId: CONFIG.MQTT_CLIENT_ID,
    keepalive: 60,
    reconnectPeriod: 5000,
    clean: true
  });

  // Handle connection
  client.on('connect', () => {
    console.log('✅ Connected to MQTT broker\n');

    // Subscribe to topic
    client.subscribe(CONFIG.MQTT_TOPIC, { qos: 1 }, (error) => {
      if (error) {
        console.error('❌ Subscription error:', error.message);
      } else {
        console.log(`✅ Subscribed to topic: ${CONFIG.MQTT_TOPIC}\n`);
        console.log('🎯 Listening for CO2 sensor data...');
        console.log('💾 Data will be saved to MongoDB Atlas\n');
        console.log('Press Ctrl+C to stop\n');
      }
    });
  });

  // Handle incoming messages
  client.on('message', handleMessage);

  // Handle errors
  client.on('error', (error) => {
    console.error('❌ MQTT client error:', error.message);
  });

  // Handle connection close
  client.on('close', () => {
    console.log('🔌 MQTT connection closed');
  });

  // Handle reconnect
  client.on('reconnect', () => {
    console.log('🔄 Reconnecting to MQTT broker...');
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down...');

    // Flush any remaining data in buffer
    if (batchBuffer.length > 0) {
      console.log(`💾 Flushing ${batchBuffer.length} remaining readings...`);
      await flushBatch();
    }

    // Close MQTT connection
    client.end();

    // Close MongoDB connection
    await co2StorageService.close();

    console.log('✅ Shutdown complete');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n\n🛑 Received SIGTERM, shutting down...');

    if (batchBuffer.length > 0) {
      await flushBatch();
    }

    client.end();
    await co2StorageService.close();

    process.exit(0);
  });
}

// Start the bridge
start().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
