// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAaDgzwbFpZc23ben2SOWEvR-mI55TFldw",
  authDomain: "carbon-neutrality-bea37.firebaseapp.com",
  projectId: "carbon-neutrality-bea37",
  storageBucket: "carbon-neutrality-bea37.firebasestorage.app",
  messagingSenderId: "919031202789",
  appId: "1:919031202789:web:0e8da307795bf9c8fde50c",
  measurementId: "G-H02K92BYZH"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
