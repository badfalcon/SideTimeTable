/**
 * LocalEventModal - Local event editing modal
 */
import { ModalComponent } from './modal-component.js';
import { RECURRENCE_TYPES } from '../../../lib/constants.js';
import { formatDateString } from '../../../lib/format-utils.js';
import {
    createLabel, createInput, createCheckbox, createSelect,
    createButton, createContainer
} from '../../../lib/form-builder.js';

export class LocalEventModal extends ModalComponent {
    constructor(options = {}) {
        super({
            id: 'localEventDialog',
            ...options
        });

        // Form elements
        this.titleInput = null;
        this.startTimeInput = null;
        this.endTimeInput = null;
        this.saveButton = null;
        this.deleteButton = null;
        this.cancelButton = null;

        // Recurrence elements
        this.recurrenceSelect = null;
        this.recurrenceOptionsContainer = null;
        this.weekdayCheckboxes = {};
        this.endDateInput = null;
        this.noEndDateCheckbox = null;

        // The event being edited
        this.currentEvent = null;

        // Callbacks
        this.onSave = options.onSave || null;
        this.onDelete = options.onDelete || null;
        this.onCancel = options.onCancel || null;
        this.onDeleteSeries = options.onDeleteSeries || null;

        // Edit mode (create/edit)
        this.mode = 'create';
    }

    createContent() {
        const content = document.createElement('div');

        // Title
        const title = document.createElement('h2');
        title.setAttribute('data-localize', '__MSG_eventDialogTitle__');
        title.textContent = chrome.i18n.getMessage('eventDialogTitle');
        content.appendChild(title);

        // Title input
        content.appendChild(createLabel('eventTitle', 'eventTitle'));
        this.titleInput = createInput({ type: 'text', id: 'eventTitle', required: true });
        content.appendChild(this.titleInput);

        // Start time input
        content.appendChild(createLabel('eventStartTime', 'startTime'));
        this.startTimeInput = createInput({ type: 'time', id: 'eventStartTime', list: 'time-list', required: true });
        content.appendChild(this.startTimeInput);

        // End time input
        content.appendChild(createLabel('eventEndTime', 'endTime'));
        this.endTimeInput = createInput({ type: 'time', id: 'eventEndTime', list: 'time-list', required: true });
        content.appendChild(this.endTimeInput);

        // Reminder checkbox
        const reminder = createCheckbox({
            id: 'eventReminder',
            msgKey: 'remindMeBefore',
            checked: true,
            containerStyle: 'margin: 10px 0; display: flex; align-items: center;',
            checkboxStyle: 'margin: 0; flex-shrink: 0;',
            labelStyle: 'margin-left: 8px; user-select: none; cursor: pointer; display: inline-block;'
        });
        this.reminderCheckbox = reminder.checkbox;
        content.appendChild(reminder.container);

        // Recurrence section
        content.appendChild(this._createRecurrenceSection());

        // Button group
        const buttonGroup = createContainer({ className: 'modal-buttons' });

        this.saveButton = createButton({ id: 'saveEventButton', className: 'btn btn-success', msgKey: 'save' });
        this.deleteButton = createButton({ id: 'deleteEventButton', className: 'btn btn-danger', msgKey: 'delete' });
        this.cancelButton = createButton({ id: 'cancelEventButton', className: 'btn btn-secondary', msgKey: 'cancel' });

        buttonGroup.appendChild(this.saveButton);
        buttonGroup.appendChild(this.deleteButton);
        buttonGroup.appendChild(this.cancelButton);
        content.appendChild(buttonGroup);

        this._setupFormEventListeners();

        return content;
    }

