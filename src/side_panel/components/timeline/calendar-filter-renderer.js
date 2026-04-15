/**
 * CalendarFilterRenderer - Dropdown rendering for the timeline calendar filter.
 *
 * Extracted from TimelineCalendarFilter to separate rendering concerns
 * (dropdown content, calendar list, group sections, calendar items)
 * from the main component's lifecycle and data-fetching logic.
 */

export class CalendarFilterRenderer {
    /**
     * @param {Object} options
     * @param {Function} options.getCalendars - Returns full calendars array
     * @param {Function} options.getSelectedIds - Returns current selectedIds array
     * @param {Function} options.getCalendarGroups - Returns current calendarGroups array
     * @param {Function} options.getSearchTerm - Returns current search term string
     * @param {Function} options.getMessage - i18n message lookup (key => string)
     * @param {Function} options.onSearchInput - Called when search input changes (value)
     * @param {Function} options.onRefreshClick - Called when refresh button is clicked
     * @param {Function} options.onCalendarToggle - Called when a single calendar is toggled (calendarId, checked)
     * @param {Function} options.onGroupToggle - Called when a group checkbox is toggled (group, calendars, checked)
     */
    constructor(options) {
        this._getCalendars = options.getCalendars;
        this._getSelectedIds = options.getSelectedIds;
        this._getCalendarGroups = options.getCalendarGroups;
        this._getSearchTerm = options.getSearchTerm;
        this._getMessage = options.getMessage;
        this._onSearchInput = options.onSearchInput;
        this._onRefreshClick = options.onRefreshClick;
        this._onCalendarToggle = options.onCalendarToggle;
        this._onGroupToggle = options.onGroupToggle;

        // DOM references owned by the parent; set after each render
        this.searchInput = null;
        this.refreshBtn = null;
        this.calendarList = null;
    }

    // ------------------------------------------------------------------
    // Public rendering entry points
    // ------------------------------------------------------------------

    /**
     * Render the full dropdown content (toolbar + calendar list) into the
     * given container. Returns references to key DOM nodes.
     * @param {HTMLElement} dropdown - The dropdown container element
     * @returns {{ searchInput: HTMLElement, refreshBtn: HTMLElement, calendarList: HTMLElement }}
     */
    renderDropdownContent(dropdown) {
        dropdown.innerHTML = '';

        // Toolbar: search + refresh
        const toolbar = document.createElement('div');
        toolbar.className = 'timeline-calendar-filter-toolbar';

        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.className = 'timeline-calendar-filter-search';
        this.searchInput.placeholder = this._getMessage('calendarFilterSearchPlaceholder');
        this.searchInput.setAttribute('aria-label', this._getMessage('calendarFilterSearchPlaceholder'));
        this.searchInput.value = this._getSearchTerm();
        this.searchInput.addEventListener('input', () => {
            this._onSearchInput(this.searchInput.value);
        });

        this.refreshBtn = document.createElement('button');
        this.refreshBtn.type = 'button';
        this.refreshBtn.className = 'timeline-calendar-filter-refresh-btn';
        this.refreshBtn.title = this._getMessage('calendarFilterRefreshTooltip');
        this.refreshBtn.setAttribute('aria-label', this._getMessage('calendarFilterRefreshTooltip'));
        this.refreshBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i>';
        this.refreshBtn.addEventListener('click', () => {
            this._onRefreshClick();
        });

        toolbar.appendChild(this.searchInput);
        toolbar.appendChild(this.refreshBtn);
        dropdown.appendChild(toolbar);

        // Calendar list container
        this.calendarList = document.createElement('div');
        this.calendarList.className = 'timeline-calendar-filter-list';
        dropdown.appendChild(this.calendarList);

        this.renderCalendarList();

        return {
            searchInput: this.searchInput,
            refreshBtn: this.refreshBtn,
            calendarList: this.calendarList,
        };
    }

