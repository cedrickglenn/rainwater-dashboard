/**
 * Water quality analysis constants and utilities
 * Used for determining potability status based on sensor readings
 */

/**
 * Sensor thresholds for water quality assessment
 * Based on WHO and EPA drinking water standards
 */
export const SENSOR_THRESHOLDS = {
  // pH: Ideal range 6.5-8.5 for drinking water
  ph: {
    min: 6.5,
    max: 8.5,
    unit: 'pH',
    name: 'pH Level',
    description: 'Measure of water acidity or alkalinity',
    safeRange: '6.5 - 8.5',
  },

  // Turbidity: adjusted voltage — clean water normalizes to ~4.1V after ZERO calibration.
  // Higher voltage = cleaner. Threshold: >= 3.8V (4.1V anchor minus 0.3V sensor tolerance).
  turbidity: {
    min: 3.8,
    max: 4.1,
    unit: 'V',
    name: 'Turbidity',
    description: 'Adjusted voltage — higher is cleaner (≥ 3.8 V after zero-point calibration)',
    safeRange: '≥ 3.8 V',
  },

  // TDS: Total Dissolved Solids, should be below 500 mg/L
  tds: {
    min: 0,
    max: 500,
    unit: 'mg/L',
    name: 'TDS',
    description: 'Total Dissolved Solids in water',
    safeRange: '< 500 mg/L',
  },

  // Temperature: Ideal for storage 15-25°C; also drives Nernst pH compensation
  temperature: {
    min: 15,
    max: 25,
    unit: '°C',
    name: 'Temperature',
    description: 'Water temperature — also used to apply Nernst pH compensation in firmware',
    safeRange: '15 - 25°C',
  },
};

/**
 * Water quality status types
 */
export const WATER_STATUS = {
  SAFE: 'safe',
  WARNING: 'warning',
  UNSAFE: 'unsafe',
  UNKNOWN: 'unknown', // sensor not present or no data yet
};

/**
 * Status display configuration
 */
export const STATUS_CONFIG = {
  [WATER_STATUS.SAFE]: {
    label: 'Safe',
    color: 'text-[color:var(--water-safe)]',
    bgColor: 'bg-[color:var(--water-safe)]/10',
    borderColor: 'border-[color:var(--water-safe)]',
    dotColor: 'bg-[color:var(--water-safe)]',
  },
  [WATER_STATUS.WARNING]: {
    label: 'Warning',
    color: 'text-[color:var(--water-warning)]',
    bgColor: 'bg-[color:var(--water-warning)]/10',
    borderColor: 'border-[color:var(--water-warning)]',
    dotColor: 'bg-[color:var(--water-warning)]',
  },
  [WATER_STATUS.UNSAFE]: {
    label: 'Unsafe',
    color: 'text-[color:var(--water-unsafe)]',
    bgColor: 'bg-[color:var(--water-unsafe)]/10',
    borderColor: 'border-[color:var(--water-unsafe)]',
    dotColor: 'bg-[color:var(--water-unsafe)]',
  },
  [WATER_STATUS.UNKNOWN]: {
    label: 'No Data',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
    borderColor: 'border-muted',
    dotColor: 'bg-muted',
  },
};

/**
 * Check if a sensor value is within safe range
 * @param {string} sensorType - Type of sensor (ph, turbidity, tds, temperature)
 * @param {number} value - Sensor reading value
 * @returns {string} - Status ('safe', 'warning', 'unsafe')
 */
