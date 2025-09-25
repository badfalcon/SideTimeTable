/**
 * Locale-aware date and time formatting utilities
 */

/**
 * Get current language setting
 * @returns {Promise<string>} Language code (en/ja)
 */
async function getCurrentLocale() {
    try {
        if (window.getCurrentLanguageSetting && window.resolveLanguageCode) {
            const setting = await window.getCurrentLanguageSetting();
            return window.resolveLanguageCode(setting);
        }
        
        // Fallback
        const result = await chrome.storage.sync.get(['language']);
        const languageSetting = result.language || 'auto';
        
        if (languageSetting === 'auto') {
            return chrome.i18n.getUILanguage().startsWith('ja') ? 'ja' : 'en';
        }
        return languageSetting;
    } catch (error) {
        console.warn('Locale acquisition error:', error);
        return chrome.i18n.getUILanguage().startsWith('ja') ? 'ja' : 'en';
    }
}

/**
 * Format time according to locale
 * @param {string} timeString - Time string in HH:mm format
 * @param {string} locale - Locale (ja/en)
 * @returns {string} Formatted time
 */
function formatTimeForLocale(timeString, locale = 'ja') {
    if (!timeString) return '';
    
    try {
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        
        if (locale === 'en') {
            // English: 12-hour format
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } else {
            // Japanese: 24-hour format
            return date.toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        }
    } catch (error) {
        console.warn('Time format error:', error);
        return timeString;
    }
}

/**
 * Format date according to locale
 * @param {Date} date - Date object
 * @param {string} locale - Locale (ja/en)
 * @returns {string} Formatted date
 */
function formatDateForLocale(date, locale = 'ja') {
    if (!date) return '';
    
    try {
        if (locale === 'en') {
            // English: MM/DD/YYYY
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } else {
            // Japanese: YYYY/MM/DD
            return date.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        }
    } catch (error) {
        console.warn('Date format error:', error);
        return date.toLocaleDateString();
    }
}

/**
 * Format date with weekday according to locale
 * @param {Date} date - Date object
 * @param {string} locale - Locale (ja/en)
 * @returns {string} Formatted date (with weekday)
 */
function formatDateWithWeekdayForLocale(date, locale = 'ja') {
    if (!date) return '';
    
    try {
        if (locale === 'en') {
            // English: Mon, MM/DD/YYYY
            return date.toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } else {
            // Japanese: YYYY/MM/DD (Mon)
            return date.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                weekday: 'short'
            });
        }
    } catch (error) {
        console.warn('Date format error:', error);
        return date.toLocaleDateString();
    }
}

/**
 * Format time range according to locale
 * @param {string} startTime - Start time (HH:mm)
 * @param {string} endTime - End time (HH:mm)
 * @param {string} locale - Locale (ja/en)
 * @returns {string} Formatted time range
 */
function formatTimeRangeForLocale(startTime, endTime, locale = 'ja') {
    const formattedStart = formatTimeForLocale(startTime, locale);
    const formattedEnd = formatTimeForLocale(endTime, locale);
    
    if (locale === 'en') {
        return `${formattedStart} - ${formattedEnd}`;
    } else {
        return `${formattedStart}～${formattedEnd}`;
    }
}

/**
 * Format current time according to locale
 * @param {string} locale - Locale (ja/en)
 * @returns {string} Formatted current time
 */
function formatCurrentTimeForLocale(locale = 'ja') {
    const now = new Date();
    
    try {
        if (locale === 'en') {
            // English: 12-hour format
            return now.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } else {
            // Japanese: 24-hour format
            return now.toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        }
    } catch (error) {
        console.warn('Current time format error:', error);
        return now.toLocaleTimeString();
    }
}

// Export as global functions
window.getCurrentLocale = getCurrentLocale;
window.formatTimeForLocale = formatTimeForLocale;
window.formatDateForLocale = formatDateForLocale;
window.formatDateWithWeekdayForLocale = formatDateWithWeekdayForLocale;
window.formatTimeRangeForLocale = formatTimeRangeForLocale;
window.formatCurrentTimeForLocale = formatCurrentTimeForLocale;