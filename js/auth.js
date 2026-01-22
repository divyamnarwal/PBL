// js/auth.js
import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";

// Development-only logging flag
const DEBUG = import.meta.env.DEV;

const loginForm = document.getElementById("login-form");
const loginPage = document.getElementById("login-page");
const mainApp = document.getElementById("main-app");
const errorMsg = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");
const authStatus = document.getElementById("auth-status");
const authStatusMessage = document.getElementById("auth-status-message");
const currentPath = window.location.pathname.toLowerCase();
const onProtectedPage = currentPath.includes("dashboard.html");

// Prevent multiple redirects
let isRedirecting = false;

const showProtectedApp = () => {
  if (mainApp) {
    mainApp.style.display = "";
  }
  if (authStatus) {
    authStatus.style.display = "none";
  }
};

const hideProtectedApp = (message) => {
  if (mainApp) {
    mainApp.style.display = "none";
  }
  if (authStatus) {
    authStatus.style.display = "flex";
    if (authStatusMessage && message) {
      authStatusMessage.textContent = message;
    }
  }
};

if (onProtectedPage) {
  hideProtectedApp("Checking authentication...");
}

// LOGIN FUNCTION
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (isRedirecting) return;

    if (DEBUG) console.log("Form submitted");
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    if (DEBUG) console.log("Attempting login with:", email);
    errorMsg.classList.add("hidden"); // Hide previous errors

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        if (DEBUG) console.log("Login successful:", userCredential.user.email);
        // Auth state listener will handle redirect - no need to redirect here
      })
      .catch((error) => {
        if (DEBUG) console.error("Login error:", error.code);

        // Generic error message - prevents user enumeration
        let errorMessage = "Invalid email or password.";

        // Only exception for rate limiting (Firebase-side protection)
        if (error.code === "auth/too-many-requests") {
          errorMessage = "Too many attempts. Please try again later.";
        }

        errorMsg.textContent = errorMessage;
        errorMsg.classList.remove("hidden");
      });
  });
}

// AUTH STATE LISTENER
onAuthStateChanged(auth, (user) => {
  // Prevent multiple redirects
  if (isRedirecting) return;

  // Get current path dynamically (not from captured variable)
  const currentUrl = window.location.pathname.toLowerCase();
  const isLoginPage = currentUrl.includes("login.html");
  const isDashboardPage = currentUrl.includes("dashboard.html");

  if (DEBUG) console.log("Auth state changed:", { user: !!user, currentUrl, isLoginPage, isDashboardPage });

  if (user) {
    // User is signed in
    if (DEBUG) console.log("✅ User authenticated:", user.email);

    // If on login page, redirect to dashboard immediately (no timeout)
    if (isLoginPage) {
      isRedirecting = true;
      window.location.replace("dashboard.html"); // Use replace for faster navigation
      return;
    }

    // Show protected app content
    if (isDashboardPage) {
      showProtectedApp();
    }
  } else {
    // User is signed out
    if (DEBUG) console.log("❌ User not authenticated");

    // If on dashboard page, redirect to login
    if (isDashboardPage) {
      hideProtectedApp("Redirecting to login...");
      isRedirecting = true;
      setTimeout(() => {
        window.location.replace("login.html");
      }, 500); // Reduced timeout from 1000ms to 500ms
    }
  }
});

// LOGOUT FUNCTION
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    isRedirecting = true;
    signOut(auth).then(() => {
      window.location.replace("login.html");
    });
  });
}
