// js/db/emissionRuleEngine.service.js
// Rule-Based Carbon Reduction Engine
// Compares actual emissions vs baseline profiles to trigger insights

import EmissionProfile from './emissionProfile.schema.js';

/**
 * Severity levels for emission anomalies
 */
const SEVERITY = {
  LOW: 'LOW',       // 10-20% deviation
  MEDIUM: 'MEDIUM', // 20-40% deviation
  HIGH: 'HIGH'      // >40% deviation
};

/**
 * Emission status after comparison
 */
const STATUS = {
  NORMAL: 'NORMAL',
  HIGH_USAGE: 'HIGH_USAGE',
  UNDER_UTILIZED: 'UNDER_UTILIZED',
  UNPROFILED: 'UNPROFILED'
};

/**
 * Configuration constants
 */
const CONFIG = {
  TOLERANCE_PERCENT: 10,    // ±10% tolerance for normal range
  DEVIATION_LOW: 20,        // >20% deviation = LOW severity
  DEVIATION_MEDIUM: 40,     // >40% deviation = MEDIUM severity
  DEVIATION_HIGH: Infinity  // >40% deviation = HIGH severity
};

/**
 * ============================================
 * MAIN RULE ENGINE FUNCTION
 * ============================================
 *
 * Analyzes actual emissions against expected baselines and returns insights
 *
 * @param {Object} params - Analysis parameters
 * @param {string} params.buildingId - Unique building identifier
 * @param {string} params.buildingType - Building type (OFFICE, CAMPUS, etc.)
 * @param {string} [params.organizationId] - Organization ID for multi-tenant
 * @param {Array<Object>} params.aggregatedEmissionData - Actual emission data
 * @param {string} params.aggregatedEmissionData[].emissionSource - Source type
 * @param {number} params.aggregatedEmissionData[].actualPercentage - Actual %
 *
 * @returns {Promise<Object>} Analysis results with insights
 *
 * @example
 * const result = await analyzeEmissions({
 *   buildingId: 'bldg-001',
 *   buildingType: 'OFFICE',
 *   organizationId: 'org-123',
 *   aggregatedEmissionData: [
 *     { emissionSource: 'HVAC', actualPercentage: 45 },
 *     { emissionSource: 'LIGHTING', actualPercentage: 15 }
 *   ]
 * });
 */
