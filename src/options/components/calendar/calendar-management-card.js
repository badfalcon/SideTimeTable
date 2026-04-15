/**
 * CalendarManagementCard - The calendar management card component with group support
 *
 * Group CRUD and modal logic delegated to CalendarGroupManager.
 * List rendering and UI state delegated to CalendarListRenderer.
 */
import { CardComponent } from '../base/card-component.js';
import { logError } from '../../../lib/utils.js';
import { loadSelectedCalendars, saveSelectedCalendars, loadCalendarGroups } from '../../../lib/settings-storage.js';
import { sendMessage } from '../../../lib/chrome-messaging.js';
import { CalendarGroupManager } from './calendar-group-manager.js';
import { CalendarListRenderer } from './calendar-list-renderer.js';

export class CalendarManagementCard extends CardComponent {
    constructor(onCalendarSelectionChange) {
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

        this.onCalendarSelectionChange = onCalendarSelectionChange;
        this.availableCalendars = {};
        this.selectedCalendarIds = [];
        this.calendarGroups = [];
        this.hasAutoFetched = false;
        this.allCalendars = [];

        // The UI element references
        this.refreshBtn = null;
        this.loadingIndicator = null;
        this.calendarList = null;
        this.noCalendarsMsg = null;
        this.searchInput = null;
        this.clearSearchBtn = null;
        this.addGroupBtn = null;

        // Initialize group manager
        this._groupManager = new CalendarGroupManager({
            getCalendarGroups: () => this.calendarGroups,
            setCalendarGroups: (groups) => { this.calendarGroups = groups; },
            getSelectedCalendarIds: () => this.selectedCalendarIds,
            setSelectedCalendarIds: (ids) => { this.selectedCalendarIds = ids; },
            getAllCalendars: () => this.allCalendars,
            onGroupsChanged: () => this.render(),
            onSelectionChanged: (ids, diff) => {
                if (this.onCalendarSelectionChange) {
                    this.onCalendarSelectionChange(ids, diff);
                }
            },
            getAddGroupBtn: () => this.addGroupBtn
        });

        // Initialize list renderer
        this._listRenderer = new CalendarListRenderer({
            getCalendarList: () => this.calendarList,
            getNoCalendarsMsg: () => this.noCalendarsMsg,
            getClearSearchBtn: () => this.clearSearchBtn,
            getSelectedCalendarIds: () => this.selectedCalendarIds,
            getCalendarGroups: () => this.calendarGroups,
            getAllCalendars: () => this.allCalendars,
            getLoadingIndicator: () => this.loadingIndicator,
            getRefreshBtn: () => this.refreshBtn
        });
    }

    destroy() {
        this._groupManager.destroy();
        super.destroy();
    }

    createElement() {
        const card = super.createElement();

        // The control buttons
        const controlsDiv = this._createControlsSection();
        this.addContent(controlsDiv);

        // The search field
        const searchDiv = this._createSearchSection();
        this.addContent(searchDiv);

        // The group control section
        const groupControlDiv = this._createGroupControlSection();
        this.addContent(groupControlDiv);

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
        const spinner = document.createElement('div');
        spinner.className = 'spinner-border spinner-border-sm text-primary';
        spinner.setAttribute('role', 'status');
        const srSpan = document.createElement('span');
        srSpan.className = 'visually-hidden';
        srSpan.textContent = window.getLocalizedMessage('screenReaderLoading') || 'Loading...';
        spinner.appendChild(srSpan);
        this.loadingIndicator.appendChild(spinner);

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
        iconSpan.innerHTML = '<i class="fas fa-search text-muted" aria-hidden="true"></i>';

        // The search input field
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.id = 'calendar-search';
        this.searchInput.className = 'form-control';
        this.searchInput.placeholder = window.getLocalizedMessage('searchCalendars') || 'Search calendars...';
        this.searchInput.setAttribute('aria-label', window.getLocalizedMessage('searchCalendars') || 'Search calendars');
        this.searchInput.setAttribute('data-localize-placeholder', '__MSG_searchCalendars__');

        // The clear button
        this.clearSearchBtn = document.createElement('button');
        this.clearSearchBtn.id = 'clear-search-btn';
        this.clearSearchBtn.className = 'btn btn-outline-secondary';
        this.clearSearchBtn.type = 'button';
        this.clearSearchBtn.style.display = 'none';
        this.clearSearchBtn.setAttribute('aria-label', window.getLocalizedMessage('clearSearch') || 'Clear search');
        this.clearSearchBtn.innerHTML = '<i class="fas fa-times"></i>';

        inputGroup.appendChild(iconSpan);
        inputGroup.appendChild(this.searchInput);
        inputGroup.appendChild(this.clearSearchBtn);
        searchDiv.appendChild(inputGroup);

        return searchDiv;
    }

