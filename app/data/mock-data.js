/**
 * Mock data for the Rainwater Dashboard
 * This file contains sample data that simulates real sensor readings
 * Replace with actual API calls when connecting to the backend
 */

import { subHours, subMinutes, subDays } from 'date-fns';

/**
 * Generate timestamp for mock data
 * @param {number} hoursAgo - Hours before now
 * @param {number} minutesAgo - Additional minutes before now
 * @returns {string} - ISO date string
 */
function getTimestamp(hoursAgo = 0, minutesAgo = 0) {
  let date = new Date();
  if (hoursAgo) date = subHours(date, hoursAgo);
  if (minutesAgo) date = subMinutes(date, minutesAgo);
  return date.toISOString();
}

/**
 * Current sensor readings
 * Simulates real-time data from sensors
 */
export const currentSensorData = {
  ph: 7.2,
  turbidity: 2.5,
  tds: 245,
  temperature: 22.5,
  lastUpdated: getTimestamp(0, 2),
};

/**
 * System status information
 */
export const systemStatus = {
  filterStatus: true, // Filter is ON
  uvStatus: true, // UV lamp is ON
  pumpStatus: true, // Pump is running
  tankLevel: 75, // Tank is 75% full
  lastMaintenance: subDays(new Date(), 15).toISOString(),
  nextMaintenance: subDays(new Date(), -15).toISOString(),
  systemHealth: 'good', // 'good', 'warning', 'critical'
};

/**
 * Historical sensor data for charts (last 24 hours)
 * Each entry represents hourly readings
 */
export const historicalData = Array.from({ length: 24 }, (_, i) => {
  const hoursAgo = 23 - i;
  return {
    timestamp: getTimestamp(hoursAgo),
    ph: 6.8 + Math.random() * 0.8,
    turbidity: 1.5 + Math.random() * 2,
    tds: 200 + Math.random() * 100,
    temperature: 20 + Math.random() * 5,
  };
});

/**
 * Weekly sensor data for trend analysis
 */
export const weeklyData = Array.from({ length: 7 }, (_, i) => {
  const daysAgo = 6 - i;
  return {
    date: subDays(new Date(), daysAgo).toISOString(),
    avgPh: 7.0 + Math.random() * 0.4,
    avgTurbidity: 2.0 + Math.random() * 1.5,
    avgTds: 220 + Math.random() * 60,
    avgTemperature: 21 + Math.random() * 3,
    potabilityScore: 75 + Math.random() * 20,
  };
});

/**
 * System event logs
 */
export const systemLogs = [
  {
    id: 1,
    timestamp: getTimestamp(0, 5),
    type: 'info',
    category: 'sensor',
    message: 'All sensors reporting normal readings',
    details: 'pH: 7.2, Turbidity: 2.5 NTU, TDS: 245 mg/L, Temp: 22.5°C',
  },
  {
    id: 2,
    timestamp: getTimestamp(0, 30),
    type: 'success',
    category: 'system',
    message: 'UV sterilization cycle completed',
    details: 'Duration: 15 minutes, Power: 100%',
  },
  {
    id: 3,
    timestamp: getTimestamp(1, 0),
    type: 'warning',
    category: 'sensor',
    message: 'Turbidity approaching threshold',
    details: 'Current: 4.2 NTU, Threshold: 5.0 NTU',
  },
  {
    id: 4,
    timestamp: getTimestamp(2, 15),
    type: 'info',
    category: 'maintenance',
    message: 'Automatic filter backwash initiated',
    details: 'Scheduled maintenance cycle',
  },
  {
    id: 5,
    timestamp: getTimestamp(3, 0),
    type: 'success',
    category: 'system',
    message: 'Water quality assessment: SAFE',
    details: 'All parameters within acceptable range',
  },
  {
    id: 6,
    timestamp: getTimestamp(4, 30),
    type: 'info',
    category: 'tank',
    message: 'Tank level increased to 75%',
    details: 'Rainwater collection active',
  },
  {
    id: 7,
    timestamp: getTimestamp(6, 0),
    type: 'warning',
    category: 'system',
    message: 'Power fluctuation detected',
    details: 'Backup power activated briefly',
  },
  {
    id: 8,
    timestamp: getTimestamp(12, 0),
    type: 'error',
    category: 'sensor',
    message: 'TDS sensor calibration needed',
    details: 'Readings showing minor drift from baseline',
  },
  {
    id: 9,
    timestamp: getTimestamp(18, 0),
    type: 'success',
    category: 'maintenance',
    message: 'Weekly system health check passed',
    details: 'All components functioning normally',
  },
  {
    id: 10,
    timestamp: getTimestamp(24, 0),
    type: 'info',
    category: 'system',
    message: 'Daily report generated',
    details: 'Average potability score: 92%',
  },
];

