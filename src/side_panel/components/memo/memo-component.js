/**
 * MemoComponent - Persistent memo panel with Markdown preview at the bottom of the side panel
 */
import { Component } from '../base/component.js';
import { StorageHelper } from '../../../lib/storage-helper.js';
import { isDemoMode, getDemoMemoContent } from '../../../lib/demo-data.js';
import { loadSettings } from '../../../lib/settings-storage.js';
import { DEFAULT_SETTINGS, MEMO_FONT_SIZE_RANGE } from '../../../lib/constants.js';

const DEFAULT_HEIGHT = 150;
const MIN_HEIGHT = 80;
const MAX_HEIGHT_RATIO = 0.8;
const AUTO_EXPAND_THRESHOLD = 10;
const COLLAPSED_HEIGHT_FALLBACK = 34;
const SAVE_DEBOUNCE_DELAY = 300;
const ANIM_DURATION = 420;
const ICON_CLASS_DOWN = 'fas fa-chevron-down memo-toggle-icon';
const ICON_CLASS_UP = 'fas fa-chevron-up memo-toggle-icon';

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

export class MemoComponent extends Component {
    constructor(options = {}) {
        super({
            id: 'memoPanelWrapper',
            ...options
        });

        this.textarea = null;
        this._preview = null;
        this.toggleIcon = null;
        this._dragHandle = null;
        this._toggleBtn = null;
        this._memoBody = null;
        this._spacer = document.createElement('div');
        this._spacer.id = 'memoPanelSpacer';
        this._collapsedHeight = null; // cached to avoid reflow on every mousemove
        this._collapsedClipPath = null; // cached when valid DOM measurement available
        this._timeline = null; // cached reference to .side-time-table
        this._saveDebounceTimer = null;
        this._collapsed = false;
        this._panelHeight = DEFAULT_HEIGHT;
        this._markdownEnabled = false;

        // Tab trap: enabled on text input, disabled on Escape for accessibility
        this._tabTrapped = false;

        // Drag state
        this._dragStartY = 0;
        this._dragStartHeight = 0;
        this._expandedDuringDrag = false;
        this._onDragMove = null;
        this._onDragEnd = null;
    }

    createElement() {
        const wrapper = super.createElement();
        if (wrapper.children.length > 0) return wrapper;

        this._dragHandle = document.createElement('div');
        this._dragHandle.className = 'memo-drag-handle';

        this._toggleBtn = document.createElement('button');
        this._toggleBtn.className = 'memo-toggle-btn';
        this._toggleBtn.setAttribute('data-localize-title', '__MSG_memoSectionTitle__');

        const labelSpan = document.createElement('span');
        labelSpan.setAttribute('data-localize', '__MSG_memoSectionTitle__');
        labelSpan.textContent = this.getMessage('memoSectionTitle');

        this.toggleIcon = document.createElement('i');
        this.toggleIcon.className = ICON_CLASS_DOWN;

        this._toggleBtn.appendChild(labelSpan);
        this._toggleBtn.appendChild(this.toggleIcon);

        const body = document.createElement('div');
        body.className = 'memo-body';
        this._memoBody = body;

        this.textarea = document.createElement('textarea');
        this.textarea.id = 'memoTextarea';
        this.textarea.placeholder = this.getMessage('memoPlaceholder');
        this.textarea.setAttribute('data-localize-placeholder', '__MSG_memoPlaceholder__');

        this._preview = document.createElement('div');
        this._preview.id = 'memoPreview';
        this._preview.className = 'memo-hidden';

        body.appendChild(this.textarea);
        body.appendChild(this._preview);
        wrapper.appendChild(this._dragHandle);
        wrapper.appendChild(this._toggleBtn);
        wrapper.appendChild(body);

        // Apply default height immediately to avoid flash before async load
        this._applyHeight(false);

        // Fire-and-forget: textarea is shown by default, then _loadState swaps
        // to preview mode once settings are loaded (avoids blocking createElement)
        this._loadState();

        this.addEventListener(this._toggleBtn, 'click', () => this._toggleCollapse());
        this.addEventListener(this.textarea, 'input', () => {
            this._tabTrapped = true;
            this._onInput();
        });
        this.addEventListener(this.textarea, 'keydown', (e) => this._onKeyDown(e));
        this.addEventListener(this.textarea, 'blur', () => {
            this._tabTrapped = false;
            this._switchToPreview();
        });
        this.addEventListener(this._preview, 'click', (e) => {
            if (e.target.matches('input[type="checkbox"]')) {
                e.preventDefault();
                this._toggleCheckbox(e.target);
                return;
            }
            if (!e.target.closest('a')) this._switchToEdit();
        });
        this._setupDragHandle();

        return wrapper;
    }

