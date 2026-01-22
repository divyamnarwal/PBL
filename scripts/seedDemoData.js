// scripts/seedDemoData.js
// Seed script for demo data - run with: node scripts/seedDemoData.js

import dotenv from 'dotenv';
import mongoDBService from '../js/db/mongodb.service.js';
import EmissionProfile from '../js/db/emissionProfile.schema.js';
import CO2Reading from '../js/db/co2Reading.schema.js';
import Recommendation from '../js/db/recommendation.schema.js';
import { analyzeEmissions } from '../js/db/emissionRuleEngine.service.js';

dotenv.config();

// ============================================
// DEMO DATA
// ============================================

// Demo building IDs for filtering
const DEMO_BUILDING_IDS = ['office-demo-001', 'campus-demo-001'];

const PROFILES = [
  // OFFICE (global)
  { buildingType: 'OFFICE', emissionSource: 'HVAC', expectedContributionPercentage: 45, description: 'Heating, ventilation, and air conditioning systems' },
  { buildingType: 'OFFICE', emissionSource: 'LIGHTING', expectedContributionPercentage: 20, description: 'Indoor and outdoor lighting systems' },
  { buildingType: 'OFFICE', emissionSource: 'ELECTRICITY', expectedContributionPercentage: 25, description: 'Grid electricity for office equipment' },
  { buildingType: 'OFFICE', emissionSource: 'EQUIPMENT', expectedContributionPercentage: 10, description: 'Office equipment and appliances' },

  // CAMPUS (global)
  { buildingType: 'CAMPUS', emissionSource: 'ELECTRICITY', expectedContributionPercentage: 35, description: 'Hostel and facility electricity' },
  { buildingType: 'CAMPUS', emissionSource: 'EQUIPMENT', expectedContributionPercentage: 30, description: 'Lab and workshop equipment' },
  { buildingType: 'CAMPUS', emissionSource: 'TRANSPORT', expectedContributionPercentage: 20, description: 'Campus shuttle and vehicle emissions' },
  { buildingType: 'CAMPUS', emissionSource: 'LIGHTING', expectedContributionPercentage: 15, description: 'Campus street and building lighting' },

  // INDUSTRIAL (global)
  { buildingType: 'INDUSTRIAL', emissionSource: 'FUEL', expectedContributionPercentage: 50, description: 'Generator and fuel consumption' },
  { buildingType: 'INDUSTRIAL', emissionSource: 'EQUIPMENT', expectedContributionPercentage: 30, description: 'Heavy machinery and equipment' },
  { buildingType: 'INDUSTRIAL', emissionSource: 'ELECTRICITY', expectedContributionPercentage: 20, description: 'Industrial power consumption' },
];

const ORG_OVERRIDE = {
  buildingType: 'OFFICE',
  emissionSource: 'HVAC',
  expectedContributionPercentage: 55,
  description: 'Org-specific HVAC baseline - larger floor area requires more cooling',
  organizationId: 'org-demo-001',
  isActive: true
};

const BUILDINGS = [
  {
    buildingId: 'office-demo-001',
    buildingType: 'OFFICE',
    emissions: [
      { emissionSource: 'HVAC', actualPercentage: 65 },
      { emissionSource: 'LIGHTING', actualPercentage: 15 },
      { emissionSource: 'ELECTRICITY', actualPercentage: 15 },
      { emissionSource: 'EQUIPMENT', actualPercentage: 5 }
    ]
  },
  {
    buildingId: 'campus-demo-001',
    buildingType: 'CAMPUS',
    emissions: [
      { emissionSource: 'TRANSPORT', actualPercentage: 35 },
      { emissionSource: 'ELECTRICITY', actualPercentage: 30 },
      { emissionSource: 'LIGHTING', actualPercentage: 20 },
      { emissionSource: 'EQUIPMENT', actualPercentage: 15 }
    ]
  }
];

// ============================================
// SEED FUNCTIONS
// ============================================

