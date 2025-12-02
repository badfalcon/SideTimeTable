/**
 * Locale-aware date and time formatting utilities
 */

/**
 * Get the current language setting
 * @returns {Promise<string>} The language code (en/ja)
 */
async function getCurrentLocale() {
    try {
        if (window.getCurrentLanguageSetting && window.resolveLanguageCode) {
            const setting = await window.getCurrentLanguageSetting();
            return window.resolveLanguageCode(setting);
        }
        
        // The fallback
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
 * Determine default time format based on UI language
 * Policy: en-US -> 12h, otherwise -> 24h
 * @returns {"12h"|"24h"}
 */
function determineDefaultTimeFormat() {
    try {
        const uiLang = chrome.i18n.getUILanguage();
        return uiLang && uiLang.toLowerCase().startsWith('en-us') ? '12h' : '24h';
    } catch (_) {
        return '24h';
    }
}

/**
 * Get user's time format preference from storage with sensible default.
 * Default policy: 24h globally, except en-US defaults to 12h.
 * @returns {Promise<"12h"|"24h">}
 */
async function getTimeFormatPreference() {
    try {
        const result = await chrome.storage.sync.get(['timeFormat']);
        const saved = result.timeFormat;
        if (saved === '12h' || saved === '24h') return saved;
        return determineDefaultTimeFormat();
    } catch (error) {
        console.warn('Time format preference error:', error);
        return determineDefaultTimeFormat();
    }
}

/**
 * Persist user's time format preference.
 * @param {"12h"|"24h"} format
 * @returns {Promise<void>}
 */
async function setTimeFormatPreference(format) {
    try {
        if (format !== '12h' && format !== '24h') return;
        await chrome.storage.sync.set({ timeFormat: format });
    } catch (error) {
        console.warn('Time format persistence error:', error);
    }
}

/**
 * Format the time according to the locale
 * @param {string} timeString - The time string in HH:mm format
 * @param {string} locale - The locale (ja/en)
 * @returns {string} The formatted time
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
 * Core formatter (explicit hour cycle 12h/24h)
 * Locale hint only affects digits/zero-padding language, not hour cycle.
 * @param {string} timeString - The time string in HH:mm format
 * @param {"12h"|"24h"} timeFormat - Desired hour cycle
 * @param {string} localeHint - 'ja' or 'en' to pick numeral locale
 * @returns {string}
 */
function formatTimeByFormat(timeString, timeFormat = '24h', localeHint = 'ja') {
    if (!timeString) return '';
    try {
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);

        const is12 = timeFormat === '12h';
        const localeId = localeHint === 'en' ? 'en-US' : 'ja-JP';
        return date.toLocaleTimeString(localeId, {
            hour: is12 ? 'numeric' : '2-digit',
            minute: '2-digit',
            hour12: is12
        });
    } catch (error) {
        console.warn('Time format (by format) error:', error);
        return timeString;
    }
}

/**
 * Minimal public API: format a time string with options
 * @param {string} timeString - HH:mm
 * @param {{ format?: "12h"|"24h", locale?: 'ja'|'en' }} [options]
 * @returns {string}
 */
function formatTime(timeString, options = {}) {
    const format = options.format === '12h' || options.format === '24h' ? options.format : '24h';
    const locale = options.locale === 'en' ? 'en' : 'ja';
    return formatTimeByFormat(timeString, format, locale);
}

/**
 * Format the date according to the locale
 * @param {Date} date - The date object
 * @param {string} locale - The locale (ja/en)
 * @returns {string} The formatted date
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
 * Format the date with the weekday according to the locale
 * @param {Date} date - The date object
 * @param {string} locale - The locale (ja/en)
 * @returns {string} The formatted date (with the weekday)
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

// Export as the global functions
window.getCurrentLocale = getCurrentLocale;
window.getTimeFormatPreference = getTimeFormatPreference;
window.setTimeFormatPreference = setTimeFormatPreference;
window.formatTimeForLocale = formatTimeForLocale; // legacy
window.formatTime = formatTime; // minimal API
window.formatTimeByFormat = formatTimeByFormat;
window.formatDateForLocale = formatDateForLocale;
window.formatDateWithWeekdayForLocale = formatDateWithWeekdayForLocale;