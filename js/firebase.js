// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { config } from './config.js';

// Initialize Firebase with configuration from config.js
// Secrets are loaded from .env file (when using Vite) or fallback values
export const app = initializeApp(config.firebase);
export const auth = getAuth(app);
