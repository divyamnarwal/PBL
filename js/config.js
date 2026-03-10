// js/config.js
// Environment configuration loader
// All secrets MUST come from environment variables (Vite loads VITE_* from .env)
// NEVER hardcode API keys or credentials in source code.

const isVite = typeof import.meta !== 'undefined' && import.meta.env;

// Helper to require an env value (throws if missing for critical keys)
const requireEnv = (envValue, name) => {
  if (!envValue || envValue.includes('your_') || envValue === 'your_api_key_here') {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      'Copy .env.example to .env and fill in your values. See SETUP_GUIDE.md.'
    );
  }
  return envValue;
};

// Optional env value (returns empty string if not set)
const optionalEnv = (envValue) => envValue || '';

// Firebase config from environment variables — no hardcoded fallbacks
const config = {
  firebase: {
    apiKey: requireEnv(isVite ? import.meta.env.VITE_FIREBASE_API_KEY : undefined, 'VITE_FIREBASE_API_KEY'),
    authDomain: requireEnv(isVite ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN : undefined, 'VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: requireEnv(isVite ? import.meta.env.VITE_FIREBASE_PROJECT_ID : undefined, 'VITE_FIREBASE_PROJECT_ID'),
    storageBucket: requireEnv(isVite ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET : undefined, 'VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: requireEnv(isVite ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID : undefined, 'VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: requireEnv(isVite ? import.meta.env.VITE_FIREBASE_APP_ID : undefined, 'VITE_FIREBASE_APP_ID'),
    measurementId: optionalEnv(isVite ? import.meta.env.VITE_FIREBASE_MEASUREMENT_ID : undefined)
  },
  mqtt: {
    brokerUrl: (isVite && import.meta.env.VITE_MQTT_BROKER_URL) || 'ws://localhost:9001',
    topic: (isVite && import.meta.env.VITE_MQTT_TOPIC) || 'sensor/co2'
  },
  predictions: {
    dashboardUrl: (isVite && import.meta.env.VITE_PREDICTION_DASHBOARD_URL) || 'http://localhost:8501'
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
