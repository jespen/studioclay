/**
 * Utility functions for date formatting and manipulation
 */

/**
 * Format a date string or Date object to a localized format
 * @param dateString - ISO date string or Date object
 * @param locale - Optional locale for formatting (default: 'sv-SE')
 * @returns Formatted date string
 */
export function formatDate(dateString: string | Date, locale: string = 'sv-SE'): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Check if a date is in the past
 * @param dateString - ISO date string or Date object to check
 * @returns true if the date is in the past
 */
export function isPastDate(dateString: string | Date): boolean {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  
  return date < now;
}

/**
 * Get relative time (e.g., "2 days ago", "in 3 hours")
 * @param dateString - ISO date string or Date object
 * @param locale - Optional locale for formatting (default: 'sv-SE')
 * @returns Relative time string
 */
export function getRelativeTime(dateString: string | Date, locale: string = 'sv-SE'): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const now = new Date();
  const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);
  
  // Convert to appropriate time unit
  if (Math.abs(diffInSeconds) < 60) {
    return formatter.format(diffInSeconds, 'second');
  } else if (Math.abs(diffInSeconds) < 3600) {
    return formatter.format(Math.floor(diffInSeconds / 60), 'minute');
  } else if (Math.abs(diffInSeconds) < 86400) {
    return formatter.format(Math.floor(diffInSeconds / 3600), 'hour');
  } else if (Math.abs(diffInSeconds) < 2592000) { // 30 days
    return formatter.format(Math.floor(diffInSeconds / 86400), 'day');
  } else if (Math.abs(diffInSeconds) < 31536000) { // 365 days
    return formatter.format(Math.floor(diffInSeconds / 2592000), 'month');
  } else {
    return formatter.format(Math.floor(diffInSeconds / 31536000), 'year');
  }
} 