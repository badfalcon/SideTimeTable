/**
 * CalendarListRenderer - Calendar list rendering, search, and UI state management
 *
 * Extracted from CalendarManagementCard to handle all list rendering and search
 * independently from the card UI lifecycle and group management logic.
 *
 * All data and DOM elements are passed directly as method parameters —
 * the renderer holds no references to external state.
 *
 * Rows read like the side panel's calendar filter: colour, name, then the
 * checkbox on the right. A group header folds its calendars and carries the
 * group's checkbox in the same column.
 */
import { createIcon, createIconButton, createNotice, msg } from '../base/settings-dom.js';

/**
 * A checkbox for the calendar list.
 * @param {string} label - Accessible name
 * @returns {HTMLInputElement}
 */
function createListCheckbox(label) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'calendar-checkbox';
    checkbox.setAttribute('aria-label', label || '');
    return checkbox;
}

/**
 * The number of calendars under a group header.
 * @param {number} count
 * @returns {HTMLElement}
 */
function createCount(count) {
    const badge = document.createElement('span');
    badge.className = 'group-count';
    badge.textContent = String(count);
    return badge;
}

export class CalendarListRenderer {
    /**
     * Create a group section (header + body)
     */
    createGroupSection(group, calendars, searchTerm, selectedCalendarIds, allCalendars, calendarGroups) {
        const section = document.createElement('div');
        section.className = 'calendar-group-section';

        const header = this.createGroupHeader(group, calendars, allCalendars, selectedCalendarIds);
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
            const isSelected = selectedCalendarIds.includes(calendar.id);
            const item = this.createCalendarItem(calendar, isSelected, calendarGroups);
            body.appendChild(item);
        });

        section.appendChild(body);
        return section;
    }

    /**
     * Create a group header
     */
    createGroupHeader(group, _calendarsInGroup, allCalendars, selectedCalendarIds) {
        const header = document.createElement('div');
        header.className = 'calendar-group-header';
        header.dataset.groupId = group.id;

        // Group checkbox
        const checkbox = createListCheckbox(group.name);

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

        // Collapse icon
        const collapseIcon = createIcon(`fas fa-chevron-down group-collapse-icon${group.collapsed ? ' collapsed' : ''}`);

        // Group name
        const nameSpan = document.createElement('span');
        nameSpan.className = 'group-name';
        nameSpan.textContent = group.name;

        // Action buttons
        const actions = document.createElement('div');
        actions.className = 'group-actions';

        const editBtn = createIconButton({ icon: 'fas fa-pen', labelKey: 'editGroup', labelFallback: 'Edit' });
        editBtn.dataset.groupEdit = group.id;

        const deleteBtn = createIconButton({ icon: 'fas fa-trash-can', labelKey: 'deleteGroup', labelFallback: 'Delete' });
        deleteBtn.dataset.groupDelete = group.id;

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');
        header.setAttribute('aria-expanded', group.collapsed ? 'false' : 'true');
        header.appendChild(collapseIcon);
        header.appendChild(nameSpan);
        header.appendChild(createCount(fullGroupIds.length));
        header.appendChild(actions);
        header.appendChild(checkbox);

        return header;
    }

    /**
     * Create ungrouped section
     */
    createUngroupedSection(calendars, _searchTerm, selectedCalendarIds, calendarGroups) {
        const section = document.createElement('div');
        section.className = 'calendar-group-section';

        // Ungrouped header (simplified, no edit/delete)
        const header = document.createElement('div');
        header.className = 'calendar-group-header';
        header.dataset.groupId = '__ungrouped__';

        const collapseIcon = createIcon('fas fa-chevron-down group-collapse-icon');

        const nameSpan = document.createElement('span');
        nameSpan.className = 'group-name';
        nameSpan.textContent = msg('ungrouped', 'Ungrouped');

        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');
        header.setAttribute('aria-expanded', 'true');
        header.appendChild(collapseIcon);
        header.appendChild(nameSpan);
        header.appendChild(createCount(calendars.length));
        section.appendChild(header);

        const body = document.createElement('div');
        body.className = 'calendar-group-body';

        calendars.forEach(calendar => {
            const isSelected = selectedCalendarIds.includes(calendar.id);
            const item = this.createCalendarItem(calendar, isSelected, calendarGroups);
            body.appendChild(item);
        });

        section.appendChild(body);
        return section;
    }

    /**
     * Create calendar item
     */
    createCalendarItem(calendar, isSelected, calendarGroups) {
        const item = document.createElement('div');
        item.className = 'calendar-item';
        item.dataset.calendarId = calendar.id;

        // The colour (the calendar's own, so set from data)
        const colorIndicator = document.createElement('span');
        colorIndicator.className = 'calendar-color-indicator';
        colorIndicator.setAttribute('aria-hidden', 'true');
        if (calendar.backgroundColor) {
            colorIndicator.style.setProperty('--calendar-color', calendar.backgroundColor);
        }

        // The name, and "Primary" for the main calendar (always shown)
        const name = document.createElement('span');
        name.className = 'calendar-name';
        name.textContent = calendar.summary;
        if (calendar.primary) {
            item.classList.add('is-primary');
            const badge = document.createElement('span');
            badge.className = 'calendar-primary-badge';
            badge.setAttribute('data-localize', '__MSG_primaryCalendar__');
            badge.textContent = msg('primaryCalendar', 'Primary');
            name.appendChild(badge);
        }

        // The checkbox, on the right
        const checkbox = createListCheckbox(calendar.summary);
        checkbox.checked = isSelected;
        if (calendar.primary) {
            checkbox.disabled = true;
            checkbox.checked = true;
        }

        item.appendChild(colorIndicator);
        item.appendChild(name);

        // Group assign button (only if groups exist)
        if (calendarGroups.length > 0 && !calendar.primary) {
            const assignBtn = createIconButton({ icon: 'fas fa-folder', labelKey: 'assignToGroups', labelFallback: 'Assign to groups' });
            assignBtn.classList.add('calendar-group-assign-btn');
            item.appendChild(assignBtn);
        }
        item.appendChild(checkbox);

        return item;
    }

    /**
     * Set loading state
     */
    setLoading(loading, loadingIndicator, refreshBtn) {
        if (loadingIndicator) {
            loadingIndicator.textContent = loading ? msg('screenReaderLoading', 'Loading...') : '';
        }
        if (refreshBtn) {
            refreshBtn.disabled = loading;
            refreshBtn.querySelector('i')?.classList.toggle('fa-spin', loading);
        }
    }

    /**
     * Show empty state
     */
    showEmptyState(calendarList, noCalendarsMsg) {
        calendarList.innerHTML = '';
        noCalendarsMsg.style.display = 'block';
    }

    /**
     * Show no search results
     */
    showNoSearchResults(calendarList, noCalendarsMsg) {
        const noResultsMsg = window.getLocalizedMessage('noSearchResults') || 'No search results found';
        calendarList.innerHTML = '';
        const div = document.createElement('div');
        div.className = 'settings-empty';
        div.textContent = noResultsMsg;
        calendarList.appendChild(div);
        noCalendarsMsg.style.display = 'none';
    }

    /**
     * Hide empty state
     */
    hideEmptyState(noCalendarsMsg) {
        noCalendarsMsg.style.display = 'none';
    }

    /**
     * Update search UI
     */
    updateSearchUI(searchTerm, clearSearchBtn) {
        if (clearSearchBtn) {
            clearSearchBtn.hidden = !searchTerm;
        }
    }

    /**
     * Show error
     */
    showError(message, calendarList) {
        const errorDiv = createNotice({ content: message, tone: 'danger' });

        if (calendarList?.parentElement) {
            calendarList.parentElement.insertBefore(errorDiv, calendarList);
        }
    }
}
