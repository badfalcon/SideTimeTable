/**
 * The one line shown for the memo while its panel is collapsed: the first
 * line that has any text, without the Markdown markers that only mean
 * something when rendered (heading #, list bullets, checkboxes, quotes).
 *
 * @param {string} text - The memo's content
 * @returns {string} '' when the memo is empty
 */
export function summarizeMemo(text) {
    const lines = String(text || '').split(/\r?\n/);
    for (const raw of lines) {
        const line = raw
            .trim()
            .replace(/^#{1,6}(?:\s+|$)/, '')
            .replace(/^>\s*/, '')
            .replace(/^(?:[-*+]|\d+[.)])(?:\s+|$)/, '')
            .replace(/^\[[ xX]\](?:\s+|$)/, '')
            .trim();
        if (line) {
            return line;
        }
    }
    return '';
}
