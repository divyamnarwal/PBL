# 🚀 Deployment Guide

## 📋 GitHub Setup Instructions

### Step 1: Create GitHub Repository
1. Go to [GitHub](https://github.com) and log in
2. Click the "+" button in the top right corner
3. Select "New repository"
4. Repository name: `carbon-neutrality-dashboard`
5. Description: `Real-time CO₂ monitoring dashboard with CNN-LSTM neural networks`
6. Choose "Public" or "Private"
7. **Do NOT** initialize with README (we already have one)
8. Click "Create repository"

### Step 2: Connect Local Repository
Once you create the repository, GitHub will show you commands. Run these:

```bash
# Add your remote repository (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/carbon-neutrality-dashboard.git

# Push to GitHub
git push -u origin main
```

### Step 3: Deploy to Streamlit Cloud (Optional)

#### Option A: Direct Streamlit Cloud Deployment
1. Go to [Streamlit Cloud](https://share.streamlit.io)
2. Click "Deploy now"
3. Connect your GitHub account
4. Select your `carbon-neutrality-dashboard` repository
5. Main file: `dashboard.py`
6. Click "Deploy"

#### Option B: Manual Deployment
1. Fork your repository to your personal GitHub
2. Use Streamlit Cloud with the forked repository

## 🔧 Configuration

### Environment Variables
For production deployment, you may need:
- `DATA_PATH`: Path to your CO₂ data file
- `MODEL_PATH`: Path to trained model file

### Requirements
The `requirements.txt` includes all necessary packages for deployment.

## 🌐 Access Your Dashboard

### Local Development
```bash
streamlit run dashboard.py
```

### Production (Streamlit Cloud)
Your dashboard will be available at: `https://YOUR_USERNAME-carbon-neutrality-dashboard.streamlit.app`

## 📊 Features Included

- ✅ Real-time CO₂ monitoring
- ✅ CNN-LSTM predictions
- ✅ Advanced analytics (6 tabs)
- ✅ Machine learning insights
- ✅ Environmental impact calculator
- ✅ Gamification system
- ✅ Global monitoring map
- ✅ Professional UI/UX
- ✅ Mobile responsive design

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m "Add feature"`
4. Push to branch: `git push origin feature-name`
5. Create Pull Request

## 📝 License

This project is open source and available under the MIT License.
