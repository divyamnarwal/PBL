// api/recommendations.routes.js
// Express routes for carbon reduction recommendations
//
// TODO: MVP - Add authentication middleware when Firebase Admin SDK is available
// Current: Open endpoints for demo purposes
// Production: Require Bearer token with Firebase ID token verification

import express from 'express';
import { analyzeEmissions } from '../js/db/emissionRuleEngine.service.js';
import Recommendation from '../js/db/recommendation.schema.js';
import co2StorageService from '../js/db/co2Storage.service.js';
import mongoDBService from '../js/db/mongodb.service.js';

const router = express.Router();

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

const validateBuildingId = (req, res, next) => {
  const buildingId = req.body?.buildingId || req.query?.buildingId;
  if (buildingId && (typeof buildingId !== 'string' || buildingId.length > 50)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid buildingId format'
    });
  }
  next();
};

const validateBuildingType = (req, res, next) => {
  const validTypes = ['OFFICE', 'CAMPUS', 'INDUSTRIAL', 'COMMERCIAL'];
  const buildingType = req.body?.buildingType;
  if (buildingType && !validTypes.includes(buildingType)) {
    return res.status(400).json({
      success: false,
      error: `Invalid buildingType. Must be one of: ${validTypes.join(', ')}`
    });
  }
  next();
};

const validateMongoId = (req, res, next) => {
  const id = req.params.id;
  if (!id || typeof id !== 'string' || id.length > 50) {
    return res.status(400).json({
      success: false,
      error: 'Invalid recommendation ID'
    });
  }
  next();
};

/**
 * Error handler wrapper
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * POST /api/recommendations/generate
 * Generate carbon reduction recommendations for a building
 */
router.post('/generate', validateBuildingId, validateBuildingType, asyncHandler(async (req, res) => {
  const { buildingId, buildingType, organizationId } = req.body;

  // Required field validation
  if (!buildingId || !buildingType) {
    return res.status(400).json({
      success: false,
      error: 'buildingId and buildingType are required'
    });
  }

  // Ensure MongoDB connection
  await mongoDBService.connect();

  // Fetch aggregated emission data for the building
  // Returns: [{ emissionSource, actualPercentage }, ...]
  const aggregatedData = await co2StorageService.getAggregatedEmissions(buildingId);

  if (!aggregatedData || aggregatedData.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'No emission data found for this building'
    });
  }

  // Run rule engine analysis
  const analysisResult = await analyzeEmissions({
    buildingId,
    buildingType,
    organizationId,
    aggregatedEmissionData: aggregatedData
  });

  // Extract only HIGH_USAGE insights for persistence
  // Phase 1: Only HIGH_USAGE persisted; others are analytics-only
  const insights = analysisResult.insights || [];

  if (insights.length === 0) {
    return res.json({
      success: true,
      message: 'No new recommendations - all emissions within normal range',
      recommendations: [],
      summary: analysisResult.summary
    });
  }

  // Fetch existing unresolved recommendations to avoid duplicates
  // Multi-tenant aware: checks organizationId in addition to buildingId + emissionSource
  const existingQuery = {
    buildingId,
    isResolved: false,
    emissionSource: { $in: insights.map(i => i.emissionSource) }
  };
  if (organizationId) {
    existingQuery.organizationId = organizationId;
  }

  const existingRecommendations = await Recommendation.find(existingQuery);

  const existingSourceMap = new Map(
    existingRecommendations.map(r => [r.emissionSource, true])
  );

  // Create only new recommendations (no duplicates)
  const newRecommendations = [];
  for (const insight of insights) {
    if (existingSourceMap.has(insight.emissionSource)) {
      continue; // Skip - already exists
    }

    const recommendation = new Recommendation({
      buildingId,
      buildingType,
      organizationId,
      emissionSource: insight.emissionSource,
      status: 'HIGH_USAGE', // Only HIGH_USAGE persisted at launch
      severity: insight.severity,
      recommendationText: generateRecommendationText(insight),
      expectedReductionPercent: calculateExpectedReduction(insight),
      recommendationType: getRecommendationType(insight.emissionSource)
    });

    await recommendation.save();
    newRecommendations.push(recommendation);
  }

  return res.status(201).json({
    success: true,
    recommendations: newRecommendations,
    summary: {
      created: newRecommendations.length,
      skipped: insights.length - newRecommendations.length,
      totalInsights: insights.length
    },
    healthScore: analysisResult.summary.healthScore
  });
}));

