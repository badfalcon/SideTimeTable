/**
 * GroupModalBuilder - DOM construction for the create/edit group modal.
 *
 * Extracted from CalendarGroupManager to isolate the modal DOM generation
 * from the group CRUD business logic.
 */

export class GroupModalBuilder {

    /**
     * Build the group modal overlay and return references.
     * @param {Object} options
     * @param {Object|null} options.editingGroup - Group to edit, or null for create
     * @param {Array} options.allCalendars - All available calendars
     * @param {Function} options.onClose - Called when modal should close
     * @param {Function} options.onSubmit - Called with (name, checkboxes, editingGroup)
     * @returns {{ overlay: HTMLElement, nameInput: HTMLElement, keyHandler: Function }}
     */
    build({ editingGroup, allCalendars, onClose, onSubmit }) {
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
        const header = this._buildHeader(modalTitle, onClose);
        modal.appendChild(header);

        // Body
        const { body, nameInput, checkboxes } = this._buildBody(allCalendars, existingCalendarIds, editingGroup);
        modal.appendChild(body);

        // Footer
        const footer = this._buildFooter(submitLabel, onClose, () => {
            onSubmit(nameInput.value.trim(), checkboxes, editingGroup);
        });
        modal.appendChild(footer);

        overlay.appendChild(modal);

        // Keyboard handler: Escape to close + focus trap
        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                onClose();
                return;
            }
            if (e.key === 'Tab') {
                const focusable = Array.from(modal.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                )).filter(el => el.offsetParent !== null);
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

        // Click overlay to close
        overlay.addEventListener('mousedown', (e) => {
            if (e.target === overlay) onClose();
        });

        // Enter key in name input submits
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                onSubmit(nameInput.value.trim(), checkboxes, editingGroup);
            }
        });

        return { overlay, nameInput, keyHandler };
    }

    /**
     * @private
     */
    _buildHeader(title, onClose) {
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

    /**
     * @private
     */
    _buildBody(allCalendars, existingCalendarIds, editingGroup) {
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
        if (editingGroup) {
            nameInput.value = editingGroup.name;
        }

        body.appendChild(nameLabel);
        body.appendChild(nameInput);

        // Calendar selection label
        const calLabel = document.createElement('label');
        calLabel.className = 'form-label fw-bold';
        calLabel.textContent = window.getLocalizedMessage('selectCalendarsLabel') || 'Select Calendars';
        body.appendChild(calLabel);

        // Chip area + calendar list
        const chipArea = document.createElement('div');
        chipArea.className = 'create-group-modal-chip-area';
        body.appendChild(chipArea);

        // Search input
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'form-control form-control-sm mb-2';
        searchInput.placeholder = window.getLocalizedMessage('searchCalendars') || 'Search calendars...';
        searchInput.setAttribute('aria-label', window.getLocalizedMessage('searchCalendars') || 'Search calendars');
        body.appendChild(searchInput);

        const calList = document.createElement('div');
        calList.className = 'create-group-modal-calendar-list';

        // Exclude primary calendar
        const sortedCalendars = allCalendars
            .filter(c => !c.primary)
            .sort((a, b) => (a.summary || '').localeCompare(b.summary || ''));

        const calendarInfoMap = new Map();
        for (const cal of sortedCalendars) {
            calendarInfoMap.set(cal.id, { name: cal.summary || cal.id, color: cal.backgroundColor || '' });
        }

        const checkboxes = [];
        const calItems = [];

        // Chip rendering function
        const renderChips = () => {
            chipArea.innerHTML = '';
            const selectedIds = checkboxes.filter(cb => cb.checked).map(cb => cb.value);
            if (selectedIds.length === 0) {
                chipArea.style.display = 'none';
                return;
            }
            chipArea.style.display = '';
            for (const id of selectedIds) {
                const info = calendarInfoMap.get(id);
                if (!info) continue;
                chipArea.appendChild(this._buildChip(info, id, checkboxes, renderChips));
            }
        };

        if (sortedCalendars.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'text-muted p-2';
            empty.textContent = window.getLocalizedMessage('noCalendarsToAdd')
                || 'No calendars available. Refresh the calendar list first.';
            calList.appendChild(empty);
        } else {
            for (const cal of sortedCalendars) {
                const { wrapper, checkbox } = this._buildCalendarCheckbox(cal, existingCalendarIds, renderChips);
                calList.appendChild(wrapper);
                checkboxes.push(checkbox);
                calItems.push({ element: wrapper, name: (cal.summary || cal.id).toLowerCase() });
            }
        }

        body.appendChild(calList);
        renderChips();

        // Filter calendar items as user types
        searchInput.addEventListener('input', () => {
            const term = searchInput.value.toLowerCase().trim();
            for (const item of calItems) {
                item.element.style.display = (!term || item.name.includes(term)) ? '' : 'none';
            }
        });

        return { body, nameInput, checkboxes };
    }

    /**
     * @private
     */
    _buildChip(info, id, checkboxes, renderChips) {
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

    /**
     * @private
     */
    _buildCalendarCheckbox(cal, existingCalendarIds, renderChips) {
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
        checkbox.addEventListener('change', () => renderChips());

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

        return { wrapper, checkbox };
    }

    /**
     * @private
     */
    _buildFooter(submitLabel, onClose, onSubmitClick) {
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
