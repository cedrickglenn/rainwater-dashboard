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

  // Turbidity: Should be below 5 NTU, ideally below 1 NTU
  turbidity: {
    min: 0,
    max: 5,
    unit: 'NTU',
    name: 'Turbidity',
    description: 'Measure of water clarity',
    safeRange: '< 5 NTU',
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

  // Temperature: Ideal for storage 15-25°C
  temperature: {
    min: 15,
    max: 25,
    unit: '°C',
    name: 'Temperature',
    description: 'Water temperature',
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
};

/**
 * Status display configuration
 */
export const STATUS_CONFIG = {
  [WATER_STATUS.SAFE]: {
    label: 'Safe',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    borderColor: 'border-green-500',
    dotColor: 'bg-green-500',
  },
  [WATER_STATUS.WARNING]: {
    label: 'Warning',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    borderColor: 'border-amber-500',
    dotColor: 'bg-amber-500',
  },
  [WATER_STATUS.UNSAFE]: {
    label: 'Unsafe',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    borderColor: 'border-red-500',
    dotColor: 'bg-red-500',
  },
};

/**
 * Check if a sensor value is within safe range
 * @param {string} sensorType - Type of sensor (ph, turbidity, tds, temperature)
 * @param {number} value - Sensor reading value
 * @returns {string} - Status ('safe', 'warning', 'unsafe')
 */
export function getSensorStatus(sensorType, value) {
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

  // For turbidity and TDS (only max matters)
  if (sensorType === 'turbidity' || sensorType === 'tds') {
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

  // Check each sensor
  for (const [sensor, value] of Object.entries(sensorData)) {
    if (SENSOR_THRESHOLDS[sensor]) {
      const status = getSensorStatus(sensor, value);
      statuses[sensor] = status;

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

  // For max-only thresholds (turbidity, TDS)
  return Math.max(0, Math.min(100, (value / threshold.max) * 100));
}
