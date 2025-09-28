/**
 * CalendarManagementCard - The calendar management card component
 */
import { CardComponent } from '../base/card-component.js';
import { loadSelectedCalendars, saveSelectedCalendars, logError } from '../../../lib/utils.js';

export class CalendarManagementCard extends CardComponent {
    constructor() {
        super({
            id: 'calendar-management-card',
            title: 'Calendar Management',
            titleLocalize: '__MSG_calendarSelection__',
            subtitle: 'Select Google Calendars to display and configure their colors.',
            subtitleLocalize: '__MSG_calendarSelectionDescription__',
            icon: 'fas fa-calendar-alt',
            iconColor: 'text-success',
            hidden: true
        });

        this.availableCalendars = {};
        this.selectedCalendarIds = [];
        this.hasAutoFetched = false;
        this.allCalendars = [];

        // The UI element references
        this.refreshBtn = null;
        this.loadingIndicator = null;
        this.calendarList = null;
        this.noCalendarsMsg = null;
        this.searchInput = null;
        this.clearSearchBtn = null;
    }

    createElement() {
        const card = super.createElement();

        // The control buttons
        const controlsDiv = this._createControlsSection();
        this.addContent(controlsDiv);

        // The search field
        const searchDiv = this._createSearchSection();
        this.addContent(searchDiv);

        // The calendar list container
        const listContainer = this._createListContainer();
        this.addContent(listContainer);

        this._setupEventListeners();

        return card;
    }

    /**
     * Create the control section
     * @private
     */
    _createControlsSection() {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'd-flex align-items-center mb-3';

        // The refresh button
        this.refreshBtn = document.createElement('button');
        this.refreshBtn.id = 'refresh-calendars-btn';
        this.refreshBtn.className = 'btn btn-outline-primary btn-sm';
        this.refreshBtn.innerHTML = `
            <i class="fas fa-refresh me-1"></i>
            <span data-localize="__MSG_refreshCalendars__">Refresh</span>
        `;

        // The loading indicator
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.id = 'calendar-loading-indicator';
        this.loadingIndicator.className = 'ms-2';
        this.loadingIndicator.style.display = 'none';
        this.loadingIndicator.innerHTML = `
            <div class="spinner-border spinner-border-sm text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        `;

        controlsDiv.appendChild(this.refreshBtn);
        controlsDiv.appendChild(this.loadingIndicator);

        return controlsDiv;
    }

    /**
     * Create the search section
     * @private
     */
    _createSearchSection() {
        const searchDiv = document.createElement('div');
        searchDiv.className = 'mb-3';

        const inputGroup = document.createElement('div');
        inputGroup.className = 'input-group';

        // The search icon
        const iconSpan = document.createElement('span');
        iconSpan.className = 'input-group-text';
        iconSpan.innerHTML = '<i class="fas fa-search text-muted"></i>';

        // The search input field
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.id = 'calendar-search';
        this.searchInput.className = 'form-control';
        this.searchInput.placeholder = 'Search calendars...';
        this.searchInput.setAttribute('data-localize-placeholder', '__MSG_searchCalendars__');

        // The clear button
        this.clearSearchBtn = document.createElement('button');
        this.clearSearchBtn.id = 'clear-search-btn';
        this.clearSearchBtn.className = 'btn btn-outline-secondary';
        this.clearSearchBtn.type = 'button';
        this.clearSearchBtn.style.display = 'none';
        this.clearSearchBtn.innerHTML = '<i class="fas fa-times"></i>';

        inputGroup.appendChild(iconSpan);
        inputGroup.appendChild(this.searchInput);
        inputGroup.appendChild(this.clearSearchBtn);
        searchDiv.appendChild(inputGroup);

        return searchDiv;
    }

