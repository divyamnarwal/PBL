// js/auth.js
import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const loginForm = document.getElementById("login-form");
const loginPage = document.getElementById("login-page");
const mainApp = document.getElementById("main-app");
const errorMsg = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");
const authStatus = document.getElementById("auth-status");
const authStatusMessage = document.getElementById("auth-status-message");
const currentPath = window.location.pathname.toLowerCase();
const onProtectedPage = currentPath.includes("dashboard.html");

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
    console.log("Form submitted");
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    
    console.log("Attempting login with:", email);

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        console.log("Login successful:", userCredential.user);
        console.log("Redirecting to dashboard.html");
        window.location.href = "dashboard.html";
      })
      .catch((error) => {
        console.error("Login error:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        
        let errorMessage = "Invalid email or password!";
        if (error.code === "auth/user-not-found") {
          errorMessage = "No account found with this email.";
        } else if (error.code === "auth/wrong-password") {
          errorMessage = "Incorrect password.";
        } else if (error.code === "auth/invalid-email") {
          errorMessage = "Invalid email format.";
        } else if (error.code === "auth/too-many-requests") {
          errorMessage = "Too many attempts. Please try again later.";
        }
        
        errorMsg.textContent = errorMessage;
        errorMsg.classList.remove("hidden");
      });
  });
}

// AUTH STATE LISTENER
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (currentPath.includes("login.html")) {
      window.location.href = "dashboard.html";
      return;
    }
    if (onProtectedPage) {
      showProtectedApp();
    }
  } else {
    if (onProtectedPage) {
      hideProtectedApp("Redirecting to login...");
      window.location.href = "login.html";
    }
  }
});

// LOGOUT FUNCTION
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => {
      window.location.href = "login.html";
    });
  });
}
