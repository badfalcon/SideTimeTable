/**
 * CalendarGroupManager - Group CRUD operations, modal, and popover management
 *
 * Extracted from CalendarManagementCard to handle all group-related business
 * logic independently from the card UI lifecycle.
 */

import { logError } from '../../../lib/utils.js';
import { saveCalendarGroups } from '../../../lib/settings-storage.js';
import { GroupModalBuilder } from './group-modal-builder.js';

export class CalendarGroupManager {
    /**
     * @param {Object} options
     * @param {Function} options.getCalendarGroups - Returns current calendarGroups array
     * @param {Function} options.setCalendarGroups - Sets calendarGroups array
     * @param {Function} options.getSelectedCalendarIds - Returns current selectedCalendarIds
     * @param {Function} options.setSelectedCalendarIds - Sets selectedCalendarIds
     * @param {Function} options.getAllCalendars - Returns all calendars
     * @param {Function} options.onGroupsChanged - Called after group changes (triggers render)
     * @param {Function} options.onSelectionChanged - Called after selection changes with diff
     * @param {Function} options.getAddGroupBtn - Returns add group button element
     */
    constructor(options) {
        this._getCalendarGroups = options.getCalendarGroups;
        this._setCalendarGroups = options.setCalendarGroups;
        this._getSelectedCalendarIds = options.getSelectedCalendarIds;
        this._setSelectedCalendarIds = options.setSelectedCalendarIds;
        this._getAllCalendars = options.getAllCalendars;
        this._onGroupsChanged = options.onGroupsChanged;
        this._onSelectionChanged = options.onSelectionChanged;
        this._getAddGroupBtn = options.getAddGroupBtn;

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
        this._groupModalTrigger = null;
    }

    destroy() {
        this.closePopover();
        this.closeGroupModal();
        if (this._collapseSaveTimer) {
            clearTimeout(this._collapseSaveTimer);
            this._collapseSaveTimer = null;
        }
    }

