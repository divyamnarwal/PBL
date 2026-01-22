// js/db/recommendation.schema.js
// Mongoose Schema for Carbon Reduction Recommendations

import mongoose from 'mongoose';

/**
 * Recommendation status types
 */
const RECOMMENDATION_STATUS = {
  HIGH_USAGE: 'HIGH_USAGE',
  UNDER_UTILIZED: 'UNDER_UTILIZED',
  UNPROFILED: 'UNPROFILED'
};

/**
 * Severity levels
 */
const SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH'
};

/**
 * Recommendation action types
 */
const RECOMMENDATION_TYPE = {
  REDUCE: 'REDUCE',       // Reduce consumption
  OPTIMIZE: 'OPTIMIZE',   // Optimize usage patterns
  OFFSET: 'OFFSET'        // Purchase carbon credits
};

/**
 * Recommendation Schema
 * Stores system-generated carbon reduction recommendations
 */
const recommendationSchema = new mongoose.Schema({
  // Building identification
  buildingId: {
    type: String,
    required: true,
    index: true
  },

  buildingType: {
    type: String,
    required: true,
    enum: ['OFFICE', 'CAMPUS', 'INDUSTRIAL', 'COMMERCIAL']
  },

  // Multi-tenant support
  organizationId: {
    type: String,
    index: true
  },

  // Emission source this recommendation targets
  emissionSource: {
    type: String,
    required: true,
    enum: ['HVAC', 'LIGHTING', 'FUEL', 'ELECTRICITY', 'TRANSPORT', 'WASTE', 'WATER', 'EQUIPMENT', 'OTHER']
  },

  // Analysis results
  status: {
    type: String,
    required: true,
    enum: Object.values(RECOMMENDATION_STATUS)
  },

  severity: {
    type: String,
    required: true,
    enum: Object.values(SEVERITY)
  },

  // Recommendation details
  recommendationText: {
    type: String,
    required: true,
    maxlength: 500
  },

  expectedReductionPercent: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  recommendationType: {
    type: String,
    required: true,
    enum: Object.values(RECOMMENDATION_TYPE)
  },

  // Resolution tracking
  isResolved: {
    type: Boolean,
    default: false,
    index: true
  },

  resolvedAt: {
    type: Date,
    default: null
  },

  // Metadata
  acknowledgedBy: {
    type: String
  },

  acknowledgedAt: {
    type: Date,
    default: null
  },

  dismissedAt: {
    type: Date,
    default: null
  }

}, {
  timestamps: true
});

// ============================================
// INDEXES (defined outside schema options)
// ============================================

// Compound index for pending recommendations per building
recommendationSchema.index(
  { buildingId: 1, isResolved: 1, createdAt: -1 }
);

// Organization-wide pending recommendations
recommendationSchema.index(
  { organizationId: 1, isResolved: 1, severity: 1 }
);

// Active alerts by severity
recommendationSchema.index(
  { isResolved: 1, severity: 1, createdAt: -1 }
);

// Emission source tracking
recommendationSchema.index(
  { emissionSource: 1, buildingId: 1, isResolved: 1 }
);

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Mark recommendation as resolved
 */
recommendationSchema.methods.markResolved = function(userId = null) {
  this.isResolved = true;
  this.resolvedAt = new Date();
  if (userId) {
    this.acknowledgedBy = userId;
  }
  return this.save();
};

/**
 * Mark recommendation as acknowledged
 */
recommendationSchema.methods.markAcknowledged = function(userId) {
  this.acknowledgedBy = userId;
  this.acknowledgedAt = new Date();
  return this.save();
};

/**
 * Dismiss recommendation without resolving
 */
recommendationSchema.methods.dismiss = function(userId) {
  this.dismissedAt = new Date();
  if (userId) {
    this.acknowledgedBy = userId;
  }
  return this.save();
};

/**
 * Check if recommendation is stale (older than 30 days and unresolved)
 */
recommendationSchema.methods.isStale = function() {
  if (this.isResolved) return false;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return this.createdAt < thirtyDaysAgo;
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get active (unresolved) recommendations for a building
 */
recommendationSchema.statics.getActiveByBuilding = function(buildingId) {
  return this.find({
    buildingId,
    isResolved: false,
    dismissedAt: null
  }).sort({ severity: -1, createdAt: -1 });
};

/**
 * Get active recommendations for an organization
 */
recommendationSchema.statics.getActiveByOrganization = function(organizationId) {
  return this.find({
    organizationId,
    isResolved: false,
    dismissedAt: null
  }).sort({ severity: -1, createdAt: -1 });
};

/**
 * Get recommendations by emission source
 * Validates emissionSource against allowed enum values before querying
 */
recommendationSchema.statics.getByEmissionSource = function(emissionSource, organizationId = null) {
  // Validate emissionSource against enum to prevent injection
  const validSources = ['HVAC', 'LIGHTING', 'FUEL', 'ELECTRICITY', 'TRANSPORT', 'WASTE', 'WATER', 'EQUIPMENT', 'OTHER'];
  if (!validSources.includes(emissionSource)) {
    throw new Error(`Invalid emissionSource: ${emissionSource}. Must be one of: ${validSources.join(', ')}`);
  }

  const query = {
    emissionSource,
    isResolved: false
  };
  if (organizationId) {
    query.organizationId = organizationId;
  }
  return this.find(query).sort({ severity: -1, createdAt: -1 });
};

/**
 * Get high severity unresolved recommendations
 */
recommendationSchema.statics.getHighSeverityAlerts = function(organizationId = null) {
  const query = {
    severity: 'HIGH',
    isResolved: false,
    dismissedAt: null
  };
  if (organizationId) {
    query.organizationId = organizationId;
  }
  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Get stale recommendations (for cleanup)
 */
recommendationSchema.statics.getStaleRecommendations = function(daysOld = 30) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return this.find({
    isResolved: false,
    createdAt: { $lt: cutoffDate }
  });
};

/**
 * Get recommendation statistics for a building
 */
recommendationSchema.statics.getStatsByBuilding = function(buildingId) {
  return this.aggregate([
    { $match: { buildingId } },
    {
      $group: {
        _id: '$buildingId',
        total: { $sum: 1 },
        resolved: { $sum: { $cond: ['$isResolved', 1, 0] } },
        pending: { $sum: { $cond: ['$isResolved', 0, 1] } },
        highSeverity: { $sum: { $cond: [{ $eq: ['$severity', 'HIGH'] }, 1, 0] } },
        byType: {
          $push: {
            type: '$recommendationType',
            severity: '$severity'
          }
        }
      }
    }
  ]);
};

/**
 * Bulk resolve recommendations for a building
 */
recommendationSchema.statics.resolveAllForBuilding = function(buildingId, userId = null) {
  return this.updateMany(
    { buildingId, isResolved: false },
    {
      isResolved: true,
      resolvedAt: new Date(),
      acknowledgedBy: userId
    }
  );
};

// ============================================
// EXPORT
// ============================================

const Recommendation = mongoose.model('Recommendation', recommendationSchema);

export { RECOMMENDATION_STATUS, SEVERITY, RECOMMENDATION_TYPE };
export default Recommendation;
