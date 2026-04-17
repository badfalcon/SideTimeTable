/**
 * TimelineCalendarFilter - A fixed button in the timeline top-right
 * that opens a popover for quick Google Calendar visibility toggling.
 * Supports calendar groups for batch toggling.
 */
import { Component } from '../base/component.js';
import { sendMessage } from '../../../lib/chrome-messaging.js';
import { loadSelectedCalendars, saveSelectedCalendars, loadCalendarGroups } from '../../../lib/settings-storage.js';
import { isDemoMode, getDemoCalendarGroups } from '../../../lib/demo-data.js';
import { CalendarFilterRenderer } from './calendar-filter-renderer.js';

export class TimelineCalendarFilter extends Component {
    constructor(options = {}) {
        super({
            id: 'timelineCalendarFilter',
            className: 'timeline-calendar-filter',
            ...options
        });

        this.onCalendarChange = options.onCalendarChange || null;
        this.isOpen = false;
        this.calendars = [];
        this.selectedIds = [];
        this.calendarGroups = [];
        this.hasFetched = false;
        this.isAuthenticated = false;
        this.searchTerm = '';

        // DOM references
        this.button = null;
        this.dropdown = null;
        this.searchInput = null;
        this.calendarList = null;
        this.refreshBtn = null;

        // Bound handlers
        this._boundOnScroll = null;
        this._rafId = null;
        this._isFetching = false;

        // Renderer delegate
        this.renderer = new CalendarFilterRenderer({
            onSearchInput: (value) => {
                this.searchTerm = value;
                this.renderer.renderCalendarList(
                    this.calendars, this.selectedIds, this.calendarGroups, this.searchTerm
                );
            },
            onRefreshClick: () => this._refreshCalendars(),
            onCalendarToggle: (calendarId, checked) => this._handleToggle(calendarId, checked),
            onGroupToggle: (group, calendars, checked) => this._handleGroupToggle(group, calendars, checked),
        });
    }

    createElement() {
        const wrapper = super.createElement();
        if (wrapper.children.length > 0) {
            return wrapper;
        }

        // Filter button
        this.button = document.createElement('button');
        this.button.className = 'timeline-calendar-filter-btn';
        this.button.title = this.getMessage('calendarFilterTooltip');
        this.button.setAttribute('aria-label', this.getMessage('calendarFilterTooltip'));
        this.button.setAttribute('aria-expanded', 'false');
        this.button.type = 'button';
        this.button.innerHTML = '<i class="fa-solid fa-sliders"></i>';
        this.addEventListener(this.button, 'click', (e) => {
            e.stopPropagation();
            this._toggle();
        });

        // Dropdown popover
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'timeline-calendar-filter-dropdown';
        this.dropdown.id = 'timeline-calendar-filter-dropdown';
        this.dropdown.setAttribute('role', 'region');
        this.dropdown.setAttribute('aria-label', this.getMessage('calendarFilterTooltip'));
        this.button.setAttribute('aria-controls', 'timeline-calendar-filter-dropdown');

        // Transparent backdrop to block clicks on events behind the dropdown
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'timeline-calendar-filter-backdrop';
        this.addEventListener(this.backdrop, 'mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this._close();
            this.button.focus();
        });

        // Escape key closes the dropdown
        this.addEventListener(this.dropdown, 'keydown', (e) => {
            if (e.key === 'Escape') {
                this._close();
                this.button.focus();
            }
        });

        wrapper.appendChild(this.button);
        wrapper.appendChild(this.backdrop);
        wrapper.appendChild(this.dropdown);

        // Check auth and hide if not connected
        this._checkAuthAndVisibility();

