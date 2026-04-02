// js/db/recommendationDefaults.js
// Default emission profiles and helper utilities for the recommendation engine

import EmissionProfile from './emissionProfile.schema.js';

const DEFAULT_EMISSION_PROFILES = [
  { buildingType: 'OFFICE', emissionSource: 'HVAC', expectedContributionPercentage: 45, description: 'Heating, ventilation, and air conditioning systems' },
  { buildingType: 'OFFICE', emissionSource: 'LIGHTING', expectedContributionPercentage: 20, description: 'Indoor and outdoor lighting systems' },
  { buildingType: 'OFFICE', emissionSource: 'ELECTRICITY', expectedContributionPercentage: 25, description: 'Grid electricity for office equipment' },
  { buildingType: 'OFFICE', emissionSource: 'EQUIPMENT', expectedContributionPercentage: 10, description: 'Office equipment and appliances' },
  { buildingType: 'CAMPUS', emissionSource: 'ELECTRICITY', expectedContributionPercentage: 35, description: 'Hostel and facility electricity' },
  { buildingType: 'CAMPUS', emissionSource: 'EQUIPMENT', expectedContributionPercentage: 30, description: 'Lab and workshop equipment' },
  { buildingType: 'CAMPUS', emissionSource: 'TRANSPORT', expectedContributionPercentage: 20, description: 'Campus shuttle and vehicle emissions' },
  { buildingType: 'CAMPUS', emissionSource: 'LIGHTING', expectedContributionPercentage: 15, description: 'Campus street and building lighting' },
  { buildingType: 'INDUSTRIAL', emissionSource: 'FUEL', expectedContributionPercentage: 50, description: 'Generator and fuel consumption' },
  { buildingType: 'INDUSTRIAL', emissionSource: 'EQUIPMENT', expectedContributionPercentage: 30, description: 'Heavy machinery and equipment' },
  { buildingType: 'INDUSTRIAL', emissionSource: 'ELECTRICITY', expectedContributionPercentage: 20, description: 'Industrial power consumption' },
  { buildingType: 'COMMERCIAL', emissionSource: 'HVAC', expectedContributionPercentage: 35, description: 'Customer-facing climate control systems' },
  { buildingType: 'COMMERCIAL', emissionSource: 'LIGHTING', expectedContributionPercentage: 30, description: 'Retail and public-area lighting systems' },
  { buildingType: 'COMMERCIAL', emissionSource: 'ELECTRICITY', expectedContributionPercentage: 20, description: 'Point-of-sale, refrigeration, and general electricity demand' },
  { buildingType: 'COMMERCIAL', emissionSource: 'EQUIPMENT', expectedContributionPercentage: 15, description: 'Store equipment and appliances' }
];

export async function ensureDefaultEmissionProfiles() {
  const existingCount = await EmissionProfile.countDocuments();
  if (existingCount > 0) {
    return existingCount;
  }

  await EmissionProfile.insertMany(DEFAULT_EMISSION_PROFILES, { ordered: false });
  return DEFAULT_EMISSION_PROFILES.length;
}

export function inferBuildingTypeFromId(buildingId = '') {
  const normalized = String(buildingId).trim().toLowerCase();

  if (!normalized) return 'OFFICE';
  if (normalized.includes('campus') || normalized.includes('hostel') || normalized.includes('college') || normalized.includes('university')) {
    return 'CAMPUS';
  }
  if (normalized.includes('factory') || normalized.includes('plant') || normalized.includes('industrial') || normalized.includes('warehouse')) {
    return 'INDUSTRIAL';
  }
  if (normalized.includes('mall') || normalized.includes('shop') || normalized.includes('store') || normalized.includes('commercial')) {
    return 'COMMERCIAL';
  }
  return 'OFFICE';
}

export { DEFAULT_EMISSION_PROFILES };