    async _loadState() {
        try {
            // Load markdown setting
            const settings = await loadSettings();
            this._markdownEnabled = settings.memoMarkdown === true;
            this._applyMarkdownMode();
            this._applyFontSize(settings.memoFontSize);

            if (isDemoMode()) {
                if (this.textarea) {
                    this.textarea.value = await getDemoMemoContent();
                    if (this._markdownEnabled) {
                        this._renderMarkdown(this.textarea.value);
                    }
                }
                this._applyHeight(false);
                return;
            }
            const result = await StorageHelper.getLocal(['memoContent', 'memoCollapsed', 'memoHeight']);
            if (this.textarea && result.memoContent !== undefined) {
                this.textarea.value = result.memoContent;
                if (this._markdownEnabled) {
                    this._renderMarkdown(result.memoContent);
                }
            }
            if (result.memoHeight) {
                this._panelHeight = result.memoHeight;
            }
            this._collapsed = result.memoCollapsed === true;
            this._applyHeight(false);
        } catch (e) {
            // ignore
        }
    }

    _applyFontSize(size) {
        const px = (typeof size === 'number' && size >= MEMO_FONT_SIZE_RANGE.min && size <= MEMO_FONT_SIZE_RANGE.max)
            ? size : DEFAULT_SETTINGS.memoFontSize;
        const value = `${px}px`;
        if (this.textarea) this.textarea.style.fontSize = value;
        if (this._preview) this._preview.style.fontSize = value;
    }

    _applyMarkdownMode() {
        if (!this.textarea || !this._preview) return;
        if (this._markdownEnabled) {
            this._switchToPreview();
        } else {
            this._preview.classList.add('memo-hidden');
            this.textarea.classList.remove('memo-hidden');
        }
    }

    _getTimeline() {
        if (!this._timeline || !this._timeline.isConnected) {
            this._timeline = document.querySelector('.side-time-table');
        }
        return this._timeline;
    }

    _setTransitions(enabled) {
        const v = enabled ? '' : 'none';
        this.element.style.transition = v;
        this._memoBody.style.transition = v;
        this._spacer.style.transition = v;
    }

    _toggleCollapse() {
        this._collapsed = !this._collapsed;
        this.element.classList.add('memo-animating');

        // When expanding, lock timeline scroll position during animation
        if (!this._collapsed) {
            const timeline = this._getTimeline();
            if (timeline) {
                const savedScrollTop = timeline.scrollTop;
                const ro = new ResizeObserver(() => {
                    timeline.scrollTop = savedScrollTop;
                });
                ro.observe(timeline);
                setTimeout(() => ro.disconnect(), ANIM_DURATION);
            }
        }

        this._applyHeight(true);
        setTimeout(() => {
            this.element.classList.remove('memo-animating');
        }, ANIM_DURATION);
        StorageHelper.setLocal({ memoCollapsed: this._collapsed }).catch(() => {});
    }

    _applyHeight(animate) {
        if (!this.element || !this.toggleIcon) return;

        if (!animate) {
            this._setTransitions(false);
            void this.element.offsetHeight;
        }

        if (this._collapsed) {
            const clipPath = this._getCollapsedClipPath(); // measure BEFORE state changes
            this.element.style.height = this._getCollapsedHeight() + 'px';
            this.element.classList.add('memo-collapsed');
            this.element.style.clipPath = clipPath;
            this.toggleIcon.className = ICON_CLASS_UP;
            if (this._dragHandle) this._dragHandle.style.display = 'none';
            this._spacer.style.height = '0px';
        } else {
            this.element.style.height = this._panelHeight + 'px';
            this.element.classList.remove('memo-collapsed');
            this.element.style.clipPath = '';
            this.toggleIcon.className = ICON_CLASS_DOWN;
            if (this._dragHandle) this._dragHandle.style.display = '';
            this._spacer.style.height = this._panelHeight + 'px';
        }

        if (!animate) {
            void this.element.offsetHeight;
            this._setTransitions(true);
        }
    }

    _getCollapsedClipPath() {
        if (this._collapsedClipPath) return this._collapsedClipPath;

        const RIGHT_MARGIN = 20;
        const COLLAPSED_PADDING = 32; // 2 * 16px horizontal padding in collapsed state
        const labelSpan = this._toggleBtn ? this._toggleBtn.querySelector('span') : null;
        const labelWidth = labelSpan ? labelSpan.offsetWidth : 0;
        const iconWidth = this.toggleIcon ? this.toggleIcon.offsetWidth : 0;
        // No gap: width:auto flex container with space-between packs items directly
        const btnWidth = Math.max(labelWidth + iconWidth + COLLAPSED_PADDING, 40);
        const result = `inset(0 ${RIGHT_MARGIN}px 0 calc(100% - ${btnWidth + RIGHT_MARGIN}px) round 8px 8px 0 0)`;
        // Cache only when we have a real DOM measurement (avoid caching zero-width pre-render)
        if (labelWidth > 0 || iconWidth > 0) {
            this._collapsedClipPath = result;
        }
        return result;
    }