    /**
     * Create the recurrence section
     * @returns {HTMLElement}
     * @private
     */
    _createRecurrenceSection() {
        const section = createContainer({
            className: 'recurrence-section',
            style: 'margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 5px;'
        });

        // Recurrence select
        section.appendChild(createLabel('recurrenceType', 'recurrence', 'Recurrence:'));

        this.recurrenceSelect = createSelect({
            id: 'recurrenceType',
            style: 'width: 100%; padding: 6px; margin-top: 5px; border: 1px solid #ced4da; border-radius: 4px;',
            options: [
                { value: RECURRENCE_TYPES.NONE, msgKey: 'recurrenceNone', fallback: 'Does not repeat' },
                { value: RECURRENCE_TYPES.DAILY, msgKey: 'recurrenceDaily', fallback: 'Daily' },
                { value: RECURRENCE_TYPES.WEEKDAYS, msgKey: 'recurrenceWeekdays', fallback: 'Every weekday (Mon-Fri)' },
                { value: RECURRENCE_TYPES.WEEKLY, msgKey: 'recurrenceWeekly', fallback: 'Weekly' },
                { value: RECURRENCE_TYPES.MONTHLY, msgKey: 'recurrenceMonthly', fallback: 'Monthly' }
            ]
        });
        section.appendChild(this.recurrenceSelect);

        // Weekday selection container
        this.recurrenceOptionsContainer = createContainer({
            className: 'recurrence-options',
            style: 'margin-top: 10px; display: none;'
        });

        const weekdayContainer = createContainer({
            className: 'weekday-container',
            style: 'display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px;'
        });

        const weekdays = [
            { value: 0, msgKey: 'daySun', fallback: 'Sun' },
            { value: 1, msgKey: 'dayMon', fallback: 'Mon' },
            { value: 2, msgKey: 'dayTue', fallback: 'Tue' },
            { value: 3, msgKey: 'dayWed', fallback: 'Wed' },
            { value: 4, msgKey: 'dayThu', fallback: 'Thu' },
            { value: 5, msgKey: 'dayFri', fallback: 'Fri' },
            { value: 6, msgKey: 'daySat', fallback: 'Sat' }
        ];

        weekdays.forEach(day => {
            const dayLabel = document.createElement('label');
            dayLabel.style.cssText = 'display: flex; align-items: center; padding: 4px 8px; background: #e9ecef; border-radius: 3px; cursor: pointer; font-size: 0.85em;';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = day.value;
            checkbox.style.cssText = 'margin-right: 4px;';
            this.weekdayCheckboxes[day.value] = checkbox;

            const dayText = document.createElement('span');
            dayText.setAttribute('data-localize', `__MSG_${day.msgKey}__`);
            dayText.textContent = chrome.i18n.getMessage(day.msgKey) || day.fallback;

            dayLabel.appendChild(checkbox);
            dayLabel.appendChild(dayText);
            weekdayContainer.appendChild(dayLabel);
        });

        this.recurrenceOptionsContainer.appendChild(weekdayContainer);
        section.appendChild(this.recurrenceOptionsContainer);

        // End date section
        this.endDateSection = createContainer({
            className: 'end-date-section',
            style: 'margin-top: 10px; display: none;'
        });

        this.endDateSection.appendChild(createLabel('recurrenceEndDate', 'recurrenceEndDate', 'End date:'));

        const endDateRow = createContainer({ style: 'display: flex; align-items: center; gap: 10px; margin-top: 5px;' });

        this.endDateInput = createInput({
            type: 'date',
            id: 'recurrenceEndDate',
            style: 'flex: 1; padding: 6px; border: 1px solid #ced4da; border-radius: 4px;'
        });

        const noEndDate = createCheckbox({
            id: 'noEndDate',
            msgKey: 'noEndDate',
            fallback: 'No end date',
            checked: true,
            checkboxStyle: 'margin-right: 5px;',
            labelStyle: 'display: flex; align-items: center; cursor: pointer; white-space: nowrap;'
        });
        // Use the label as the container for the no-end-date option
        this.noEndDateCheckbox = noEndDate.checkbox;

        endDateRow.appendChild(this.endDateInput);
        endDateRow.appendChild(noEndDate.container);
        this.endDateSection.appendChild(endDateRow);

        section.appendChild(this.endDateSection);

        return section;
    }