export async function analyzeEmissions({
  buildingId,
  buildingType,
  organizationId = null,
  aggregatedEmissionData = []
}) {
  // ============================================
  // STEP 1: Fetch baseline profiles for this building type
  // ============================================
  // Uses org-specific profiles if available, falls back to global defaults
  const profiles = await EmissionProfile.getByBuildingType(buildingType, organizationId);

  // Build a map for quick lookup: emissionSource -> profile
  const profileMap = new Map();
  for (const profile of profiles) {
    // Org-specific profiles override global ones (stored last)
    profileMap.set(profile.emissionSource, profile);
  }

  // ============================================
  // STEP 2: Compare actual vs expected for each source
  // ============================================
  const analysis = [];
  const summary = {
    totalSources: aggregatedEmissionData.length,
    normalCount: 0,
    highUsageCount: 0,
    underUtilizedCount: 0,
    totalDeviation: 0
  };

  for (const actual of aggregatedEmissionData) {
    const { emissionSource, actualPercentage } = actual;

    // Skip if actual data is invalid
    if (typeof actualPercentage !== 'number' || actualPercentage < 0) {
      continue;
    }

    const profile = profileMap.get(emissionSource);

    // If no profile exists for this source, mark as unprofiled but still track it
    if (!profile) {
      analysis.push({
        emissionSource,
        status: STATUS.UNPROFILED,
        expectedPercentage: null,
        actualPercentage,
        deviation: null,
        severity: null,
        message: `No baseline profile defined for ${emissionSource}`
      });
      continue;
    }

    const expectedPercentage = profile.expectedContributionPercentage;
    const deviation = actualPercentage - expectedPercentage;
    const absDeviation = Math.abs(deviation);

    // ============================================
    // STEP 3: Determine status based on tolerance
    // ============================================
    // Within ±10% tolerance = NORMAL
    // Above expected + 10% = HIGH_USAGE
    // Below expected - 10% = UNDER_UTILIZED

    let status, severity, message;

    if (absDeviation <= CONFIG.TOLERANCE_PERCENT) {
      status = STATUS.NORMAL;
      severity = null;
      summary.normalCount++;
      message = `${emissionSource} operating within normal range`;

    } else if (deviation > 0) {
      // Actual is HIGHER than expected
      status = STATUS.HIGH_USAGE;
      summary.highUsageCount++;

      // Calculate severity based on deviation magnitude
      if (deviation <= CONFIG.DEVIATION_LOW) {
        severity = SEVERITY.LOW;
      } else if (deviation <= CONFIG.DEVIATION_MEDIUM) {
        severity = SEVERITY.MEDIUM;
      } else {
        severity = SEVERITY.HIGH;
      }

      message = `${emissionSource} exceeds baseline by ${deviation.toFixed(1)}%`;

    } else {
      // Actual is LOWER than expected
      status = STATUS.UNDER_UTILIZED;
      summary.underUtilizedCount++;
      severity = null; // No severity for under-utilization (not an issue)
      message = `${emissionSource} utilization below baseline by ${Math.abs(deviation).toFixed(1)}%`;
    }

    // Track total deviation (for overall health score)
    summary.totalDeviation += absDeviation;

    analysis.push({
      emissionSource,
      status,
      expectedPercentage,
      actualPercentage,
      deviation: parseFloat(deviation.toFixed(2)),
      severity,
      message,
      // Include profile metadata for context
      description: profile.description
    });
  }

  // ============================================
  // STEP 4: Filter and prioritize HIGH_USAGE insights
  // ============================================
  // Only HIGH_USAGE sources generate actionable recommendations
  const insights = analysis
    .filter(item => item.status === STATUS.HIGH_USAGE)
    .map(item => ({
      buildingId,
      buildingType,
      emissionSource: item.emissionSource,
      expectedPercentage: item.expectedPercentage,
      actualPercentage: item.actualPercentage,
      deviation: item.deviation,
      severity: item.severity,
      message: item.message,
      description: item.description
    }))
    .sort((a, b) => b.deviation - a.deviation); // Sort by highest deviation first

  // ============================================
  // STEP 5: Calculate overall health score
  // ============================================
  // Score 0-100: 100 = perfect match, 0 = completely off baseline
  const avgDeviation = summary.totalSources > 0
    ? summary.totalDeviation / summary.totalSources
    : 0;
  const healthScore = Math.max(0, 100 - avgDeviation);

  return {
    buildingId,
    buildingType,
    organizationId,
    timestamp: new Date().toISOString(),

    // Full analysis for all sources
    analysis,

    // Only HIGH_USAGE sources (actionable)
    insights,

    // Summary statistics
    summary: {
      ...summary,
      healthScore: Math.round(healthScore),
      avgDeviation: parseFloat(avgDeviation.toFixed(2))
    },

    // Quick flag for alerting
    hasAlerts: insights.length > 0,
    alertCount: insights.length
  };
}

/**
 * ============================================
 * HELPER FUNCTIONS
 * ============================================
 */

/**
 * Get severity level from deviation percentage
 */
export function getSeverityFromDeviation(deviation) {
  if (deviation <= CONFIG.DEVIATION_LOW) return SEVERITY.LOW;
  if (deviation <= CONFIG.DEVIATION_MEDIUM) return SEVERITY.MEDIUM;
  return SEVERITY.HIGH;
}

/**
 * Get threshold values for a given expected percentage
 */
export function getThresholds(expectedPercentage) {
  return {
    lower: Math.max(0, expectedPercentage - CONFIG.TOLERANCE_PERCENT),
    upper: expectedPercentage + CONFIG.TOLERANCE_PERCENT,
    lowSeverity: expectedPercentage + CONFIG.DEVIATION_LOW,
    mediumSeverity: expectedPercentage + CONFIG.DEVIATION_MEDIUM
  };
}

/**
 * Check if a building requires immediate attention
 * (multiple HIGH_USAGE sources with HIGH severity)
 */
export function requiresImmediateAttention(analysisResult) {
  const highSeverityCount = analysisResult.insights.filter(
    i => i.severity === SEVERITY.HIGH
  ).length;

  return highSeverityCount >= 2; // 2+ HIGH severity = immediate attention
}

// Export constants for use in other modules
export { SEVERITY, STATUS, CONFIG };
