// Get localized text and set to element
function replace_i18n(element, tag) {
    const msg = tag.replace(/__MSG_(\w+)__/g, (match, v1) => chrome.i18n.getMessage(v1) || '');
    if (msg !== tag) element.innerHTML = msg;
}

// Localize HTML content
function localizeHtmlPage() {
    document.querySelectorAll('[data-localize]').forEach(element => {
        replace_i18n(element, element.getAttribute('data-localize'));
    });

    // Localize aria-label attributes
    document.querySelectorAll('[data-localize-aria-label]').forEach(element => {
        const tag = element.getAttribute('data-localize-aria-label');
        const msg = tag.replace(/__MSG_(\w+)__/g, (match, v1) => chrome.i18n.getMessage(v1) || '');
        if (msg !== tag) element.setAttribute('aria-label', msg);
    });

    // Localize placeholder attributes
    document.querySelectorAll('[data-localize-placeholder]').forEach(element => {
        const tag = element.getAttribute('data-localize-placeholder');
        const msg = tag.replace(/__MSG_(\w+)__/g, (match, v1) => chrome.i18n.getMessage(v1) || '');
        if (msg !== tag) element.setAttribute('placeholder', msg);
    });

    // Localize title attributes
    document.querySelectorAll('[data-localize-title]').forEach(element => {
        const tag = element.getAttribute('data-localize-title');
        const msg = tag.replace(/__MSG_(\w+)__/g, (match, v1) => chrome.i18n.getMessage(v1) || '');
        if (msg !== tag) element.setAttribute('title', msg);
    });

    Array.from(document.getElementsByTagName('html')).forEach(element => {
        replace_i18n(element, element.innerHTML);
    });
}

/**
 * Get current language setting
 * @returns {string} Language code (en/ja/auto)
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
 * Determine actual language code to use
 * @param {string} languageSetting - Setting value (auto/en/ja)
 * @returns {string} Actual language code (en/ja)
 */
function resolveLanguageCode(languageSetting) {
    if (languageSetting === 'auto') {
        // Get browser language
        const browserLang = chrome.i18n.getUILanguage().toLowerCase();
        return browserLang.startsWith('ja') ? 'ja' : 'en';
    }
    return languageSetting;
}

// Get localized text according to language settings
function getMessageWithLang(key) {
    const lang = localStorage.getItem('sideTimeTableLang') || (chrome.i18n && chrome.i18n.getUILanguage ? chrome.i18n.getUILanguage().slice(0,2) : 'ja');
    // According to manifest/_locales spec, chrome.i18n.getMessage switches automatically,
    // but if manifest's default_locale is ja, then en or en_US will use en
    // Get only by key here (chrome.i18n.getMessage switches automatically)
    return chrome.i18n.getMessage(key) || '';
}

// Localize HTML content (reflecting language settings)
async function localizeHtmlPageWithLang() {
    try {
        // Get user's language setting
        const userLanguageSetting = await getCurrentLanguageSetting();
        const targetLanguage = resolveLanguageCode(userLanguageSetting);
        
        
        // Execute localization in set language
        await localizeWithLanguage(targetLanguage);
    } catch (error) {
        console.warn('Localization by language setting failed:', error);
        // Execute standard localization as fallback
        localizeHtmlPage();
    }
}

// Execute localization in specified language
async function localizeWithLanguage(targetLang) {
    const messageFiles = {
        'en': '/_locales/en/messages.json',
        'ja': '/_locales/ja/messages.json'
    };
    
    try {
        // Get message file for specified language
        const messagesUrl = chrome.runtime.getURL(messageFiles[targetLang] || messageFiles['en']);
        const response = await fetch(messagesUrl);
        const messages = await response.json();
        
        
        // Localize HTML elements
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
        
        // Localize placeholder attributes
        document.querySelectorAll('[data-localize-placeholder]').forEach(element => {
            const tag = element.getAttribute('data-localize-placeholder');
            const msg = tag.replace(/__MSG_(\w+)__/g, (match, v1) => {
                return messages[v1]?.message || chrome.i18n.getMessage(v1) || v1;
            });
            if (msg !== tag) element.setAttribute('placeholder', msg);
        });
        
        // Localize title attributes
        document.querySelectorAll('[data-localize-title]').forEach(element => {
            const tag = element.getAttribute('data-localize-title');
            const msg = tag.replace(/__MSG_(\w+)__/g, (match, v1) => {
                return messages[v1]?.message || chrome.i18n.getMessage(v1) || v1;
            });
            if (msg !== tag) element.setAttribute('title', msg);
        });
        
    } catch (error) {
        console.warn('Failed to load message file:', error);
        // Execute standard localization as fallback
        localizeHtmlPage();
    }
}

// Export as global functions (maintain legacy format)
window.getCurrentLanguageSetting = getCurrentLanguageSetting;
window.resolveLanguageCode = resolveLanguageCode;
window.getMessageWithLang = getMessageWithLang;
window.localizeHtmlPageWithLang = localizeHtmlPageWithLang;
window.localizeWithLanguage = localizeWithLanguage;
