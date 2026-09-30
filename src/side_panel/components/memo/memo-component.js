/**
 * MemoComponent - Persistent memo panel with Markdown preview at the bottom of the side panel
 */
import { Component } from '../base/component.js';
import { StorageHelper } from '../../../lib/storage-helper.js';
import { isDemoMode, getDemoMemoContent } from '../../../lib/demo-data.js';
import { loadSettings } from '../../../lib/settings-storage.js';
import { DEFAULT_SETTINGS, MEMO_FONT_SIZE_RANGE } from '../../../lib/constants.js';
import { MemoEditor } from './memo-editor.js';
import { summarizeMemo } from './memo-summary.js';

const DEFAULT_HEIGHT = 150;
const MIN_HEIGHT = 80;
const MAX_HEIGHT_RATIO = 0.8;
const AUTO_EXPAND_THRESHOLD = 10;
const COLLAPSED_HEIGHT_FALLBACK = 32;
const ANIM_DURATION = 420;
const ICON_CLASS_DOWN = 'fas fa-chevron-down memo-toggle-icon';
const ICON_CLASS_UP = 'fas fa-chevron-up memo-toggle-icon';

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
        this._previewLine = null; // the memo's first line, shown while collapsed
        this._timeline = null; // cached reference to .side-time-table
        this._collapsed = false;
        this._panelHeight = DEFAULT_HEIGHT;
        this._editor = null;

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
        this._toggleBtn.type = 'button';
        this._toggleBtn.className = 'memo-toggle-btn';
        this._toggleBtn.setAttribute('data-localize-title', '__MSG_memoSectionTitle__');
        this._toggleBtn.setAttribute('aria-expanded', 'true');

        const labelSpan = document.createElement('span');
        labelSpan.className = 'memo-toggle-label';
        labelSpan.setAttribute('data-localize', '__MSG_memoSectionTitle__');
        labelSpan.textContent = this.getMessage('memoSectionTitle');

        // Collapsed, the bar still says what the memo is about
        this._previewLine = document.createElement('span');
        this._previewLine.className = 'memo-toggle-preview';

        this.toggleIcon = document.createElement('i');
        this.toggleIcon.className = ICON_CLASS_DOWN;
        this.toggleIcon.setAttribute('aria-hidden', 'true');

        this._toggleBtn.appendChild(labelSpan);
        this._toggleBtn.appendChild(this._previewLine);
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

        // Create the editor delegate for markdown editing logic
        this._editor = new MemoEditor(this.textarea, this._preview);

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
            this._editor._tabTrapped = true;
            this._editor.onInput();
        });
        this.addEventListener(this.textarea, 'keydown', (e) => this._editor.onKeyDown(e));
        this.addEventListener(this.textarea, 'blur', () => {
            this._editor._tabTrapped = false;
            this._editor.switchToPreview();
        });
        this.addEventListener(this._preview, 'click', (e) => {
            if (e.target.matches('input[type="checkbox"]')) {
                e.preventDefault();
                this._editor.toggleCheckbox(e.target);
                return;
            }
            if (!e.target.closest('a')) this._editor.switchToEdit();
        });
        this._setupDragHandle();

        return wrapper;
    }

    async _loadState() {
        try {
            // Load markdown setting
            const settings = await loadSettings();
            this._editor.markdownEnabled = settings.memoMarkdown === true;
            this._applyMarkdownMode();
            this._applyFontSize(settings.memoFontSize);

            if (isDemoMode()) {
                if (this.textarea) {
                    this.textarea.value = await getDemoMemoContent();
                    if (this._editor.markdownEnabled) {
                        this._editor.renderMarkdown(this.textarea.value);
                    }
                }
                this._applyHeight(false);
                return;
            }
            const result = await StorageHelper.getLocal(['memoContent', 'memoCollapsed', 'memoHeight']);
            if (this.textarea && result.memoContent !== undefined) {
                this.textarea.value = result.memoContent;
                if (this._editor.markdownEnabled) {
                    this._editor.renderMarkdown(result.memoContent);
                }
            }
            if (result.memoHeight) {
                this._panelHeight = result.memoHeight;
            }
            this._collapsed = result.memoCollapsed === true;
            this._applyHeight(false);
        } catch (_e) {
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
        if (this._editor.markdownEnabled) {
            this._editor.switchToPreview();
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

        // Collapsed, the panel is a full-width bar (its header) that keeps
        // its own room below the timeline, so it never covers an event
        if (this._collapsed) {
            this._updatePreviewLine();
            this.element.classList.add('memo-collapsed');
            if (this._dragHandle) this._dragHandle.style.display = 'none';
            const barHeight = this._getCollapsedHeight();
            this.element.style.height = barHeight + 'px';
            this.toggleIcon.className = ICON_CLASS_UP;
            this._spacer.style.height = barHeight + 'px';
        } else {
            this.element.style.height = this._panelHeight + 'px';
            this.element.classList.remove('memo-collapsed');
            this.toggleIcon.className = ICON_CLASS_DOWN;
            if (this._dragHandle) this._dragHandle.style.display = '';
            this._spacer.style.height = this._panelHeight + 'px';
        }
        this._toggleBtn?.setAttribute('aria-expanded', String(!this._collapsed));

        if (!animate) {
            void this.element.offsetHeight;
            this._setTransitions(true);
        }
    }

    /**
     * Put the memo's first line in the collapsed bar.
     * @private
     */
    _updatePreviewLine() {
        if (this._previewLine && this.textarea) {
            this._previewLine.textContent = summarizeMemo(this.textarea.value);
        }
    }

    _getCollapsedHeight() {
        if (this._collapsedHeight === null) {
            const measured = this._toggleBtn ? this._toggleBtn.offsetHeight : 0;
            // Not laid out yet (before the panel is in the page): use the
            // fallback now and measure again next time
            if (!measured) return COLLAPSED_HEIGHT_FALLBACK;
            this._collapsedHeight = measured;
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

    appendTo(parent) {
        if (parent && typeof parent.appendChild === 'function') {
            parent.appendChild(this._spacer);
        }
        return super.appendTo(parent);
    }

    destroy() {
        if (this._editor) {
            this._editor.destroy();
        }
        document.removeEventListener('mousemove', this._onDragMove);
        document.removeEventListener('mouseup', this._onDragEnd);
        this._spacer.remove();
        this._spacer = null;
        super.destroy();
    }
}
