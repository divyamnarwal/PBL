// js/db/emissionProfile.schema.js
// Mongoose Schema for Emission Profiles

import mongoose from 'mongoose';

/**
 * Emission Source Types
 * Defines the various categories of emissions
 */
const EMISSION_SOURCES = {
  HVAC: 'HVAC',           // Heating, Ventilation, Air Conditioning
  LIGHTING: 'LIGHTING',   // Indoor and outdoor lighting
  FUEL: 'FUEL',           // Generator fuel, diesel, etc.
  ELECTRICITY: 'ELECTRICITY', // Grid electricity consumption
  TRANSPORT: 'TRANSPORT', // Vehicle emissions within premises
  WASTE: 'WASTE',         // Waste management emissions
  WATER: 'WATER',         // Water heating and pumping
  EQUIPMENT: 'EQUIPMENT', // Office equipment, machinery
  OTHER: 'OTHER'          // Miscellaneous sources
};

/**
 * Building Types
 * Defines categories of buildings/facilities
 */
const BUILDING_TYPES = {
  OFFICE: 'OFFICE',
  CAMPUS: 'CAMPUS',
  INDUSTRIAL: 'INDUSTRIAL',
  COMMERCIAL: 'COMMERCIAL'
};

/**
 * Emission Profile Schema
 * Defines emission source contributions per building type
 *
 * Expected contribution is a baseline assumption,
 * actual values are derived from real-time emission data
 */
const emissionProfileSchema = new mongoose.Schema({
  // Building type this profile applies to
  buildingType: {
    type: String,
    required: true,
    enum: Object.values(BUILDING_TYPES)
  },

  // Source of emissions
  emissionSource: {
    type: String,
    required: true,
    enum: Object.values(EMISSION_SOURCES)
  },

  // Expected contribution percentage (0-100)
  // Used as baseline for comparing actual emissions
  expectedContributionPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },

  // Description of this emission source
  description: {
    type: String,
    maxlength: 500
  },

  // Metadata
  isActive: {
    type: Boolean,
    default: true
  },

  // Organization/tenant identifier (for multi-tenant support)
  // Null = global default profile
  organizationId: {
    type: String,
    index: true
  }
}, {
  timestamps: true
});

// ============================================
// INDEXES (Must be defined outside schema options)
// ============================================

// Unique combination: building type + emission source per org
emissionProfileSchema.index(
  { buildingType: 1, emissionSource: 1, organizationId: 1 },
  { unique: true, sparse: true }
);

// Query index for org-based lookups
emissionProfileSchema.index(
  { organizationId: 1, buildingType: 1, isActive: 1 }
);

// Index for global profile lookups (no org)
emissionProfileSchema.index(
  { buildingType: 1, isActive: 1, organizationId: { $exists: false } }
);

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get emission profiles by building type
 * Falls back to global profiles if org-specific not found
 */
emissionProfileSchema.statics.getByBuildingType = function(buildingType, organizationId = null) {
  return this.find({
    buildingType,
    isActive: true,
    $or: [
      { organizationId },
      { organizationId: { $exists: false } }
    ]
  }).sort({ expectedContributionPercentage: -1 });
};

/**
 * Get total expected contribution for a building type
 */
emissionProfileSchema.statics.getTotalContribution = function(buildingType, organizationId = null) {
  const matchQuery = {
    buildingType,
    isActive: true,
    $or: [
      { organizationId },
      { organizationId: { $exists: false } }
    ]
  };

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$buildingType',
        totalPercentage: { $sum: '$expectedContributionPercentage' },
        sourceCount: { $sum: 1 },
        sources: { $push: '$emissionSource' }
      }
    }
  ]);
};

/**
 * Get profiles requiring alerts based on threshold
 */
emissionProfileSchema.statics.getHighContributionSources = function(threshold = 30) {
  return this.find({
    expectedContributionPercentage: { $gte: threshold },
    isActive: true
  }).sort({ expectedContributionPercentage: -1 });
};

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Validate that contribution percentage doesn't cause total to exceed 100%
 *
 * Org-specific profiles override global profiles, not add to them.
 * Validation is scoped to the organization level:
 * - Global profiles (no orgId): sum must be ≤100%
 * - Org-specific profiles: sum within that org must be ≤100%
 */
emissionProfileSchema.methods.validateTotalContribution = async function() {
  const query = {
    buildingType: this.buildingType,
    isActive: true,
    _id: { $ne: this._id }
  };

  // For org-specific profiles, only check other org-specific profiles
  // Org profiles OVERRIDE global profiles, not add to them
  if (this.organizationId) {
    query.organizationId = this.organizationId;
  } else {
    // For global profiles, only check other global profiles
    query.organizationId = { $exists: false };
  }

  const others = await this.constructor.find(query);
  const othersTotal = others.reduce((sum, doc) => sum + doc.expectedContributionPercentage, 0);
  const totalWithThis = othersTotal + this.expectedContributionPercentage;

  return {
    isValid: totalWithThis <= 100,
    totalPercentage: totalWithThis,
    remaining: Math.max(0, 100 - totalWithThis),
    existingTotal: othersTotal
  };
};

// ============================================
// PRE-SAVE HOOK
// ============================================

emissionProfileSchema.pre('save', async function() {
  // Skip validation for deactivations
  if (!this.isActive && !this.isModified('expectedContributionPercentage')) {
    return;
  }

  // Only validate on new docs or percentage changes
  if (this.isModified('expectedContributionPercentage') || this.isNew) {
    const validation = await this.validateTotalContribution();
    if (!validation.isValid) {
      throw new Error(
        `Total contribution for ${this.buildingType} would exceed 100%: ${validation.totalPercentage}%`
      );
    }
  }
});

// ============================================
// EXPORT
// ============================================

const EmissionProfile = mongoose.model('EmissionProfile', emissionProfileSchema);

export { EMISSION_SOURCES, BUILDING_TYPES };
export default EmissionProfile;