        return wrapper;
    }

    /**
     * Attach to the timeline scroll container and sync position on scroll
     * @param {HTMLElement} scrollContainer - The .side-time-table element
     */
    attachTo(scrollContainer) {
        if (!this.element) {
            this.createElement();
        }

        this.scrollContainer = scrollContainer;
        scrollContainer.appendChild(this.element);

        // Initial position
        this._syncPosition();

        // Sync position on scroll (deduplicate rAF calls)
        this._boundOnScroll = () => {
            if (this._rafId) window.cancelAnimationFrame(this._rafId);
            this._rafId = window.requestAnimationFrame(() => {
                this._rafId = null;
                this._syncPosition();
            });
        };
        scrollContainer.addEventListener('scroll', this._boundOnScroll);

        // Close dropdown when side panel loses focus (e.g., user clicks on main page)
        this._boundOnWindowBlur = () => {
            if (this.isOpen) this._close();
        };
        window.addEventListener('blur', this._boundOnWindowBlur);
    }

    /**
     * Check Google auth status and hide button if not authenticated
     * @private
     */
    async _checkAuthAndVisibility() {
        if (isDemoMode()) {
            this.isAuthenticated = true;
            if (this.element) {
                this.element.style.display = '';
            }
            return;
        }

        try {
            const response = await sendMessage({ action: 'checkGoogleAuth' });
            this.isAuthenticated = !!(response && response.authenticated);
        } catch {
            this.isAuthenticated = false;
        }

        if (this.element) {
            this.element.style.display = this.isAuthenticated ? '' : 'none';
        }
    }

    /**
     * Keep button fixed to the visible top-right of the scroll container
     * @private
     */
    _syncPosition() {
        if (!this.element || !this.scrollContainer) return;
        this.element.style.top = `${this.scrollContainer.scrollTop + 8}px`;
    }

    /**
     * Toggle the dropdown open/closed
     * @private
     */
    _toggle() {
        if (this.isOpen) {
            this._close();
        } else {
            this._open();
        }
    }

    /**
     * Open the dropdown
     * @private
     */
    async _open() {
        if (this._isFetching) return;

        this.isOpen = true;
        this.backdrop.classList.add('open');
        this.dropdown.classList.add('open');
        this.button.setAttribute('aria-expanded', 'true');

        if (!this.hasFetched) {
            this._isFetching = true;
            try {
                await this._fetchCalendars();
            } finally {
                this._isFetching = false;
            }
            if (!this.isOpen) return;
            this._focusDropdown();
        } else {
            // Refresh selected state and groups each time
            this._isFetching = true;
            try {
                const [selectedIds, groups] = await Promise.all([
                    loadSelectedCalendars(),
                    isDemoMode() ? getDemoCalendarGroups() : loadCalendarGroups()
                ]);
                if (!this.isOpen) return;
                this.selectedIds = selectedIds;
                this.calendarGroups = Array.isArray(groups) ? groups : [];
                // Ensure primary calendar stays in selection
                const primary = this.calendars.find(c => c.primary);
                if (primary && !this.selectedIds.includes(primary.id)) {
                    this.selectedIds.unshift(primary.id);
                    try {
                        await saveSelectedCalendars(this.selectedIds);
                    } catch {
                        // Non-critical: primary will be re-added on next open
                    }
                }
                if (!this.isOpen) return;
                this._renderDropdownContent();
                this._focusDropdown();
            } catch {
                if (!this.isOpen) return;
                this._renderDropdownContent();
            } finally {
                this._isFetching = false;
            }
        }
    }

    /**
     * Focus the search input when dropdown opens
     * @private
     */
    _focusDropdown() {
        if (this.searchInput) {
            this.searchInput.focus();
        }
    }

    /**
     * Close the dropdown
     * @private
     */
    _close() {
        this.isOpen = false;
        this.backdrop.classList.remove('open');
        this.dropdown.classList.remove('open');
        this.button.setAttribute('aria-expanded', 'false');
        this.searchTerm = '';
    }

    /**
     * Fetch calendar list from the background service worker
     * @private
     */
    async _fetchCalendars() {
        this.dropdown.innerHTML = '';
        const loading = document.createElement('div');
        loading.className = 'timeline-calendar-filter-status';
        loading.setAttribute('role', 'status');
        loading.textContent = this.getMessage('calendarFilterLoading');
        this.dropdown.appendChild(loading);

        try {
            const requestId = `filter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const [response, selectedIds, groups] = await Promise.all([
                sendMessage({ action: 'getCalendarList', requestId }),
                loadSelectedCalendars(),
                isDemoMode() ? getDemoCalendarGroups() : loadCalendarGroups()
            ]);

            // Bail out if dropdown was closed while fetching
            if (!this.isOpen) return;

            if (response.error || !response.calendars) {
                this.dropdown.innerHTML = '';
                this.refreshBtn = null;
                this.searchInput = null;
                this.calendarList = null;
                const errorEl = document.createElement('div');
                errorEl.className = 'timeline-calendar-filter-status';
                errorEl.setAttribute('role', 'status');
                errorEl.textContent = this.getMessage('calendarFilterError');
                this.dropdown.appendChild(errorEl);
                return;
            }

            this.calendars = response.calendars;
            this.selectedIds = selectedIds;
            this.calendarGroups = Array.isArray(groups) ? groups : [];

            // Ensure primary calendar is always included in selection
            const primary = this.calendars.find(c => c.primary);
            if (primary && !this.selectedIds.includes(primary.id)) {
                this.selectedIds.unshift(primary.id);
                try {
                    await saveSelectedCalendars(this.selectedIds);
                } catch {
                    // Non-critical: primary will be re-added on next open
                }
            }

            if (!this.isOpen) return;
            this.hasFetched = true;
            this._renderDropdownContent();
        } catch {
            this.dropdown.innerHTML = '';
            this.refreshBtn = null;
            this.searchInput = null;
            this.calendarList = null;
            const errorEl = document.createElement('div');
            errorEl.className = 'timeline-calendar-filter-status';
            errorEl.setAttribute('role', 'status');
            errorEl.textContent = this.getMessage('calendarFilterError');
            this.dropdown.appendChild(errorEl);
        }
    }

    /**
     * Delegate rendering to CalendarFilterRenderer, then sync DOM refs back.
     * @private
     */
    _renderDropdownContent() {
        const refs = this.renderer.renderDropdownContent(
            this.dropdown, this.searchTerm, this.calendars, this.selectedIds, this.calendarGroups
        );
        this.searchInput = refs.searchInput;
        this.refreshBtn = refs.refreshBtn;
        this.calendarList = refs.calendarList;
    }

    /**
     * Handle group toggle in the filter dropdown
     * @private
     */
    async _handleGroupToggle(group, _calendars, checked) {
        if (group.calendarIds.length === 0) return;

        const previousIds = [...this.selectedIds];
        const primaryId = this.calendars.find(c => c.primary)?.id;
        // Use full group membership (not the filtered view) for toggling
        const fullGroupCalIds = new Set(group.calendarIds);

        if (checked) {
            const validCalIds = new Set(this.calendars.map(c => c.id));
            for (const calId of group.calendarIds) {
                if (validCalIds.has(calId) && !this.selectedIds.includes(calId)) {
                    this.selectedIds.push(calId);
                }
            }
        } else {
            // Find calendar IDs that are in other groups and still selected
            const otherGroupIds = new Set();
            for (const g of this.calendarGroups) {
                if (g.id === group.id) continue;
                for (const id of g.calendarIds) {
                    if (this.selectedIds.includes(id)) {
                        otherGroupIds.add(id);
                    }
                }
            }

            this.selectedIds = this.selectedIds.filter(id => {
                if (id === primaryId) return true;
                if (!fullGroupCalIds.has(id)) return true;
                if (otherGroupIds.has(id)) return true;
                return false;
            });
        }

        try {
            await saveSelectedCalendars(this.selectedIds);
            this.renderer.renderCalendarList(
                this.calendars, this.selectedIds, this.calendarGroups, this.searchTerm
            );
            if (this.onCalendarChange) {
                const addedIds = this.selectedIds.filter(id => !previousIds.includes(id));
                const removedIds = previousIds.filter(id => !this.selectedIds.includes(id));
                this.onCalendarChange({ addedIds, removedIds });
            }
        } catch {
            this.selectedIds = previousIds;
            this.renderer.renderCalendarList(
                this.calendars, this.selectedIds, this.calendarGroups, this.searchTerm
            );
        }
    }

    /**
     * Refresh calendars from the API
     * @private
     */
    async _refreshCalendars() {
        if (this._isFetching) return;
        const spinIcon = this.refreshBtn?.querySelector('i');
        if (spinIcon) {
            spinIcon.classList.add('fa-spin');
        }
        this.hasFetched = false;
        this._isFetching = true;
        try {
            await this._fetchCalendars();
        } finally {
            this._isFetching = false;
            if (spinIcon) {
                spinIcon.classList.remove('fa-spin');
            }
        }
    }

    /**
     * Handle calendar toggle
     * @private
     */
    async _handleToggle(calendarId, checked) {
        const previousIds = [...this.selectedIds];

        if (checked) {
            if (!this.selectedIds.includes(calendarId)) {
                this.selectedIds.push(calendarId);
            }
        } else {
            this.selectedIds = this.selectedIds.filter(id => id !== calendarId);
        }

        try {
            await saveSelectedCalendars(this.selectedIds);
            // Update group header checkbox states
            this.renderer.updateGroupCheckboxStates(
                this.calendarList, this.calendars, this.selectedIds, this.calendarGroups
            );
            if (this.onCalendarChange) {
                this.onCalendarChange({
                    addedIds: checked ? [calendarId] : [],
                    removedIds: checked ? [] : [calendarId]
                });
            }
        } catch {
            this.selectedIds = previousIds;
            this.renderer.renderCalendarList(
                this.calendars, this.selectedIds, this.calendarGroups, this.searchTerm
            );
        }
    }

    /**
     * Refresh auth visibility (e.g., after sign-in)
     */
    async refreshVisibility() {
        await this._checkAuthAndVisibility();
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this._rafId) {
            window.cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
        if (this._boundOnScroll && this.scrollContainer) {
            this.scrollContainer.removeEventListener('scroll', this._boundOnScroll);
            this._boundOnScroll = null;
        }
        if (this._boundOnWindowBlur) {
            window.removeEventListener('blur', this._boundOnWindowBlur);
            this._boundOnWindowBlur = null;
        }
        this.scrollContainer = null;
        this.button = null;
        this.backdrop = null;
        this.dropdown = null;
        this.searchInput = null;
        this.calendarList = null;
        this.refreshBtn = null;
        this.calendars = [];
        this.selectedIds = [];
        this.calendarGroups = [];
        this.renderer = null;
        super.destroy();
    }
}
