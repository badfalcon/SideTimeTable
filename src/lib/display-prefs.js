/**
 * The language and 12/24-hour choice dates and times are written in — the
 * extension language and the time-format setting, the same ones the header,
 * the event blocks and the time fields use, so a time reads the same
 * everywhere. Starts from a synchronous guess and is replaced once the
 * settings are read (refreshDisplayPrefs).
 *
 * The settings are read through locale-utils.js (window.getCurrentLocale /
 * window.getTimeFormatPreference), which the page loads as a plain script.
 */

let displayPrefs = null;

/**
 * Whether Chrome's own language writes times with a 12-hour clock. Used for
 * the first guess, before the stored setting is read.
 * @returns {boolean}
 */
export function usesTwelveHourClock() {
    let language;
    try {
        language = chrome.i18n.getUILanguage();
    } catch {
        language = undefined;
    }
    language = language || globalThis.navigator?.language || 'en-US';
    try {
        const { hourCycle, hour12 } = new Intl.DateTimeFormat(language, { hour: 'numeric' }).resolvedOptions();
        if (hourCycle) return hourCycle === 'h11' || hourCycle === 'h12';
        return hour12 === true;
    } catch {
        return false;
    }
}

/**
 * @returns {{locale: string, timeFormat: string}}
 */
export function getDisplayPrefs() {
    if (!displayPrefs) {
        const lang = globalThis.document?.documentElement?.lang;
        displayPrefs = {
            locale: lang === 'ja' ? 'ja' : 'en',
            timeFormat: usesTwelveHourClock() ? '12h' : '24h'
        };
    }
    return displayPrefs;
}

/**
 * Use known preferences (tests, or a caller that has already read them).
 * @param {{locale: string, timeFormat: string}} prefs
 */
export function setDisplayPrefs(prefs) {
    displayPrefs = {
        locale: prefs.locale === 'ja' ? 'ja' : 'en',
        timeFormat: prefs.timeFormat === '12h' ? '12h' : '24h'
    };
}

/**
 * Read the stored language and time-format setting.
 * @returns {Promise<boolean>} Whether they differ from what was assumed
 */
export async function refreshDisplayPrefs() {
    const before = getDisplayPrefs();
    try {
        const [locale, timeFormat] = await Promise.all([
            typeof window.getCurrentLocale === 'function' ? window.getCurrentLocale() : before.locale,
            typeof window.getTimeFormatPreference === 'function' ? window.getTimeFormatPreference() : before.timeFormat
        ]);
        const next = {
            locale: locale === 'ja' ? 'ja' : 'en',
            timeFormat: timeFormat === '12h' ? '12h' : '24h'
        };
        displayPrefs = next;
        return next.locale !== before.locale || next.timeFormat !== before.timeFormat;
    } catch {
        return false;
    }
}
