/**
 * MemoEditor - Markdown editing logic for the memo panel textarea
 *
 * Encapsulates keyboard handling (list continuation, tab indent, auto-pair,
 * bold/italic shortcuts), markdown rendering, checkbox toggling, and
 * debounced save.
 */
import { StorageHelper } from '../../../lib/storage-helper.js';

const SAVE_DEBOUNCE_DELAY = 300;

// Lazy-loaded markdown renderer (only loaded when markdown is enabled)
let _renderer = null;

async function getMarkdownRenderer() {
    if (!_renderer) {
        const [{ Marked }, DOMPurify] = await Promise.all([
            import(/* webpackChunkName: "markdown" */ 'marked'),
            import(/* webpackChunkName: "markdown" */ 'dompurify')
        ]);
        const purify = DOMPurify.default || DOMPurify;
        const marked = new Marked({ breaks: true, gfm: true });
        _renderer = (text) => purify.sanitize(marked.parse(text), {
            ADD_TAGS: ['input'],
            ADD_ATTR: ['type', 'checked']
        });
    }
    return _renderer;
}

export class MemoEditor {
    /**
     * @param {HTMLTextAreaElement} textarea - The memo textarea element
     * @param {HTMLElement} preview - The markdown preview container element
     * @param {object} options
     * @param {function} options.onSave - Called after debounced save completes
     */
    constructor(textarea, preview, options = {}) {
        this.textarea = textarea;
        this._preview = preview;
        this._onSave = options.onSave || null;
        this._saveDebounceTimer = null;
        this.markdownEnabled = false;

        // Tab trap: enabled on text input, disabled on Escape for accessibility
        this._tabTrapped = false;
    }

    // --- Preview / Edit mode switching ---

    switchToPreview() {
        if (!this.textarea || !this._preview || !this.markdownEnabled) return;
        this.renderMarkdown(this.textarea.value);
        this.textarea.classList.add('memo-hidden');
        this._preview.classList.remove('memo-hidden');
    }

    switchToEdit() {
        if (!this.textarea || !this._preview || !this.markdownEnabled) return;
        this._preview.classList.add('memo-hidden');
        this.textarea.classList.remove('memo-hidden');
        this._tabTrapped = true;
        this.textarea.focus();
        this.textarea.selectionStart = this.textarea.selectionEnd = this.textarea.value.length;
    }

    // --- Markdown rendering ---

    async renderMarkdown(text) {
        if (!this._preview) return;
        if (!text || !text.trim()) {
            this._preview.textContent = '';
            const placeholder = document.createElement('span');
            placeholder.className = 'memo-preview-placeholder';
            placeholder.textContent = this.textarea.placeholder;
            this._preview.appendChild(placeholder);
            return;
        }
        const render = await getMarkdownRenderer();
        this._preview.innerHTML = render(text);
        // Open links in new tab
        this._preview.querySelectorAll('a').forEach(a => {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
        });
        // Strip non-checkbox inputs that may pass through DOMPurify
        this._preview.querySelectorAll('input:not([type="checkbox"])').forEach(el => el.remove());
        // Enable checkbox toggling: only index checkboxes inside list items
        // (matches toggleCheckbox's Markdown-only source parsing, ignoring raw HTML checkboxes)
        let checkboxIndex = 0;
        this._preview.querySelectorAll('li > input[type="checkbox"]').forEach(cb => {
            cb.dataset.cbIndex = checkboxIndex++;
            cb.removeAttribute('disabled');
        });
    }