    /**
     * Render (or re-render) the calendar list inside the existing
     * calendarList container.
     */
    renderCalendarList() {
        if (!this.calendarList) return;
        this.calendarList.innerHTML = '';

        const calendars = this._getCalendars();
        const selectedIds = this._getSelectedIds();
        const calendarGroups = this._getCalendarGroups();

        if (!calendars || calendars.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'timeline-calendar-filter-status';
            empty.textContent = this._getMessage('noCalendarsAvailable');
            this.calendarList.appendChild(empty);
            return;
        }

        // Filter by search term
        const term = this._getSearchTerm().toLowerCase().trim();
        const filtered = term
            ? calendars.filter(c => (c.summary || '').toLowerCase().includes(term))
            : calendars;

        if (filtered.length === 0) {
            const noResult = document.createElement('div');
            noResult.className = 'timeline-calendar-filter-status';
            noResult.textContent = this._getMessage('noCalendarsAvailable');
            this.calendarList.appendChild(noResult);
            return;
        }

        const filteredIds = new Set(filtered.map(c => c.id));
        const calendarMap = new Map(calendars.map(c => [c.id, c]));

        // If groups exist, render grouped
        if (calendarGroups.length > 0) {
            for (const group of calendarGroups) {
                const groupCalendars = group.calendarIds
                    .map(id => calendarMap.get(id))
                    .filter(cal => cal && filteredIds.has(cal.id));

                if (term && groupCalendars.length === 0) continue;

                this._renderGroupSection(group, groupCalendars, calendars, selectedIds, calendarGroups);
            }

            // Ungrouped
            const groupedIds = new Set();
            for (const group of calendarGroups) {
                for (const id of group.calendarIds) {
                    groupedIds.add(id);
                }
            }

            const ungrouped = filtered
                .filter(c => !groupedIds.has(c.id))
                .sort((a, b) => {
                    if (a.primary && !b.primary) return -1;
                    if (!a.primary && b.primary) return 1;
                    return (a.summary || '').localeCompare(b.summary || '');
                });

            if (ungrouped.length > 0) {
                this._renderUngroupedSection(ungrouped, selectedIds);
            }
        } else {
            // No groups - flat list (backward compatible)
            const sorted = [...filtered].sort((a, b) => {
                if (a.primary && !b.primary) return -1;
                if (!a.primary && b.primary) return 1;
                return (a.summary || '').localeCompare(b.summary || '');
            });

            sorted.forEach(calendar => {
                this._renderCalendarItem(this.calendarList, calendar, selectedIds);
            });
        }
    }

