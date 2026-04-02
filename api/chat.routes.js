import express from 'express';
import Recommendation from '../js/db/recommendation.schema.js';
import mongoDBService from '../js/db/mongodb.service.js';
import { createChatCompletion } from '../js/services/chatProvider.service.js';

const router = express.Router();
const MAX_MESSAGE_LENGTH = 1500;
const MAX_CONVERSATION_ITEMS = 8;

router.get('/status', (req, res) => {
  const configured = Boolean(process.env.OPENROUTER_API_KEY);
  return res.json({
    success: true,
    configured,
    provider: process.env.CHAT_PROVIDER || 'openrouter',
    model: process.env.OPENROUTER_MODEL || 'openrouter/free'
  });
});

router.post('/', async (req, res) => {
  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required'
      });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `message must be ${MAX_MESSAGE_LENGTH} characters or fewer`
      });
    }

    const dashboardContext = sanitizeDashboardContext(req.body?.dashboardContext || {});
    const conversation = sanitizeConversation(req.body?.conversation || []);
    const recommendationContext = await loadRecommendationContext(dashboardContext);
    const enrichedContext = {
      ...dashboardContext,
      recommendations: recommendationContext.data ?? dashboardContext.recommendations ?? null
    };

    const completion = await createChatCompletion({
      message,
      dashboardContext: enrichedContext,
      conversation
    });

    return res.json({
      success: true,
      answer: completion.answer,
      usedContext: buildUsedContext(enrichedContext, recommendationContext.usedServerLookup),
      warnings: completion.warnings
    });
  } catch (error) {
    console.error('Chat API error:', error);

    const statusCode = error.statusCode || error.status || 500;
    return res.status(statusCode).json({
      success: false,
      error: error.exposeMessage || error.message || 'Chat service unavailable'
    });
  }
});

export default router;

function sanitizeDashboardContext(input) {
  return {
    liveCo2: sanitizeLiveCo2(input.liveCo2),
    footprint: sanitizeFootprint(input.footprint),
    travelPlan: sanitizeTravelPlan(input.travelPlan),
    insights: sanitizeInsights(input.insights),
    recommendations: sanitizeRecommendations(input.recommendations)
  };
}

function sanitizeLiveCo2(input) {
  if (!input || typeof input !== 'object') return null;
  return {
    currentPpm: toFiniteNumber(input.currentPpm),
    quality: safeString(input.quality, 80),
    statusText: safeString(input.statusText, 120),
    sensorStatus: safeString(input.sensorStatus, 120),
    sensorType: safeString(input.sensorType, 80),
    location: safeString(input.location, 80),
    lastUpdate: safeString(input.lastUpdate, 80),
    isSimulationMode: Boolean(input.isSimulationMode)
  };
}

function sanitizeFootprint(input) {
  if (!input || typeof input !== 'object') return null;
  return {
    totalText: safeString(input.totalText, 80),
    totalTonsPerYear: toFiniteNumber(input.totalTonsPerYear),
    tips: sanitizeStringArray(input.tips, 8, 160),
    inputs: input.inputs && typeof input.inputs === 'object'
      ? {
          carKmPerWeek: toFiniteNumber(input.inputs.carKmPerWeek),
          flightHoursPerYear: toFiniteNumber(input.inputs.flightHoursPerYear),
          electricityBillPerMonth: toFiniteNumber(input.inputs.electricityBillPerMonth),
          shoppingSpendPerMonth: toFiniteNumber(input.inputs.shoppingSpendPerMonth),
          diet: safeString(input.inputs.diet, 40)
        }
      : null
  };
}

function sanitizeTravelPlan(input) {
  if (!input || typeof input !== 'object') return null;
  return {
    legCount: toFiniteNumber(input.legCount),
    totalEmissionKg: toFiniteNumber(input.totalEmissionKg),
    totalTrips: toFiniteNumber(input.totalTrips),
    totalDistanceKm: toFiniteNumber(input.totalDistanceKm),
    topContributor: input.topContributor && typeof input.topContributor === 'object'
      ? {
          name: safeString(input.topContributor.name, 120),
          emission: toFiniteNumber(input.topContributor.emission),
          percentage: toFiniteNumber(input.topContributor.percentage)
        }
      : null,
    recommendations: sanitizeStringArray(input.recommendations, 8, 180),
    legs: Array.isArray(input.legs)
      ? input.legs.slice(0, 10).map((leg) => ({
          origin: safeString(leg.origin, 40),
          destination: safeString(leg.destination, 40),
          mode: safeString(leg.mode, 20),
          trips: toFiniteNumber(leg.trips),
          months: toFiniteNumber(leg.months),
          distanceKm: toFiniteNumber(leg.distanceKm),
          emissionPerTripKg: toFiniteNumber(leg.emissionPerTripKg)
        }))
      : []
  };
}

