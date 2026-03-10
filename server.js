// server.js
// Express server for Carbon Neutrality platform

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import recommendationsRoutes from './api/recommendations.routes.js';
import mlRoutes from './api/ml.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : ['http://localhost:3000', 'http://localhost:5000'],  // Both Vite and Express
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
console.log('Loading recommendations routes...');
app.use('/api/recommendations', recommendationsRoutes);
console.log('Recommendations routes mounted at /api/recommendations');
app.use('/api/ml', mlRoutes);

// Serve static files from /public (Vite dev or built files)
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for SPA routes
app.get('/recommendations', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'recommendations.html'));
});
app.get('/predictions', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'predictions.html'));
});
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
  console.log(`🌐 Dashboard: http://localhost:${PORT}/recommendations`);
});

export default app;
