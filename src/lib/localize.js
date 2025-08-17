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

    Array.from(document.getElementsByTagName('html')).forEach(element => {
        replace_i18n(element, element.innerHTML);
    });
}