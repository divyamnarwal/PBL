# Carbon Reduction Recommendation Engine

## Overview

The Carbon Reduction Recommendation Engine is a rule-based system that analyzes building emission data against expected baselines and generates actionable recommendations for reducing carbon footprint. It compares real-time sensor data with predefined emission profiles to identify sources of excessive energy consumption.

## Architecture Flow

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Real-time CO2   │ ───> │  Aggregated Data │ ───> │   Rule Engine   │
│   Sensor Data    │      │   (MongoDB)      │      │  (Analysis)     │
└─────────────────┘      └──────────────────┘      └────────┬────────┘
                                                                │
┌─────────────────┐      ┌──────────────────┐               ▼
│  Emission       │ <─── │  Recommendation  │ ─────────> │  Generate &    │
│  Profiles       │      │  API Endpoint    │      │  Store Recs     │
│  (Baselines)    │      └──────────────────┘      └─────────────────┘
└─────────────────┘
```

## Core Components

### 1. Emission Profiles

**File:** `js/db/emissionProfile.schema.js`

Emission profiles define baseline expectations for each building type and emission source combination.

**Schema Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `buildingType` | String | OFFICE, CAMPUS, INDUSTRIAL, COMMERCIAL |
| `emissionSource` | String | HVAC, LIGHTING, FUEL, ELECTRICITY, TRANSPORT, WASTE, WATER, EQUIPMENT, OTHER |
| `expectedContributionPercentage` | Number | Baseline % this source should contribute (0-100) |
| `organizationId` | String | Multi-tenant identifier (null = global default) |
| `isActive` | Boolean | Whether profile is currently active |

**Example Profile:**
```javascript
{
  buildingType: "OFFICE",
  emissionSource: "HVAC",
  expectedContributionPercentage: 35,
  description: "Heating and cooling systems",
  organizationId: null  // Global default
}
```

**Key Methods:**
- `getByBuildingType(buildingType, organizationId)` - Fetches applicable profiles for a building
- `validateTotalContribution()` - Ensures total percentage ≤ 100% per scope

### 2. Rule Engine

**File:** `js/db/emissionRuleEngine.service.js`

The core analysis function `analyzeEmissions()` compares actual emissions against expected baselines.

**Algorithm:**

1. Fetch baseline profiles for the building type (org-specific override global defaults)
2. For each emission source:
   - Calculate deviation = actual - expected
   - Classify status based on tolerance thresholds
   - Determine severity level
3. Filter for HIGH_USAGE sources (actionable recommendations)
4. Calculate overall health score

**Status Classification:**

| Condition | Status | Severity |
|-----------|--------|----------|
| \|deviation\| ≤ 10% | NORMAL | - |
| deviation > 10% | HIGH_USAGE | LOW (10-20%), MEDIUM (20-40%), HIGH (>40%) |
| deviation < -10% | UNDER_UTILIZED | - |

**Configuration:**
```javascript
const CONFIG = {
  TOLERANCE_PERCENT: 10,    // ±10% tolerance for normal range
  DEVIATION_LOW: 20,        // >20% deviation = LOW severity
  DEVIATION_MEDIUM: 40,     // >40% deviation = MEDIUM severity
  DEVIATION_HIGH: Infinity  // >40% deviation = HIGH severity
};
```

**Output Structure:**
```javascript
{
  buildingId: "bldg-001",
  buildingType: "OFFICE",
  organizationId: "org-123",
  timestamp: "2025-01-20T12:00:00.000Z",

  // Full analysis for all sources
  analysis: [
    {
      emissionSource: "HVAC",
      status: "HIGH_USAGE",
      expectedPercentage: 35,
      actualPercentage: 55,
      deviation: 20,
      severity: "MEDIUM",
      message: "HVAC exceeds baseline by 20.0%"
    }
  ],

  // Only HIGH_USAGE sources (actionable recommendations)
  insights: [...],

  // Summary statistics
  summary: {
    totalSources: 5,
    normalCount: 3,
    highUsageCount: 2,
    healthScore: 80,
    avgDeviation: 8.5
  },

  hasAlerts: true,
  alertCount: 2
}
```

### 3. Recommendations API

**File:** `api/recommendations.routes.js`

RESTful API endpoints for generating and managing recommendations.

**Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/recommendations/generate` | POST | Generate new recommendations |
| `GET /api/recommendations/active` | GET | Fetch unresolved recommendations |
| `PATCH /api/recommendations/:id/resolve` | PATCH | Mark as resolved |

