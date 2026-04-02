import { config } from './config.js';

const API_BASE_URL = config.apiBaseUrl || 'http://localhost:5000/api';

export async function sendDashboardChatMessage(payload) {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Chat service unavailable');
  }

  return data;
}

export async function getDashboardChatStatus() {
  const response = await fetch(`${API_BASE_URL}/chat/status`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Unable to load chat status');
  }

  return data;
}
