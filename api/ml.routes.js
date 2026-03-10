import express from 'express';
import co2StorageService from '../js/db/co2Storage.service.js';

const router = express.Router();
const DEFAULT_LOCATION = process.env.LOCATION || 'default';
const DEFAULT_HOURS = 24;
const MIN_HOURS = 1;
const MAX_HOURS = 168;
const MAX_POINTS = 1000;

router.get('/co2-history', async (req, res) => {
  const location = getLocation(req.query.location);
  const hours = getHours(req.query.hours);

  if (!location) {
    return res.status(400).json({
      success: false,
      error: 'Invalid location. Provide a non-empty string up to 100 characters.'
    });
  }

  if (hours === null) {
    return res.status(400).json({
      success: false,
      error: `Invalid hours value. Use an integer between ${MIN_HOURS} and ${MAX_HOURS}.`
    });
  }

  try {
    if (!isMongoConfigured()) {
      return res
        .set('Cache-Control', 'no-store')
        .json(generateDemoHistory(location, hours));
    }

    const readings = await co2StorageService.getRecent(hours, location, MAX_POINTS);
    const normalizedReadings = normalizeReadings(readings);

    if (normalizedReadings.length > 0) {
      return res.set('Cache-Control', 'no-store').json(normalizedReadings);
    }

    console.warn(`ML API: no CO2 history found for '${location}', returning demo fallback`);
  } catch (error) {
    console.warn(`ML API: failed to load CO2 history for '${location}', using demo fallback`, error.message);
  }

  return res
    .set('Cache-Control', 'no-store')
    .json(generateDemoHistory(location, hours));
});

export default router;

function getLocation(location) {
  if (typeof location !== 'string') {
    return DEFAULT_LOCATION;
  }

  const trimmed = location.trim();
  if (!trimmed || trimmed.length > 100) {
    return null;
  }

  return trimmed;
}

function isMongoConfigured() {
  const uri = process.env.MONGODB_URI;
  return typeof uri === 'string' && uri.trim() !== '' && !uri.includes('<username>');
}

function getHours(hours) {
  if (hours === undefined) {
    return DEFAULT_HOURS;
  }

  const parsed = Number.parseInt(hours, 10);
  if (!Number.isInteger(parsed) || parsed < MIN_HOURS || parsed > MAX_HOURS) {
    return null;
  }

  return parsed;
}

function normalizeReadings(readings = []) {
  return readings
    .map((reading) => {
      const timestamp = new Date(reading.timestamp);
      if (Number.isNaN(timestamp.getTime())) {
        return null;
      }

      return {
        timestamp: timestamp.toISOString(),
        co2: Number(reading.co2),
        status: reading.status || 'OK',
        sensor: reading.sensor || 'MH-Z19'
      };
    })
    .filter((reading) => reading && Number.isFinite(reading.co2))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function generateDemoHistory(location, hours) {
  const points = Math.min(Math.max(hours * 12, 48), 288);
  const startTime = Date.now() - hours * 60 * 60 * 1000;
  const intervalMs = Math.max(Math.floor((hours * 60 * 60 * 1000) / points), 60_000);

  let baseline = 540;
  if (location.includes('office')) {
    baseline = 690;
  } else if (location.includes('campus')) {
    baseline = 620;
  }

  return Array.from({ length: points }, (_, index) => {
    const wave = Math.sin(index / 4) * 55;
    const trend = Math.sin(index / 15) * 35;
    const noise = ((index % 5) - 2) * 6;
    const co2 = Math.round(Math.max(380, baseline + wave + trend + noise));

    return {
      timestamp: new Date(startTime + intervalMs * index).toISOString(),
      co2,
      status: 'OK',
      sensor: 'DEMO-SENSOR'
    };
  });
}
