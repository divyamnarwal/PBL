import { config } from './config.js';

const iframe = document.getElementById('prediction-frame');
const statusBadge = document.getElementById('prediction-status');
const statusTitle = document.getElementById('prediction-status-title');
const statusText = document.getElementById('prediction-status-text');
const statusPanel = document.getElementById('prediction-status-panel');
const retryButton = document.getElementById('prediction-retry');
const openLink = document.getElementById('prediction-open-link');
const serviceUrl = document.getElementById('prediction-service-url');
const frameShell = document.getElementById('prediction-frame-shell');

const dashboardUrl = config.predictions.dashboardUrl;
const iframeUrl = `${dashboardUrl}${dashboardUrl.includes('?') ? '&' : '?'}embed=true`;
const NETWORK_TIMEOUT_MS = 4000;
const LOAD_TIMEOUT_MS = 10000;

let iframeLoadTimer = null;

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

async function probeDashboard(url) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);

  try {
    await fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal
    });
    return true;
  } catch (error) {
    console.warn('Prediction dashboard probe failed:', error);
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function attachIframeLoadHandlers(url) {
  if (!iframe) return;

  iframe.onload = () => {
    if (iframeLoadTimer) {
      window.clearTimeout(iframeLoadTimer);
      iframeLoadTimer = null;
    }
    setStatus('ready', 'Prediction service connected', `Embedded dashboard loaded from ${url}.`);
    showFrame(true);
  };

  iframeLoadTimer = window.setTimeout(() => {
    setStatus(
      'error',
      'Prediction service is taking too long',
      `The Streamlit service did not finish loading within ${LOAD_TIMEOUT_MS / 1000} seconds. Use the direct link below to verify it is running.`
    );
  }, LOAD_TIMEOUT_MS);
}

async function loadPredictionDashboard() {
  if (!dashboardUrl) {
    setStatus('error', 'Prediction service URL missing', 'Set VITE_PREDICTION_DASHBOARD_URL or use the default http://localhost:8501.');
    showFrame(false);
    return;
  }

  if (serviceUrl) {
    serviceUrl.textContent = dashboardUrl;
  }

  if (openLink) {
    openLink.href = dashboardUrl;
  }

  setStatus('checking', 'Checking prediction service', `Trying to reach ${dashboardUrl}...`);
  showFrame(false);

  const available = await probeDashboard(dashboardUrl);
  if (!available) {
    if (iframe) {
      iframe.removeAttribute('src');
    }
    setStatus(
      'error',
      'Prediction service unavailable',
      `Start the Streamlit service with scripts/start_prediction_dashboard and then retry.`
    );
    return;
  }

  attachIframeLoadHandlers(dashboardUrl);
  if (iframe) {
    iframe.src = iframeUrl;
  }
}

if (retryButton) {
  retryButton.addEventListener('click', () => {
    loadPredictionDashboard();
  });
}

loadPredictionDashboard();
