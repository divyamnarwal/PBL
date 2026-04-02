import { config } from './config.js';

const statusBadge = document.getElementById('prediction-status');
const statusTitle = document.getElementById('prediction-status-title');
const statusText = document.getElementById('prediction-status-text');
const statusPanel = document.getElementById('prediction-status-panel');
const retryButton = document.getElementById('prediction-retry');
const openLink = document.getElementById('prediction-open-link');
const serviceUrl = document.getElementById('prediction-service-url');
const frameShell = document.getElementById('prediction-frame-shell');
const predictionCo2 = document.getElementById('prediction-co2');
const predictionInputCo2 = document.getElementById('prediction-input-co2');
const predictionTemperature = document.getElementById('prediction-temperature');
const predictionLocation = document.getElementById('prediction-location');
const predictionPredictedFor = document.getElementById('prediction-predicted-for');
const predictionGeneratedAt = document.getElementById('prediction-generated-at');
const predictionRaw = document.getElementById('prediction-raw');

const predictionApiUrl = config.predictions.apiUrl || config.predictions.dashboardUrl;
const NETWORK_TIMEOUT_MS = 4000;
const REFRESH_INTERVAL_MS = 1000;
let refreshTimer = null;
let clockTimer = null;
let latestPrediction = null;

function setStatus(kind, title, message) {
  if (statusTitle) {
    statusTitle.textContent = title;
  }

  if (statusText) {
    statusText.textContent = message;
  }

  if (statusBadge) {
    statusBadge.dataset.state = kind;
    statusBadge.textContent = kind === 'ready' ? 'Ready' : kind === 'checking' ? 'Checking' : 'Unavailable';
  }

  if (statusPanel) {
    statusPanel.dataset.state = kind;
  }
}

function showFrame(show) {
  if (!frameShell) return;
  frameShell.hidden = !show;
}

function formatDateTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatLiveTime(value, mode = 'past') {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);

  if (mode === 'future') {
    if (diffSeconds > 0) {
      return `${formatDateTime(value)} (in ${diffSeconds}s)`;
    }
    if (diffSeconds === 0) {
      return `${formatDateTime(value)} (now)`;
    }
    return `${formatDateTime(value)} (${Math.abs(diffSeconds)}s ago)`;
  }

  if (diffSeconds < 0) {
    return `${formatDateTime(value)} (${Math.abs(diffSeconds)}s ago)`;
  }
  if (diffSeconds === 0) {
    return `${formatDateTime(value)} (now)`;
  }
  return `${formatDateTime(value)} (in ${diffSeconds}s)`;
}

function startClock() {
  if (clockTimer) {
    window.clearInterval(clockTimer);
  }

  clockTimer = window.setInterval(() => {
    if (!latestPrediction) return;

    if (predictionPredictedFor) {
      predictionPredictedFor.textContent = formatLiveTime(latestPrediction.predicted_for, 'future');
    }
    if (predictionGeneratedAt) {
      predictionGeneratedAt.textContent = formatLiveTime(latestPrediction.generated_at, 'past');
    }
  }, 1000);
}

function renderPrediction(data) {
  latestPrediction = data;

  if (predictionCo2) {
    predictionCo2.textContent = `${Math.round(data.predicted_co2_level ?? 0)} ppm`;
  }
  if (predictionInputCo2) {
    predictionInputCo2.textContent = `${Math.round(data.input_co2_level ?? 0)} ppm`;
  }
  if (predictionTemperature) {
    predictionTemperature.textContent = data.temperature != null ? `${Math.round(data.temperature)} C` : '--';
  }
  if (predictionLocation) {
    predictionLocation.textContent = data.location || 'default';
  }
  if (predictionPredictedFor) {
    predictionPredictedFor.textContent = formatLiveTime(data.predicted_for, 'future');
  }
  if (predictionGeneratedAt) {
    predictionGeneratedAt.textContent = formatLiveTime(data.generated_at, 'past');
  }
  if (predictionRaw) {
    predictionRaw.textContent = JSON.stringify(data, null, 2);
  }

  startClock();
}

function scheduleNextRefresh() {
  if (refreshTimer) {
    window.clearTimeout(refreshTimer);
  }

  refreshTimer = window.setTimeout(() => {
    loadPredictionDashboard({ silent: true });
  }, REFRESH_INTERVAL_MS);
}

async function fetchPrediction(url) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  const uncachedUrl = `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`;

  try {
    const response = await fetch(uncachedUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Prediction API returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('Prediction API request failed:', error);
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function loadPredictionDashboard(options = {}) {
  const { silent = false } = options;

  if (!predictionApiUrl) {
    setStatus('error', 'Prediction service URL missing', 'Set VITE_PREDICTION_API_URL to your running prediction API.');
    showFrame(false);
    return;
  }

  if (serviceUrl) {
    serviceUrl.textContent = predictionApiUrl;
  }

  if (openLink) {
    openLink.href = predictionApiUrl;
  }

  if (!silent) {
    setStatus('checking', 'Checking prediction service', `Trying to reach ${predictionApiUrl}...`);
    showFrame(false);
  }

  try {
    const payload = await fetchPrediction(predictionApiUrl);
    renderPrediction(payload);
    setStatus('ready', 'Prediction service connected', `Live prediction auto-refreshes every ${REFRESH_INTERVAL_MS / 1000} seconds from ${predictionApiUrl}.`);
    showFrame(true);
    scheduleNextRefresh();
  } catch (error) {
    setStatus(
      'error',
      'Prediction service unavailable',
      'Start or restart the local prediction API service on port 8010 and then retry.'
    );
    scheduleNextRefresh();
  }
}

if (retryButton) {
  retryButton.addEventListener('click', () => {
    loadPredictionDashboard();
  });
}

loadPredictionDashboard();
