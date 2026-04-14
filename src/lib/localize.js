/**
 * Get the current language setting
 * @returns {string} The language code (en/ja/auto)
 */
async function getCurrentLanguageSetting() {
    try {
        const result = await chrome.storage.sync.get(['language']);
        return result.language || 'auto';
    } catch (error) {
        console.warn('Language setting retrieval error:', error);
        return 'auto';
    }
}

/**
 * Determine the actual language code to use
 * @param {string} languageSetting - The setting value (auto/en/ja)
 * @returns {string} The actual language code (en/ja)
 */
function resolveLanguageCode(languageSetting) {
    if (languageSetting === 'auto') {
        // Get the browser language
        const browserLang = chrome.i18n.getUILanguage().toLowerCase();
        return browserLang.startsWith('ja') ? 'ja' : 'en';
    }
    // Only 'en' and 'ja' are valid; all others fallback to 'en'
    if (languageSetting === 'en' || languageSetting === 'ja') {
        return languageSetting;
    }
    return 'en';
}

// Localize the HTML content (reflecting the language settings)
async function localizeHtmlPageWithLang() {
    try {
        // Get the user's language setting
        const userLanguageSetting = await getCurrentLanguageSetting();
        const targetLanguage = resolveLanguageCode(userLanguageSetting);
        
        
        // Execute the localization in the set language
        await localizeWithLanguage(targetLanguage);
    } catch (error) {
        console.warn('Localization by language setting failed:', error);
    }
}

/** @type {Object<string, {message: string}>|null} Cached locale messages */
let _cachedMessages = null;

/**
 * Get a localized message respecting the user's language setting.
 * Falls back to chrome.i18n.getMessage() if cache is not loaded.
 * @param {string} key - i18n message key
 * @returns {string} Localized message or the key itself
 */
function getLocalizedMessage(key) {
    if (_cachedMessages && _cachedMessages[key]) {
        return _cachedMessages[key].message || key;
    }
    try {
        const msg = chrome.i18n.getMessage(key);
        return msg || key;
    } catch {
        return key;
    }
}

/**
 * Load locale messages based on the user's language setting.
 * Must be called once before components render.
 * @returns {Promise<void>}
 */
async function loadLocalizedMessages() {
    try {
        const userLanguageSetting = await getCurrentLanguageSetting();
        const targetLanguage = resolveLanguageCode(userLanguageSetting);
        const messagesUrl = chrome.runtime.getURL(`/_locales/${targetLanguage}/messages.json`);
        const response = await fetch(messagesUrl);
        _cachedMessages = await response.json();
    } catch {
        _cachedMessages = null;
    }
}

// Execute the localization in the specified language
async function localizeWithLanguage(targetLang) {
    const messageFiles = {
        'en': '/_locales/en/messages.json',
        'ja': '/_locales/ja/messages.json'
    };

    try {
        // Get the message file for the specified language
        const messagesUrl = chrome.runtime.getURL(messageFiles[targetLang] || messageFiles['en']);
        const response = await fetch(messagesUrl);
        const messages = await response.json();

        // Update the cached messages
        _cachedMessages = messages;
        
        
        // Localize the HTML elements
        document.querySelectorAll('[data-localize]').forEach(element => {
            const tag = element.getAttribute('data-localize');
            const msg = tag.replace(/__MSG_(\w+)__/g, (match, v1) => {
                return messages[v1]?.message || chrome.i18n.getMessage(v1) || v1;
            });
            if (msg !== tag) element.innerHTML = msg;
        });
        
        document.querySelectorAll('[data-localize-aria-label]').forEach(element => {
            const tag = element.getAttribute('data-localize-aria-label');
            const msg = tag.replace(/__MSG_(\w+)__/g, (match, v1) => {
                return messages[v1]?.message || chrome.i18n.getMessage(v1) || v1;
            });
            if (msg !== tag) element.setAttribute('aria-label', msg);
        });
        
        // Localize the placeholder attributes
        document.querySelectorAll('[data-localize-placeholder]').forEach(element => {
            const tag = element.getAttribute('data-localize-placeholder');
            const msg = tag.replace(/__MSG_(\w+)__/g, (match, v1) => {
                return messages[v1]?.message || chrome.i18n.getMessage(v1) || v1;
            });
            if (msg !== tag) element.setAttribute('placeholder', msg);
        });
        
        // Localize the title attributes
        document.querySelectorAll('[data-localize-title]').forEach(element => {
            const tag = element.getAttribute('data-localize-title');
            const msg = tag.replace(/__MSG_(\w+)__/g, (match, v1) => {
                return messages[v1]?.message || chrome.i18n.getMessage(v1) || v1;
            });
            if (msg !== tag) element.setAttribute('title', msg);
        });
        
    } catch (error) {
        console.warn('Failed to load message file:', error);
    }
}

// Export as the global functions (maintain the legacy format)
window.getCurrentLanguageSetting = getCurrentLanguageSetting;
window.resolveLanguageCode = resolveLanguageCode;
window.localizeHtmlPageWithLang = localizeHtmlPageWithLang;
window.localizeWithLanguage = localizeWithLanguage;
window.getLocalizedMessage = getLocalizedMessage;
window.loadLocalizedMessages = loadLocalizedMessages;
