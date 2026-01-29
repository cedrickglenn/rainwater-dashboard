/**
 * Date formatting utilities using date-fns
 * Provides consistent date formatting across the dashboard
 */

import {
  format,
  formatDistanceToNow,
  parseISO,
  isToday,
  isYesterday,
  isThisWeek,
  startOfDay,
  endOfDay,
  subDays,
  subHours,
  differenceInMinutes,
} from 'date-fns';

/**
 * Format a date to a standard display format
 * @param {Date|string} date - Date object or ISO string
 * @param {string} formatStr - Format string (default: 'MMM dd, yyyy')
 * @returns {string} - Formatted date string
 */
export function formatDate(date, formatStr = 'MMM dd, yyyy') {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Format a date with time
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} - Formatted date and time string
 */
export function formatDateTime(date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM dd, yyyy HH:mm:ss');
}

/**
 * Format time only
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} - Formatted time string (HH:mm)
 */
export function formatTime(date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'HH:mm');
}

/**
 * Format as relative time (e.g., "5 minutes ago")
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} - Relative time string
 */
export function formatRelativeTime(date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Get a human-readable date label
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} - Human readable label (Today, Yesterday, or formatted date)
 */
export function getDateLabel(date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (isToday(dateObj)) {
    return 'Today';
  }
  if (isYesterday(dateObj)) {
    return 'Yesterday';
  }
  if (isThisWeek(dateObj)) {
    return format(dateObj, 'EEEE'); // Day name
  }
  return format(dateObj, 'MMM dd, yyyy');
}

/**
 * Format date for log entries
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} - Formatted string for log display
 */
export function formatLogDate(date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const diffMinutes = differenceInMinutes(new Date(), dateObj);

  if (diffMinutes < 1) {
    return 'Just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  if (isToday(dateObj)) {
    return `Today at ${format(dateObj, 'HH:mm')}`;
  }
  if (isYesterday(dateObj)) {
    return `Yesterday at ${format(dateObj, 'HH:mm')}`;
  }
  return format(dateObj, 'MMM dd, HH:mm');
}

/**
 * Get date range for filtering
 * @param {string} range - Range type ('today', 'week', 'month', 'custom')
 * @returns {Object} - Object with startDate and endDate
 */
export function getDateRange(range) {
  const now = new Date();

  switch (range) {
    case 'today':
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
      };
    case 'week':
      return {
        startDate: startOfDay(subDays(now, 7)),
        endDate: endOfDay(now),
      };
    case 'month':
      return {
        startDate: startOfDay(subDays(now, 30)),
        endDate: endOfDay(now),
      };
    case '24h':
      return {
        startDate: subHours(now, 24),
        endDate: now,
      };
    default:
      return {
        startDate: startOfDay(subDays(now, 7)),
        endDate: endOfDay(now),
      };
  }
}

/**
 * Format chart axis label
 * @param {Date|string} date - Date object or ISO string
 * @param {string} type - Type of label ('hour', 'day', 'month')
 * @returns {string} - Formatted axis label
 */
export function formatChartLabel(date, type = 'hour') {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  switch (type) {
    case 'hour':
      return format(dateObj, 'HH:mm');
    case 'day':
      return format(dateObj, 'MMM dd');
    case 'month':
      return format(dateObj, 'MMM yyyy');
    default:
      return format(dateObj, 'HH:mm');
  }
}