    toggleCheckbox(checkbox) {
        const cbIndex = parseInt(checkbox.dataset.cbIndex, 10);
        if (isNaN(cbIndex) || !this.textarea) return;

        const text = this.textarea.value;
        const lines = text.split('\n');
        let currentIndex = 0;
        let inCodeBlock = false;
        let fenceChar = null;

        for (let i = 0; i < lines.length; i++) {
            const fenceMatch = lines[i].match(/^\s*(`{3,}|~{3,})(.*)?$/);
            if (fenceMatch) {
                const char = fenceMatch[1][0];
                if (inCodeBlock) {
                    // Closing fence: must use same char and have no info string
                    if (char === fenceChar && (!fenceMatch[2] || !fenceMatch[2].trim())) {
                        inCodeBlock = false;
                        fenceChar = null;
                    }
                } else {
                    inCodeBlock = true;
                    fenceChar = char;
                }
                continue;
            }
            if (inCodeBlock) continue;

            const m = lines[i].match(/^(\s*- \[)([ xX])(\].*)$/);
            if (!m) continue;

            if (currentIndex === cbIndex) {
                const isChecked = m[2] !== ' ';
                lines[i] = m[1] + (isChecked ? ' ' : 'x') + m[3];
                const newText = lines.join('\n');
                // Direct assignment is intentional: textarea is hidden (display:none)
                // during preview mode, so execCommand would be a no-op.
                // Undo history loss is acceptable since the user is not in edit mode.
                this.textarea.value = newText;
                StorageHelper.setLocal({ memoContent: newText }).catch(() => {});
                // renderMarkdown is async but renderer is already cached at this point
                // (preview was rendered before the checkbox became clickable)
                this.renderMarkdown(newText);
                return;
            }
            currentIndex++;
        }
    }

    // --- Keyboard handling ---

    onKeyDown(e) {
        // Skip all helpers during IME composition (e.g. Japanese input)
        if (e.isComposing) return;

        // Escape releases Tab trap for accessibility
        if (e.key === 'Escape') {
            this._tabTrapped = false;
            return;
        }

        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && this.markdownEnabled) {
            if (this._handleListContinuation(e)) return;
        }
        if (e.key === 'Tab' && this._tabTrapped && this.markdownEnabled) {
            this._handleTabIndent(e);
            return;
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && this.markdownEnabled) {
            if (e.key === 'b' || e.key === 'B') {
                e.preventDefault();
                this._wrapSelection('**', '**');
                return;
            }
            if (e.key === 'i' || e.key === 'I') {
                e.preventDefault();
                this._wrapSelection('*', '*');
                return;
            }
        }
        if (this.markdownEnabled) {
            // Skip over closing bracket if it matches the next character
            const closingBrackets = new Set([')', ']', '}']);
            if (closingBrackets.has(e.key)) {
                const ta = this.textarea;
                if (ta.selectionStart === ta.selectionEnd && ta.value[ta.selectionStart] === e.key) {
                    e.preventDefault();
                    ta.setSelectionRange(ta.selectionStart + 1, ta.selectionStart + 1);
                    return;
                }
            }
            const pair = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" }[e.key];
            if (pair) {
                this._handleAutoPair(e, pair);
            }
        }
    }

    onInput() {
        if (this._saveDebounceTimer) {
            clearTimeout(this._saveDebounceTimer);
        }
        this._saveDebounceTimer = setTimeout(() => {
            const text = this.textarea ? this.textarea.value : '';
            StorageHelper.setLocal({ memoContent: text }).catch(() => {});
            this._saveDebounceTimer = null;
            if (this._onSave) this._onSave(text);
        }, SAVE_DEBOUNCE_DELAY);
    }

    // --- Internal helpers ---

    _getFullCurrentLine() {
        const ta = this.textarea;
        const text = ta.value;
        const lineStart = text.lastIndexOf('\n', ta.selectionStart - 1) + 1;
        let lineEnd = text.indexOf('\n', ta.selectionStart);
        if (lineEnd === -1) lineEnd = text.length;
        return text.substring(lineStart, lineEnd);
    }

    // Uses execCommand for undo/redo integration (no modern alternative for textareas)
    _replaceRange(start, end, replacement) {
        const ta = this.textarea;
        ta.setSelectionRange(start, end);
        document.execCommand('insertText', false, replacement);
    }

    _handleListContinuation(e) {
        const ta = this.textarea;
        if (ta.selectionStart !== ta.selectionEnd) return false;

        const line = this._getFullCurrentLine();
        // Match: checkbox list, unordered list, ordered list (with optional leading whitespace)
        const checkboxMatch = line.match(/^(\s*)- \[([ xX])\]\s?(.*)$/);
        const ulMatch = line.match(/^(\s*)([*+-])\s(.*)$/);
        const olMatch = line.match(/^(\s*)(\d+)\.\s(.*)$/);

        let indent, prefix;
        if (checkboxMatch) {
            indent = checkboxMatch[1];
            prefix = `${indent}- [ ] `;
        } else if (olMatch) {
            indent = olMatch[1];
            const nextNum = parseInt(olMatch[2], 10) + 1;
            prefix = `${indent}${nextNum}. `;
        } else if (ulMatch) {
            indent = ulMatch[1];
            prefix = `${indent}${ulMatch[2]} `;
        } else {
            return false;
        }

        e.preventDefault();

        // Use text from line start to cursor for empty check (ignores text after cursor)
        const text = ta.value;
        const lineStart = text.lastIndexOf('\n', ta.selectionStart - 1) + 1;
        const lineBeforeCursor = text.substring(lineStart, ta.selectionStart);
        // Extract content after the list marker prefix in the portion before cursor
        const prefixPattern = /^\s*(?:- \[[ xX]\]\s|[*+-]\s|\d+\.\s)/;
        const contentBeforeCursor = lineBeforeCursor.replace(prefixPattern, '');

        // Empty content before cursor -> remove the list prefix (exit list)
        if (!contentBeforeCursor.trim()) {
            const lineEnd = text.indexOf('\n', ta.selectionStart);
            const fullLineEnd = lineEnd === -1 ? text.length : lineEnd;
            this._replaceRange(lineStart, fullLineEnd, '');
            return true;
        }

        // Insert newline + list prefix (text after cursor is carried to the new line naturally)
        document.execCommand('insertText', false, '\n' + prefix);
        return true;
    }

    _handleTabIndent(e) {
        e.preventDefault();
        const ta = this.textarea;
        const text = ta.value;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;

        // Find the lines covered by the selection
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        // If selection ends right at a newline, don't include the next line
        const effectiveEnd = (end > start && text[end - 1] === '\n') ? end - 1 : end;
        const lineEnd = text.indexOf('\n', effectiveEnd);
        const blockEnd = lineEnd === -1 ? text.length : lineEnd;
        const block = text.substring(lineStart, blockEnd);
        const lines = block.split('\n');

        let newBlock;
        let startDelta = 0;
        let totalDelta = 0;

        if (e.shiftKey) {
            // Outdent: remove up to 2 leading spaces
            newBlock = lines.map((l, i) => {
                const removed = l.match(/^( {1,2})/);
                const count = removed ? removed[1].length : 0;
                if (i === 0) startDelta = -count;
                totalDelta -= count;
                return count > 0 ? l.substring(count) : l;
            }).join('\n');
        } else {
            // Indent: add 2 spaces
            newBlock = lines.map((l, i) => {
                if (i === 0) startDelta = 2;
                totalDelta += 2;
                return '  ' + l;
            }).join('\n');
        }

        this._replaceRange(lineStart, blockEnd, newBlock);
        // Restore selection across the modified lines
        const newStart = Math.max(lineStart, start + startDelta);
        const newEnd = Math.max(newStart, end + totalDelta);
        ta.setSelectionRange(newStart, newEnd);
    }

    _wrapSelection(before, after) {
        const ta = this.textarea;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const text = ta.value;
        const selected = text.substring(start, end);

        // If already wrapped, unwrap
        if (start >= before.length && text.substring(start - before.length, start) === before
            && text.substring(end, end + after.length) === after) {
            this._replaceRange(start - before.length, end + after.length, selected);
            ta.setSelectionRange(start - before.length, end - before.length);
            return;
        }

        const replacement = before + selected + after;
        this._replaceRange(start, end, replacement);
        if (selected.length > 0) {
            ta.setSelectionRange(start + before.length, end + before.length);
        } else {
            ta.setSelectionRange(start + before.length, start + before.length);
        }
    }

    _handleAutoPair(e, closing) {
        const ta = this.textarea;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;

        // If there's a selection, wrap it
        if (start !== end) {
            e.preventDefault();
            const selected = ta.value.substring(start, end);
            this._replaceRange(start, end, e.key + selected + closing);
            ta.setSelectionRange(start + 1, end + 1);
            return;
        }

        // If next char is the same closing char, skip over it
        if (e.key === closing && ta.value[start] === closing) {
            e.preventDefault();
            ta.setSelectionRange(start + 1, start + 1);
            return;
        }

        // Auto-pair only when next char is whitespace, end of text, or a closing bracket
        const nextChar = ta.value[start] || '';
        if (!nextChar || /[\s)\]}>,.;:]/.test(nextChar)) {
            e.preventDefault();
            document.execCommand('insertText', false, e.key + closing);
            ta.setSelectionRange(start + 1, start + 1);
        }
    }

    /**
     * Cancel any pending debounced save timer.
     * Should be called when the parent component is destroyed.
     */
    destroy() {
        if (this._saveDebounceTimer) {
            clearTimeout(this._saveDebounceTimer);
            this._saveDebounceTimer = null;
        }
    }
}
