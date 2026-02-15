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
    return languageSetting;
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
