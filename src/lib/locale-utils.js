/**
 * Locale-aware date and time formatting utilities
 */

/**
 * 現在の言語設定を取得
 * @returns {Promise<string>} 言語コード（en/ja）
 */
async function getCurrentLocale() {
    try {
        if (window.getCurrentLanguageSetting && window.resolveLanguageCode) {
            const setting = await window.getCurrentLanguageSetting();
            return window.resolveLanguageCode(setting);
        }
        
        // フォールバック
        const result = await chrome.storage.sync.get(['language']);
        const languageSetting = result.language || 'auto';
        
        if (languageSetting === 'auto') {
            return chrome.i18n.getUILanguage().startsWith('ja') ? 'ja' : 'en';
        }
        return languageSetting;
    } catch (error) {
        console.warn('ロケール取得エラー:', error);
        return chrome.i18n.getUILanguage().startsWith('ja') ? 'ja' : 'en';
    }
}

/**
 * 時間をロケールに応じてフォーマット
 * @param {string} timeString - HH:mm形式の時間文字列
 * @param {string} locale - ロケール（ja/en）
 * @returns {string} フォーマット済み時間
 */
function formatTimeForLocale(timeString, locale = 'ja') {
    if (!timeString) return '';
    
    try {
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        
        if (locale === 'en') {
            // 英語: 12時間制
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } else {
            // 日本語: 24時間制
            return date.toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        }
    } catch (error) {
        console.warn('時間フォーマットエラー:', error);
        return timeString;
    }
}

/**
 * 日付をロケールに応じてフォーマット
 * @param {Date} date - 日付オブジェクト
 * @param {string} locale - ロケール（ja/en）
 * @returns {string} フォーマット済み日付
 */
function formatDateForLocale(date, locale = 'ja') {
    if (!date) return '';
    
    try {
        if (locale === 'en') {
            // 英語: MM/DD/YYYY
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } else {
            // 日本語: YYYY/MM/DD
            return date.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        }
    } catch (error) {
        console.warn('日付フォーマットエラー:', error);
        return date.toLocaleDateString();
    }
}

/**
 * 日付を曜日付きでロケールに応じてフォーマット
 * @param {Date} date - 日付オブジェクト
 * @param {string} locale - ロケール（ja/en）
 * @returns {string} フォーマット済み日付（曜日付き）
 */
function formatDateWithWeekdayForLocale(date, locale = 'ja') {
    if (!date) return '';
    
    try {
        if (locale === 'en') {
            // 英語: Mon, MM/DD/YYYY
            return date.toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } else {
            // 日本語: YYYY/MM/DD (月)
            return date.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                weekday: 'short'
            });
        }
    } catch (error) {
        console.warn('日付フォーマットエラー:', error);
        return date.toLocaleDateString();
    }
}

/**
 * 時間範囲をロケールに応じてフォーマット
 * @param {string} startTime - 開始時間（HH:mm）
 * @param {string} endTime - 終了時間（HH:mm）
 * @param {string} locale - ロケール（ja/en）
 * @returns {string} フォーマット済み時間範囲
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
 * 現在時刻をロケールに応じてフォーマット
 * @param {string} locale - ロケール（ja/en）
 * @returns {string} フォーマット済み現在時刻
 */
function formatCurrentTimeForLocale(locale = 'ja') {
    const now = new Date();
    
    try {
        if (locale === 'en') {
            // 英語: 12時間制
            return now.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } else {
            // 日本語: 24時間制
            return now.toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        }
    } catch (error) {
        console.warn('現在時刻フォーマットエラー:', error);
        return now.toLocaleTimeString();
    }
}

// グローバル関数として公開
window.getCurrentLocale = getCurrentLocale;
window.formatTimeForLocale = formatTimeForLocale;
window.formatDateForLocale = formatDateForLocale;
window.formatDateWithWeekdayForLocale = formatDateWithWeekdayForLocale;
window.formatTimeRangeForLocale = formatTimeRangeForLocale;
window.formatCurrentTimeForLocale = formatCurrentTimeForLocale;