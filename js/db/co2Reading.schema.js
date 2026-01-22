// js/db/co2Reading.schema.js
// Mongoose Schema for CO2 Sensor Readings

import mongoose from 'mongoose';

/**
 * CO2 Reading Schema
 * Stores real-time CO2 sensor data from MQTT
 */
const co2ReadingSchema = new mongoose.Schema({
  // CO2 value in parts per million (ppm)
  co2: {
    type: Number,
    required: true,
    min: 300,
    max: 5000
  },

  // Sensor status (OK, WARMUP, ERROR)
  status: {
    type: String,
    required: true,
    enum: ['OK', 'WARMUP', 'ERROR']
  },

  // Timestamp when reading was taken (from sensor)
  timestamp: {
    type: Date,
    required: true
  },

  // Sensor model/type
  sensor: {
    type: String,
    default: 'MH-Z19'
  },

  // Air quality assessment (calculated field)
  airQuality: {
    type: String,
    enum: ['Excellent', 'Good', 'Moderate', 'Fair', 'Poor'],
    default: 'Good'
  },

  // Location identifier (optional, for multi-sensor setups)
  location: {
    type: String,
    default: 'default'
  },

  // Additional sensor data (extensible for future sensors)
  temperature: {
    type: Number,
    min: -20,
    max: 60
  },

  humidity: {
    type: Number,
    min: 0,
    max: 100
  }
}, {
  // Automatically manage createdAt/updatedAt fields
  timestamps: true
});

// ============================================
// INDEXES (Must be defined outside schema options)
// ============================================

co2ReadingSchema.index({ timestamp: -1 }); // Sort by latest
co2ReadingSchema.index({ location: 1, timestamp: -1 }); // Location-based queries
co2ReadingSchema.index({ airQuality: 1 }); // Filter by air quality

/**
 * Instance method to calculate air quality based on CO2 level
 */
co2ReadingSchema.methods.calculateAirQuality = function() {
  const co2 = this.co2;
  if (co2 < 400) return 'Excellent';
  if (co2 < 450) return 'Good';
  if (co2 < 550) return 'Moderate';
  if (co2 < 1000) return 'Fair';
  return 'Poor';
};

/**
 * Pre-save hook to automatically calculate air quality
 */
co2ReadingSchema.pre('save', function() {
  this.airQuality = this.calculateAirQuality();
});

/**
 * Static method to get latest reading
 */
co2ReadingSchema.statics.getLatest = function(location = 'default') {
  return this.findOne({ location }).sort({ timestamp: -1 });
};

/**
 * Static method to get readings within a time range
 */
co2ReadingSchema.statics.getByTimeRange = function(startTime, endTime, location = 'default') {
  return this.find({
    location,
    timestamp: { $gte: startTime, $lte: endTime }
  }).sort({ timestamp: -1 });
};

/**
 * Static method to get statistics for a time period
 */
co2ReadingSchema.statics.getStats = function(startTime, endTime, location = 'default') {
  return this.aggregate([
    {
      $match: {
        location,
        timestamp: { $gte: startTime, $lte: endTime }
      }
    },
    {
      $group: {
        _id: null,
        avg: { $avg: '$co2' },
        min: { $min: '$co2' },
        max: { $max: '$co2' },
        count: { $sum: 1 }
      }
    }
  ]);
};

// Create and export the model
const CO2Reading = mongoose.model('CO2Reading', co2ReadingSchema);

export default CO2Reading;
