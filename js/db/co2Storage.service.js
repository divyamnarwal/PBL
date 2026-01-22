// js/db/co2Storage.service.js
// CO2 Data Storage Service - Handles saving CO2 readings to MongoDB

import CO2Reading from './co2Reading.schema.js';
import mongoDBService from './mongodb.service.js';

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
    // Guard: Only allow demo buildings in mock mode
    const demoBuildings = ['office-demo-001', 'campus-demo-001'];

    if (!demoBuildings.includes(buildingId)) {
      throw new Error(
        `No emission data available for building '${buildingId}'. ` +
        `getAggregatedEmissions() only supports demo buildings. ` +
        `For production, implement actual energy consumption tracking by emission source.`
      );
    }

    return this.getAggregatedEmissionsForDemo(buildingId);
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
}

// Export singleton instance
const co2StorageService = new CO2StorageService();
export default co2StorageService;