    /**
     * Update group header checkbox states without re-rendering the whole list.
     * @param {HTMLElement} calendarList - The calendar list container
     */
    updateGroupCheckboxStates(calendarList) {
        const calendarGroups = this._getCalendarGroups();
        if (!calendarList || calendarGroups.length === 0) return;

        const calendars = this._getCalendars();
        const selectedIds = this._getSelectedIds();
        const calendarMap = new Map(calendars.map(c => [c.id, c]));

        for (const group of calendarGroups) {
            const header = calendarList.querySelector(`.timeline-calendar-filter-group-header[data-group-id="${CSS.escape(group.id)}"]`);
            if (!header) continue;

            const checkbox = header.querySelector('input[type="checkbox"]');
            if (!checkbox) continue;

            const validCalendars = group.calendarIds.filter(id => calendarMap.has(id));
            const selectedCount = validCalendars.filter(id => selectedIds.includes(id)).length;

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

    // ------------------------------------------------------------------
    // Private rendering helpers
    // ------------------------------------------------------------------

    /**
     * Render a group section in the filter dropdown
     * @private
     */
    _renderGroupSection(group, calendars, allCalendars, selectedIds, _calendarGroups) {
        // Group header
        const header = document.createElement('div');
        header.className = 'timeline-calendar-filter-group-header';
        header.dataset.groupId = group.id;

        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');
        header.setAttribute('aria-expanded', 'true');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.setAttribute('aria-label', group.name);

        // Determine check state using full group membership (not search-filtered view)
        const calendarMap = new Map(allCalendars.map(c => [c.id, c]));
        const fullGroupIds = group.calendarIds.filter(id => calendarMap.has(id));
        const selectedCount = fullGroupIds.filter(id => selectedIds.includes(id)).length;
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

        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            this._onGroupToggle(group, calendars, checkbox.checked);
        });

        const nameSpan = document.createElement('span');
        nameSpan.className = 'group-name';
        nameSpan.textContent = group.name;

        const collapseIcon = document.createElement('i');
        collapseIcon.className = 'fa-solid fa-chevron-down group-collapse-icon';
        collapseIcon.setAttribute('aria-hidden', 'true');

        header.appendChild(checkbox);
        header.appendChild(nameSpan);
        header.appendChild(collapseIcon);

        const toggleCollapse = () => {
            const body = header.nextElementSibling;
            if (body) body.classList.toggle('collapsed');
            collapseIcon.classList.toggle('collapsed');
            const expanded = !collapseIcon.classList.contains('collapsed');
            header.setAttribute('aria-expanded', String(expanded));
        };

        header.addEventListener('click', (e) => {
            if (e.target === checkbox) return;
            toggleCollapse();
        });

        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                if (e.target === checkbox) return;
                e.preventDefault();
                toggleCollapse();
            }
        });

        this.calendarList.appendChild(header);

        // Group body
        const body = document.createElement('div');
        body.className = 'timeline-calendar-filter-group-body';

        const sorted = [...calendars].sort((a, b) => {
            if (a.primary && !b.primary) return -1;
            if (!a.primary && b.primary) return 1;
            return (a.summary || '').localeCompare(b.summary || '');
        });

        sorted.forEach(calendar => {
            this._renderCalendarItem(body, calendar, selectedIds);
        });

        this.calendarList.appendChild(body);
    }

    /**
     * Render ungrouped section
     * @private
     */
    _renderUngroupedSection(calendars, selectedIds) {
        const header = document.createElement('div');
        header.className = 'timeline-calendar-filter-group-header';
        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');
        header.setAttribute('aria-expanded', 'true');

        const nameSpan = document.createElement('span');
        nameSpan.className = 'group-name';
        nameSpan.textContent = this._getMessage('ungrouped') || 'Ungrouped';

        const collapseIcon = document.createElement('i');
        collapseIcon.className = 'fa-solid fa-chevron-down group-collapse-icon';
        collapseIcon.setAttribute('aria-hidden', 'true');

        header.appendChild(nameSpan);
        header.appendChild(collapseIcon);

        const toggleCollapse = () => {
            const body = header.nextElementSibling;
            if (body) body.classList.toggle('collapsed');
            collapseIcon.classList.toggle('collapsed');
            const expanded = !collapseIcon.classList.contains('collapsed');
            header.setAttribute('aria-expanded', String(expanded));
        };

        header.addEventListener('click', () => toggleCollapse());

        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleCollapse();
            }
        });

        this.calendarList.appendChild(header);

        const body = document.createElement('div');
        body.className = 'timeline-calendar-filter-group-body';

        calendars.forEach(calendar => {
            this._renderCalendarItem(body, calendar, selectedIds);
        });

        this.calendarList.appendChild(body);
    }

    /**
     * Render a single calendar item
     * @private
     */
    _renderCalendarItem(container, calendar, selectedIds) {
        const isSelected = selectedIds.includes(calendar.id);
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
            this._onCalendarToggle(calendar.id, checkbox.checked);
        });

        // Color indicator
        const color = document.createElement('span');
        color.className = 'timeline-calendar-filter-color';
        color.style.backgroundColor = calendar.backgroundColor || '#ccc';
        color.setAttribute('aria-hidden', 'true');

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
}