/**
 * GET /api/recommendations/active
 * Fetch active (unresolved, non-dismissed) recommendations
 */
router.get('/active', validateBuildingId, asyncHandler(async (req, res) => {
  const { buildingId, organizationId } = req.query;

  // Validation
  if (!buildingId && !organizationId) {
    return res.status(400).json({
      success: false,
      error: 'Either buildingId or organizationId query param is required'
    });
  }

  // Ensure MongoDB connection
  await mongoDBService.connect();

  let recommendations;

  if (buildingId) {
    recommendations = await Recommendation.getActiveByBuilding(buildingId);
  } else {
    recommendations = await Recommendation.getActiveByOrganization(organizationId);
  }

  return res.json({
    success: true,
    recommendations,
    count: recommendations.length
  });
}));

/**
 * PATCH /api/recommendations/:id/resolve
 * Mark a recommendation as resolved
 */
router.patch('/:id/resolve', validateMongoId, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  // Ensure MongoDB connection
  await mongoDBService.connect();

  const recommendation = await Recommendation.findById(id);

  if (!recommendation) {
    return res.status(404).json({
      success: false,
      error: 'Recommendation not found'
    });
  }

  if (recommendation.isResolved) {
    return res.status(400).json({
      success: false,
      error: 'Recommendation is already resolved'
    });
  }

  // Mark as resolved
  await recommendation.markResolved(userId);

  return res.json({
    success: true,
    recommendation
  });
}));

/**
 * Error handler
 */
router.use((error, req, res, next) => {
  console.error('Recommendations API error:', error);

  // MongoDB duplicate key error
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      error: 'Duplicate recommendation already exists'
    });
  }

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

export default router;

/**
 * ============================================
 * HELPER FUNCTIONS
 * ============================================
 */

/**
 * Generate human-readable recommendation text based on insight
 */
function generateRecommendationText(insight) {
  const { emissionSource, deviation, severity } = insight;

  const actions = {
    HVAC: 'Optimize HVAC schedules and temperature setpoints to reduce energy consumption.',
    LIGHTING: 'Switch to LED lighting and implement motion-based controls in low-traffic areas.',
    ELECTRICITY: 'Identify and eliminate phantom loads from equipment left on standby.',
    FUEL: 'Review generator usage schedules and optimize fuel consumption patterns.',
    TRANSPORT: 'Promote carpooling and electric vehicle adoption for campus commuting.',
    WASTE: 'Implement waste segregation and recycling programs to reduce landfill emissions.',
    WATER: 'Fix leaks and optimize pumping schedules to reduce water-related energy use.',
    EQUIPMENT: 'Power down non-essential equipment during non-operating hours.'
  };

  const baseAction = actions[emissionSource] || 'Review and optimize energy usage patterns.';

  const severityPrefix = {
    LOW: 'Consider ',
    MEDIUM: 'Prioritize ',
    HIGH: 'Urgently '
  };

  return `${severityPrefix[severity]}: ${baseAction} Current usage exceeds baseline by ${deviation.toFixed(1)}%.`;
}

/**
 * Calculate expected reduction percentage based on severity
 */
function calculateExpectedReduction(insight) {
  const { severity, deviation } = insight;

  // Expected reduction is a portion of the excess (deviation above 10%)
  const excessDeviation = Math.max(0, deviation - 10);

  const reductionFactors = {
    LOW: 0.3,      // Can recover ~30% of excess
    MEDIUM: 0.5,   // Can recover ~50% of excess
    HIGH: 0.7      // Can recover ~70% of excess
  };

  const factor = reductionFactors[severity] || 0.5;
  return Math.min(100, Math.round(excessDeviation * factor));
}

/**
 * Determine recommendation type based on emission source
 */
function getRecommendationType(emissionSource) {
  const optimizeTypes = ['HVAC', 'LIGHTING', 'WATER', 'EQUIPMENT'];
  const reduceTypes = ['FUEL', 'ELECTRICITY', 'TRANSPORT'];

  if (optimizeTypes.includes(emissionSource)) {
    return 'OPTIMIZE';
  } else if (reduceTypes.includes(emissionSource)) {
    return 'REDUCE';
  }
  return 'REDUCE'; // Default
}