**Request Example (Generate):**
```json
POST /api/recommendations/generate
{
  "buildingId": "bldg-001",
  "buildingType": "OFFICE",
  "organizationId": "org-123"
}
```

**Response Example:**
```json
{
  "success": true,
  "recommendations": [
    {
      "emissionSource": "HVAC",
      "recommendationText": "Prioritize: Optimize HVAC schedules...",
      "expectedReductionPercent": 10,
      "severity": "MEDIUM"
    }
  ],
  "summary": {
    "created": 2,
    "skipped": 0,
    "totalInsights": 2
  }
}
```

### 4. Recommendation Storage

**File:** `js/db/recommendation.schema.js`

Mongoose schema for storing generated recommendations.

**Schema Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `buildingId`, `buildingType`, `organizationId` | String | Building identifiers |
| `emissionSource` | String | Target emission source |
| `status` | String | HIGH_USAGE, UNDER_UTILIZED, UNPROFILED |
| `severity` | String | LOW, MEDIUM, HIGH |
| `recommendationText` | String | Human-readable action item |
| `expectedReductionPercent` | Number | Estimated CO₂ reduction (0-100) |
| `recommendationType` | String | REDUCE, OPTIMIZE, OFFSET |
| `isResolved` | Boolean | Resolution tracking |
| `dismissedAt` | Date | Dismissal timestamp |

**Key Methods:**
- `getActiveByBuilding(buildingId)` - Get unresolved recommendations
- `getActiveByOrganization(organizationId)` - Org-wide recommendations
- `markResolved(userId)` - Mark as resolved
- `getStatsByBuilding(buildingId)` - Statistics aggregation

## Severity Matrix

| Deviation from Baseline | Severity | Interpretation |
|-------------------------|----------|----------------|
| 0% - 10% | Normal | Within acceptable range |
| 10% - 20% | LOW | Slightly elevated, monitor |
| 20% - 40% | Medium | Significantly high, prioritize action |
| > 40% | High | Critical, immediate action required |

## Key Features

1. **Multi-tenant Support** - Organization-specific profiles override global defaults
2. **Duplicate Prevention** - Avoids creating duplicate recommendations for the same emission source
3. **Health Scoring** - Overall building health score (0-100) based on deviation from baselines
4. **Priority Sorting** - Recommendations sorted by severity and deviation magnitude
5. **Tolerance-based Thresholds** - Configurable tolerance prevents alert fatigue

## Design Rationale: Rule-Based vs Machine Learning

The recommendation engine uses a rule-based approach rather than machine learning for the following reasons:

**Advantages of Rule-Based:**
- **Explainability** - Clear reasoning behind each recommendation (deviation % from known baseline)
- **Predictability** - Consistent behavior for given inputs
- **Low Data Requirements** - Works with small datasets; no training phase needed
- **Fast Iteration** - Rules can be adjusted quickly based on domain knowledge
- **Transparency** - Stakeholders can understand and trust the logic

**Trade-offs:**
- Less adaptive to new patterns without manual rule updates
- Requires domain expertise to define accurate baselines
- May miss complex non-linear relationships between variables

For this use case, rule-based is appropriate because:
- Emission baselines are well-understood from building engineering principles
- Regulatory requirements often mandate specific thresholds
- Stakeholders need to understand and justify recommendations
- Data volume is insufficient for meaningful ML training

## Future Work

- Incorporate time-series trends to identify gradual degradation patterns
- Add weather data normalization for HVAC recommendations
- Implement seasonal baseline adjustments
- Expand emission source categories
- Add cost-benefit analysis to recommendations
