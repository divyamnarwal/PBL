const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.CHAT_REQUEST_TIMEOUT_MS || '20000', 10);
const DEFAULT_MAX_TOKENS = Number.parseInt(process.env.CHAT_MAX_TOKENS || '400', 10);

export async function createChatCompletion({ message, dashboardContext, conversation = [] }) {
  const provider = process.env.CHAT_PROVIDER || 'openrouter';

  if (provider !== 'openrouter') {
    const error = new Error(`Unsupported chat provider '${provider}'`);
    error.statusCode = 500;
    throw error;
  }

  return createOpenRouterCompletion({ message, dashboardContext, conversation });
}

async function createOpenRouterCompletion({ message, dashboardContext, conversation }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'openrouter/free';

  if (!apiKey) {
    const error = new Error('Chat service is not configured yet. Add OPENROUTER_API_KEY to enable the dashboard assistant.');
    error.statusCode = 503;
    error.exposeMessage = error.message;
    throw error;
  }

  const messages = [
    {
      role: 'system',
      content: buildSystemPrompt(dashboardContext)
    },
    ...conversation.map((item) => ({
      role: item.role,
      content: item.content
    })),
    {
      role: 'user',
      content: `User question: ${message}\n\nGrounded dashboard context:\n${JSON.stringify(dashboardContext, null, 2)}`
    }
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5000',
        'X-Title': 'Carbon Neutrality Dashboard Assistant'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: DEFAULT_MAX_TOKENS
      }),
      signal: controller.signal
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload?.error?.message || payload?.message || 'OpenRouter request failed');
      error.statusCode = response.status === 401 ? 503 : response.status;
      error.exposeMessage = response.status === 401
        ? 'Chat service API key is invalid or missing.'
        : response.status === 429
          ? 'Chat service is rate limited right now. Please try again in a moment.'
          : 'Chat service is unavailable right now.';
      throw error;
    }

    const answer = payload?.choices?.[0]?.message?.content?.trim();
    return {
      answer: answer || 'I could not generate a grounded answer from the current dashboard context.',
      warnings: buildWarnings(dashboardContext)
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Chat service timed out. Please try again.');
      timeoutError.statusCode = 504;
      timeoutError.exposeMessage = timeoutError.message;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildSystemPrompt(dashboardContext) {
  const missing = [];
  if (!dashboardContext?.liveCo2?.currentPpm) missing.push('live CO2');
  if (!dashboardContext?.footprint?.totalText) missing.push('personal footprint');
  if (!dashboardContext?.travelPlan?.legCount) missing.push('travel plan');
  if (!dashboardContext?.insights?.actionableTip) missing.push('insights');

  return [
    'You are the Carbon Neutrality Dashboard Assistant.',
    'You must answer from the provided dashboard context first and treat it as the source of truth.',
    'You may add general carbon reduction advice only after grounding your answer in the supplied context.',
    'Never invent sensor values, recommendation status, trip totals, footprint totals, or forecast numbers.',
    'If a section is missing or incomplete, say that clearly and tell the user what data is missing.',
    'Keep answers concise, practical, and user-friendly.',
    'If the live CO2 context indicates simulation mode or offline fallback, say so explicitly.',
    missing.length ? `Currently incomplete dashboard sections: ${missing.join(', ')}.` : 'All major dashboard sections are available.'
  ].join(' ');
}

function buildWarnings(dashboardContext) {
  const warnings = [];

  if (dashboardContext?.liveCo2?.isSimulationMode) {
    warnings.push('Live CO2 is currently in simulation/offline mode.');
  }

  if (!dashboardContext?.travelPlan?.legCount) {
    warnings.push('Travel planner data is currently empty.');
  }

  if (!dashboardContext?.footprint?.totalText) {
    warnings.push('Personal footprint data has not been calculated yet.');
  }

  return warnings;
}