    /**
     * Create the group control section
     * @private
     */
    _createGroupControlSection() {
        const div = document.createElement('div');
        div.className = 'mb-3';

        this.addGroupBtn = document.createElement('button');
        this.addGroupBtn.className = 'btn btn-outline-secondary btn-sm';
        this.addGroupBtn.type = 'button';
        const addGroupIcon = document.createElement('i');
        addGroupIcon.className = 'fas fa-folder-plus me-1';
        const addGroupLabel = document.createElement('span');
        addGroupLabel.setAttribute('data-localize', '__MSG_addGroup__');
        addGroupLabel.textContent = window.getLocalizedMessage('addGroup') || 'Add Group';
        this.addGroupBtn.appendChild(addGroupIcon);
        this.addGroupBtn.appendChild(addGroupLabel);

        div.appendChild(this.addGroupBtn);
        return div;
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
        this.noCalendarsMsg.textContent = window.getLocalizedMessage('noCalendarsFound') || 'No calendars found.';

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
        this.searchInput?.addEventListener('input', () => this.render());
        this.searchInput?.addEventListener('keyup', (e) => {
            if (e.key === 'Escape') {
                this._clearSearch();
            }
        });

        this.clearSearchBtn?.addEventListener('click', () => this._clearSearch());

        // Add group button
        this.addGroupBtn?.addEventListener('click', () => this._groupManager.handleAddGroup());

        // Handle the calendar checkbox using event delegation
        this.calendarList?.addEventListener('change', (e) => {
            const target = e.target;
            if (target.type !== 'checkbox') return;

            const groupHeader = target.closest('.calendar-group-header');
            if (groupHeader) {
                const groupId = groupHeader.dataset.groupId;
                if (groupId) {
                    this._groupManager.handleGroupToggle(groupId, target.checked);
                }
                return;
            }

            const calendarItem = target.closest('[data-calendar-id]');
            if (calendarItem) {
                this._handleCalendarToggle(e);
            }
        });

        // Handle group header clicks (collapse/expand)
        this.calendarList?.addEventListener('click', (e) => {
            const collapseIcon = e.target.closest('.group-collapse-icon');
            if (collapseIcon) {
                const groupHeader = collapseIcon.closest('.calendar-group-header');
                if (groupHeader) {
                    this._groupManager.handleGroupCollapse(groupHeader.dataset.groupId, this.calendarList);
                }
                return;
            }

            // Group name click (also collapse/expand, unless clicking checkbox or actions)
            const groupHeader = e.target.closest('.calendar-group-header');
            if (groupHeader && !e.target.closest('input') && !e.target.closest('.group-actions')) {
                this._groupManager.handleGroupCollapse(groupHeader.dataset.groupId, this.calendarList);
                return;
            }

            // Edit group name
            const editBtn = e.target.closest('[data-group-edit]');
            if (editBtn) {
                e.stopPropagation();
                this._groupManager.handleStartRenameGroup(editBtn.dataset.groupEdit);
                return;
            }

            // Delete group
            const deleteBtn = e.target.closest('[data-group-delete]');
            if (deleteBtn) {
                e.stopPropagation();
                this._groupManager.handleDeleteGroup(deleteBtn.dataset.groupDelete);
                return;
            }

            // Group assign button
            const assignBtn = e.target.closest('.calendar-group-assign-btn');
            if (assignBtn) {
                e.stopPropagation();
                const calendarItem = assignBtn.closest('[data-calendar-id]');
                if (calendarItem) {
                    this._groupManager.showGroupAssignPopover(calendarItem.dataset.calendarId, assignBtn);
                }
            }
        });

        // Keyboard support for group headers
        this.calendarList?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const groupHeader = e.target.closest('.calendar-group-header');
                if (groupHeader && e.target === groupHeader) {
                    e.preventDefault();
                    this._groupManager.handleGroupCollapse(groupHeader.dataset.groupId, this.calendarList);
                }
            }
        });
    }

    /**
     * Load data
     */
    async loadData() {
        try {
            const [selectedIds, groups] = await Promise.all([
                loadSelectedCalendars(),
                loadCalendarGroups()
            ]);
            this.selectedCalendarIds = this._validateSelectedIds(selectedIds);
            this.calendarGroups = Array.isArray(groups) ? groups : [];
            this.render();
        } catch (error) {
            logError('Calendar data loading', error);
            this._listRenderer.showError(window.getLocalizedMessage('calendarLoadError') || 'Failed to load calendar data');
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
        this._listRenderer.setLoading(true);

        try {
            // Load current selections from storage to avoid overwriting with empty state
            if (this.selectedCalendarIds.length === 0) {
                const storedIds = await loadSelectedCalendars();
                this.selectedCalendarIds = this._validateSelectedIds(storedIds);
            }

            const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
            const response = await sendMessage({action: 'getCalendarList', requestId});

            if (response.error) {
                const detail = response.errorType ? `${response.error} (${response.errorType})` : response.error;
                const rid = response.requestId ? ` [Request ID: ${response.requestId}]` : '';
                throw new Error(detail + rid);
            }

            if (response.calendars) {
                this.allCalendars = response.calendars;

                // Ensure the primary calendar is always included in selection
                const primaryCalendar = response.calendars.find(cal => cal.primary);
                if (primaryCalendar && !this.selectedCalendarIds.includes(primaryCalendar.id)) {
                    this.selectedCalendarIds.unshift(primaryCalendar.id);
                }

                await saveSelectedCalendars(this.selectedCalendarIds);
                this.render();
            }
        } catch (error) {
            logError('Calendar list update', error);
            this._listRenderer.showError(window.getLocalizedMessage('calendarUpdateError') || `Failed to update calendars: ${error.message || 'Unknown error'}`);
        } finally {
            this._listRenderer.setLoading(false);
        }
    }

    /**
     * Render calendar list with group support
     */
    render() {
        this._groupManager.closePopover();

        if (!this.allCalendars || this.allCalendars.length === 0) {
            this._listRenderer.showEmptyState();
            return;
        }

        // Apply the search filter
        const searchTerm = this.searchInput?.value.toLowerCase().trim() || '';
        const filteredCalendars = searchTerm
            ? this.allCalendars.filter(calendar =>
                (calendar.summary || '').toLowerCase().includes(searchTerm))
            : this.allCalendars;

        if (filteredCalendars.length === 0 && searchTerm) {
            this._listRenderer.showNoSearchResults();
            return;
        }

        this._listRenderer.hideEmptyState();
        this.calendarList.innerHTML = '';

        // Build a set of all calendar IDs in groups
        const calendarIdToCalendar = new Map();
        for (const cal of this.allCalendars) {
            calendarIdToCalendar.set(cal.id, cal);
        }

        const filteredIds = new Set(filteredCalendars.map(c => c.id));

        // Render each group
        for (const group of this.calendarGroups) {
            const groupCalendars = group.calendarIds
                .map(id => calendarIdToCalendar.get(id))
                .filter(cal => cal && filteredIds.has(cal.id));

            // Skip groups with no matching calendars during search
            if (searchTerm && groupCalendars.length === 0) continue;

            const groupSection = this._listRenderer.createGroupSection(group, groupCalendars, searchTerm);
            this.calendarList.appendChild(groupSection);
        }

        // Render ungrouped calendars
        const groupedIds = new Set();
        for (const group of this.calendarGroups) {
            for (const id of group.calendarIds) {
                groupedIds.add(id);
            }
        }

        const ungroupedCalendars = filteredCalendars
            .filter(cal => !groupedIds.has(cal.id))
            .sort((a, b) => {
                if (a.primary && !b.primary) return -1;
                if (!a.primary && b.primary) return 1;
                return (a.summary || '').localeCompare(b.summary || '');
            });

        if (ungroupedCalendars.length > 0) {
            const ungroupedSection = this._listRenderer.createUngroupedSection(ungroupedCalendars, searchTerm);
            this.calendarList.appendChild(ungroupedSection);
        }

        this._listRenderer.updateSearchUI(searchTerm);
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

        const previousIds = [...this.selectedCalendarIds];
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
            // Notify parent via callback with diff info
            if (this.onCalendarSelectionChange) {
                this.onCalendarSelectionChange(this.selectedCalendarIds, {
                    addedIds: isChecked ? [calendarId] : [],
                    removedIds: isChecked ? [] : [calendarId]
                });
            }
            // Update group header checkbox states
            this._updateGroupCheckboxStates();
        } catch (error) {
            this.selectedCalendarIds = previousIds;
            this.render();
            logError('Calendar selection save', error);
            this._listRenderer.showError(window.getLocalizedMessage('calendarSaveError') || 'Failed to save settings');
        }
    }

    /**
     * Update group header checkbox states without full re-render
     * @private
     */
    _updateGroupCheckboxStates() {
        const calendarIdToCalendar = new Map();
        for (const cal of this.allCalendars) {
            calendarIdToCalendar.set(cal.id, cal);
        }

        for (const group of this.calendarGroups) {
            const header = this.calendarList.querySelector(`.calendar-group-header[data-group-id="${CSS.escape(group.id)}"]`);
            if (!header) continue;

            const checkbox = header.querySelector('input[type="checkbox"]');
            if (!checkbox) continue;

            const validCalendars = group.calendarIds.filter(id => calendarIdToCalendar.has(id));
            const selectedCount = validCalendars.filter(id => this.selectedCalendarIds.includes(id)).length;

            checkbox.indeterminate = false;
            if (selectedCount === 0) {
                checkbox.checked = false;
                checkbox.setAttribute('aria-checked', 'false');
            } else if (selectedCount === validCalendars.length) {
                checkbox.checked = true;
                checkbox.setAttribute('aria-checked', 'true');
            } else {
                checkbox.checked = false;
                checkbox.indeterminate = true;
                checkbox.setAttribute('aria-checked', 'mixed');
            }
        }
    }

    /**
     * Validate selected IDs
     * @private
     */
    _validateSelectedIds(ids) {
        return Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : [];
    }
}
