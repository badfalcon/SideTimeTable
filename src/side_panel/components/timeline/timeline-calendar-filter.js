/**
 * TimelineCalendarFilter - A fixed button in the timeline top-right
 * that opens a popover for quick Google Calendar visibility toggling.
 * Supports calendar groups for batch toggling.
 */
import { Component } from '../base/component.js';
import { sendMessage } from '../../../lib/chrome-messaging.js';
import { loadSelectedCalendars, saveSelectedCalendars, loadCalendarGroups } from '../../../lib/settings-storage.js';

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
        this.button.type = 'button';
        this.button.innerHTML = '<i class="fa-solid fa-sliders"></i>';
        this.addEventListener(this.button, 'click', (e) => {
            e.stopPropagation();
            this._toggle();
        });

        // Dropdown popover
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'timeline-calendar-filter-dropdown';

        // Transparent backdrop to block clicks on events behind the dropdown
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'timeline-calendar-filter-backdrop';
        this.addEventListener(this.backdrop, 'mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this._close();
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
        this.isOpen = true;
        this.backdrop.classList.add('open');
        this.dropdown.classList.add('open');

        if (!this.hasFetched) {
            await this._fetchCalendars();
        } else {
            // Refresh selected state and groups each time
            const [selectedIds, groups] = await Promise.all([
                loadSelectedCalendars(),
                loadCalendarGroups()
            ]);
            this.selectedIds = selectedIds;
            this.calendarGroups = Array.isArray(groups) ? groups : [];
            // Ensure primary calendar stays in selection
            const primary = this.calendars.find(c => c.primary);
            if (primary && !this.selectedIds.includes(primary.id)) {
                this.selectedIds.unshift(primary.id);
                await saveSelectedCalendars(this.selectedIds);
            }
            this._renderDropdownContent();
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
        loading.textContent = this.getMessage('calendarFilterLoading');
        this.dropdown.appendChild(loading);

        try {
            const requestId = `filter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const [response, selectedIds, groups] = await Promise.all([
                sendMessage({ action: 'getCalendarList', requestId }),
                loadSelectedCalendars(),
                loadCalendarGroups()
            ]);

            if (response.error || !response.calendars) {
                this.dropdown.innerHTML = '';
                const errorEl = document.createElement('div');
                errorEl.className = 'timeline-calendar-filter-status';
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
                await saveSelectedCalendars(this.selectedIds);
            }

            this.hasFetched = true;
            this._renderDropdownContent();
        } catch {
            this.dropdown.innerHTML = '';
            const errorEl = document.createElement('div');
            errorEl.className = 'timeline-calendar-filter-status';
            errorEl.textContent = this.getMessage('calendarFilterError');
            this.dropdown.appendChild(errorEl);
        }
    }

    /**
     * Render the full dropdown content (toolbar + calendar list)
     * @private
     */
    _renderDropdownContent() {
        this.dropdown.innerHTML = '';

        // Toolbar: search + refresh
        const toolbar = document.createElement('div');
        toolbar.className = 'timeline-calendar-filter-toolbar';

        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.className = 'timeline-calendar-filter-search';
        this.searchInput.placeholder = this.getMessage('calendarFilterSearchPlaceholder');
        this.searchInput.value = this.searchTerm;
        this.addEventListener(this.searchInput, 'input', () => {
            this.searchTerm = this.searchInput.value;
            this._renderCalendarList();
        });

        this.refreshBtn = document.createElement('button');
        this.refreshBtn.type = 'button';
        this.refreshBtn.className = 'timeline-calendar-filter-refresh-btn';
        this.refreshBtn.title = this.getMessage('calendarFilterRefreshTooltip');
        this.refreshBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i>';
        this.addEventListener(this.refreshBtn, 'click', () => {
            this._refreshCalendars();
        });

        toolbar.appendChild(this.searchInput);
        toolbar.appendChild(this.refreshBtn);
        this.dropdown.appendChild(toolbar);

        // Calendar list container
        this.calendarList = document.createElement('div');
        this.calendarList.className = 'timeline-calendar-filter-list';
        this.dropdown.appendChild(this.calendarList);

        this._renderCalendarList();
    }

    /**
     * Render the calendar list with group support
     * @private
     */
    _renderCalendarList() {
        if (!this.calendarList) return;
        this.calendarList.innerHTML = '';

        if (!this.calendars || this.calendars.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'timeline-calendar-filter-status';
            empty.textContent = this.getMessage('noCalendarsAvailable');
            this.calendarList.appendChild(empty);
            return;
        }

        // Filter by search term
        const term = this.searchTerm.toLowerCase().trim();
        const filtered = term
            ? this.calendars.filter(c => c.summary.toLowerCase().includes(term))
            : this.calendars;

        if (filtered.length === 0) {
            const noResult = document.createElement('div');
            noResult.className = 'timeline-calendar-filter-status';
            noResult.textContent = this.getMessage('noCalendarsAvailable');
            this.calendarList.appendChild(noResult);
            return;
        }

        const filteredIds = new Set(filtered.map(c => c.id));
        const calendarMap = new Map(this.calendars.map(c => [c.id, c]));

        // If groups exist, render grouped
        if (this.calendarGroups.length > 0) {
            for (const group of this.calendarGroups) {
                const groupCalendars = group.calendarIds
                    .map(id => calendarMap.get(id))
                    .filter(cal => cal && filteredIds.has(cal.id));

                if (term && groupCalendars.length === 0) continue;

                this._renderGroupSection(group, groupCalendars);
            }

            // Ungrouped
            const groupedIds = new Set();
            for (const group of this.calendarGroups) {
                for (const id of group.calendarIds) {
                    groupedIds.add(id);
                }
            }

            const ungrouped = filtered
                .filter(c => !groupedIds.has(c.id))
                .sort((a, b) => {
                    if (a.primary && !b.primary) return -1;
                    if (!a.primary && b.primary) return 1;
                    return a.summary.localeCompare(b.summary);
                });

            if (ungrouped.length > 0) {
                this._renderUngroupedSection(ungrouped);
            }
        } else {
            // No groups - flat list (backward compatible)
            const sorted = [...filtered].sort((a, b) => {
                if (a.primary && !b.primary) return -1;
                if (!a.primary && b.primary) return 1;
                return a.summary.localeCompare(b.summary);
            });

            sorted.forEach(calendar => {
                this._renderCalendarItem(this.calendarList, calendar);
            });
        }
    }

    /**
     * Render a group section in the filter dropdown
     * @private
     */
    _renderGroupSection(group, calendars) {
        // Group header
        const header = document.createElement('div');
        header.className = 'timeline-calendar-filter-group-header';
        header.dataset.groupId = group.id;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';

        // Determine check state
        const selectedCount = calendars.filter(cal => this.selectedIds.includes(cal.id)).length;
        if (selectedCount === 0) {
            checkbox.checked = false;
        } else if (selectedCount === calendars.length) {
            checkbox.checked = true;
        } else {
            checkbox.checked = false;
            checkbox.indeterminate = true;
        }

        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            this._handleGroupToggle(group, calendars, checkbox.checked);
        });

        const nameSpan = document.createElement('span');
        nameSpan.className = 'group-name';
        nameSpan.textContent = group.name;

        const collapseIcon = document.createElement('i');
        collapseIcon.className = 'fa-solid fa-chevron-down group-collapse-icon';

        header.appendChild(checkbox);
        header.appendChild(nameSpan);
        header.appendChild(collapseIcon);

        header.addEventListener('click', (e) => {
            if (e.target === checkbox) return;
            const body = header.nextElementSibling;
            if (body) body.classList.toggle('collapsed');
            collapseIcon.classList.toggle('collapsed');
        });

        this.calendarList.appendChild(header);

        // Group body
        const body = document.createElement('div');
        body.className = 'timeline-calendar-filter-group-body';

        const sorted = [...calendars].sort((a, b) => {
            if (a.primary && !b.primary) return -1;
            if (!a.primary && b.primary) return 1;
            return a.summary.localeCompare(b.summary);
        });

        sorted.forEach(calendar => {
            this._renderCalendarItem(body, calendar);
        });

        this.calendarList.appendChild(body);
    }

    /**
     * Render ungrouped section
     * @private
     */
    _renderUngroupedSection(calendars) {
        const header = document.createElement('div');
        header.className = 'timeline-calendar-filter-group-header';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'group-name';
        nameSpan.textContent = this.getMessage('ungrouped') || 'Ungrouped';

        const collapseIcon = document.createElement('i');
        collapseIcon.className = 'fa-solid fa-chevron-down group-collapse-icon';

        header.appendChild(nameSpan);
        header.appendChild(collapseIcon);

        header.addEventListener('click', () => {
            const body = header.nextElementSibling;
            if (body) body.classList.toggle('collapsed');
            collapseIcon.classList.toggle('collapsed');
        });

        this.calendarList.appendChild(header);

        const body = document.createElement('div');
        body.className = 'timeline-calendar-filter-group-body';

        calendars.forEach(calendar => {
            this._renderCalendarItem(body, calendar);
        });

        this.calendarList.appendChild(body);
    }

    /**
     * Render a single calendar item
     * @private
     */
    _renderCalendarItem(container, calendar) {
        const isSelected = this.selectedIds.includes(calendar.id);
        const item = document.createElement('label');
        item.className = 'timeline-calendar-filter-item';

        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'timeline-calendar-filter-checkbox';
        checkbox.checked = isSelected || calendar.primary;
        if (calendar.primary) {
            checkbox.disabled = true;
        }
        checkbox.addEventListener('change', () => {
            this._handleToggle(calendar.id, checkbox.checked);
        });

        // Color indicator
        const color = document.createElement('span');
        color.className = 'timeline-calendar-filter-color';
        color.style.backgroundColor = calendar.backgroundColor || '#ccc';

        // Name
        const name = document.createElement('span');
        name.className = 'timeline-calendar-filter-name';
        name.textContent = calendar.summary;
        if (calendar.primary) {
            name.classList.add('timeline-calendar-filter-primary');
        }

        item.appendChild(checkbox);
        item.appendChild(color);
        item.appendChild(name);
        container.appendChild(item);
    }

    /**
     * Handle group toggle in the filter dropdown
     * @private
     */
    async _handleGroupToggle(group, calendars, checked) {
        const primaryId = this.calendars.find(c => c.primary)?.id;

        if (checked) {
            for (const cal of calendars) {
                if (!this.selectedIds.includes(cal.id)) {
                    this.selectedIds.push(cal.id);
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

            const groupCalIds = new Set(calendars.map(c => c.id));
            this.selectedIds = this.selectedIds.filter(id => {
                if (id === primaryId) return true;
                if (!groupCalIds.has(id)) return true;
                if (otherGroupIds.has(id)) return true;
                return false;
            });
        }

        await saveSelectedCalendars(this.selectedIds);
        this._renderCalendarList();

        if (this.onCalendarChange) {
            this.onCalendarChange();
        }
    }

    /**
     * Refresh calendars from the API
     * @private
     */
    async _refreshCalendars() {
        if (this.refreshBtn) {
            this.refreshBtn.querySelector('i').classList.add('fa-spin');
        }
        this.hasFetched = false;
        try {
            await this._fetchCalendars();
        } finally {
            if (this.refreshBtn) {
                this.refreshBtn.querySelector('i').classList.remove('fa-spin');
            }
        }
    }

    /**
     * Handle calendar toggle
     * @private
     */
    async _handleToggle(calendarId, checked) {
        if (checked) {
            if (!this.selectedIds.includes(calendarId)) {
                this.selectedIds.push(calendarId);
            }
        } else {
            this.selectedIds = this.selectedIds.filter(id => id !== calendarId);
        }

        await saveSelectedCalendars(this.selectedIds);

        // Update group header checkbox states
        this._updateGroupCheckboxStates();

        if (this.onCalendarChange) {
            this.onCalendarChange();
        }
    }

    /**
     * Update group header checkbox states after individual toggle
     * @private
     */
    _updateGroupCheckboxStates() {
        if (!this.calendarList || this.calendarGroups.length === 0) return;

        const calendarMap = new Map(this.calendars.map(c => [c.id, c]));

        for (const group of this.calendarGroups) {
            const header = this.calendarList.querySelector(`.timeline-calendar-filter-group-header[data-group-id="${group.id}"]`);
            if (!header) continue;

            const checkbox = header.querySelector('input[type="checkbox"]');
            if (!checkbox) continue;

            const validCalendars = group.calendarIds.filter(id => calendarMap.has(id));
            const selectedCount = validCalendars.filter(id => this.selectedIds.includes(id)).length;

            checkbox.indeterminate = false;
            if (selectedCount === 0) {
                checkbox.checked = false;
            } else if (selectedCount === validCalendars.length) {
                checkbox.checked = true;
            } else {
                checkbox.checked = false;
                checkbox.indeterminate = true;
            }
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
        super.destroy();
    }
}