    /**
     * Set up form event listeners
     * @private
     */
    _setupFormEventListeners() {
        this.addEventListener(this.saveButton, 'click', () => this._handleSave());
        this.addEventListener(this.deleteButton, 'click', () => this._handleDelete());
        this.addEventListener(this.cancelButton, 'click', () => this._handleCancel());

        this.addEventListener(this.titleInput, 'keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this._handleSave();
            }
        });

        this.addEventListener(this.startTimeInput, 'change', () => this._validateTimes());
        this.addEventListener(this.endTimeInput, 'change', () => this._validateTimes());
        this.addEventListener(this.recurrenceSelect, 'change', () => this._updateRecurrenceOptions());

        this.addEventListener(this.noEndDateCheckbox, 'change', () => {
            this.endDateInput.disabled = this.noEndDateCheckbox.checked;
            if (this.noEndDateCheckbox.checked) {
                this.endDateInput.value = '';
            }
        });
    }

    /**
     * Update recurrence options visibility
     * @private
     */
    _updateRecurrenceOptions() {
        const recurrenceType = this.recurrenceSelect.value;
        this.recurrenceOptionsContainer.style.display =
            recurrenceType === RECURRENCE_TYPES.WEEKLY ? 'block' : 'none';
        this.endDateSection.style.display =
            recurrenceType !== RECURRENCE_TYPES.NONE ? 'block' : 'none';
    }

    /**
     * Save processing
     * @private
     */
    _handleSave() {
        if (!this._validateForm()) {
            return;
        }

        const recurrenceType = this.recurrenceSelect.value;
        let recurrence = null;

        if (recurrenceType !== RECURRENCE_TYPES.NONE) {
            const startDate = this._getStartDateForRecurrence();
            const endDate = this.noEndDateCheckbox.checked ? null : (this.endDateInput.value || null);

            if (endDate && endDate < startDate) {
                this._showError(chrome.i18n.getMessage('endDateMustBeLater') || 'End date must be on or after start date');
                return;
            }

            recurrence = {
                type: recurrenceType,
                interval: 1,
                startDate: startDate,
                endDate: endDate,
                exceptions: this.currentEvent?.recurrence?.exceptions || []
            };

            if (recurrenceType === RECURRENCE_TYPES.WEEKLY) {
                const selectedDays = [];
                Object.entries(this.weekdayCheckboxes).forEach(([day, checkbox]) => {
                    if (checkbox.checked) {
                        selectedDays.push(parseInt(day));
                    }
                });
                if (selectedDays.length === 0) {
                    const startDateObj = new Date(recurrence.startDate + 'T00:00:00');
                    selectedDays.push(startDateObj.getDay());
                }
                recurrence.daysOfWeek = selectedDays;
            }
        }

        const eventData = {
            id: this.currentEvent?.id || null,
            title: this.titleInput.value.trim(),
            startTime: this.startTimeInput.value,
            endTime: this.endTimeInput.value,
            reminder: this.reminderCheckbox.checked,
            recurrence: recurrence,
            isRecurringInstance: this.currentEvent?.isRecurringInstance || false,
            originalId: this.currentEvent?.originalId || null
        };

        if (this.onSave) {
            this.onSave(eventData, this.mode);
        }

        this.hide();
    }

    /**
     * Get the start date for recurrence using formatDateString
     * @returns {string} YYYY-MM-DD format
     * @private
     */
    _getStartDateForRecurrence() {
        const controller = window.sidePanelController;
        if (controller && controller.currentDate) {
            return formatDateString(controller.currentDate);
        }
        return formatDateString(new Date());
    }

    /**
     * Delete processing
     * @private
     */
    _handleDelete() {
        if (!this.currentEvent) {
            return;
        }

        if (this.currentEvent.isRecurringInstance || this.currentEvent.recurrence) {
            this._showDeleteRecurringDialog();
        } else {
            if (this.onDelete) {
                this.onDelete(this.currentEvent);
            }
            this.hide();
        }
    }

    /**
     * Show delete recurring event dialog
     * @private
     */
    _showDeleteRecurringDialog() {
        const overlay = document.createElement('div');
        overlay.className = 'delete-recurring-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10001; display: flex; align-items: center; justify-content: center;';

        const dialog = document.createElement('div');
        dialog.className = 'delete-recurring-dialog';
        dialog.style.cssText = 'background: white; padding: 20px; border-radius: 8px; max-width: 300px; text-align: center;';

        const title = document.createElement('h3');
        title.style.cssText = 'margin: 0 0 15px 0; font-size: 1.1em;';
        title.setAttribute('data-localize', '__MSG_deleteRecurringTitle__');
        title.textContent = chrome.i18n.getMessage('deleteRecurringTitle') || 'Delete recurring event?';
        dialog.appendChild(title);

        const message = document.createElement('p');
        message.style.cssText = 'margin: 0 0 20px 0; font-size: 0.9em; color: #666;';
        message.setAttribute('data-localize', '__MSG_deleteRecurringMessage__');
        message.textContent = chrome.i18n.getMessage('deleteRecurringMessage') || 'Do you want to delete this occurrence only or all occurrences?';
        dialog.appendChild(message);

        const buttonContainer = createContainer({ style: 'display: flex; flex-direction: column; gap: 10px;' });

        const deleteThisBtn = createButton({
            id: 'deleteThisOccurrence',
            className: 'btn btn-outline-danger',
            msgKey: 'deleteThisOccurrence',
            fallback: 'Delete this occurrence',
            style: 'width: 100%; padding: 8px;'
        });
        deleteThisBtn.addEventListener('click', () => {
            overlay.remove();
            if (this.onDelete) {
                this.onDelete(this.currentEvent, 'this');
            }
            this.hide();
        });

        const deleteAllBtn = createButton({
            id: 'deleteAllOccurrences',
            className: 'btn btn-danger',
            msgKey: 'deleteAllOccurrences',
            fallback: 'Delete all occurrences',
            style: 'width: 100%; padding: 8px;'
        });
        deleteAllBtn.addEventListener('click', () => {
            overlay.remove();
            if (this.onDeleteSeries) {
                this.onDeleteSeries(this.currentEvent);
            } else if (this.onDelete) {
                this.onDelete(this.currentEvent, 'all');
            }
            this.hide();
        });

        const cancelBtn = createButton({
            id: 'deleteRecurringCancel',
            className: 'btn btn-secondary',
            msgKey: 'cancel',
            fallback: 'Cancel',
            style: 'width: 100%; padding: 8px;'
        });
        cancelBtn.addEventListener('click', () => {
            overlay.remove();
        });

        buttonContainer.appendChild(deleteThisBtn);
        buttonContainer.appendChild(deleteAllBtn);
        buttonContainer.appendChild(cancelBtn);
        dialog.appendChild(buttonContainer);

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }

    /**
     * Cancel processing
     * @private
     */
    _handleCancel() {
        if (this.onCancel) {
            this.onCancel();
        }
        this.hide();
    }

    /**
     * Form validation
     * @private
     */
    _validateForm() {
        if (!this.titleInput.value.trim()) {
            this._showError(chrome.i18n.getMessage('pleaseEnterTitle'));
            this.titleInput.focus();
            return false;
        }

        if (!this.startTimeInput.value) {
            this._showError(chrome.i18n.getMessage('pleaseEnterStartTime'));
            this.startTimeInput.focus();
            return false;
        }

        if (!this.endTimeInput.value) {
            this._showError(chrome.i18n.getMessage('pleaseEnterEndTime'));
            this.endTimeInput.focus();
            return false;
        }

        if (!this._validateTimes()) {
            return false;
        }

        return true;
    }

    /**
     * Validate time validity
     * @private
     */
    _validateTimes() {
        if (!this.startTimeInput.value || !this.endTimeInput.value) {
            return true;
        }

        if (this.startTimeInput.value >= this.endTimeInput.value) {
            this._showError(chrome.i18n.getMessage('endTimeMustBeLater'));
            this.endTimeInput.focus();
            return false;
        }

        this._clearError();
        return true;
    }

    /**
     * Display in create new mode
     */
    showCreate(defaultStartTime = '', defaultEndTime = '') {
        this.mode = 'create';
        this.currentEvent = null;

        this.titleInput.value = '';
        this.startTimeInput.value = defaultStartTime;
        this.endTimeInput.value = defaultEndTime;
        this.reminderCheckbox.checked = true;

        this.recurrenceSelect.value = RECURRENCE_TYPES.NONE;
        this._resetWeekdayCheckboxes();
        this.noEndDateCheckbox.checked = true;
        this.endDateInput.value = '';
        this.endDateInput.disabled = true;
        this._updateRecurrenceOptions();

        this.deleteButton.style.display = 'none';

        this.setTitle(chrome.i18n.getMessage('eventDialogTitle'));

        this._clearError();
        this.show();
        this._localizeModal();
    }

    /**
     * Reset weekday checkboxes
     * @private
     */
    _resetWeekdayCheckboxes() {
        Object.values(this.weekdayCheckboxes).forEach(checkbox => {
            checkbox.checked = false;
        });
    }

    /**
     * Display in edit mode
     */
    showEdit(event) {
        this.mode = 'edit';
        this.currentEvent = event;

        this.titleInput.value = event.title || '';
        this.startTimeInput.value = event.startTime || '';
        this.endTimeInput.value = event.endTime || '';
        this.reminderCheckbox.checked = event.reminder !== false;

        this._resetWeekdayCheckboxes();
        if (event.recurrence) {
            this.recurrenceSelect.value = event.recurrence.type || RECURRENCE_TYPES.NONE;

            if (event.recurrence.type === RECURRENCE_TYPES.WEEKLY && event.recurrence.daysOfWeek) {
                event.recurrence.daysOfWeek.forEach(day => {
                    if (this.weekdayCheckboxes[day]) {
                        this.weekdayCheckboxes[day].checked = true;
                    }
                });
            }

            if (event.recurrence.endDate) {
                this.endDateInput.value = event.recurrence.endDate;
                this.noEndDateCheckbox.checked = false;
                this.endDateInput.disabled = false;
            } else {
                this.endDateInput.value = '';
                this.noEndDateCheckbox.checked = true;
                this.endDateInput.disabled = true;
            }
        } else {
            this.recurrenceSelect.value = RECURRENCE_TYPES.NONE;
            this.noEndDateCheckbox.checked = true;
            this.endDateInput.value = '';
            this.endDateInput.disabled = true;
        }
        this._updateRecurrenceOptions();

        this.deleteButton.style.display = '';

        this.setTitle(chrome.i18n.getMessage('eventDialogTitle'));

        this._clearError();
        this.show();
        this._localizeModal();
    }

    /**
     * Get form data
     * @returns {Object}
     */
    getFormData() {
        const recurrenceType = this.recurrenceSelect?.value || RECURRENCE_TYPES.NONE;
        let recurrence = null;

        if (recurrenceType !== RECURRENCE_TYPES.NONE) {
            recurrence = {
                type: recurrenceType,
                interval: 1,
                startDate: this._getStartDateForRecurrence(),
                endDate: this.noEndDateCheckbox?.checked ? null : (this.endDateInput?.value || null)
            };

            if (recurrenceType === RECURRENCE_TYPES.WEEKLY) {
                const selectedDays = [];
                Object.entries(this.weekdayCheckboxes).forEach(([day, checkbox]) => {
                    if (checkbox.checked) {
                        selectedDays.push(parseInt(day));
                    }
                });
                recurrence.daysOfWeek = selectedDays;
            }
        }

        return {
            title: this.titleInput?.value.trim() || '',
            startTime: this.startTimeInput?.value || '',
            endTime: this.endTimeInput?.value || '',
            reminder: this.reminderCheckbox?.checked || false,
            recurrence: recurrence
        };
    }

    /**
     * Reset form
     */
    resetForm() {
        if (this.titleInput) this.titleInput.value = '';
        if (this.startTimeInput) this.startTimeInput.value = '';
        if (this.endTimeInput) this.endTimeInput.value = '';
        if (this.reminderCheckbox) this.reminderCheckbox.checked = true;
        this.currentEvent = null;
        this.mode = 'create';
        this._clearError();
    }
}
