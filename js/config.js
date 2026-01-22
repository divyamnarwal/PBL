// js/config.js
// Environment configuration loader
// For production, these should be loaded from environment variables during build
// For development, Vite loads VITE_* variables from .env file

const isVite = typeof import.meta !== 'undefined' && import.meta.env;

// Default Firebase configuration (fallback for development)
const defaultFirebaseConfig = {
  apiKey: "AIzaSyAaDgzwbFpZc23ben2SOWEvR-mI55TFldw",
  authDomain: "carbon-neutrality-bea37.firebaseapp.com",
  projectId: "carbon-neutrality-bea37",
  storageBucket: "carbon-neutrality-bea37.firebasestorage.app",
  messagingSenderId: "919031202789",
  appId: "1:919031202789:web:0e8da307795bf9c8fde50c",
  measurementId: "G-H02K92BYZH"
};

// Helper to get env value or fallback
const getEnvOrFallback = (envValue, fallback) => {
  if (!envValue) return fallback;
  // Check if it's a placeholder value
  if (typeof envValue === 'string' && (
    envValue.includes('your_') ||
    envValue === 'your_project_id' ||
    envValue === 'your_api_key_here'
  )) {
    return fallback;
  }
  return envValue;
};

// Firebase config from environment variables with fallback
const config = {
  firebase: {
    apiKey: getEnvOrFallback(isVite ? import.meta.env.VITE_FIREBASE_API_KEY : undefined, defaultFirebaseConfig.apiKey),
    authDomain: getEnvOrFallback(isVite ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN : undefined, defaultFirebaseConfig.authDomain),
    projectId: getEnvOrFallback(isVite ? import.meta.env.VITE_FIREBASE_PROJECT_ID : undefined, defaultFirebaseConfig.projectId),
    storageBucket: getEnvOrFallback(isVite ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET : undefined, defaultFirebaseConfig.storageBucket),
    messagingSenderId: getEnvOrFallback(isVite ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID : undefined, defaultFirebaseConfig.messagingSenderId),
    appId: getEnvOrFallback(isVite ? import.meta.env.VITE_FIREBASE_APP_ID : undefined, defaultFirebaseConfig.appId),
    measurementId: getEnvOrFallback(isVite ? import.meta.env.VITE_FIREBASE_MEASUREMENT_ID : undefined, defaultFirebaseConfig.measurementId)
  },
  mqtt: {
    brokerUrl: getEnvOrFallback(isVite ? import.meta.env.VITE_MQTT_BROKER_URL : undefined, 'ws://localhost:9001'),
    topic: getEnvOrFallback(isVite ? import.meta.env.VITE_MQTT_TOPIC : undefined, 'sensor/co2')
  }
};

// Log configuration status (without exposing secrets)
console.log('✅ Firebase Config Loaded:', {
  projectId: config.firebase.projectId,
  authDomain: config.firebase.authDomain,
  hasApiKey: !!config.firebase.apiKey,
  hasAppId: !!config.firebase.appId
});

export { config };
