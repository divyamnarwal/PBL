# 🔐 Environment Variables Setup

This project uses environment variables to manage sensitive configuration like Firebase credentials and MQTT broker settings.

## 📋 Quick Setup

### 1. Copy the example file:
```bash
cp .env.example .env
```

### 2. Edit `.env` with your actual values:
```bash
# Windows
notepad .env

# Linux/Mac
nano .env
```

### 3. Fill in your Firebase credentials:
Get these from [Firebase Console](https://console.firebase.google.com/):
- Go to Project Settings > General
- Scroll to "Your apps" section
- Copy the Firebase SDK configuration values

### 4. Update MQTT settings (optional):
```env
# For local development
VITE_MQTT_BROKER_URL=ws://localhost:9001

# For Raspberry Pi deployment
VITE_MQTT_BROKER_URL=ws://192.168.1.XX:9001
```

## 🚀 Usage

### Development (Direct Browser Access)
When opening files directly via `file://` protocol:
- The app uses **fallback values** from `js/config.js`
- Environment variables are **not loaded**
- ⚠️ **Not recommended** for production

### Development (With Vite - Recommended)
```bash
# Install Vite
npm install

# Run dev server
npm run dev
```
- Environment variables from `.env` are **automatically loaded**
- Vite injects them at build time
- ✅ **Secure and recommended**

### Production Build
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Files

| File | Purpose | Git Tracked? |
|------|---------|--------------|
| `.env` | **Your actual secrets** | ❌ NO (in .gitignore) |
| `.env.example` | **Template with placeholders** | ✅ YES (safe to commit) |
| `js/config.js` | **Config loader** | ✅ YES |

## 🔒 Security Notes

1. **Never commit `.env` to Git** ✅ (Already in .gitignore)
2. **Never share your Firebase API keys publicly**
3. **Use different Firebase projects for dev/prod**
4. **Rotate keys if accidentally exposed**

## 🛠️ Environment Variables Reference

### Firebase Configuration
```env
VITE_FIREBASE_API_KEY=           # Your Firebase API key
VITE_FIREBASE_AUTH_DOMAIN=       # Format: project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=        # Your project ID
VITE_FIREBASE_STORAGE_BUCKET=    # Format: project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=  # Messaging sender ID (numbers)
VITE_FIREBASE_APP_ID=            # App ID from Firebase
VITE_FIREBASE_MEASUREMENT_ID=    # Analytics measurement ID
```

### MQTT Configuration
```env
VITE_MQTT_BROKER_URL=            # WebSocket URL (ws://host:port)
VITE_MQTT_TOPIC=                 # MQTT topic to subscribe to
```

## 🐛 Troubleshooting

### "Firebase configuration missing"
- ✅ Check `.env` file exists in project root
- ✅ Verify all required variables are set
- ✅ Restart Vite dev server after changing .env

### Environment variables not loading
- ✅ Make sure you're using Vite dev server (`npm run dev`)
- ✅ Environment variables must start with `VITE_`
- ✅ Restart dev server after modifying .env

### MQTT connection fails
- ✅ Check `VITE_MQTT_BROKER_URL` is correct
- ✅ Ensure Mosquitto broker is running
- ✅ Verify WebSocket port (9001) is open

## 📚 More Info

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Firebase Setup Guide](https://firebase.google.com/docs/web/setup)
- [MQTT Broker Setup](./docs/INTEGRATION_PLAN.md)
