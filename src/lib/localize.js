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

    Array.from(document.getElementsByTagName('html')).forEach(element => {
        replace_i18n(element, element.innerHTML);
    });
}

// Export for webpack
export { localizeHtmlPage };

// Make available globally for direct script inclusion
window.localizeHtmlPage = localizeHtmlPage;