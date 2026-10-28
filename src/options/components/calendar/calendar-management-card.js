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
import { createButton, createIcon, createIconButton, msg, setText } from '../base/settings-dom.js';

export class CalendarManagementCard extends CardComponent {
    constructor(onCalendarSelectionChange) {
        super({
            id: 'calendar-management-card',
            title: 'Calendars to show',
            titleLocalize: '__MSG_calendarFilterTitle__',
            subtitle: 'Choose the calendars shown in the side panel, and groups to switch together.',
            subtitleLocalize: '__MSG_calendarSelectionDescription__',
            icon: 'fas fa-calendar-check',
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
            setCalendarGroups: (groups) => { this.calendarGroups = groups; },
            setSelectedCalendarIds: (ids) => { this.selectedCalendarIds = ids; },
            onGroupsChanged: () => this.render(),
            onSelectionChanged: (ids, diff) => {
                if (this.onCalendarSelectionChange) {
                    this.onCalendarSelectionChange(ids, diff);
                }
            }
        });

        // Initialize list renderer
        this._listRenderer = new CalendarListRenderer();
    }

    destroy() {
        this._groupManager.destroy();
        super.destroy();
    }

    createElement() {
        const card = super.createElement();

        // Search, refresh and "Add group" in one toolbar
        this.addContent(this._createToolbar());

        // The calendar list container
        const listContainer = this._createListContainer();
        this.addContent(listContainer);

        this._setupEventListeners();

        return card;
    }

    /**
     * The toolbar: search box, refresh button, "Add group".
     * @private
     */
    _createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'calendar-toolbar';

        // The search box, with its icon and a clear button inside
        const search = document.createElement('div');
        search.className = 'settings-search';
        search.appendChild(createIcon('fas fa-magnifying-glass settings-search-icon'));

        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.id = 'calendar-search';
        this.searchInput.className = 'settings-input settings-search-input';
        this.searchInput.placeholder = msg('searchCalendars', 'Search calendars');
        this.searchInput.setAttribute('aria-label', msg('searchCalendars', 'Search calendars'));
        this.searchInput.setAttribute('data-localize-placeholder', '__MSG_searchCalendars__');
        this.searchInput.setAttribute('data-localize-aria-label', '__MSG_searchCalendars__');
        search.appendChild(this.searchInput);

        this.clearSearchBtn = createIconButton({
            id: 'clear-search-btn',
            icon: 'fas fa-xmark',
            labelKey: 'clearSearch',
            labelFallback: 'Clear search'
        });
        this.clearSearchBtn.classList.add('settings-search-clear');
        this.clearSearchBtn.hidden = true;
        search.appendChild(this.clearSearchBtn);

        // Refresh: the icon spins while the list loads
        this.refreshBtn = createIconButton({
            id: 'refresh-calendars-btn',
            icon: 'fas fa-arrows-rotate',
            labelKey: 'refreshCalendars',
            labelFallback: 'Refresh calendar list'
        });

        // Announces loading to screen readers (the spinning icon says it visually)
        this.loadingIndicator = document.createElement('span');
        this.loadingIndicator.id = 'calendar-loading-indicator';
        this.loadingIndicator.className = 'visually-hidden';
        this.loadingIndicator.setAttribute('role', 'status');

        this.addGroupBtn = createButton({
            labelKey: 'addGroup',
            labelFallback: 'Add group',
            icon: 'fas fa-folder-plus'
        });

