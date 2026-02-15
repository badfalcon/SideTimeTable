/**
 * FormatUtils - Centralized date and time formatting utilities
 *
 * Consolidates all date string formatting and locale-aware time
 * formatting used across the application.
 */

/**
 * Format a Date object to YYYY-MM-DD string using local timezone
 * @param {Date} date - The date to format
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function formatDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format a time string (HH:mm) for the given locale and time format
 * @param {string} timeString - Time in HH:mm format
 * @param {Object} [options] - Formatting options
 * @param {string} [options.locale='en'] - Locale code
 * @param {string} [options.format='24h'] - Time format ('12h' or '24h')
 * @returns {string} Formatted time string
 */
export function formatTimeForDisplay(timeString, options = {}) {
    const { locale = 'en', format = '24h' } = options;

    if (typeof window.formatTime === 'function') {
        return window.formatTime(timeString, { format, locale });
    } else if (typeof window.formatTimeByFormat === 'function') {
        return window.formatTimeByFormat(timeString, format, locale);
    } else if (typeof window.formatTimeForLocale === 'function') {
        return window.formatTimeForLocale(timeString, locale);
    }

    // Fallback: return the raw time string
    return timeString;
}

/**
 * Get the current locale and time format preference
 * @returns {Promise<{locale: string, timeFormat: string}>}
 */
export async function getLocalePreferences() {
    const [locale, timeFormat] = await Promise.all([
        typeof window.getCurrentLocale === 'function'
            ? window.getCurrentLocale()
            : Promise.resolve('en'),
        typeof window.getTimeFormatPreference === 'function'
            ? window.getTimeFormatPreference()
            : Promise.resolve('24h')
    ]);
    return { locale, timeFormat };
}

/**
 * Get the locale-appropriate time range separator
 * @param {string} locale - Locale code
 * @returns {string} Separator string
 */
export function getTimeSeparator(locale) {
    return locale === 'en' ? ' - ' : '～';
}

/**
 * Format a time range string with locale awareness
 * @param {string} startTime - Start time in HH:mm format
 * @param {string} endTime - End time in HH:mm format
 * @param {Object} [options] - Formatting options
 * @param {string} [options.locale='en'] - Locale code
 * @param {string} [options.format='24h'] - Time format
 * @returns {string} Formatted time range
 */
export function formatTimeRange(startTime, endTime, options = {}) {
    const { locale = 'en', format = '24h' } = options;
    const formattedStart = formatTimeForDisplay(startTime, { locale, format });
    const formattedEnd = formatTimeForDisplay(endTime, { locale, format });
    const separator = getTimeSeparator(locale);
    return `${formattedStart}${separator}${formattedEnd}`;
}

/**
 * Format a Date object's time as HH:mm string
 * @param {Date} date - The date object
 * @returns {string} Time in HH:mm format
 */
export function formatTimeFromDate(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}
