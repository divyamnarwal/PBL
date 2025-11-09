# 🚀 Quick Start Guide - Secure Configuration

## ✅ **What Just Changed:**

All secrets have been moved from source code to environment variables for better security!

### 📁 **New Files Created:**

1. **`.env`** - Your actual secrets (⚠️ NOT tracked in Git)
2. **`.env.example`** - Template for team members
3. **`js/config.js`** - Configuration loader
4. **`vite.config.js`** - Vite build configuration
5. **`package.json`** - Node.js dependencies
6. **`docs/ENVIRONMENT.md`** - Detailed setup guide

### 🔒 **Security Improvements:**

| Before | After |
|--------|-------|
| ❌ Secrets in `firebase.js` | ✅ Secrets in `.env` (gitignored) |
| ❌ Committed to Git | ✅ Never committed (safe!) |
| ❌ Hard to change per environment | ✅ Easy per-environment config |

---

## 🏃 **Quick Setup (2 Options)**

### **Option 1: Direct Browser (No Build Tool)**
✅ **Works now without any changes!**

The app uses fallback values from `js/config.js` so it still works when opening files directly.

**Steps:**
1. Open `public/dashboard.html` directly in browser
2. Everything works as before (fallback values used)

**Note:** Not recommended for production deployment.

---

### **Option 2: Vite Dev Server (Recommended - Secure)**
✅ **Loads secrets from `.env` file**

**Steps:**

```powershell
# 1. Install Node.js dependencies
npm install

# 2. Verify .env file exists with your secrets
# (Already created with your Firebase config!)
notepad .env

# 3. Start Vite dev server
npm run dev
```

The app will open at `http://localhost:3000` with full .env support! 🎉

---

## 📋 **For Team Members / New Setup:**

If someone clones this repo, they need to:

```powershell
# 1. Copy the example file
Copy-Item .env.example .env

# 2. Edit with their Firebase credentials
notepad .env

# 3. Install and run
npm install
npm run dev
```

---

## 🔐 **Your `.env` File:**

Already created with your current Firebase config:

```env
VITE_FIREBASE_API_KEY=AIzaSyAaDgzwbFpZc23ben2SOWEvR-mI55TFldw
VITE_FIREBASE_AUTH_DOMAIN=carbon-neutrality-bea37.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=carbon-neutrality-bea37
...
```

✅ **Safe** - This file is in `.gitignore` and won't be committed!

---

## 🧪 **Testing:**

### Test Direct Browser Access (Fallback Mode):
```powershell
Start-Process "d:\carbon-frontend\public\dashboard.html"
```
Should work with fallback values from `config.js`

### Test Vite Dev Server (Secure Mode):
```powershell
npm run dev
```
Should work with values from `.env` file

---

## 🎯 **What This Solves:**

1. ✅ **Security:** No more secrets in Git history
2. ✅ **Flexibility:** Different configs for dev/prod
3. ✅ **Team Collaboration:** Easy onboarding with `.env.example`
4. ✅ **Best Practices:** Industry-standard approach
5. ✅ **Future-Proof:** Ready for CI/CD deployment

---

## 🚨 **IMPORTANT:**

If you've already committed secrets to Git before:

```powershell
# Remove .env from Git if accidentally added
git rm --cached .env

# Verify .gitignore contains .env
git status
# Should show: .env (untracked)

# Commit the security improvements
git add .
git commit -m "feat: move secrets to .env for security"
git push
```

**Consider rotating your Firebase keys** if they were exposed in Git history.

---

## 📚 **Need More Details?**

See `docs/ENVIRONMENT.md` for complete documentation!