function sanitizeInsights(input) {
  if (!input || typeof input !== 'object') return null;
  return {
    forecastText: safeString(input.forecastText, 80),
    treesText: safeString(input.treesText, 80),
    topContributorText: safeString(input.topContributorText, 120),
    actionableTip: safeString(input.actionableTip, 220)
  };
}

function sanitizeRecommendations(input) {
  if (!input || typeof input !== 'object') return null;
  return {
    buildingId: safeString(input.buildingId, 80),
    summary: sanitizeStringArray(input.summary, 8, 180),
    active: Array.isArray(input.active)
      ? input.active.slice(0, 6).map((item) => ({
          emissionSource: safeString(item.emissionSource, 40),
          severity: safeString(item.severity, 20),
          recommendationText: safeString(item.recommendationText, 220),
          expectedReductionPercent: toFiniteNumber(item.expectedReductionPercent)
        }))
      : []
  };
}

function sanitizeConversation(conversation) {
  if (!Array.isArray(conversation)) return [];
  return conversation
    .slice(-MAX_CONVERSATION_ITEMS)
    .map((item) => ({
      role: item?.role === 'assistant' ? 'assistant' : 'user',
      content: safeString(item?.content, 800)
    }))
    .filter((item) => item.content);
}

async function loadRecommendationContext(dashboardContext) {
  const buildingId = dashboardContext?.recommendations?.buildingId || dashboardContext?.liveCo2?.location;
  if (!buildingId) {
    return { data: dashboardContext?.recommendations ?? null, usedServerLookup: false };
  }

  try {
    await mongoDBService.connect();
    const activeRecommendations = await Recommendation.getActiveByBuilding(buildingId);
    const recommendationSummary = Array.isArray(activeRecommendations)
      ? activeRecommendations.slice(0, 5).map((item) => ({
          emissionSource: item.emissionSource,
          severity: item.severity,
          recommendationText: item.recommendationText,
          expectedReductionPercent: item.expectedReductionPercent
        }))
      : [];

    return {
      usedServerLookup: true,
      data: {
        buildingId,
        active: recommendationSummary,
        summary: recommendationSummary.map((item) => `${item.severity}: ${item.recommendationText}`)
      }
    };
  } catch (error) {
    console.warn('Chat API: failed to load recommendation context', error.message);
    return { data: dashboardContext?.recommendations ?? null, usedServerLookup: false };
  }
}

function buildUsedContext(dashboardContext, usedServerLookup) {
  return {
    liveCo2: hasUsefulFields(dashboardContext.liveCo2, ['currentPpm', 'quality', 'statusText', 'location']),
    footprint: hasUsefulFields(dashboardContext.footprint, ['totalText', 'totalTonsPerYear']) || (dashboardContext.footprint?.tips?.length ?? 0) > 0,
    travelPlan: hasUsefulFields(dashboardContext.travelPlan, ['legCount', 'totalEmissionKg', 'topContributor']) || (dashboardContext.travelPlan?.legs?.length ?? 0) > 0,
    insights: hasUsefulFields(dashboardContext.insights, ['forecastText', 'topContributorText', 'actionableTip']),
    recommendations: usedServerLookup || hasUsefulFields(dashboardContext.recommendations, ['buildingId']) || (dashboardContext.recommendations?.active?.length ?? 0) > 0
  };
}

function hasUsefulFields(input, keys) {
  if (!input || typeof input !== 'object') return false;
  return keys.some((key) => {
    const value = input[key];
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'string') return Boolean(value.trim());
    return Boolean(value);
  });
}

function sanitizeStringArray(input, limit, maxLength) {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, limit)
    .map((item) => safeString(item, maxLength))
    .filter(Boolean);
}

function safeString(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
