/**
 * CalendarFilterRenderer - Dropdown rendering for the timeline calendar filter.
 *
 * Extracted from TimelineCalendarFilter to separate rendering concerns
 * (dropdown content, calendar list, group sections, calendar items)
 * from the main component's lifecycle and data-fetching logic.
 *
 * All data is passed directly as method parameters — the renderer holds
 * no references to external state. Event callbacks are retained as an
 * observer hook from the parent component.
 *
 * Layout: a title row (with the refresh button), the search box when the
 * list is long, the calendars (colour, name, checkbox on the right), and a
 * link to the settings page at the bottom.
 */

// The search box only earns its place once the list no longer fits at a glance
export const SEARCH_MIN_CALENDARS = 9;

export class CalendarFilterRenderer {
    /**
     * @param {Object} options
     * @param {Function} options.onSearchInput - Called when search input changes (value)
     * @param {Function} options.onRefreshClick - Called when refresh button is clicked
     * @param {Function} options.onCalendarToggle - Called when a single calendar is toggled (calendarId, checked)
     * @param {Function} options.onGroupToggle - Called when a group checkbox is toggled (group, calendars, checked)
     * @param {Function} [options.onManageClick] - Called by the "Manage calendars in Settings" link;
     *   the link is left out without it
     */
    constructor(options) {
        this._onSearchInput = options.onSearchInput;
        this._onRefreshClick = options.onRefreshClick;
        this._onCalendarToggle = options.onCalendarToggle;
        this._onGroupToggle = options.onGroupToggle;
        this._onManageClick = options.onManageClick || null;

        // DOM references owned by the parent; set after each render
        this.searchInput = null;
        this.refreshBtn = null;
        this.calendarList = null;
    }

    // ------------------------------------------------------------------
    // Public rendering entry points
    // ------------------------------------------------------------------

    /**
     * Render the full dropdown content (title, search, calendar list,
     * settings link) into the given container. Returns references to key
     * DOM nodes.
     * @param {HTMLElement} dropdown - The dropdown container element
     * @param {string} searchTerm - Current search term value
     * @param {Array} calendars - Full calendars array
     * @param {Array<string>} selectedIds - Current selectedIds array
     * @param {Array} calendarGroups - Current calendarGroups array
     * @returns {{ searchInput: HTMLElement|null, refreshBtn: HTMLElement, calendarList: HTMLElement }}
     */
    renderDropdownContent(dropdown, searchTerm, calendars, selectedIds, calendarGroups) {
        dropdown.innerHTML = '';
        dropdown.appendChild(this._createHead());

        this.searchInput = null;
        if ((calendars || []).length >= SEARCH_MIN_CALENDARS || searchTerm) {
            this.searchInput = document.createElement('input');
            this.searchInput.type = 'search';
            this.searchInput.className = 'timeline-calendar-filter-search';
            this.searchInput.placeholder = window.getLocalizedMessage('calendarFilterSearchPlaceholder');
            this.searchInput.setAttribute('aria-label', window.getLocalizedMessage('calendarFilterSearchPlaceholder'));
            this.searchInput.value = searchTerm;
            this.searchInput.addEventListener('input', () => {
                this._onSearchInput(this.searchInput.value);
            });
            dropdown.appendChild(this.searchInput);
        }

        // Calendar list container
        this.calendarList = document.createElement('div');
        this.calendarList.className = 'timeline-calendar-filter-list';
        dropdown.appendChild(this.calendarList);

        this.renderCalendarList(calendars, selectedIds, calendarGroups, searchTerm);

        this._appendFooter(dropdown);

        return {
            searchInput: this.searchInput,
            refreshBtn: this.refreshBtn,
            calendarList: this.calendarList,
        };
    }

    /**
     * Render a status line (loading, error) in place of the list, keeping
     * the title and the settings link around it.
     * @param {HTMLElement} dropdown - The dropdown container element
     * @param {string} message - Text to show
     * @param {Object} [options]
     * @param {boolean} [options.busy=false] - Spin and disable the refresh button
     * @returns {{ refreshBtn: HTMLElement }}
     */
    renderStatus(dropdown, message, { busy = false } = {}) {
        dropdown.innerHTML = '';
        dropdown.appendChild(this._createHead({ busy }));
        this.searchInput = null;
        this.calendarList = null;

        const status = document.createElement('div');
        status.className = 'timeline-calendar-filter-status';
        status.setAttribute('role', 'status');
        status.textContent = message;
        dropdown.appendChild(status);

        this._appendFooter(dropdown);
        return { refreshBtn: this.refreshBtn };
    }

