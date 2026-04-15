/**
 * CalendarListRenderer - Calendar list rendering, search, and UI state management
 *
 * Extracted from CalendarManagementCard to handle all list rendering and search
 * independently from the card UI lifecycle and group management logic.
 */

export class CalendarListRenderer {
    /**
     * @param {Object} options
     * @param {Function} options.getCalendarList - Returns calendarList DOM element
     * @param {Function} options.getNoCalendarsMsg - Returns noCalendarsMsg DOM element
     * @param {Function} options.getClearSearchBtn - Returns clearSearchBtn DOM element
     * @param {Function} options.getSelectedCalendarIds - Returns current selectedCalendarIds
     * @param {Function} options.getCalendarGroups - Returns current calendarGroups
     * @param {Function} options.getAllCalendars - Returns all calendars
     * @param {Function} options.getLoadingIndicator - Returns loading indicator DOM element
     * @param {Function} options.getRefreshBtn - Returns refresh button DOM element
     */
    constructor(options) {
        this._getCalendarList = options.getCalendarList;
        this._getNoCalendarsMsg = options.getNoCalendarsMsg;
        this._getClearSearchBtn = options.getClearSearchBtn;
        this._getSelectedCalendarIds = options.getSelectedCalendarIds;
        this._getCalendarGroups = options.getCalendarGroups;
        this._getAllCalendars = options.getAllCalendars;
        this._getLoadingIndicator = options.getLoadingIndicator;
        this._getRefreshBtn = options.getRefreshBtn;
    }

    /**
     * Create a group section (header + body)
     */
    createGroupSection(group, calendars, searchTerm) {
        const section = document.createElement('div');
        section.className = 'calendar-group-section';

        const header = this.createGroupHeader(group, calendars);
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
            const isSelected = this._getSelectedCalendarIds().includes(calendar.id);
            const item = this.createCalendarItem(calendar, isSelected);
            body.appendChild(item);
        });

        section.appendChild(body);
        return section;
    }

    /**
     * Create a group header
     */
    createGroupHeader(group, _calendarsInGroup) {
        const allCalendars = this._getAllCalendars();
        const selectedCalendarIds = this._getSelectedCalendarIds();

        const header = document.createElement('div');
        header.className = 'calendar-group-header';
        header.dataset.groupId = group.id;

        // Group checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-check-input';

        // Determine check state using full group membership
        const fullGroupIds = group.calendarIds.filter(id =>
            allCalendars.some(cal => cal.id === id)
        );
        const selectedCount = fullGroupIds.filter(
            id => selectedCalendarIds.includes(id)
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
     */
    createUngroupedSection(calendars, _searchTerm) {
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

        // Spacer to align with grouped headers that have a checkbox
        const spacer = document.createElement('span');
        spacer.className = 'group-checkbox-spacer';
        spacer.setAttribute('aria-hidden', 'true');

        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');
        header.setAttribute('aria-expanded', 'true');
        header.appendChild(spacer);
        header.appendChild(collapseIcon);
        header.appendChild(nameSpan);
        section.appendChild(header);

        const body = document.createElement('div');
        body.className = 'calendar-group-body';

        calendars.forEach(calendar => {
            const isSelected = this._getSelectedCalendarIds().includes(calendar.id);
            const item = this.createCalendarItem(calendar, isSelected);
            body.appendChild(item);
        });

        section.appendChild(body);
        return section;
    }

    /**
     * Create calendar item
     */
    createCalendarItem(calendar, isSelected) {
        const calendarGroups = this._getCalendarGroups();

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
        if (calendarGroups.length > 0 && !calendar.primary) {
            item.appendChild(assignBtn);
        }
        item.appendChild(colorIndicator);

        return item;
    }

    /**
     * Set loading state
     */
    setLoading(loading) {
        const loadingIndicator = this._getLoadingIndicator();
        const refreshBtn = this._getRefreshBtn();
        if (loadingIndicator) {
            loadingIndicator.style.display = loading ? 'block' : 'none';
        }
        if (refreshBtn) {
            refreshBtn.disabled = loading;
        }
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        const calendarList = this._getCalendarList();
        const noCalendarsMsg = this._getNoCalendarsMsg();
        calendarList.innerHTML = '';
        noCalendarsMsg.style.display = 'block';
    }

    /**
     * Show no search results
     */
    showNoSearchResults() {
        const calendarList = this._getCalendarList();
        const noCalendarsMsg = this._getNoCalendarsMsg();
        const noResultsMsg = window.getLocalizedMessage('noSearchResults') || 'No search results found';
        calendarList.innerHTML = '';
        const div = document.createElement('div');
        div.className = 'text-muted text-center p-3';
        div.textContent = noResultsMsg;
        calendarList.appendChild(div);
        noCalendarsMsg.style.display = 'none';
    }

    /**
     * Hide empty state
     */
    hideEmptyState() {
        this._getNoCalendarsMsg().style.display = 'none';
    }

    /**
     * Update search UI
     */
    updateSearchUI(searchTerm) {
        const clearSearchBtn = this._getClearSearchBtn();
        if (clearSearchBtn) {
            clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
        }
    }

    /**
     * Show error
     */
    showError(message) {
        const calendarList = this._getCalendarList();

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

        if (calendarList?.parentElement) {
            calendarList.parentElement.insertBefore(errorDiv, calendarList);
        }
    }
}