async function seedEmissionProfiles() {
  console.log('\n📊 Seeding Emission Profiles...');

  // Idempotent: Delete existing profiles by buildingType before inserting
  const buildingTypes = ['OFFICE', 'CAMPUS', 'INDUSTRIAL', 'COMMERCIAL'];
  for (const buildingType of buildingTypes) {
    await EmissionProfile.deleteMany({ buildingType });
  }
  console.log('  Cleared existing profiles by buildingType (idempotent)');

  for (const profile of PROFILES) {
    await EmissionProfile.create(profile);
    console.log(`  ✅ ${profile.buildingType} - ${profile.emissionSource}: ${profile.expectedContributionPercentage}%`);
  }

  await EmissionProfile.create(ORG_OVERRIDE);
  console.log(`  ✅ [org-demo-001] OFFICE HVAC override: 55%`);
}

async function seedAggregatedData() {
  console.log('\n🏢 Seeding Aggregated Emission Data...');

  await CO2Reading.deleteMany({ location: { $in: DEMO_BUILDING_IDS } });
  console.log('  Cleared existing demo readings');

  const now = new Date();

  for (const building of BUILDINGS) {
    for (const emission of building.emissions) {
      await CO2Reading.create({
        location: building.buildingId,
        co2: 400 + (emission.actualPercentage * 5),
        status: 'OK',
        timestamp: new Date(now.getTime() - Math.random() * 3600000),
        sensor: 'DEMO-SENSOR'
      });
    }
    console.log(`  ✅ ${building.buildingId} - ${building.emissions.length} emission sources`);
  }
}

async function generateRecommendations() {
  console.log('\n🎯 Generating Recommendations from Rule Engine...');

  await Recommendation.deleteMany({ buildingId: { $in: DEMO_BUILDING_IDS } });
  console.log('  Cleared existing demo recommendations');

  for (const building of BUILDINGS) {
    const result = await analyzeEmissions({
      buildingId: building.buildingId,
      buildingType: building.buildingType,
      organizationId: null,
      aggregatedEmissionData: building.emissions
    });

    for (const insight of result.insights) {
      await Recommendation.create({
        buildingId: building.buildingId,
        buildingType: building.buildingType,
        organizationId: null,
        emissionSource: insight.emissionSource,
        status: 'HIGH_USAGE',
        severity: insight.severity,
        recommendationText: `High ${insight.emissionSource} usage detected - ${insight.deviation.toFixed(1)}% above baseline`,
        expectedReductionPercent: Math.round(insight.deviation * 0.5),
        recommendationType: 'OPTIMIZE'
      });
    }

    console.log(`  ✅ ${building.buildingId} - ${result.insights.length} recommendations created`);
  }
}

async function printSummary() {
  console.log('\n' + '='.repeat(50));
  console.log('📋 SEED DATA SUMMARY');
  console.log('='.repeat(50));

  const profileCount = await EmissionProfile.countDocuments();
  const readingCount = await CO2Reading.countDocuments({ location: { $in: DEMO_BUILDING_IDS } });
  const recCount = await Recommendation.countDocuments({ buildingId: { $in: DEMO_BUILDING_IDS } });

  console.log(`  Emission Profiles: ${profileCount}`);
  console.log(`  Demo CO2 Readings: ${readingCount}`);
  console.log(`  Demo Recommendations: ${recCount}`);
  console.log('='.repeat(50));
}

// ============================================
// MAIN
// ============================================

async function run() {
  console.log('🌱 Starting Demo Data Seed...');

  try {
    await mongoDBService.connect();
    console.log('✅ Connected to MongoDB');

    await seedEmissionProfiles();
    await seedAggregatedData();
    await generateRecommendations();

    await printSummary();

    console.log('\n✅ Seed completed successfully!');

  } catch (error) {
    console.error('\n❌ Seed failed:', error.message);
    process.exit(1);
  } finally {
    await mongoDBService.disconnect();
    console.log('\n🔌 MongoDB connection closed');
  }
}

run();