    /**
     * Show group assignment popover for a calendar
     */
    showGroupAssignPopover(calendarId, anchorElement) {
        this.closePopover();

        const calendarGroups = this._getCalendarGroups();

        const popover = document.createElement('div');
        popover.className = 'calendar-group-assign-popover';
        popover.setAttribute('role', 'dialog');
        popover.setAttribute('aria-label', window.getLocalizedMessage('assignToGroups') || 'Assign to groups');

        if (calendarGroups.length === 0) {
            popover.textContent = window.getLocalizedMessage('noGroupsAvailable') || 'No groups available';
            popover.setAttribute('tabindex', '-1');
        } else {
            calendarGroups.forEach(group => {
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
        }

        // Position popover using fixed positioning to avoid overflow clipping
        const rect = anchorElement.getBoundingClientRect();
        popover.style.top = `${rect.bottom + 4}px`;
        popover.style.right = `${document.documentElement.clientWidth - rect.right}px`;
        document.body.appendChild(popover);

        this._activePopover = popover;

        // Escape key closes popover
        this._popoverKeyHandler = (e) => {
            if (e.key === 'Escape') {
                this.closePopover();
                anchorElement.focus();
            }
        };
        document.addEventListener('keydown', this._popoverKeyHandler);

        // Focus first interactive element in popover
        const focusTarget = popover.querySelector('input[type="checkbox"]') || popover;
        setTimeout(() => focusTarget.focus(), 0);

        this._popoverCloseHandler = (e) => {
            if (!this._activePopover) return;
            if (!popover.contains(e.target) && !anchorElement.contains(e.target)) {
                this.closePopover();
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
     */
    closePopover() {
        if (this._popoverTimerId) {
            clearTimeout(this._popoverTimerId);
            this._popoverTimerId = null;
        }
        if (this._popoverKeyHandler) {
            document.removeEventListener('keydown', this._popoverKeyHandler);
            this._popoverKeyHandler = null;
        }
        if (this._activePopover) {
            this._activePopover.remove();
            this._activePopover = null;
        }
        if (this._popoverCloseHandler) {
            document.removeEventListener('click', this._popoverCloseHandler);
            this._popoverCloseHandler = null;
        }
    }

    /**
     * Handle calendar group assignment change
     */
    async handleCalendarGroupAssignment(calendarId, groupId, assigned) {
        return this._handleCalendarGroupAssignment(calendarId, groupId, assigned);
    }

    /**
     * @private
     */
    async _handleCalendarGroupAssignment(calendarId, groupId, assigned) {
        const allCalendars = this._getAllCalendars();
        const calendarGroups = this._getCalendarGroups();

        const primaryCalendar = allCalendars.find(c => c.primary);
        if (primaryCalendar && primaryCalendar.id === calendarId) return;
        const group = calendarGroups.find(g => g.id === groupId);
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
            await saveCalendarGroups(calendarGroups);
            this.closePopover();
            this._onGroupsChanged();
        } catch (error) {
            group.calendarIds = previousCalendarIds;
            this.closePopover();
            this._onGroupsChanged();
            logError('Calendar group assignment save', error);
        }
    }

    /**
     * Handle adding a new group — opens modal
     */
    handleAddGroup() {
        this.showGroupModal(null);
    }

    /**
     * Show the group modal for create or edit
     * @param {Object|null} editingGroup - existing group to edit, or null for create
     */
    showGroupModal(editingGroup) {
        this._groupModalTrigger = document.activeElement;
        this.closePopover();
        this.closeGroupModal();
        this._isSubmittingGroup = false;

        const builder = new GroupModalBuilder();
        const { overlay, nameInput, keyHandler } = builder.build({
            editingGroup,
            allCalendars: this._getAllCalendars(),
            onClose: () => this.closeGroupModal(),
            onSubmit: (name, checkboxes, group) => this._submitGroupModal(name, checkboxes, group)
        });

        this._createGroupModalKeyHandler = keyHandler;
        document.addEventListener('keydown', this._createGroupModalKeyHandler);

        this._createGroupModalOverlay = overlay;
        document.body.appendChild(overlay);

        setTimeout(() => nameInput.focus(), 0);
    }

    /**
     * Submit the group modal (create or edit)
     * @private
     */
    async _submitGroupModal(name, checkboxes, editingGroup) {
        if (this._isSubmittingGroup) return;
        this._isSubmittingGroup = true;

        const calendarGroups = this._getCalendarGroups();
        const groupName = name || (window.getLocalizedMessage('newGroupName') || 'New Group');
        const selectedCalIds = checkboxes
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        if (editingGroup) {
            const previousName = editingGroup.name;
            const previousCalendarIds = [...editingGroup.calendarIds];
            editingGroup.name = groupName.slice(0, 50);
            editingGroup.calendarIds = selectedCalIds;

            try {
                await saveCalendarGroups(calendarGroups);
                this.closeGroupModal();
                this._onGroupsChanged();
            } catch (error) {
                editingGroup.name = previousName;
                editingGroup.calendarIds = previousCalendarIds;
                logError('Edit group', error);
            } finally {
                this._isSubmittingGroup = false;
            }
        } else {
            const groupId = `group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const newGroup = {
                id: groupId,
                name: groupName.slice(0, 50),
                calendarIds: selectedCalIds,
                collapsed: false
            };
            calendarGroups.push(newGroup);

            try {
                await saveCalendarGroups(calendarGroups);
                this.closeGroupModal();
                this._onGroupsChanged();
            } catch (error) {
                this._setCalendarGroups(calendarGroups.filter(g => g.id !== groupId));
                logError('Add group', error);
            } finally {
                this._isSubmittingGroup = false;
            }
        }
    }

    /**
     * Close the group modal
     */
    closeGroupModal() {
        const wasOpen = !!this._createGroupModalOverlay;
        if (this._createGroupModalKeyHandler) {
            document.removeEventListener('keydown', this._createGroupModalKeyHandler);
            this._createGroupModalKeyHandler = null;
        }
        if (this._createGroupModalOverlay) {
            this._createGroupModalOverlay.remove();
            this._createGroupModalOverlay = null;
        }
        if (wasOpen) {
            const trigger = this._groupModalTrigger;
            this._groupModalTrigger = null;
            if (trigger && trigger.isConnected) {
                trigger.focus();
            } else {
                const addGroupBtn = this._getAddGroupBtn();
                if (addGroupBtn && addGroupBtn.isConnected) {
                    addGroupBtn.focus();
                }
            }
        }
    }

    /**
     * Handle deleting a group
     */
    async handleDeleteGroup(groupId) {
        const confirmMsg = window.getLocalizedMessage('deleteGroupConfirm')
            || 'Delete this group? Calendars will be moved to Ungrouped.';
        if (!confirm(confirmMsg)) return;

        const calendarGroups = this._getCalendarGroups();
        const previousGroups = [...calendarGroups];
        this._setCalendarGroups(calendarGroups.filter(g => g.id !== groupId));

        try {
            await saveCalendarGroups(this._getCalendarGroups());
            this._onGroupsChanged();
        } catch (error) {
            this._setCalendarGroups(previousGroups);
            logError('Delete group', error);
        }
    }

    /**
     * Open edit modal for a group
     */
    handleStartRenameGroup(groupId) {
        const group = this._getCalendarGroups().find(g => g.id === groupId);
        if (!group) return;
        this.showGroupModal(group);
    }

    /**
     * Handle group toggle (select/deselect all calendars in group)
     */
    async handleGroupToggle(groupId, isChecked) {
        const calendarGroups = this._getCalendarGroups();
        const selectedCalendarIds = [...this._getSelectedCalendarIds()];
        const allCalendars = this._getAllCalendars();

        const group = calendarGroups.find(g => g.id === groupId);
        if (!group || group.calendarIds.length === 0) return;

        const previousIds = [...selectedCalendarIds];
        const primaryId = allCalendars.find(c => c.primary)?.id;

        if (isChecked) {
            const allCalendarIds = new Set(allCalendars.map(c => c.id));
            for (const calId of group.calendarIds) {
                if (allCalendarIds.has(calId) && !selectedCalendarIds.includes(calId)) {
                    selectedCalendarIds.push(calId);
                }
            }
        } else {
            const otherGroupSelectedIds = this._getOtherGroupSelectedIds(groupId);
            const filtered = selectedCalendarIds.filter(id => {
                if (id === primaryId) return true;
                if (!group.calendarIds.includes(id)) return true;
                if (otherGroupSelectedIds.has(id)) return true;
                return false;
            });
            selectedCalendarIds.length = 0;
            selectedCalendarIds.push(...filtered);
        }

        this._setSelectedCalendarIds(selectedCalendarIds);

        try {
            const { saveSelectedCalendars } = await import('../../../lib/settings-storage.js');
            await saveSelectedCalendars(selectedCalendarIds);
            const addedIds = selectedCalendarIds.filter(id => !previousIds.includes(id));
            const removedIds = previousIds.filter(id => !selectedCalendarIds.includes(id));
            this._onSelectionChanged(selectedCalendarIds, { addedIds, removedIds });
            this._onGroupsChanged();
        } catch (error) {
            this._setSelectedCalendarIds(previousIds);
            this._onGroupsChanged();
            logError('Group toggle save', error);
        }
    }

    /**
     * Get calendar IDs that are selected and belong to other active groups
     * @private
     */
    _getOtherGroupSelectedIds(excludeGroupId) {
        const calendarGroups = this._getCalendarGroups();
        const selectedCalendarIds = this._getSelectedCalendarIds();
        const ids = new Set();
        for (const group of calendarGroups) {
            if (group.id === excludeGroupId) continue;
            for (const calId of group.calendarIds) {
                if (selectedCalendarIds.includes(calId)) {
                    ids.add(calId);
                }
            }
        }
        return ids;
    }

    /**
     * Handle group collapse/expand
     * @param {string} groupId
     * @param {HTMLElement} calendarList - The calendar list DOM element
     */
    async handleGroupCollapse(groupId, calendarList) {
        if (groupId === '__ungrouped__') {
            const header = calendarList.querySelector('.calendar-group-header[data-group-id="__ungrouped__"]');
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

        const calendarGroups = this._getCalendarGroups();
        const group = calendarGroups.find(g => g.id === groupId);
        if (!group) return;

        group.collapsed = !group.collapsed;

        // Update UI directly without full re-render
        const header = calendarList.querySelector(`.calendar-group-header[data-group-id="${CSS.escape(groupId)}"]`);
        if (header) {
            const body = header.nextElementSibling;
            const icon = header.querySelector('.group-collapse-icon');
            if (body) body.classList.toggle('collapsed', group.collapsed);
            if (icon) icon.classList.toggle('collapsed', group.collapsed);
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
                await saveCalendarGroups(this._getCalendarGroups());
            } catch (error) {
                logError('Group save (debounced)', error);
            }
        }, 1000);
    }
}