    /**
     * Create list container
     * @private
     */
    _createListContainer() {
        const container = document.createElement('div');

        // The calendar list
        this.calendarList = document.createElement('div');
        this.calendarList.id = 'calendar-list';
        this.calendarList.className = 'list-group';

        // The not found message
        this.noCalendarsMsg = document.createElement('div');
        this.noCalendarsMsg.id = 'no-calendars-msg';
        this.noCalendarsMsg.className = 'text-muted';
        this.noCalendarsMsg.style.display = 'none';
        this.noCalendarsMsg.setAttribute('data-localize', '__MSG_noCalendarsFound__');
        this.noCalendarsMsg.textContent = 'No calendars found.';

        container.appendChild(this.calendarList);
        container.appendChild(this.noCalendarsMsg);

        return container;
    }

    /**
     * Setup event listeners
     * @private
     */
    _setupEventListeners() {
        // The refresh button
        this.refreshBtn?.addEventListener('click', () => this.refreshCalendars());

        // The search functionality
        this.searchInput?.addEventListener('input', (e) => this._handleSearch(e.target.value));
        this.searchInput?.addEventListener('keyup', (e) => {
            if (e.key === 'Escape') {
                this._clearSearch();
            }
        });

        this.clearSearchBtn?.addEventListener('click', () => this._clearSearch());

        // Handle the calendar checkbox using event delegation
        this.calendarList?.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                this._handleCalendarToggle(e);
            }
        });
    }

    /**
     * Load data
     */
    async loadData() {
        try {
            this.selectedCalendarIds = this._validateSelectedIds(await loadSelectedCalendars());
            this.render();
        } catch (error) {
            logError('Calendar data loading', error);
            this._showError('Failed to load calendar data');
        }
    }

    /**
     * Show card
     */
    show() {
        this.setVisible(true);

        // Auto-fetch the calendars on first display
        if (!this.hasAutoFetched && (!this.allCalendars || this.allCalendars.length === 0)) {
            this.hasAutoFetched = true;
            this.refreshCalendars();
        }
    }

    /**
     * Hide card
     */
    hide() {
        this.setVisible(false);
    }

    /**
     * Refresh calendar list
     */
    async refreshCalendars() {
        this._setLoading(true);

        try {
            const response = await new Promise((resolve) => {
                const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
                chrome.runtime.sendMessage({action: 'getCalendarList', requestId}, resolve);
            });

            if (response.error) {
                const detail = response.errorType ? `${response.error} (${response.errorType})` : response.error;
                const rid = response.requestId ? ` [Request ID: ${response.requestId}]` : '';
                throw new Error(detail + rid);
            }

            if (response.calendars) {
                this.allCalendars = response.calendars;

                // Auto-select the primary calendar only (if not selected)
                if (this.selectedCalendarIds.length === 0) {
                    const primaryCalendar = response.calendars.find(cal => cal.primary);
                    if (primaryCalendar) {
                        this.selectedCalendarIds = [primaryCalendar.id];
                    }
                }

                // Add the primary calendar if not included in selection
                const primaryCalendar = response.calendars.find(cal => cal.primary);
                if (primaryCalendar && !this.selectedCalendarIds.includes(primaryCalendar.id)) {
                    this.selectedCalendarIds.unshift(primaryCalendar.id);
                }

                await saveSelectedCalendars(this.selectedCalendarIds);
                this.render();
            }
        } catch (error) {
            logError('Calendar list update', error);
            this._showError(`Failed to update calendars: ${error.message || 'Unknown error'}`);
        } finally {
            this._setLoading(false);
        }
    }

    /**
     * Render calendar list
     */
    render() {
        if (!this.allCalendars || this.allCalendars.length === 0) {
            this._showEmptyState();
            return;
        }

        // Apply the search filter
        const searchTerm = this.searchInput?.value.toLowerCase().trim() || '';
        const filteredCalendars = searchTerm
            ? this.allCalendars.filter(calendar =>
                calendar.summary.toLowerCase().includes(searchTerm))
            : this.allCalendars;

        // Sort the calendars (primary first)
        const sortedCalendars = [...filteredCalendars].sort((a, b) => {
            if (a.primary && !b.primary) return -1;
            if (!a.primary && b.primary) return 1;
            return a.summary.localeCompare(b.summary, 'ja');
        });

        if (sortedCalendars.length === 0 && searchTerm) {
            this._showNoSearchResults();
            return;
        }

        this._hideEmptyState();
        this.calendarList.innerHTML = '';

        sortedCalendars.forEach(calendar => {
            const isSelected = this.selectedCalendarIds.includes(calendar.id);
            const item = this._createCalendarItem(calendar, isSelected);
            this.calendarList.appendChild(item);
        });

        this._updateSearchUI(searchTerm);
    }

    /**
     * Create calendar item
     * @private
     */
    _createCalendarItem(calendar, isSelected) {
        const item = document.createElement('div');
        item.className = 'list-group-item d-flex align-items-center py-2';
        item.dataset.calendarId = calendar.id;

        // The checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-check-input me-3';
        checkbox.checked = isSelected;

        if (calendar.primary) {
            checkbox.disabled = true;
            checkbox.checked = true;
        }

        // The calendar information
        const info = document.createElement('div');
        info.className = 'flex-grow-1';

        const name = document.createElement('div');
        name.className = 'fw-bold';
        name.textContent = calendar.summary;
        if (calendar.primary) {
            name.classList.add('text-primary');
        }

        info.appendChild(name);

        // The color indicator
        const colorIndicator = document.createElement('div');
        colorIndicator.className = 'me-2';
        colorIndicator.style.cssText = `
            width: 12px;
            height: 12px;
            background-color: ${calendar.backgroundColor || '#ccc'};
            border-radius: 50%;
            border: 1px solid #ddd;
        `;

        item.appendChild(checkbox);
        item.appendChild(info);
        item.appendChild(colorIndicator);

        return item;
    }

    /**
     * Handle search
     * @private
     */
    _handleSearch(searchTerm) {
        this.render();
    }

    /**
     * Clear search
     * @private
     */
    _clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
            this.render();
        }
    }

    /**
     * Toggle calendar selection
     * @private
     */
    async _handleCalendarToggle(event) {
        const calendarId = event.target.closest('[data-calendar-id]')?.dataset.calendarId;
        if (!calendarId) return;

        const isChecked = event.target.checked;

        if (isChecked) {
            if (!this.selectedCalendarIds.includes(calendarId)) {
                this.selectedCalendarIds.push(calendarId);
            }
        } else {
            this.selectedCalendarIds = this.selectedCalendarIds.filter(id => id !== calendarId);
        }

        try {
            await saveSelectedCalendars(this.selectedCalendarIds);
        } catch (error) {
            logError('Calendar selection save', error);
            this._showError('Failed to save settings');
        }
    }

    /**
     * Set loading state
     * @private
     */
    _setLoading(loading) {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = loading ? 'block' : 'none';
        }
        if (this.refreshBtn) {
            this.refreshBtn.disabled = loading;
        }
    }

    /**
     * Show empty state
     * @private
     */
    _showEmptyState() {
        this.calendarList.innerHTML = '';
        this.noCalendarsMsg.style.display = 'block';
    }

    /**
     * Show no search results
     * @private
     */
    _showNoSearchResults() {
        this.calendarList.innerHTML = '<div class="text-muted text-center p-3">No search results found</div>';
        this.noCalendarsMsg.style.display = 'none';
    }

    /**
     * Hide empty state
     * @private
     */
    _hideEmptyState() {
        this.noCalendarsMsg.style.display = 'none';
    }

    /**
     * Update search UI
     * @private
     */
    _updateSearchUI(searchTerm) {
        if (this.clearSearchBtn) {
            this.clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
        }
    }

    /**
     * Show error
     * @private
     */
    _showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger alert-dismissible fade show';
        errorDiv.innerHTML = `
            <strong>Error:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        if (this.calendarList?.parentElement) {
            this.calendarList.parentElement.insertBefore(errorDiv, this.calendarList);
        }
    }

    /**
     * Validate selected IDs
     * @private
     */
    _validateSelectedIds(ids) {
        return Array.isArray(ids) ? ids : [];
    }
}