        toolbar.appendChild(search);
        toolbar.appendChild(this.refreshBtn);
        toolbar.appendChild(this.addGroupBtn);
        toolbar.appendChild(this.loadingIndicator);
        return toolbar;
    }

    /**
     * Create list container
     * @private
     */
    _createListContainer() {
        const container = document.createElement('div');
        container.className = 'calendar-list-wrap';

        // The calendar list
        this.calendarList = document.createElement('div');
        this.calendarList.id = 'calendar-list';
        this.calendarList.className = 'calendar-list';

        // The not found message
        this.noCalendarsMsg = document.createElement('div');
        this.noCalendarsMsg.id = 'no-calendars-msg';
        this.noCalendarsMsg.className = 'settings-empty';
        this.noCalendarsMsg.style.display = 'none';
        setText(this.noCalendarsMsg, 'noCalendarsFound', 'No calendars found.');

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
        this.addGroupBtn?.addEventListener('click', () => this._groupManager.handleAddGroup(this.allCalendars, this.calendarGroups));

        // Handle the calendar checkbox using event delegation
        this.calendarList?.addEventListener('change', (e) => {
            const target = e.target;
            if (target.type !== 'checkbox') return;

            const groupHeader = target.closest('.calendar-group-header');
            if (groupHeader) {
                const groupId = groupHeader.dataset.groupId;
                if (groupId) {
                    this._groupManager.handleGroupToggle(
                        groupId, target.checked,
                        this.calendarGroups, this.selectedCalendarIds, this.allCalendars
                    );
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
                    this._groupManager.handleGroupCollapse(
                        groupHeader.dataset.groupId, this.calendarList, this.calendarGroups
                    );
                }
                return;
            }

            // Group name click (also collapse/expand, unless clicking checkbox or actions)
            const groupHeader = e.target.closest('.calendar-group-header');
            if (groupHeader && !e.target.closest('input') && !e.target.closest('.group-actions')) {
                this._groupManager.handleGroupCollapse(
                    groupHeader.dataset.groupId, this.calendarList, this.calendarGroups
                );
                return;
            }

            // Edit group name
            const editBtn = e.target.closest('[data-group-edit]');
            if (editBtn) {
                e.stopPropagation();
                this._groupManager.handleStartRenameGroup(
                    editBtn.dataset.groupEdit, this.calendarGroups, this.allCalendars
                );
                return;
            }

            // Delete group
            const deleteBtn = e.target.closest('[data-group-delete]');
            if (deleteBtn) {
                e.stopPropagation();
                this._groupManager.handleDeleteGroup(deleteBtn.dataset.groupDelete, this.calendarGroups);
                return;
            }

            // Group assign button
            const assignBtn = e.target.closest('.calendar-group-assign-btn');
            if (assignBtn) {
                e.stopPropagation();
                const calendarItem = assignBtn.closest('[data-calendar-id]');
                if (calendarItem) {
                    this._groupManager.showGroupAssignPopover(
                        calendarItem.dataset.calendarId, assignBtn,
                        this.calendarGroups, this.allCalendars
                    );
                }
            }
        });

        // Keyboard support for group headers
        this.calendarList?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const groupHeader = e.target.closest('.calendar-group-header');
                if (groupHeader && e.target === groupHeader) {
                    e.preventDefault();
                    this._groupManager.handleGroupCollapse(
                        groupHeader.dataset.groupId, this.calendarList, this.calendarGroups
                    );
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
            this._listRenderer.showError(window.getLocalizedMessage('calendarLoadError') || 'Failed to load calendar data', this.calendarList);
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
        this._listRenderer.setLoading(true, this.loadingIndicator, this.refreshBtn);

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
            this._listRenderer.showError(window.getLocalizedMessage('calendarUpdateError') || `Failed to update calendars: ${error.message || 'Unknown error'}`, this.calendarList);
        } finally {
            this._listRenderer.setLoading(false, this.loadingIndicator, this.refreshBtn);
        }
    }

    /**
     * Render calendar list with group support
     */
    render() {
        this._groupManager.closePopover();

        if (!this.allCalendars || this.allCalendars.length === 0) {
            this._listRenderer.showEmptyState(this.calendarList, this.noCalendarsMsg);
            return;
        }

        const searchTerm = this.searchInput?.value.toLowerCase().trim() || '';
        // The clear button shows with any search, including one with no results
        this._listRenderer.updateSearchUI(searchTerm, this.clearSearchBtn);
        const renderData = this._prepareRenderData(searchTerm);

        if (renderData.filteredCalendars.length === 0 && searchTerm) {
            this._listRenderer.showNoSearchResults(this.calendarList, this.noCalendarsMsg);
            return;
        }

        this._listRenderer.hideEmptyState(this.noCalendarsMsg);
        this.calendarList.innerHTML = '';

        // Render each group section
        for (const { group, calendars } of renderData.groupedSections) {
            const groupSection = this._listRenderer.createGroupSection(
                group, calendars, searchTerm,
                this.selectedCalendarIds, this.allCalendars, this.calendarGroups
            );
            this.calendarList.appendChild(groupSection);
        }

        // Render ungrouped calendars
        if (renderData.ungroupedCalendars.length > 0) {
            const ungroupedSection = this._listRenderer.createUngroupedSection(
                renderData.ungroupedCalendars, searchTerm,
                this.selectedCalendarIds, this.calendarGroups
            );
            this.calendarList.appendChild(ungroupedSection);
        }
    }

    /**
     * Prepare render data: filter calendars, compute grouped sections and ungrouped list.
     * @private
     * @param {string} searchTerm - Lowercased, trimmed search term
     * @returns {{ filteredCalendars: Array, groupedSections: Array<{group, calendars}>, ungroupedCalendars: Array }}
     */
    _prepareRenderData(searchTerm) {
        // Apply search filter
        const filteredCalendars = searchTerm
            ? this.allCalendars.filter(calendar =>
                (calendar.summary || '').toLowerCase().includes(searchTerm))
            : this.allCalendars;

        // Build lookup map
        const calendarIdToCalendar = new Map();
        for (const cal of this.allCalendars) {
            calendarIdToCalendar.set(cal.id, cal);
        }

        const filteredIds = new Set(filteredCalendars.map(c => c.id));

        // Compute grouped sections
        const groupedSections = [];
        for (const group of this.calendarGroups) {
            const groupCalendars = group.calendarIds
                .map(id => calendarIdToCalendar.get(id))
                .filter(cal => cal && filteredIds.has(cal.id));

            // Skip groups with no matching calendars during search
            if (searchTerm && groupCalendars.length === 0) continue;

            groupedSections.push({ group, calendars: groupCalendars });
        }

        // Compute ungrouped calendars
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

        return { filteredCalendars, groupedSections, ungroupedCalendars };
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
            this._listRenderer.showError(window.getLocalizedMessage('calendarSaveError') || 'Failed to save settings', this.calendarList);
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
