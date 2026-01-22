// js/services/carbonApi.service.js
// API service for carbon reduction backend

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Fetch active recommendations for a building
 * @param {string} buildingId - Building identifier
 * @returns {Promise<Object>} Response with recommendations array
 */
export async function getActiveRecommendationsByBuilding(buildingId) {
  const response = await fetch(`${API_BASE_URL}/recommendations/active?buildingId=${buildingId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch recommendations');
  }

  return response.json();
}

/**
 * Generate carbon reduction recommendations for a building
 * @param {string} buildingId - Building identifier
 * @param {string} buildingType - Building type (OFFICE, CAMPUS, INDUSTRIAL, COMMERCIAL)
 * @param {string} [organizationId] - Optional organization ID
 * @returns {Promise<Object>} Response with created recommendations
 */
export async function generateRecommendations(buildingId, buildingType, organizationId) {
  const response = await fetch(`${API_BASE_URL}/recommendations/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      buildingId,
      buildingType,
      organizationId
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate recommendations');
  }

  return response.json();
}

/**
 * Mark a recommendation as resolved
 * @param {string} recommendationId - Recommendation ID
 * @param {string} [userId] - Optional user ID resolving the recommendation
 * @returns {Promise<Object>} Response with updated recommendation
 */
export async function resolveRecommendation(recommendationId, userId) {
  const response = await fetch(`${API_BASE_URL}/recommendations/${recommendationId}/resolve`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to resolve recommendation');
  }

  return response.json();
}

/**
 * Get active recommendations for an organization
 * @param {string} organizationId - Organization identifier
 * @returns {Promise<Object>} Response with recommendations array
 */
export async function getActiveRecommendationsByOrganization(organizationId) {
  const response = await fetch(`${API_BASE_URL}/recommendations/active?organizationId=${organizationId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch organization recommendations');
  }

  return response.json();
}

/**
 * Helper function for consistent error handling
 * @param {Function} apiCall - The API function to call
 * @returns {Promise<any>} API response data
 * @throws {Error} Throws error with message from API
 */
async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }
  return response.json();
}
