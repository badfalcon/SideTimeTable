// ローカライズ文言を取得して要素に設定
function replace_i18n(element, tag) {
    const msg = tag.replace(/__MSG_(\w+)__/g, (match, v1) => chrome.i18n.getMessage(v1) || '');
    if (msg !== tag) element.innerHTML = msg;
}

// HTML内をローカライズする
function localizeHtmlPage() {
    document.querySelectorAll('[data-localize]').forEach(element => {
        replace_i18n(element, element.getAttribute('data-localize'));
    });

    // aria-label属性のローカライズ
    document.querySelectorAll('[data-localize-aria-label]').forEach(element => {
        const tag = element.getAttribute('data-localize-aria-label');
        const msg = tag.replace(/__MSG_(\w+)__/g, (match, v1) => chrome.i18n.getMessage(v1) || '');
        if (msg !== tag) element.setAttribute('aria-label', msg);
    });

    // placeholder属性のローカライズ
    document.querySelectorAll('[data-localize-placeholder]').forEach(element => {
        const tag = element.getAttribute('data-localize-placeholder');
        const msg = tag.replace(/__MSG_(\w+)__/g, (match, v1) => chrome.i18n.getMessage(v1) || '');
        if (msg !== tag) element.setAttribute('placeholder', msg);
    });

    Array.from(document.getElementsByTagName('html')).forEach(element => {
        replace_i18n(element, element.innerHTML);
    });
}

/**
 * 現在の言語設定を取得
 * @returns {string} 言語コード（en/ja/auto）
 */
async function getCurrentLanguageSetting() {
    try {
        const result = await chrome.storage.sync.get(['language']);
        return result.language || 'auto';
    } catch (error) {
        console.warn('言語設定取得エラー:', error);
        return 'auto';
    }
}

/**
 * 実際に使用する言語コードを決定
 * @param {string} languageSetting - 設定値（auto/en/ja）
 * @returns {string} 実際の言語コード（en/ja）
 */
function resolveLanguageCode(languageSetting) {
    if (languageSetting === 'auto') {
        // ブラウザーの言語を取得
        const browserLang = chrome.i18n.getUILanguage().toLowerCase();
        return browserLang.startsWith('ja') ? 'ja' : 'en';
    }
    return languageSetting;
}

// 言語設定に応じてローカライズ文言を取得
function getMessageWithLang(key) {
    const lang = localStorage.getItem('sideTimeTableLang') || (chrome.i18n && chrome.i18n.getUILanguage ? chrome.i18n.getUILanguage().slice(0,2) : 'ja');
    // manifest/_localesの仕様上、chrome.i18n.getMessageは自動で切り替わるが、
    // manifestのdefault_localeがjaならenでもen_USでもenが使われる
    // ここではkeyのみで取得（chrome.i18n.getMessageは自動切替）
    return chrome.i18n.getMessage(key) || '';
}

// HTML内をローカライズ（言語設定を反映）
async function localizeHtmlPageWithLang() {
    try {
        // ユーザーの言語設定を取得
        const userLanguageSetting = await getCurrentLanguageSetting();
        const targetLanguage = resolveLanguageCode(userLanguageSetting);
        
        console.log('言語設定:', userLanguageSetting, '→', targetLanguage);
        
        // 設定された言語でローカライズを実行
        await localizeWithLanguage(targetLanguage);
    } catch (error) {
        console.warn('言語設定によるローカライズに失敗:', error);
        // フォールバックとして標準のローカライズを実行
        localizeHtmlPage();
    }
}

// 指定された言語でローカライズを実行
async function localizeWithLanguage(targetLang) {
    const messageFiles = {
        'en': '/_locales/en/messages.json',
        'ja': '/_locales/ja/messages.json'
    };
    
    try {
        // 指定言語のメッセージファイルを取得
        const messagesUrl = chrome.runtime.getURL(messageFiles[targetLang] || messageFiles['en']);
        const response = await fetch(messagesUrl);
        const messages = await response.json();
        
        console.log('メッセージファイル読み込み:', targetLang, Object.keys(messages).length, '件');
        
        // HTML要素をローカライズ
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
        
        // placeholder属性のローカライズ
        document.querySelectorAll('[data-localize-placeholder]').forEach(element => {
            const tag = element.getAttribute('data-localize-placeholder');
            const msg = tag.replace(/__MSG_(\w+)__/g, (match, v1) => {
                return messages[v1]?.message || chrome.i18n.getMessage(v1) || v1;
            });
            if (msg !== tag) element.setAttribute('placeholder', msg);
        });
        
    } catch (error) {
        console.warn('メッセージファイルの読み込みに失敗:', error);
        // フォールバックとして標準のローカライズを実行
        localizeHtmlPage();
    }
}

// グローバル関数として公開（従来の形式を維持）
window.getCurrentLanguageSetting = getCurrentLanguageSetting;
window.resolveLanguageCode = resolveLanguageCode;
window.getMessageWithLang = getMessageWithLang;
window.localizeHtmlPageWithLang = localizeHtmlPageWithLang;
window.localizeWithLanguage = localizeWithLanguage;
