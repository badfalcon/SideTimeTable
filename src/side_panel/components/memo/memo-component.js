/**
 * MemoComponent - Simple persistent memo panel at the bottom of the side panel
 */
import { Component } from '../base/component.js';
import { StorageHelper } from '../../../lib/storage-helper.js';

const DEFAULT_HEIGHT = 150;
const MIN_HEIGHT = 80;
const MAX_HEIGHT_RATIO = 0.8;
const AUTO_EXPAND_THRESHOLD = 10;
const COLLAPSED_HEIGHT_FALLBACK = 34;
const SAVE_DEBOUNCE_DELAY = 300;

export class MemoComponent extends Component {
    constructor(options = {}) {
        super({
            id: 'memoPanelWrapper',
            ...options
        });

        this.textarea = null;
        this.toggleIcon = null;
        this._dragHandle = null;
        this._toggleBtn = null;
        this._collapsedHeight = null; // cached to avoid reflow on every mousemove
        this._saveDebounceTimer = null;
        this._collapsed = false;
        this._panelHeight = DEFAULT_HEIGHT;

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
        this.toggleIcon.className = 'fas fa-chevron-down memo-toggle-icon';

        this._toggleBtn.appendChild(labelSpan);
        this._toggleBtn.appendChild(this.toggleIcon);

        const body = document.createElement('div');
        body.className = 'memo-body';

        this.textarea = document.createElement('textarea');
        this.textarea.id = 'memoTextarea';
        this.textarea.placeholder = this.getMessage('memoPlaceholder');
        this.textarea.setAttribute('data-localize-placeholder', '__MSG_memoPlaceholder__');

        body.appendChild(this.textarea);
        wrapper.appendChild(this._dragHandle);
        wrapper.appendChild(this._toggleBtn);
        wrapper.appendChild(body);

        // Apply default height immediately to avoid flash before async load
        this._applyHeight(false);

        this._loadState();

        this.addEventListener(this._toggleBtn, 'click', () => this._toggleCollapse());
        this.addEventListener(this.textarea, 'input', () => this._onInput());
        this._setupDragHandle();

        return wrapper;
    }

    async _loadState() {
        try {
            const result = await StorageHelper.getLocal(['memoContent', 'memoCollapsed', 'memoHeight']);
            if (this.textarea && result.memoContent !== undefined) {
                this.textarea.value = result.memoContent;
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

    _toggleCollapse() {
        this._collapsed = !this._collapsed;
        this._applyHeight(true);
        StorageHelper.setLocal({ memoCollapsed: this._collapsed }).catch(() => {});
    }

    _applyHeight(animate) {
        if (!this.element || !this.toggleIcon) return;

        if (!animate) {
            this.element.style.transition = 'none';
            void this.element.offsetHeight;
        }

        if (this._collapsed) {
            this.element.style.height = this._getCollapsedHeight() + 'px';
            this.toggleIcon.className = 'fas fa-chevron-up memo-toggle-icon';
            if (this._dragHandle) this._dragHandle.style.display = 'none';
        } else {
            this.element.style.height = this._panelHeight + 'px';
            this.toggleIcon.className = 'fas fa-chevron-down memo-toggle-icon';
            if (this._dragHandle) this._dragHandle.style.display = '';
        }

        if (!animate) {
            void this.element.offsetHeight;
            this.element.style.transition = '';
        }
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

            // Auto-expand if dragging up while collapsed (fire storage write only once per drag)
            if (this._collapsed && this._panelHeight > this._getCollapsedHeight() + AUTO_EXPAND_THRESHOLD) {
                this._collapsed = false;
                if (this.toggleIcon) this.toggleIcon.className = 'fas fa-chevron-down memo-toggle-icon';
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

    destroy() {
        if (this._saveDebounceTimer) {
            clearTimeout(this._saveDebounceTimer);
            this._saveDebounceTimer = null;
        }
        // Always clean up document-level drag listeners (handles mid-drag destroy)
        document.removeEventListener('mousemove', this._onDragMove);
        document.removeEventListener('mouseup', this._onDragEnd);
        super.destroy();
    }
}