/**
 * Alert notifications
 */
export const alerts = [
  {
    id: 1,
    timestamp: getTimestamp(0, 30),
    type: 'warning',
    title: 'Turbidity Rising',
    message: 'Turbidity levels approaching warning threshold',
    isRead: false,
  },
  {
    id: 2,
    timestamp: getTimestamp(2, 0),
    type: 'info',
    title: 'Maintenance Reminder',
    message: 'Filter replacement due in 15 days',
    isRead: false,
  },
  {
    id: 3,
    timestamp: getTimestamp(6, 0),
    type: 'success',
    title: 'System Update',
    message: 'Firmware update completed successfully',
    isRead: true,
  },
];

/**
 * Dashboard statistics
 */
export const dashboardStats = {
  todayWaterCollected: 125, // liters
  weeklyWaterCollected: 850, // liters
  monthlyWaterCollected: 3200, // liters
  potabilityScore: 92, // percentage
  systemUptime: 99.8, // percentage
  alertsCount: 2,
};

/**
 * System settings (default values)
 */
export const defaultSettings = {
  // Notification preferences
  notifications: {
    emailAlerts: true,
    pushNotifications: true,
    smsAlerts: false,
    alertThreshold: 'warning', // 'warning' or 'critical'
  },

  // Sensor calibration settings
  sensorCalibration: {
    phOffset: 0,
    turbidityOffset: 0,
    tdsOffset: 0,
    temperatureOffset: 0,
  },

  // System control settings
  systemControls: {
    autoFilterBackwash: true,
    uvScheduleEnabled: true,
    uvScheduleStart: '06:00',
    uvScheduleEnd: '22:00',
    autoAlerts: true,
  },

  // Display preferences
  display: {
    theme: 'system', // 'light', 'dark', 'system'
    chartRefreshRate: 30, // seconds
    dateFormat: 'MMM dd, yyyy',
    temperatureUnit: 'celsius', // 'celsius' or 'fahrenheit'
  },

  // Data logging
  dataLogging: {
    logInterval: 5, // minutes
    retentionPeriod: 30, // days
    autoExport: false,
    exportFormat: 'csv',
  },
};

/**
 * Sensor metadata for display
 */
export const sensorMetadata = {
  ph: {
    icon: 'Droplets',
    color: '#8b5cf6', // purple
    gradient: 'from-purple-500 to-purple-600',
    description: 'Measures acidity/alkalinity of water',
  },
  turbidity: {
    icon: 'Eye',
    color: '#f59e0b', // amber
    gradient: 'from-amber-500 to-amber-600',
    description: 'Measures water clarity and suspended particles',
  },
  tds: {
    icon: 'Beaker',
    color: '#0ea5e9', // sky blue
    gradient: 'from-sky-500 to-sky-600',
    description: 'Measures total dissolved solids in water',
  },
  temperature: {
    icon: 'Thermometer',
    color: '#ef4444', // red
    gradient: 'from-red-500 to-red-600',
    description: 'Measures water temperature',
  },
};

/**
 * Mock API delay simulator
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} - Resolves after delay
 */
export function simulateApiDelay(ms = 500) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get mock sensor data with simulated API call
 * @returns {Promise<Object>} - Sensor data
 */
export async function fetchSensorData() {
  await simulateApiDelay(300);
  return {
    ...currentSensorData,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get mock historical data with simulated API call
 * @param {string} range - Time range ('24h', 'week', 'month')
 * @returns {Promise<Array>} - Historical data
 */
export async function fetchHistoricalData(range = '24h') {
  await simulateApiDelay(500);
  if (range === '24h') return historicalData;
  if (range === 'week') return weeklyData;
  return historicalData;
}

/**
 * Get mock system logs with simulated API call
 * @param {number} limit - Number of logs to return
 * @returns {Promise<Array>} - System logs
 */
export async function fetchSystemLogs(limit = 10) {
  await simulateApiDelay(400);
  return systemLogs.slice(0, limit);
}