    /**
     * Render (or re-render) the calendar list inside the existing
     * calendarList container.
     */
    renderCalendarList(calendars, selectedIds, calendarGroups, searchTerm) {
        if (!this.calendarList) return;
        this.calendarList.innerHTML = '';

        if (!calendars || calendars.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'timeline-calendar-filter-status';
            empty.textContent = window.getLocalizedMessage('noCalendarsAvailable');
            this.calendarList.appendChild(empty);
            return;
        }

        // Filter by search term
        const term = (searchTerm || '').toLowerCase().trim();
        const filtered = term
            ? calendars.filter(c => (c.summary || '').toLowerCase().includes(term))
            : calendars;

        if (filtered.length === 0) {
            const noResult = document.createElement('div');
            noResult.className = 'timeline-calendar-filter-status';
            noResult.textContent = window.getLocalizedMessage('noCalendarsAvailable');
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

                this._renderGroupSection(group, groupCalendars, calendars, selectedIds);
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
     * @param {Array} calendars - Full calendars array
     * @param {Array<string>} selectedIds - Current selectedIds array
     * @param {Array} calendarGroups - Current calendarGroups array
     */
    updateGroupCheckboxStates(calendarList, calendars, selectedIds, calendarGroups) {
        if (!calendarList || calendarGroups.length === 0) return;

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
     * Title row: "Calendars to show" and the refresh button.
     * @private
     */
    _createHead({ busy = false } = {}) {
        const head = document.createElement('div');
        head.className = 'timeline-calendar-filter-head';

        const title = document.createElement('div');
        title.className = 'timeline-calendar-filter-title';
        title.id = 'timeline-calendar-filter-title';
        title.textContent = window.getLocalizedMessage('calendarFilterTitle');

        this.refreshBtn = document.createElement('button');
        this.refreshBtn.type = 'button';
        this.refreshBtn.className = 'timeline-calendar-filter-refresh-btn';
        this.refreshBtn.title = window.getLocalizedMessage('calendarFilterRefreshTooltip');
        this.refreshBtn.setAttribute('aria-label', window.getLocalizedMessage('calendarFilterRefreshTooltip'));
        const icon = document.createElement('i');
        icon.className = busy ? 'fa-solid fa-arrows-rotate fa-spin' : 'fa-solid fa-arrows-rotate';
        icon.setAttribute('aria-hidden', 'true');
        this.refreshBtn.appendChild(icon);
        this.refreshBtn.disabled = busy;
        this.refreshBtn.addEventListener('click', () => {
            this._onRefreshClick();
        });

        head.appendChild(title);
        head.appendChild(this.refreshBtn);
        return head;
    }

    /**
     * "Manage calendars in Settings" under a divider.
     * @private
     */
    _appendFooter(dropdown) {
        if (!this._onManageClick) return;
        const footer = document.createElement('div');
        footer.className = 'timeline-calendar-filter-footer';

        const link = document.createElement('button');
        link.type = 'button';
        link.className = 'timeline-calendar-filter-manage';
        link.textContent = window.getLocalizedMessage('calendarFilterManage');
        link.addEventListener('click', () => {
            this._onManageClick();
        });

        footer.appendChild(link);
        dropdown.appendChild(footer);
    }

    /**
     * Group header: a disclosure button (chevron and name) and, on the
     * right in line with the calendars' checkboxes, one checkbox for the
     * whole group.
     * @private
     */
    _createGroupHeader(name, groupId) {
        const header = document.createElement('div');
        header.className = 'timeline-calendar-filter-group-header';
        if (groupId !== undefined) {
            header.dataset.groupId = groupId;
        }

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'timeline-calendar-filter-group-toggle';
        toggle.setAttribute('aria-expanded', 'true');

        const collapseIcon = document.createElement('i');
        collapseIcon.className = 'fa-solid fa-chevron-down group-collapse-icon';
        collapseIcon.setAttribute('aria-hidden', 'true');

        const nameSpan = document.createElement('span');
        nameSpan.className = 'group-name';
        nameSpan.textContent = name;

        toggle.appendChild(collapseIcon);
        toggle.appendChild(nameSpan);
        toggle.addEventListener('click', () => {
            const body = header.nextElementSibling;
            if (body) body.classList.toggle('collapsed');
            collapseIcon.classList.toggle('collapsed');
            toggle.setAttribute('aria-expanded', String(!collapseIcon.classList.contains('collapsed')));
        });

        header.appendChild(toggle);
        return header;
    }

    /**
     * Render a group section in the filter dropdown
     * @private
     */
    _renderGroupSection(group, calendars, allCalendars, selectedIds) {
        const header = this._createGroupHeader(group.name, group.id);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'timeline-calendar-filter-checkbox';
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

        checkbox.addEventListener('change', () => {
            this._onGroupToggle(group, calendars, checkbox.checked);
        });

        header.appendChild(checkbox);
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
        const header = this._createGroupHeader(window.getLocalizedMessage('ungrouped') || 'Ungrouped');
        this.calendarList.appendChild(header);

        const body = document.createElement('div');
        body.className = 'timeline-calendar-filter-group-body';

        calendars.forEach(calendar => {
            this._renderCalendarItem(body, calendar, selectedIds);
        });

        this.calendarList.appendChild(body);
    }

    /**
     * Render a single calendar item: colour, name, checkbox on the right
     * @private
     */
    _renderCalendarItem(container, calendar, selectedIds) {
        const isSelected = selectedIds.includes(calendar.id);
        const item = document.createElement('label');
        item.className = 'timeline-calendar-filter-item';

        // Color indicator (the calendar's own colour is data, not theme)
        const color = document.createElement('span');
        color.className = 'timeline-calendar-filter-color';
        if (calendar.backgroundColor) {
            color.style.setProperty('--calendar-color', calendar.backgroundColor);
        }
        color.setAttribute('aria-hidden', 'true');

        // Name
        const name = document.createElement('span');
        name.className = 'timeline-calendar-filter-name';
        name.textContent = calendar.summary;
        if (calendar.primary) {
            name.classList.add('timeline-calendar-filter-primary');
        }

        // Checkbox (the main calendar is always shown)
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'timeline-calendar-filter-checkbox';
        checkbox.checked = isSelected || calendar.primary;
        if (calendar.primary) {
            checkbox.disabled = true;
            item.classList.add('is-locked');
        }
        checkbox.addEventListener('change', () => {
            this._onCalendarToggle(calendar.id, checkbox.checked);
        });

        item.appendChild(color);
        item.appendChild(name);
        item.appendChild(checkbox);
        container.appendChild(item);
    }
}
