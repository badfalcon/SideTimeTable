/**
 * SideTimeTable - 多言語化ユーティリティ
 * 
 * このファイルはChrome拡張機能の多言語化（i18n）機能を提供します。
 */

/**
 * ローカライズ文言を取得して要素に設定
 * @param {HTMLElement} element - ローカライズするHTML要素
 * @param {string} tag - ローカライズ対象のテキスト
 */
function replace_i18n(element: HTMLElement, tag: string): void {
    const msg = tag.replace(/__MSG_(\w+)__/g, (match, v1) => chrome.i18n.getMessage(v1) || '');
    if (msg !== tag) element.innerHTML = msg;
}

/**
 * HTML内をローカライズする
 * data-localize属性を持つ要素と全体のHTMLをローカライズします
 */
export function localizeHtmlPage(): void {
    // data-localize属性を持つ要素をローカライズ
    document.querySelectorAll('[data-localize]').forEach(element => {
        const htmlElement = element as HTMLElement;
        const localizeText = htmlElement.getAttribute('data-localize');
        if (localizeText) {
            replace_i18n(htmlElement, localizeText);
        }
    });

    // HTML全体をローカライズ
    Array.from(document.getElementsByTagName('html')).forEach(element => {
        replace_i18n(element, element.innerHTML);
    });
}

// グローバルオブジェクトとしても利用可能にする
declare global {
    interface Window {
        localizeHtmlPage: typeof localizeHtmlPage;
    }
}

window.localizeHtmlPage = localizeHtmlPage;