/**
 * TimelineCalendarFilter - A fixed button in the timeline top-right
 * that opens a popover for quick Google Calendar visibility toggling.
 */
import { Component } from '../base/component.js';
import { sendMessage } from '../../../lib/chrome-messaging.js';
import { loadSelectedCalendars, saveSelectedCalendars } from '../../../lib/settings-storage.js';

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
        this.hasFetched = false;
        this.isAuthenticated = false;

        // DOM references
        this.button = null;
        this.dropdown = null;

        // Bound handlers
        this._boundOnScroll = null;
        this._boundOnClickOutside = null;
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
        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            this._toggle();
        });

        // Dropdown popover
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'timeline-calendar-filter-dropdown';

        wrapper.appendChild(this.button);
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

        // Sync position on scroll
        this._boundOnScroll = () => {
            requestAnimationFrame(() => this._syncPosition());
        };
        scrollContainer.addEventListener('scroll', this._boundOnScroll);

        // Click-outside handler
        this._boundOnClickOutside = (e) => {
            if (this.isOpen && this.element && !this.element.contains(e.target)) {
                this._close();
            }
        };
        document.addEventListener('mousedown', this._boundOnClickOutside);
    }

    /**
     * Check Google auth status and hide button if not authenticated
     * @private
     */
    async _checkAuthAndVisibility() {
        try {
            const response = await sendMessage({ action: 'checkGoogleAuth' });
            this.isAuthenticated = !!(response && response.isAuthenticated);
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
        this.dropdown.classList.add('open');

        if (!this.hasFetched) {
            await this._fetchCalendars();
        } else {
            // Refresh selected state each time
            this.selectedIds = await loadSelectedCalendars();
            this._renderCalendarList();
        }
    }

    /**
     * Close the dropdown
     * @private
     */
    _close() {
        this.isOpen = false;
        this.dropdown.classList.remove('open');
    }

    /**
     * Fetch calendar list from the background service worker
     * @private
     */
    async _fetchCalendars() {
        this.dropdown.innerHTML = '';
        const loading = document.createElement('div');
        loading.className = 'timeline-calendar-filter-loading';
        loading.textContent = this.getMessage('calendarFilterLoading');
        this.dropdown.appendChild(loading);

        try {
            const requestId = `filter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const [response, selectedIds] = await Promise.all([
                sendMessage({ action: 'getCalendarList', requestId }),
                loadSelectedCalendars()
            ]);

            if (response.error) {
                throw new Error(response.error);
            }

            if (response.calendars) {
                this.calendars = response.calendars;
                this.selectedIds = selectedIds;

                // Auto-select primary calendar if nothing selected
                if (this.selectedIds.length === 0) {
                    const primary = this.calendars.find(c => c.primary);
                    if (primary) {
                        this.selectedIds = [primary.id];
                        await saveSelectedCalendars(this.selectedIds);
                    }
                }

                this.hasFetched = true;
                this._renderCalendarList();
            }
        } catch {
            this.dropdown.innerHTML = '';
            const errorEl = document.createElement('div');
            errorEl.className = 'timeline-calendar-filter-loading';
            errorEl.textContent = this.getMessage('calendarFilterError');
            this.dropdown.appendChild(errorEl);
        }
    }

    /**
     * Render the calendar list with checkboxes
     * @private
     */
    _renderCalendarList() {
        this.dropdown.innerHTML = '';

        if (!this.calendars || this.calendars.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'timeline-calendar-filter-loading';
            empty.textContent = this.getMessage('noCalendarsAvailable');
            this.dropdown.appendChild(empty);
            return;
        }

        // Sort: primary first, then alphabetical
        const sorted = [...this.calendars].sort((a, b) => {
            if (a.primary && !b.primary) return -1;
            if (!a.primary && b.primary) return 1;
            return a.summary.localeCompare(b.summary);
        });

        sorted.forEach(calendar => {
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
            this.dropdown.appendChild(item);
        });
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

        if (this.onCalendarChange) {
            this.onCalendarChange();
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
        if (this._boundOnScroll && this.scrollContainer) {
            this.scrollContainer.removeEventListener('scroll', this._boundOnScroll);
            this._boundOnScroll = null;
        }
        if (this._boundOnClickOutside) {
            document.removeEventListener('mousedown', this._boundOnClickOutside);
            this._boundOnClickOutside = null;
        }
        this.scrollContainer = null;
        this.button = null;
        this.dropdown = null;
        this.calendars = [];
        this.selectedIds = [];
        super.destroy();
    }
}
