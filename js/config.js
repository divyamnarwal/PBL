// js/config.js
// Environment configuration loader
// For production, these should be loaded from environment variables during build
// For development, you can override them here or use a build tool like Vite

// Check if running in Vite environment
const isVite = typeof import.meta !== 'undefined' && import.meta.env;

export const config = {
  firebase: {
    apiKey: isVite ? import.meta.env.VITE_FIREBASE_API_KEY : "AIzaSyAaDgzwbFpZc23ben2SOWEvR-mI55TFldw",
    authDomain: isVite ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN : "carbon-neutrality-bea37.firebaseapp.com",
    projectId: isVite ? import.meta.env.VITE_FIREBASE_PROJECT_ID : "carbon-neutrality-bea37",
    storageBucket: isVite ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET : "carbon-neutrality-bea37.firebasestorage.app",
    messagingSenderId: isVite ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID : "919031202789",
    appId: isVite ? import.meta.env.VITE_FIREBASE_APP_ID : "1:919031202789:web:0e8da307795bf9c8fde50c",
    measurementId: isVite ? import.meta.env.VITE_FIREBASE_MEASUREMENT_ID : "G-H02K92BYZH"
  },
  mqtt: {
    brokerUrl: isVite ? import.meta.env.VITE_MQTT_BROKER_URL : "ws://localhost:9001",
    topic: isVite ? import.meta.env.VITE_MQTT_TOPIC : "sensor/co2"
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
