/**
 * CalendarManagementCard - The calendar management card component with group support
 */
import { CardComponent } from '../base/card-component.js';
import { logError } from '../../../lib/utils.js';
import { loadSelectedCalendars, saveSelectedCalendars, loadCalendarGroups, saveCalendarGroups } from '../../../lib/settings-storage.js';
import { sendMessage } from '../../../lib/chrome-messaging.js';

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

        // Active popover reference
        this._activePopover = null;
        this._popoverCloseHandler = null;
        this._popoverKeyHandler = null;
        this._popoverTimerId = null;

        // Debounced save for collapse state
        this._collapseSaveTimer = null;

        // Create-group modal references
        this._createGroupModalOverlay = null;
        this._createGroupModalKeyHandler = null;
        this._isSubmittingGroup = false;
    }

    destroy() {
        this._closePopover();
        this._closeGroupModal();
        if (this._collapseSaveTimer) {
            clearTimeout(this._collapseSaveTimer);
            this._collapseSaveTimer = null;
        }
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
        this.searchInput?.addEventListener('input', (e) => this._handleSearch(e.target.value));
        this.searchInput?.addEventListener('keyup', (e) => {
            if (e.key === 'Escape') {
                this._clearSearch();
            }
        });

        this.clearSearchBtn?.addEventListener('click', () => this._clearSearch());

        // Add group button
        this.addGroupBtn?.addEventListener('click', () => this._handleAddGroup());

        // Handle the calendar checkbox using event delegation
        this.calendarList?.addEventListener('change', (e) => {
            const target = e.target;
            if (target.type !== 'checkbox') return;

            const groupHeader = target.closest('.calendar-group-header');
            if (groupHeader) {
                const groupId = groupHeader.dataset.groupId;
                if (groupId) {
                    this._handleGroupToggle(groupId, target.checked);
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
                    this._handleGroupCollapse(groupHeader.dataset.groupId);
                }
                return;
            }

            // Group name click (also collapse/expand, unless clicking checkbox or actions)
            const groupHeader = e.target.closest('.calendar-group-header');
            if (groupHeader && !e.target.closest('input') && !e.target.closest('.group-actions')) {
                this._handleGroupCollapse(groupHeader.dataset.groupId);
                return;
            }

            // Edit group name
            const editBtn = e.target.closest('[data-group-edit]');
            if (editBtn) {
                e.stopPropagation();
                this._handleStartRenameGroup(editBtn.dataset.groupEdit);
                return;
            }

            // Delete group
            const deleteBtn = e.target.closest('[data-group-delete]');
            if (deleteBtn) {
                e.stopPropagation();
                this._handleDeleteGroup(deleteBtn.dataset.groupDelete);
                return;
            }

            // Group assign button
            const assignBtn = e.target.closest('.calendar-group-assign-btn');
            if (assignBtn) {
                e.stopPropagation();
                const calendarItem = assignBtn.closest('[data-calendar-id]');
                if (calendarItem) {
                    this._showGroupAssignPopover(calendarItem.dataset.calendarId, assignBtn);
                }
            }
        });

        // Keyboard support for group headers
        this.calendarList?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const groupHeader = e.target.closest('.calendar-group-header');
                if (groupHeader && e.target === groupHeader) {
                    e.preventDefault();
                    this._handleGroupCollapse(groupHeader.dataset.groupId);
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
            this._showError(window.getLocalizedMessage('calendarLoadError') || 'Failed to load calendar data');
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
            this._showError(window.getLocalizedMessage('calendarUpdateError') || `Failed to update calendars: ${error.message || 'Unknown error'}`);
        } finally {
            this._setLoading(false);
        }
    }

    /**
     * Render calendar list with group support
     */
    render() {
        this._closePopover();

        if (!this.allCalendars || this.allCalendars.length === 0) {
            this._showEmptyState();
            return;
        }

        // Apply the search filter
        const searchTerm = this.searchInput?.value.toLowerCase().trim() || '';
        const filteredCalendars = searchTerm
            ? this.allCalendars.filter(calendar =>
                (calendar.summary || '').toLowerCase().includes(searchTerm))
            : this.allCalendars;

        if (filteredCalendars.length === 0 && searchTerm) {
            this._showNoSearchResults();
            return;
        }

        this._hideEmptyState();
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

            const groupSection = this._createGroupSection(group, groupCalendars, searchTerm);
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

        const ungroupedSection = this._createUngroupedSection(ungroupedCalendars, searchTerm);
        this.calendarList.appendChild(ungroupedSection);

        this._updateSearchUI(searchTerm);
    }

    /**
     * Create a group section (header + body)
     * @private
     */
    _createGroupSection(group, calendars, searchTerm) {
        const section = document.createElement('div');
        section.className = 'calendar-group-section';

        const header = this._createGroupHeader(group, calendars);
        section.appendChild(header);

        const body = document.createElement('div');
        body.className = 'calendar-group-body';
        if (group.collapsed && !searchTerm) {
            body.classList.add('collapsed');
        }

        const sortedCalendars = [...calendars].sort((a, b) => {
            if (a.primary && !b.primary) return -1;
            if (!a.primary && b.primary) return 1;
            return (a.summary || '').localeCompare(b.summary || '');
        });

        sortedCalendars.forEach(calendar => {
            const isSelected = this.selectedCalendarIds.includes(calendar.id);
            const item = this._createCalendarItem(calendar, isSelected);
            body.appendChild(item);
        });

        section.appendChild(body);
        return section;
    }

    /**
     * Create a group header
     * @private
     */
    _createGroupHeader(group, _calendarsInGroup) {
        const header = document.createElement('div');
        header.className = 'calendar-group-header';
        header.dataset.groupId = group.id;

        // Group checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-check-input';

        // Determine check state using full group membership (not search-filtered view)
        const fullGroupIds = group.calendarIds.filter(id =>
            this.allCalendars.some(cal => cal.id === id)
        );
        const selectedCount = fullGroupIds.filter(
            id => this.selectedCalendarIds.includes(id)
        ).length;

        if (selectedCount === 0 || fullGroupIds.length === 0) {
            checkbox.checked = false;
            checkbox.setAttribute('aria-checked', 'false');
        } else if (selectedCount === fullGroupIds.length) {
            checkbox.checked = true;
            checkbox.setAttribute('aria-checked', 'true');
        } else {
            checkbox.checked = false;
            checkbox.indeterminate = true;
            checkbox.setAttribute('aria-checked', 'mixed');
        }

        checkbox.setAttribute('aria-label', group.name);

        // Collapse icon
        const collapseIcon = document.createElement('i');
        collapseIcon.className = `fas fa-chevron-down group-collapse-icon${group.collapsed ? ' collapsed' : ''}`;
        collapseIcon.setAttribute('aria-hidden', 'true');

        // Group name
        const nameSpan = document.createElement('span');
        nameSpan.className = 'group-name';
        nameSpan.textContent = group.name;

        // Action buttons
        const actions = document.createElement('div');
        actions.className = 'group-actions';

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.dataset.groupEdit = group.id;
        editBtn.title = window.getLocalizedMessage('editGroup') || 'Edit';
        editBtn.setAttribute('aria-label', editBtn.title);
        editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>';

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.dataset.groupDelete = group.id;
        deleteBtn.title = window.getLocalizedMessage('deleteGroup') || 'Delete';
        deleteBtn.setAttribute('aria-label', deleteBtn.title);
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');
        header.setAttribute('aria-expanded', group.collapsed ? 'false' : 'true');
        header.appendChild(checkbox);
        header.appendChild(collapseIcon);
        header.appendChild(nameSpan);
        header.appendChild(actions);

        return header;
    }

    /**
     * Create ungrouped section
     * @private
     */
    _createUngroupedSection(calendars, _searchTerm) {
        const section = document.createElement('div');
        section.className = 'calendar-group-section';

        // Ungrouped header (simplified, no edit/delete)
        const header = document.createElement('div');
        header.className = 'calendar-group-header';
        header.dataset.groupId = '__ungrouped__';

        const collapseIcon = document.createElement('i');
        collapseIcon.className = 'fas fa-chevron-down group-collapse-icon';
        collapseIcon.setAttribute('aria-hidden', 'true');

        const nameSpan = document.createElement('span');
        nameSpan.className = 'group-name';
        nameSpan.textContent = window.getLocalizedMessage('ungrouped') || 'Ungrouped';

        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');
        header.setAttribute('aria-expanded', 'true');
        header.appendChild(collapseIcon);
        header.appendChild(nameSpan);
        section.appendChild(header);

        const body = document.createElement('div');
        body.className = 'calendar-group-body';

        calendars.forEach(calendar => {
            const isSelected = this.selectedCalendarIds.includes(calendar.id);
            const item = this._createCalendarItem(calendar, isSelected);
            body.appendChild(item);
        });

        section.appendChild(body);
        return section;
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

        checkbox.setAttribute('aria-label', calendar.summary || '');

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

        // Group assign button (only if groups exist)
        const assignBtn = document.createElement('button');
        assignBtn.type = 'button';
        assignBtn.className = 'calendar-group-assign-btn';
        assignBtn.title = window.getLocalizedMessage('assignToGroups') || 'Assign to groups';
        assignBtn.setAttribute('aria-label', assignBtn.title);
        assignBtn.innerHTML = '<i class="fas fa-folder"></i>';

        // The color indicator
        const colorIndicator = document.createElement('div');
        colorIndicator.className = 'calendar-color-indicator me-2';
        if (calendar.backgroundColor) {
            colorIndicator.style.backgroundColor = calendar.backgroundColor;
        }

        item.appendChild(checkbox);
        item.appendChild(info);
        if (this.calendarGroups.length > 0 && !calendar.primary) {
            item.appendChild(assignBtn);
        }
        item.appendChild(colorIndicator);

        return item;
    }

    /**
     * Show group assignment popover for a calendar
     * @private
     */
    _showGroupAssignPopover(calendarId, anchorElement) {
        this._closePopover();

        const popover = document.createElement('div');
        popover.className = 'calendar-group-assign-popover';
        popover.setAttribute('role', 'dialog');
        popover.setAttribute('aria-label', window.getLocalizedMessage('assignToGroups') || 'Assign to groups');

        if (this.calendarGroups.length === 0) {
            popover.textContent = window.getLocalizedMessage('noGroupsAvailable') || 'No groups available';
            popover.setAttribute('tabindex', '-1');
            const calendarItem = anchorElement.closest('[data-calendar-id]');
            if (calendarItem) {
                calendarItem.appendChild(popover);
            }
            this._activePopover = popover;
            this._popoverKeyHandler = (e) => {
                if (e.key === 'Escape') {
                    this._closePopover();
                    anchorElement.focus();
                }
            };
            popover.addEventListener('keydown', this._popoverKeyHandler);
            setTimeout(() => popover.focus(), 0);
            this._popoverCloseHandler = (e) => {
                if (!this._activePopover) return;
                if (!popover.contains(e.target) && !anchorElement.contains(e.target)) {
                    this._closePopover();
                }
            };
            this._popoverTimerId = setTimeout(() => {
                this._popoverTimerId = null;
                if (this._activePopover === popover) {
                    document.addEventListener('click', this._popoverCloseHandler);
                }
            }, 0);
            return;
        }

        this.calendarGroups.forEach(group => {
            const wrapper = document.createElement('div');
            wrapper.className = 'form-check';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'form-check-input';
            checkbox.id = `assign-${calendarId}-${group.id}`;
            checkbox.checked = group.calendarIds.includes(calendarId);
            checkbox.addEventListener('change', () => {
                this._handleCalendarGroupAssignment(calendarId, group.id, checkbox.checked);
            });

            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.htmlFor = checkbox.id;
            label.textContent = group.name;

            wrapper.appendChild(checkbox);
            wrapper.appendChild(label);
            popover.appendChild(wrapper);
        });

        const calendarItem = anchorElement.closest('[data-calendar-id]');
        if (calendarItem) {
            calendarItem.appendChild(popover);
        }

        this._activePopover = popover;

        // Escape key closes popover
        this._popoverKeyHandler = (e) => {
            if (e.key === 'Escape') {
                this._closePopover();
                anchorElement.focus();
            }
        };
        popover.addEventListener('keydown', this._popoverKeyHandler);

        // Focus first checkbox in popover
        const firstCheckbox = popover.querySelector('input[type="checkbox"]');
        if (firstCheckbox) {
            setTimeout(() => firstCheckbox.focus(), 0);
        }

        this._popoverCloseHandler = (e) => {
            if (!this._activePopover) return;
            if (!popover.contains(e.target) && !anchorElement.contains(e.target)) {
                this._closePopover();
            }
        };
        this._popoverTimerId = setTimeout(() => {
            this._popoverTimerId = null;
            if (this._activePopover === popover) {
                document.addEventListener('click', this._popoverCloseHandler);
            }
        }, 0);
    }

    /**
     * Close active popover
     * @private
     */
    _closePopover() {
        if (this._popoverTimerId) {
            clearTimeout(this._popoverTimerId);
            this._popoverTimerId = null;
        }
        if (this._activePopover) {
            if (this._popoverKeyHandler) {
                this._activePopover.removeEventListener('keydown', this._popoverKeyHandler);
            }
            this._activePopover.remove();
            this._activePopover = null;
        }
        if (this._popoverCloseHandler) {
            document.removeEventListener('click', this._popoverCloseHandler);
            this._popoverCloseHandler = null;
        }
        this._popoverKeyHandler = null;
    }

    /**
     * Handle calendar group assignment change
     * @private
     */
    async _handleCalendarGroupAssignment(calendarId, groupId, assigned) {
        const primaryCalendar = this.allCalendars.find(c => c.primary);
        if (primaryCalendar && primaryCalendar.id === calendarId) return;
        const group = this.calendarGroups.find(g => g.id === groupId);
        if (!group) return;

        const previousCalendarIds = [...group.calendarIds];

        if (assigned) {
            if (!group.calendarIds.includes(calendarId)) {
                group.calendarIds.push(calendarId);
            }
        } else {
            group.calendarIds = group.calendarIds.filter(id => id !== calendarId);
        }

        try {
            await saveCalendarGroups(this.calendarGroups);
            this._closePopover();
            this.render();
        } catch (error) {
            group.calendarIds = previousCalendarIds;
            this._closePopover();
            this.render();
            logError('Calendar group assignment save', error);
        }
    }

    /**
     * Handle adding a new group — opens modal
     * @private
     */
    _handleAddGroup() {
        this._showGroupModal(null);
    }

    /**
     * Show the group modal for create or edit
     * @param {Object|null} editingGroup - existing group to edit, or null for create
     * @private
     */
    _showGroupModal(editingGroup) {
        this._closeGroupModal();

        const isEdit = !!editingGroup;
        const modalTitle = isEdit
            ? (window.getLocalizedMessage('editGroupTitle') || 'Edit Group')
            : (window.getLocalizedMessage('createGroupTitle') || 'Create Group');
        const submitLabel = isEdit
            ? (window.getLocalizedMessage('saveGroupButton') || 'Save')
            : (window.getLocalizedMessage('createGroupButton') || 'Create');
        const existingCalendarIds = isEdit ? new Set(editingGroup.calendarIds) : new Set();

        // Overlay
        const overlay = document.createElement('div');
        overlay.className = 'create-group-modal-overlay';

        // Modal container
        const modal = document.createElement('div');
        modal.className = 'create-group-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', modalTitle);

        // Header
        const header = document.createElement('div');
        header.className = 'create-group-modal-header';
        const title = document.createElement('h5');
        title.textContent = modalTitle;
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'btn-close';
        closeBtn.setAttribute('aria-label', window.getLocalizedMessage('cancelButton') || 'Cancel');
        closeBtn.addEventListener('click', () => this._closeGroupModal());
        header.appendChild(title);
        header.appendChild(closeBtn);

        // Body
        const body = document.createElement('div');
        body.className = 'create-group-modal-body';

        // Group name input
        const nameLabel = document.createElement('label');
        nameLabel.className = 'form-label fw-bold';
        nameLabel.htmlFor = 'create-group-name-input';
        nameLabel.textContent = window.getLocalizedMessage('groupNameLabel') || 'Group Name';
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'create-group-name-input';
        nameInput.className = 'form-control mb-3';
        nameInput.placeholder = window.getLocalizedMessage('groupNamePlaceholder') || 'Enter group name';
        nameInput.maxLength = 50;
        if (isEdit) {
            nameInput.value = editingGroup.name;
        }

        body.appendChild(nameLabel);
        body.appendChild(nameInput);

        // Calendar selection
        const calLabel = document.createElement('label');
        calLabel.className = 'form-label fw-bold';
        calLabel.textContent = window.getLocalizedMessage('selectCalendarsLabel') || 'Select Calendars';
        body.appendChild(calLabel);

        const calList = document.createElement('div');
        calList.className = 'create-group-modal-calendar-list';

        // Exclude primary calendar — it is always visible and not assignable to groups
        const sortedCalendars = this.allCalendars
            .filter(c => !c.primary)
            .sort((a, b) => (a.summary || '').localeCompare(b.summary || ''));

        const checkboxes = [];
        if (sortedCalendars.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'text-muted p-2';
            empty.textContent = window.getLocalizedMessage('noCalendarsToAdd')
                || 'No calendars available. Refresh the calendar list first.';
            calList.appendChild(empty);
        } else {
            for (const cal of sortedCalendars) {
                const wrapper = document.createElement('div');
                wrapper.className = 'form-check create-group-modal-cal-item';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'form-check-input';
                checkbox.id = `create-group-cal-${cal.id}`;
                checkbox.value = cal.id;
                if (existingCalendarIds.has(cal.id)) {
                    checkbox.checked = true;
                }

                const label = document.createElement('label');
                label.className = 'form-check-label';
                label.htmlFor = checkbox.id;

                const colorDot = document.createElement('span');
                colorDot.className = 'calendar-color-indicator-inline';
                if (cal.backgroundColor) {
                    colorDot.style.backgroundColor = cal.backgroundColor;
                }

                const nameSpan = document.createElement('span');
                nameSpan.textContent = cal.summary || cal.id;

                label.appendChild(colorDot);
                label.appendChild(nameSpan);
                wrapper.appendChild(checkbox);
                wrapper.appendChild(label);
                calList.appendChild(wrapper);
                checkboxes.push(checkbox);
            }
        }
        body.appendChild(calList);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'create-group-modal-footer';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-outline-secondary btn-sm';
        cancelBtn.textContent = window.getLocalizedMessage('cancelButton') || 'Cancel';
        cancelBtn.addEventListener('click', () => this._closeGroupModal());

        const submitBtn = document.createElement('button');
        submitBtn.type = 'button';
        submitBtn.className = 'btn btn-primary btn-sm';
        submitBtn.textContent = submitLabel;
        submitBtn.addEventListener('click', () => {
            this._submitGroupModal(nameInput.value.trim(), checkboxes, editingGroup);
        });

        footer.appendChild(cancelBtn);
        footer.appendChild(submitBtn);

        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        overlay.appendChild(modal);

        // Keyboard handler: Escape to close + focus trap
        this._createGroupModalKeyHandler = (e) => {
            if (e.key === 'Escape') {
                this._closeGroupModal();
                return;
            }
            if (e.key === 'Tab') {
                const focusable = modal.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusable.length === 0) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            }
        };
        document.addEventListener('keydown', this._createGroupModalKeyHandler);

        // Click overlay to close
        overlay.addEventListener('mousedown', (e) => {
            if (e.target === overlay) {
                this._closeGroupModal();
            }
        });

        // Enter key in name input submits
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this._submitGroupModal(nameInput.value.trim(), checkboxes, editingGroup);
            }
        });

        this._createGroupModalOverlay = overlay;
        document.body.appendChild(overlay);

        // Focus name input
        setTimeout(() => nameInput.focus(), 0);
    }

    /**
     * Submit the group modal (create or edit)
     * @private
     */
    async _submitGroupModal(name, checkboxes, editingGroup) {
        if (this._isSubmittingGroup) return;
        this._isSubmittingGroup = true;

        const groupName = name || (window.getLocalizedMessage('newGroupName') || 'New Group');
        const selectedCalIds = checkboxes
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        if (editingGroup) {
            // Edit mode: update existing group
            const previousName = editingGroup.name;
            const previousCalendarIds = [...editingGroup.calendarIds];
            editingGroup.name = groupName.slice(0, 50);
            editingGroup.calendarIds = selectedCalIds;

            try {
                await saveCalendarGroups(this.calendarGroups);
                this._closeGroupModal();
                this.render();
            } catch (error) {
                editingGroup.name = previousName;
                editingGroup.calendarIds = previousCalendarIds;
                logError('Edit group', error);
            } finally {
                this._isSubmittingGroup = false;
            }
        } else {
            // Create mode: add new group
            const groupId = `group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const newGroup = {
                id: groupId,
                name: groupName.slice(0, 50),
                calendarIds: selectedCalIds,
                collapsed: false
            };
            this.calendarGroups.push(newGroup);

            try {
                await saveCalendarGroups(this.calendarGroups);
                this._closeGroupModal();
                this.render();
            } catch (error) {
                this.calendarGroups = this.calendarGroups.filter(g => g.id !== groupId);
                logError('Add group', error);
            } finally {
                this._isSubmittingGroup = false;
            }
        }
    }

    /**
     * Close the group modal
     * @private
     */
    _closeGroupModal() {
        const wasOpen = !!this._createGroupModalOverlay;
        if (this._createGroupModalKeyHandler) {
            document.removeEventListener('keydown', this._createGroupModalKeyHandler);
            this._createGroupModalKeyHandler = null;
        }
        if (this._createGroupModalOverlay) {
            this._createGroupModalOverlay.remove();
            this._createGroupModalOverlay = null;
        }
        if (wasOpen && this.addGroupBtn && this.addGroupBtn.isConnected) {
            this.addGroupBtn.focus();
        }
    }

    /**
     * Handle deleting a group
     * @private
     */
    async _handleDeleteGroup(groupId) {
        const confirmMsg = window.getLocalizedMessage('deleteGroupConfirm')
            || 'Delete this group? Calendars will be moved to Ungrouped.';
        if (!confirm(confirmMsg)) return;

        const previousGroups = [...this.calendarGroups];
        this.calendarGroups = this.calendarGroups.filter(g => g.id !== groupId);

        try {
            await saveCalendarGroups(this.calendarGroups);
            this.render();
        } catch (error) {
            // Rollback on save failure
            this.calendarGroups = previousGroups;
            logError('Delete group', error);
        }
    }

    /**
     * Open edit modal for a group
     * @private
     */
    _handleStartRenameGroup(groupId) {
        const group = this.calendarGroups.find(g => g.id === groupId);
        if (!group) return;
        this._showGroupModal(group);
    }

    /**
     * Handle group toggle (select/deselect all calendars in group)
     * @private
     */
    async _handleGroupToggle(groupId, isChecked) {
        const group = this.calendarGroups.find(g => g.id === groupId);
        if (!group || group.calendarIds.length === 0) return;

        const previousIds = [...this.selectedCalendarIds];
        const primaryId = this.allCalendars.find(c => c.primary)?.id;

        if (isChecked) {
            // Add all group calendar IDs not already selected
            for (const calId of group.calendarIds) {
                if (!this.selectedCalendarIds.includes(calId)) {
                    this.selectedCalendarIds.push(calId);
                }
            }
        } else {
            // Remove group calendar IDs, but keep those also in other selected groups, and keep primary
            const otherGroupSelectedIds = this._getOtherGroupSelectedIds(groupId);
            this.selectedCalendarIds = this.selectedCalendarIds.filter(id => {
                if (id === primaryId) return true;
                if (!group.calendarIds.includes(id)) return true;
                if (otherGroupSelectedIds.has(id)) return true;
                return false;
            });
        }

        try {
            await saveSelectedCalendars(this.selectedCalendarIds);
            if (this.onCalendarSelectionChange) {
                this.onCalendarSelectionChange(this.selectedCalendarIds);
            }
            this.render();
        } catch (error) {
            this.selectedCalendarIds = previousIds;
            this.render();
            logError('Group toggle save', error);
        }
    }

    /**
     * Get calendar IDs that are selected and belong to other active groups
     * @private
     */
    _getOtherGroupSelectedIds(excludeGroupId) {
        const ids = new Set();
        for (const group of this.calendarGroups) {
            if (group.id === excludeGroupId) continue;
            for (const calId of group.calendarIds) {
                if (this.selectedCalendarIds.includes(calId)) {
                    ids.add(calId);
                }
            }
        }
        return ids;
    }

    /**
     * Handle group collapse/expand
     * @private
     */
    async _handleGroupCollapse(groupId) {
        if (groupId === '__ungrouped__') {
            // Toggle ungrouped section (UI only, no persistence)
            const header = this.calendarList.querySelector('.calendar-group-header[data-group-id="__ungrouped__"]');
            if (header) {
                const body = header.nextElementSibling;
                const icon = header.querySelector('.group-collapse-icon');
                if (body) body.classList.toggle('collapsed');
                if (icon) icon.classList.toggle('collapsed');
                const expanded = !body?.classList.contains('collapsed');
                header.setAttribute('aria-expanded', String(expanded));
            }
            return;
        }

        const group = this.calendarGroups.find(g => g.id === groupId);
        if (!group) return;

        group.collapsed = !group.collapsed;

        // Update UI directly without full re-render
        const header = this.calendarList.querySelector(`.calendar-group-header[data-group-id="${CSS.escape(groupId)}"]`);
        if (header) {
            const body = header.nextElementSibling;
            const icon = header.querySelector('.group-collapse-icon');
            if (body) body.classList.toggle('collapsed');
            if (icon) icon.classList.toggle('collapsed');
            header.setAttribute('aria-expanded', group.collapsed ? 'false' : 'true');
        }

        this._debouncedSaveGroups();
    }

    /**
     * Debounced save for calendar groups (used for collapse state)
     * @private
     */
    _debouncedSaveGroups() {
        if (this._collapseSaveTimer) {
            clearTimeout(this._collapseSaveTimer);
        }
        this._collapseSaveTimer = setTimeout(async () => {
            try {
                await saveCalendarGroups(this.calendarGroups);
            } catch (error) {
                logError('Group save (debounced)', error);
            }
        }, 1000);
    }

    /**
     * Handle search
     * @private
     */
    _handleSearch() {
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
            // Notify parent via callback
            if (this.onCalendarSelectionChange) {
                this.onCalendarSelectionChange(this.selectedCalendarIds);
            }
            // Update group header checkbox states
            this._updateGroupCheckboxStates();
        } catch (error) {
            this.selectedCalendarIds = previousIds;
            this.render();
            logError('Calendar selection save', error);
            this._showError(window.getLocalizedMessage('calendarSaveError') || 'Failed to save settings');
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
        const noResultsMsg = window.getLocalizedMessage('noSearchResults') || 'No search results found';
        this.calendarList.innerHTML = '';
        const div = document.createElement('div');
        div.className = 'text-muted text-center p-3';
        div.textContent = noResultsMsg;
        this.calendarList.appendChild(div);
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

        const strong = document.createElement('strong');
        strong.textContent = (window.getLocalizedMessage('errorLabel') || 'Error') + ': ';
        errorDiv.appendChild(strong);
        errorDiv.appendChild(document.createTextNode(message));

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'btn-close';
        closeBtn.setAttribute('data-bs-dismiss', 'alert');
        closeBtn.setAttribute('aria-label', window.getLocalizedMessage('close') || 'Close');
        errorDiv.appendChild(closeBtn);

        if (this.calendarList?.parentElement) {
            this.calendarList.parentElement.insertBefore(errorDiv, this.calendarList);
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
