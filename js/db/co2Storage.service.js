// js/db/co2Storage.service.js
// CO2 Data Storage Service - Handles saving CO2 readings to MongoDB

import CO2Reading from './co2Reading.schema.js';
import mongoDBService from './mongodb.service.js';
import { inferBuildingTypeFromId } from './recommendationDefaults.js';

/**
 * CO2 Storage Service
 * Provides methods to store and retrieve CO2 readings from MongoDB
 */
class CO2StorageService {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize the storage service (connect to MongoDB)
   */
  async init() {
    if (this.isInitialized) {
      return;
    }

    try {
      await mongoDBService.connect();
      this.isInitialized = true;
      console.log('✅ CO2 Storage Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize CO2 Storage Service:', error);
      throw error;
    }
  }

  /**
   * Save a CO2 reading to MongoDB
   * @param {Object} data - CO2 sensor data
   * @param {number} data.co2 - CO2 value in ppm
   * @param {string} data.status - Sensor status
   * @param {string|Date} data.timestamp - Reading timestamp
   * @param {string} data.sensor - Sensor model
   * @param {string} location - Location identifier (optional)
   */
  async saveReading(data, location = 'default') {
    try {
      // Ensure connected
      await this.init();

      // Prepare document
      const readingData = {
        co2: data.co2,
        status: data.status,
        timestamp: new Date(data.timestamp),
        sensor: data.sensor || 'MH-Z19',
        location: location,
        // Optional fields
        ...(data.temperature !== undefined && { temperature: data.temperature }),
        ...(data.humidity !== undefined && { humidity: data.humidity })
      };

      // Create and save document
      const reading = new CO2Reading(readingData);
      await reading.save();

      console.log(`💾 Saved CO2 reading: ${data.co2} ppm (${reading.airQuality})`);

      return reading;

    } catch (error) {
      console.error('❌ Error saving CO2 reading:', error);
      throw error;
    }
  }

  /**
   * Save multiple readings at once (batch insert)
   */
  async saveReadings(readings, location = 'default') {
    try {
      await this.init();

      const documents = readings.map(r => ({
        co2: r.co2,
        status: r.status,
        timestamp: new Date(r.timestamp),
        sensor: r.sensor || 'MH-Z19',
        location: location,
        ...(r.temperature !== undefined && { temperature: r.temperature }),
        ...(r.humidity !== undefined && { humidity: r.humidity })
      }));

      const result = await CO2Reading.insertMany(documents);
      console.log(`💾 Saved ${result.length} CO2 readings`);

      return result;

    } catch (error) {
      console.error('❌ Error saving CO2 readings:', error);
      throw error;
    }
  }

  /**
   * Get the latest CO2 reading
   */
  async getLatest(location = 'default') {
    try {
      await this.init();
      return await CO2Reading.getLatest(location);
    } catch (error) {
      console.error('❌ Error getting latest reading:', error);
      return null;
    }
  }

  /**
   * Get readings from the last N hours
   */
  async getRecent(hours = 24, location = 'default', limit = 1000) {
    try {
      await this.init();

      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      return await CO2Reading.find({
        location,
        timestamp: { $gte: startTime }
      })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

    } catch (error) {
      console.error('❌ Error getting recent readings:', error);
      return [];
    }
  }

  /**
   * Get readings for a specific time range
   */
  async getByTimeRange(startTime, endTime, location = 'default') {
    try {
      await this.init();
      return await CO2Reading.getByTimeRange(startTime, endTime, location);
    } catch (error) {
      console.error('❌ Error getting readings by time range:', error);
      return [];
    }
  }

  /**
   * Get statistics for a time period
   */
  async getStats(hours = 24, location = 'default') {
    try {
      await this.init();

      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      const endTime = new Date();

      const stats = await CO2Reading.getStats(startTime, endTime, location);

      if (stats.length === 0) {
        return { avg: 0, min: 0, max: 0, count: 0 };
      }

      return {
        avg: Math.round(stats[0].avg),
        min: stats[0].min,
        max: stats[0].max,
        count: stats[0].count
      };

    } catch (error) {
      console.error('❌ Error getting stats:', error);
      return null;
    }
  }