    _getCollapsedHeight() {
        if (this._collapsedHeight === null) {
            this._collapsedHeight = this._toggleBtn
                ? this._toggleBtn.offsetHeight
                : COLLAPSED_HEIGHT_FALLBACK;
        }
        return this._collapsedHeight;
    }

    _setupDragHandle() {
        this._onDragMove = (e) => {
            const deltaY = e.clientY - this._dragStartY;
            const newHeight = Math.max(MIN_HEIGHT, Math.min(
                this._dragStartHeight - deltaY,
                window.innerHeight * MAX_HEIGHT_RATIO
            ));
            this._panelHeight = Math.round(newHeight);
            this.element.style.height = this._panelHeight + 'px';
            this._spacer.style.height = this._panelHeight + 'px';

            // Auto-expand if dragging up while collapsed (fire storage write only once per drag)
            if (this._collapsed && this._panelHeight > this._getCollapsedHeight() + AUTO_EXPAND_THRESHOLD) {
                this._collapsed = false;
                if (this.toggleIcon) this.toggleIcon.className = ICON_CLASS_DOWN;
                if (this._dragHandle) this._dragHandle.style.display = '';
                if (!this._expandedDuringDrag) {
                    this._expandedDuringDrag = true;
                    StorageHelper.setLocal({ memoCollapsed: false }).catch(() => {});
                }
            }
        };

        this._onDragEnd = () => {
            document.removeEventListener('mousemove', this._onDragMove);
            document.removeEventListener('mouseup', this._onDragEnd);
            this._expandedDuringDrag = false;
            StorageHelper.setLocal({ memoHeight: this._panelHeight }).catch(() => {});
        };

        this.addEventListener(this._dragHandle, 'mousedown', (e) => {
            e.preventDefault();
            this._dragStartY = e.clientY;
            this._dragStartHeight = this.element.offsetHeight;
            this._expandedDuringDrag = false;
            document.addEventListener('mousemove', this._onDragMove);
            document.addEventListener('mouseup', this._onDragEnd);
        });
    }

    _switchToPreview() {
        if (!this.textarea || !this._preview || !this._markdownEnabled) return;
        this._renderMarkdown(this.textarea.value);
        this.textarea.classList.add('memo-hidden');
        this._preview.classList.remove('memo-hidden');
    }

    _switchToEdit() {
        if (!this.textarea || !this._preview || !this._markdownEnabled) return;
        this._preview.classList.add('memo-hidden');
        this.textarea.classList.remove('memo-hidden');
        this._tabTrapped = true;
        this.textarea.focus();
        this.textarea.selectionStart = this.textarea.selectionEnd = this.textarea.value.length;
    }

    async _renderMarkdown(text) {
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
        // (matches _toggleCheckbox's Markdown-only source parsing, ignoring raw HTML checkboxes)
        let checkboxIndex = 0;
        this._preview.querySelectorAll('li > input[type="checkbox"]').forEach(cb => {
            cb.dataset.cbIndex = checkboxIndex++;
            cb.removeAttribute('disabled');
        });
    }

    _toggleCheckbox(checkbox) {
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
                // _renderMarkdown is async but renderer is already cached at this point
                // (preview was rendered before the checkbox became clickable)
                this._renderMarkdown(newText);
                return;
            }
            currentIndex++;
        }
    }

    // --- Markdown editing helpers ---

    _onKeyDown(e) {
        // Skip all helpers during IME composition (e.g. Japanese input)
        if (e.isComposing) return;

        // Escape releases Tab trap for accessibility
        if (e.key === 'Escape') {
            this._tabTrapped = false;
            return;
        }

        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && this._markdownEnabled) {
            if (this._handleListContinuation(e)) return;
        }
        if (e.key === 'Tab' && this._tabTrapped && this._markdownEnabled) {
            this._handleTabIndent(e);
            return;
        }
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && this._markdownEnabled) {
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
        if (this._markdownEnabled) {
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

        // Empty content before cursor → remove the list prefix (exit list)
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

    _onInput() {
        if (this._saveDebounceTimer) {
            clearTimeout(this._saveDebounceTimer);
        }
        this._saveDebounceTimer = setTimeout(() => {
            const text = this.textarea ? this.textarea.value : '';
            StorageHelper.setLocal({ memoContent: text }).catch(() => {});
            this._saveDebounceTimer = null;
        }, SAVE_DEBOUNCE_DELAY);
    }

    appendTo(parent) {
        if (parent && typeof parent.appendChild === 'function') {
            parent.appendChild(this._spacer);
        }
        return super.appendTo(parent);
    }

    destroy() {
        if (this._saveDebounceTimer) {
            clearTimeout(this._saveDebounceTimer);
            this._saveDebounceTimer = null;
        }
        document.removeEventListener('mousemove', this._onDragMove);
        document.removeEventListener('mouseup', this._onDragEnd);
        this._spacer.remove();
        this._spacer = null;
        super.destroy();
    }
}
