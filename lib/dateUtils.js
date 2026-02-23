/**
 * Format date to IST (Indian Standard Time)
 * @param {Date|string} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string in IST
 */
export function formatIST(date, options = {}) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };

  return new Intl.DateTimeFormat('en-IN', defaultOptions).format(dateObj);
}

/**
 * Format date to IST date only (no time)
 */
export function formatISTDate(date) {
  return formatIST(date, { hour: undefined, minute: undefined });
}

/**
 * Format date to IST time only
 */
export function formatISTTime(date) {
  return formatIST(date, { year: undefined, month: undefined, day: undefined });
}

