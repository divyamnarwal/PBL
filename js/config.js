// js/config.js
// Environment configuration loader
// For production, these should be loaded from environment variables during build
// For development, you can override them here or use a build tool like Vite

// Default Firebase configuration (fallback)
const defaultFirebaseConfig = {
  apiKey: "AIzaSyAaDgzwbFpZc23ben2SOWEvR-mI55TFldw",
  authDomain: "carbon-neutrality-bea37.firebaseapp.com",
  projectId: "carbon-neutrality-bea37",
  storageBucket: "carbon-neutrality-bea37.firebasestorage.app",
  messagingSenderId: "919031202789",
  appId: "1:919031202789:web:0e8da307795bf9c8fde50c",
  measurementId: "G-H02K92BYZH"
};

// Default MQTT configuration
const defaultMqttConfig = {
  brokerUrl: "ws://localhost:9001",
  topic: "sensor/co2"
};

// Check if running in Vite environment
const isVite = typeof import.meta !== 'undefined' && import.meta.env;

// Helper function to get env value or fallback
const getEnvOrFallback = (envValue, fallback) => {
  if (!envValue) return fallback;
  // Check if it's a placeholder value (contains "your_" or common placeholders)
  if (typeof envValue === 'string' && (
    envValue.includes('your_') ||
    envValue === 'your_project_id' ||
    envValue === 'your_api_key_here'
  )) {
    return fallback;
  }
  return envValue;
};

// Get configuration from environment or use defaults
const envApiKey = isVite ? import.meta.env.VITE_FIREBASE_API_KEY : undefined;
const envAuthDomain = isVite ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN : undefined;
const envProjectId = isVite ? import.meta.env.VITE_FIREBASE_PROJECT_ID : undefined;
const envStorageBucket = isVite ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET : undefined;
const envMessagingSenderId = isVite ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID : undefined;
const envAppId = isVite ? import.meta.env.VITE_FIREBASE_APP_ID : undefined;
const envMeasurementId = isVite ? import.meta.env.VITE_FIREBASE_MEASUREMENT_ID : undefined;
const envMqttBrokerUrl = isVite ? import.meta.env.VITE_MQTT_BROKER_URL : undefined;
const envMqttTopic = isVite ? import.meta.env.VITE_MQTT_TOPIC : undefined;

export const config = {
  firebase: {
    apiKey: getEnvOrFallback(envApiKey, defaultFirebaseConfig.apiKey),
    authDomain: getEnvOrFallback(envAuthDomain, defaultFirebaseConfig.authDomain),
    projectId: getEnvOrFallback(envProjectId, defaultFirebaseConfig.projectId),
    storageBucket: getEnvOrFallback(envStorageBucket, defaultFirebaseConfig.storageBucket),
    messagingSenderId: getEnvOrFallback(envMessagingSenderId, defaultFirebaseConfig.messagingSenderId),
    appId: getEnvOrFallback(envAppId, defaultFirebaseConfig.appId),
    measurementId: getEnvOrFallback(envMeasurementId, defaultFirebaseConfig.measurementId)
  },
  mqtt: {
    brokerUrl: getEnvOrFallback(envMqttBrokerUrl, defaultMqttConfig.brokerUrl),
    topic: getEnvOrFallback(envMqttTopic, defaultMqttConfig.topic)
  }
};

// Validate required configuration
const requiredFirebaseKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
const missingKeys = requiredFirebaseKeys.filter(key => !config.firebase[key]);

if (missingKeys.length > 0) {
  console.error('❌ Missing required Firebase configuration:', missingKeys);
  console.error('Please check your .env file or environment variables');
}

// Log configuration status (without exposing secrets)
console.log('✅ Configuration loaded:', {
  firebase: {
    projectId: config.firebase.projectId,
    authDomain: config.firebase.authDomain,
    hasApiKey: !!config.firebase.apiKey,
    hasAppId: !!config.firebase.appId
  },
  mqtt: {
    brokerUrl: config.mqtt.brokerUrl,
    topic: config.mqtt.topic
  },
  environment: isVite ? 'Vite (with .env support)' : 'Browser (fallback values)'
});
