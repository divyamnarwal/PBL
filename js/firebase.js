// js/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { config } from './config.js';

// Initialize Firebase with configuration from config.js
// Secrets are loaded from .env file (when using Vite) or fallback values
export const app = initializeApp(config.firebase);
export const auth = getAuth(app);