  /**
   * Get readings grouped by air quality
   */
  async getByAirQuality(location = 'default', hours = 24) {
    try {
      await this.init();

      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      return await CO2Reading.aggregate([
        {
          $match: {
            location,
            timestamp: { $gte: startTime }
          }
        },
        {
          $group: {
            _id: '$airQuality',
            count: { $sum: 1 },
            avgCO2: { $avg: '$co2' }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

    } catch (error) {
      console.error('❌ Error getting air quality breakdown:', error);
      return [];
    }
  }

  /**
   * Delete old readings (for cleanup/maintenance)
   */
  async deleteOlderThan(days = 30, location = 'default') {
    try {
      await this.init();

      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const result = await CO2Reading.deleteMany({
        location,
        timestamp: { $lt: cutoffDate }
      });

      console.log(`🗑️  Deleted ${result.deletedCount} readings older than ${days} days`);
      return result.deletedCount;

    } catch (error) {
      console.error('❌ Error deleting old readings:', error);
      return 0;
    }
  }

  /**
   * Get all unique locations
   */
  async getLocations() {
    try {
      await this.init();

      const locations = await CO2Reading.distinct('location');
      return locations;

    } catch (error) {
      console.error('❌ Error getting locations:', error);
      return [];
    }
  }

  /**
   * Get total count of readings
   */
  async getCount(location = 'default') {
    try {
      await this.init();
      return await CO2Reading.countDocuments({ location });
    } catch (error) {
      console.error('❌ Error getting count:', error);
      return 0;
    }
  }

  /**
   * Close the storage service
   */
  async close() {
    this.isInitialized = false;
    // Note: We don't close MongoDB connection here as it may be used by other services
    console.log('🔌 CO2 Storage Service closed');
  }

  /**
   * Get aggregated emissions by source for a building
   *
   * PRODUCTION TODO: Replace with actual energy consumption tracking by emission source
   *
   * @param {string} buildingId - Building identifier
   * @returns {Promise<Array>} Aggregated emissions by source
   */
  async getAggregatedEmissions(buildingId) {
    const demoBuildings = ['office-demo-001', 'campus-demo-001'];

    if (demoBuildings.includes(buildingId)) {
      return this.getAggregatedEmissionsForDemo(buildingId);
    }

    return this.getAggregatedEmissionsFromLiveData(buildingId);
  }

  /**
   * DEMO VERSION: Returns mock data to demonstrate recommendation engine
   *
   * Scoped explicitly to demo use. Returns hardcoded values that exceed
   * baselines to trigger HIGH_USAGE recommendations for demonstration.
   *
   * @private
   * @param {string} buildingId - Demo building identifier
   * @returns {Promise<Array>} Mock aggregated emissions
   */
  async getAggregatedEmissionsForDemo(buildingId) {
    const demoData = {
      'office-demo-001': [
        { emissionSource: 'HVAC', actualPercentage: 55 },  // Exceeds ~40% baseline
        { emissionSource: 'LIGHTING', actualPercentage: 28 }, // Exceeds ~20% baseline
        { emissionSource: 'ELECTRICITY', actualPercentage: 15 },
        { emissionSource: 'EQUIPMENT', actualPercentage: 35 }  // Exceeds ~25% baseline
      ],
      'campus-demo-001': [
        { emissionSource: 'HVAC', actualPercentage: 50 },
        { emissionSource: 'TRANSPORT', actualPercentage: 45 },
        { emissionSource: 'LIGHTING', actualPercentage: 22 }
      ]
    };

    return demoData[buildingId] || [];
  }

  /**
   * Build a recommendation-friendly proxy breakdown from recent live CO2 telemetry.
   * This is a heuristic fallback until source-specific metering is available.
   */
  async getAggregatedEmissionsFromLiveData(buildingId) {
    await this.init();

    const readings = await this.getRecent(24, buildingId, 288);
    if (!readings.length) {
      throw new Error(
        `No emission data found for '${buildingId}'. ` +
        `Connect a sensor for this location or seed demo data first.`
      );
    }

    const normalized = [...readings]
      .filter((reading) => Number.isFinite(reading.co2))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (!normalized.length) {
      throw new Error(`Recent sensor data for '${buildingId}' is invalid or incomplete.`);
    }

    const buildingType = inferBuildingTypeFromId(buildingId);
    const avgCo2 = normalized.reduce((sum, reading) => sum + reading.co2, 0) / normalized.length;
    const peakCo2 = normalized.reduce((max, reading) => Math.max(max, reading.co2), 0);
    const minCo2 = normalized.reduce((min, reading) => Math.min(min, reading.co2), normalized[0].co2);
    const avgTemperature = normalized.reduce((sum, reading) => sum + (Number.isFinite(reading.temperature) ? reading.temperature : 22), 0) / normalized.length;
    const span = Math.max(1, peakCo2 - minCo2);

    let eveningCount = 0;
    let commuteSpikeCount = 0;
    let occupancyWeighted = 0;

    for (const reading of normalized) {
      const timestamp = new Date(reading.timestamp);
      const hour = timestamp.getHours();

      if (hour >= 18 || hour < 6) {
        eveningCount += 1;
      }

      if ((hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20)) {
        if (reading.co2 >= avgCo2) {
          commuteSpikeCount += 1;
        }
      }

      occupancyWeighted += Math.max(0, reading.co2 - 420);
    }

    const eveningRatio = eveningCount / normalized.length;
    const commuteRatio = commuteSpikeCount / normalized.length;
    const occupancyIntensity = Math.min(1, occupancyWeighted / (normalized.length * 900));
    const coolingPressure = Math.min(1, Math.max(0, avgTemperature - 21) / 12);
    const peakPressure = Math.min(1, span / 1200);
    const staleAirPressure = Math.min(1, Math.max(0, avgCo2 - 600) / 1200);

    const sourceWeights = this.getSourceWeightTemplate(buildingType);
    sourceWeights.HVAC = (sourceWeights.HVAC || 0) + (coolingPressure * 0.24) + (staleAirPressure * 0.18);
    sourceWeights.ELECTRICITY = (sourceWeights.ELECTRICITY || 0) + (peakPressure * 0.18) + (occupancyIntensity * 0.08);
    sourceWeights.LIGHTING = (sourceWeights.LIGHTING || 0) + (eveningRatio * 0.18);
    sourceWeights.EQUIPMENT = (sourceWeights.EQUIPMENT || 0) + (occupancyIntensity * 0.18);

    if (sourceWeights.TRANSPORT != null) {
      sourceWeights.TRANSPORT += (commuteRatio * 0.24) + (peakPressure * 0.08);
    }

    if (sourceWeights.FUEL != null) {
      sourceWeights.FUEL += peakPressure * 0.16;
    }

    return this.normalizeSourceWeights(sourceWeights);
  }

  getSourceWeightTemplate(buildingType) {
    const templates = {
      OFFICE: { HVAC: 0.42, LIGHTING: 0.18, ELECTRICITY: 0.24, EQUIPMENT: 0.16 },
      CAMPUS: { ELECTRICITY: 0.30, EQUIPMENT: 0.24, TRANSPORT: 0.22, LIGHTING: 0.12, HVAC: 0.12 },
      INDUSTRIAL: { FUEL: 0.34, EQUIPMENT: 0.30, ELECTRICITY: 0.22, HVAC: 0.14 },
      COMMERCIAL: { HVAC: 0.30, LIGHTING: 0.24, ELECTRICITY: 0.22, EQUIPMENT: 0.16, TRANSPORT: 0.08 }
    };

    return { ...(templates[buildingType] || templates.OFFICE) };
  }

  normalizeSourceWeights(weights) {
    const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
    if (!total) {
      return [];
    }

    return Object.entries(weights)
      .map(([emissionSource, weight]) => ({
        emissionSource,
        actualPercentage: Number(((weight / total) * 100).toFixed(2))
      }))
      .sort((a, b) => b.actualPercentage - a.actualPercentage);
  }

  async getRecommendationTargets() {
    await this.init();

    const locations = await CO2Reading.aggregate([
      {
        $group: {
          _id: '$location',
          latestTimestamp: { $max: '$timestamp' },
          count: { $sum: 1 },
          avgCO2: { $avg: '$co2' }
        }
      },
      { $sort: { latestTimestamp: -1 } },
      { $limit: 20 }
    ]);

    const liveTargets = locations
      .filter((item) => item._id)
      .map((item) => ({
        buildingId: item._id,
        buildingType: inferBuildingTypeFromId(item._id),
        label: `${item._id} (${Math.round(item.avgCO2)} ppm avg)`,
        source: 'live',
        latestTimestamp: item.latestTimestamp,
        readingCount: item.count
      }));

    const demoTargets = [
      { buildingId: 'office-demo-001', buildingType: 'OFFICE', label: 'Office Demo 001', source: 'demo' },
      { buildingId: 'campus-demo-001', buildingType: 'CAMPUS', label: 'Campus Demo 001', source: 'demo' }
    ];

    const seen = new Set(liveTargets.map((target) => target.buildingId));
    return [...liveTargets, ...demoTargets.filter((target) => !seen.has(target.buildingId))];
  }
}

// Export singleton instance
const co2StorageService = new CO2StorageService();
export default co2StorageService;