export function getSensorStatus(sensorType, value) {
  if (value == null) return WATER_STATUS.UNKNOWN;

  const threshold = SENSOR_THRESHOLDS[sensorType];

  if (!threshold) {
    return WATER_STATUS.WARNING;
  }

  // Special handling for pH (both min and max matter)
  if (sensorType === 'ph') {
    if (value >= threshold.min && value <= threshold.max) {
      return WATER_STATUS.SAFE;
    }
    // Warning zone: within 0.5 of limits
    if (value >= threshold.min - 0.5 && value <= threshold.max + 0.5) {
      return WATER_STATUS.WARNING;
    }
    return WATER_STATUS.UNSAFE;
  }

  // Turbidity uses adjusted voltage — HIGHER is cleaner (opposite of NTU).
  // threshold.max = 4.1V (clean anchor), threshold.min = 3.8V (fail floor).
  if (sensorType === 'turbidity') {
    if (value >= threshold.max) return WATER_STATUS.SAFE;         // >= 4.1V: fully clean
    if (value >= threshold.min) return WATER_STATUS.WARNING;      // 3.8–4.1V: marginal
    return WATER_STATUS.UNSAFE;                                    // < 3.8V: turbid
  }

  // For TDS (only max matters — higher is worse)
  if (sensorType === 'tds') {
    if (value <= threshold.max * 0.8) {
      return WATER_STATUS.SAFE;
    }
    if (value <= threshold.max) {
      return WATER_STATUS.WARNING;
    }
    return WATER_STATUS.UNSAFE;
  }

  // For temperature (both min and max matter)
  if (sensorType === 'temperature') {
    if (value >= threshold.min && value <= threshold.max) {
      return WATER_STATUS.SAFE;
    }
    // Warning zone: within 5°C of limits
    if (value >= threshold.min - 5 && value <= threshold.max + 5) {
      return WATER_STATUS.WARNING;
    }
    return WATER_STATUS.UNSAFE;
  }

  return WATER_STATUS.SAFE;
}

/**
 * Calculate overall water potability status based on all sensors
 * @param {Object} sensorData - Object containing all sensor readings
 * @returns {Object} - Overall status and individual sensor statuses
 */
export function calculateWaterQuality(sensorData) {
  const statuses = {};
  let overallStatus = WATER_STATUS.SAFE;
  let knownCount = 0;

  // Check each sensor — skip null values (sensor not present)
  for (const [sensor, value] of Object.entries(sensorData)) {
    if (SENSOR_THRESHOLDS[sensor]) {
      const status = getSensorStatus(sensor, value);
      statuses[sensor] = status;

      if (status === WATER_STATUS.UNKNOWN) continue;
      knownCount++;

      // Upgrade overall status if worse
      if (status === WATER_STATUS.UNSAFE) {
        overallStatus = WATER_STATUS.UNSAFE;
      } else if (
        status === WATER_STATUS.WARNING &&
        overallStatus === WATER_STATUS.SAFE
      ) {
        overallStatus = WATER_STATUS.WARNING;
      }
    }
  }

  // If no sensor has returned a real reading, the overall status is unknown —
  // never claim potable when there is no data to back it up.
  if (knownCount === 0) overallStatus = WATER_STATUS.UNKNOWN;

  return {
    overall: overallStatus,
    sensors: statuses,
    isPotable: overallStatus === WATER_STATUS.SAFE,
  };
}

/**
 * Get percentage of safe range for visualization
 * @param {string} sensorType - Type of sensor
 * @param {number} value - Current value
 * @returns {number} - Percentage (0-100, can exceed 100 if unsafe)
 */
export function getSafeRangePercentage(sensorType, value) {
  const threshold = SENSOR_THRESHOLDS[sensorType];

  if (!threshold) return 50;

  if (sensorType === 'ph') {
    const range = threshold.max - threshold.min;
    const midpoint = threshold.min + range / 2;
    const deviation = Math.abs(value - midpoint);
    return Math.max(0, Math.min(100, 100 - (deviation / (range / 2)) * 100));
  }

  // Turbidity: higher voltage = cleaner — map min..max range to 0..100%.
  if (sensorType === 'turbidity') {
    const range = threshold.max - threshold.min;
    return Math.max(0, Math.min(100, ((value - threshold.min) / range) * 100));
  }

  // For max-only thresholds (TDS)
  return Math.max(0, Math.min(100, (value / threshold.max) * 100));
}
