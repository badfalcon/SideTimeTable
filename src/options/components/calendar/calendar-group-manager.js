/**
 * CalendarGroupManager - Group CRUD operations, modal, and popover management
 *
 * Extracted from CalendarManagementCard to handle all group-related business
 * logic independently from the card UI lifecycle.
 */

import { logError } from '../../../lib/utils.js';
import { saveCalendarGroups, saveSelectedCalendars } from '../../../lib/settings-storage.js';

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

        const { overlay, nameInput, keyHandler } = this._buildGroupModal(
            editingGroup,
            this._getAllCalendars(),
            () => this.closeGroupModal(),
            (name, checkboxes, group) => this._submitGroupModal(name, checkboxes, group)
        );

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

    // ── Group Modal DOM Construction ─────────────────────────────────

    /**
     * Build the group modal overlay and return references.
     * @private
     */
    _buildGroupModal(editingGroup, allCalendars, onClose, onSubmit) {
        const isEdit = !!editingGroup;
        const modalTitle = isEdit
            ? (window.getLocalizedMessage('editGroupTitle') || 'Edit Group')
            : (window.getLocalizedMessage('createGroupTitle') || 'Create Group');
        const submitLabel = isEdit
            ? (window.getLocalizedMessage('saveGroupButton') || 'Save')
            : (window.getLocalizedMessage('createGroupButton') || 'Create');
        const existingCalendarIds = isEdit ? new Set(editingGroup.calendarIds) : new Set();

        const overlay = document.createElement('div');
        overlay.className = 'create-group-modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'create-group-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', modalTitle);

        modal.appendChild(this._buildModalHeader(modalTitle, onClose));

        const { body, nameInput, checkboxes } = this._buildModalBody(allCalendars, existingCalendarIds, editingGroup);
        modal.appendChild(body);

        modal.appendChild(this._buildModalFooter(submitLabel, onClose, () => {
            onSubmit(nameInput.value.trim(), checkboxes, editingGroup);
        }));

        overlay.appendChild(modal);

        const keyHandler = (e) => {
            if (e.key === 'Escape') { onClose(); return; }
            if (e.key === 'Tab') {
                const focusable = Array.from(modal.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                )).filter(el => el.offsetParent !== null);
                if (focusable.length === 0) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };

        overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) onClose(); });
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); onSubmit(nameInput.value.trim(), checkboxes, editingGroup); }
        });

        return { overlay, nameInput, keyHandler };
    }

    /** @private */
    _buildModalHeader(title, onClose) {
        const header = document.createElement('div');
        header.className = 'create-group-modal-header';
        const h5 = document.createElement('h5');
        h5.textContent = title;
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'btn-close';
        closeBtn.setAttribute('aria-label', window.getLocalizedMessage('close') || 'Close');
        closeBtn.addEventListener('click', () => onClose());
        header.appendChild(h5);
        header.appendChild(closeBtn);
        return header;
    }

    /** @private */
    _buildModalBody(allCalendars, existingCalendarIds, editingGroup) {
        const body = document.createElement('div');
        body.className = 'create-group-modal-body';

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
        if (editingGroup) nameInput.value = editingGroup.name;
        body.appendChild(nameLabel);
        body.appendChild(nameInput);

        const calLabel = document.createElement('label');
        calLabel.className = 'form-label fw-bold';
        calLabel.textContent = window.getLocalizedMessage('selectCalendarsLabel') || 'Select Calendars';
        body.appendChild(calLabel);

        const chipArea = document.createElement('div');
        chipArea.className = 'create-group-modal-chip-area';
        body.appendChild(chipArea);

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'form-control form-control-sm mb-2';
        searchInput.placeholder = window.getLocalizedMessage('searchCalendars') || 'Search calendars...';
        searchInput.setAttribute('aria-label', window.getLocalizedMessage('searchCalendars') || 'Search calendars');
        body.appendChild(searchInput);

        const calList = document.createElement('div');
        calList.className = 'create-group-modal-calendar-list';

        const sortedCalendars = allCalendars.filter(c => !c.primary)
            .sort((a, b) => (a.summary || '').localeCompare(b.summary || ''));

        const calendarInfoMap = new Map();
        for (const cal of sortedCalendars) {
            calendarInfoMap.set(cal.id, { name: cal.summary || cal.id, color: cal.backgroundColor || '' });
        }

        const checkboxes = [];
        const calItems = [];

        const renderChips = () => {
            chipArea.innerHTML = '';
            const selectedIds = checkboxes.filter(cb => cb.checked).map(cb => cb.value);
            if (selectedIds.length === 0) { chipArea.style.display = 'none'; return; }
            chipArea.style.display = '';
            for (const id of selectedIds) {
                const info = calendarInfoMap.get(id);
                if (!info) continue;
                chipArea.appendChild(this._buildModalChip(info, id, checkboxes, renderChips));
            }
        };

        if (sortedCalendars.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'text-muted p-2';
            empty.textContent = window.getLocalizedMessage('noCalendarsToAdd') || 'No calendars available. Refresh the calendar list first.';
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
                if (existingCalendarIds.has(cal.id)) checkbox.checked = true;
                checkbox.addEventListener('change', () => renderChips());
                const label = document.createElement('label');
                label.className = 'form-check-label';
                label.htmlFor = checkbox.id;
                const colorDot = document.createElement('span');
                colorDot.className = 'calendar-color-indicator-inline';
                if (cal.backgroundColor) colorDot.style.backgroundColor = cal.backgroundColor;
                const nameSpan = document.createElement('span');
                nameSpan.textContent = cal.summary || cal.id;
                label.appendChild(colorDot);
                label.appendChild(nameSpan);
                wrapper.appendChild(checkbox);
                wrapper.appendChild(label);
                calList.appendChild(wrapper);
                checkboxes.push(checkbox);
                calItems.push({ element: wrapper, name: (cal.summary || cal.id).toLowerCase() });
            }
        }

        body.appendChild(calList);
        renderChips();

        searchInput.addEventListener('input', () => {
            const term = searchInput.value.toLowerCase().trim();
            for (const item of calItems) {
                item.element.style.display = (!term || item.name.includes(term)) ? '' : 'none';
            }
        });

        return { body, nameInput, checkboxes };
    }

    /** @private */
    _buildModalChip(info, id, checkboxes, renderChips) {
        const chip = document.createElement('span');
        chip.className = 'create-group-modal-chip';
        if (info.color) {
            const dot = document.createElement('span');
            dot.className = 'calendar-color-indicator-inline';
            dot.style.backgroundColor = info.color;
            chip.appendChild(dot);
        }
        const nameText = document.createElement('span');
        nameText.textContent = info.name;
        chip.appendChild(nameText);
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'create-group-modal-chip-remove';
        removeBtn.setAttribute('aria-label', `${window.getLocalizedMessage('removeCalendar') || 'Remove'} ${info.name}`);
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', () => {
            const cb = checkboxes.find(c => c.value === id);
            if (cb) cb.checked = false;
            renderChips();
        });
        chip.appendChild(removeBtn);
        return chip;
    }

    /** @private */
    _buildModalFooter(submitLabel, onClose, onSubmitClick) {
        const footer = document.createElement('div');
        footer.className = 'create-group-modal-footer';
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-outline-secondary btn-sm';
        cancelBtn.textContent = window.getLocalizedMessage('cancelButton') || 'Cancel';
        cancelBtn.addEventListener('click', () => onClose());
        const submitBtn = document.createElement('button');
        submitBtn.type = 'button';
        submitBtn.className = 'btn btn-primary btn-sm';
        submitBtn.textContent = submitLabel;
        submitBtn.addEventListener('click', onSubmitClick);
        footer.appendChild(cancelBtn);
        footer.appendChild(submitBtn);
        return footer;
    }
}
