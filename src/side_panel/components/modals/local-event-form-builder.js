/**
 * LocalEventFormBuilder - Helper class for building and managing the local event form
 *
 * Handles DOM construction for edit mode, form population, data retrieval, and reset.
 * This is a plain helper class (not a Component subclass).
 */
import { RECURRENCE_TYPES } from '../../../lib/constants.js';

export class LocalEventFormBuilder {
    /**
     * @param {import('./local-event-modal.js').LocalEventModal} modal - The parent modal component (used for addEventListener tracking)
     */
    constructor(modal) {
        this.modal = modal;

        // Form elements
        this.editTitleElement = null;
        this.titleInput = null;
        this.startTimeInput = null;
        this.endTimeInput = null;
        this.descriptionInput = null;
        this.reminderCheckbox = null;
        this.saveButton = null;
        this.deleteButton = null;
        this.cancelButton = null;

        // Recurrence elements
        this.recurrenceSelect = null;
        this.recurrenceOptionsContainer = null;
        this.weekdayCheckboxes = {};
        this.endDateInput = null;
        this.noEndDateCheckbox = null;
        this.endDateSection = null;
    }

    /**
     * Build the edit mode content and append it to the parent element
     * @param {HTMLElement} parentElement - The container to append form elements to
     * @param {Object} options - Callbacks: { onSave, onDelete, onCancel, onValidateTimes }
     */
    buildEditContent(parentElement, options = {}) {
        // Title
        this.editTitleElement = document.createElement('h2');
        this.editTitleElement.setAttribute('data-localize', '__MSG_eventDialogTitle__');
        this.editTitleElement.textContent = window.getLocalizedMessage('eventDialogTitle');
        parentElement.appendChild(this.editTitleElement);

        // Title input
        const titleLabel = document.createElement('label');
        titleLabel.htmlFor = 'eventTitle';
        titleLabel.setAttribute('data-localize', '__MSG_eventTitle__');
        titleLabel.textContent = window.getLocalizedMessage('eventTitle');
        parentElement.appendChild(titleLabel);

        this.titleInput = document.createElement('input');
        this.titleInput.type = 'text';
        this.titleInput.id = 'eventTitle';
        this.titleInput.required = true;
        parentElement.appendChild(this.titleInput);

        // Time inputs row (side by side)
        const timeRow = document.createElement('div');
        timeRow.className = 'time-input-row';

        // Start time group
        const startGroup = document.createElement('div');
        startGroup.className = 'time-input-group';

        const startLabel = document.createElement('label');
        startLabel.htmlFor = 'eventStartTime';
        startLabel.setAttribute('data-localize', '__MSG_startTime__');
        startLabel.textContent = window.getLocalizedMessage('startTime');
        startGroup.appendChild(startLabel);

        this.startTimeInput = document.createElement('input');
        this.startTimeInput.type = 'time';
        this.startTimeInput.id = 'eventStartTime';
        this.startTimeInput.setAttribute('list', 'time-list');
        this.startTimeInput.required = true;
        startGroup.appendChild(this.startTimeInput);

        // End time group
        const endGroup = document.createElement('div');
        endGroup.className = 'time-input-group';

        const endLabel = document.createElement('label');
        endLabel.htmlFor = 'eventEndTime';
        endLabel.setAttribute('data-localize', '__MSG_endTime__');
        endLabel.textContent = window.getLocalizedMessage('endTime');
        endGroup.appendChild(endLabel);

        this.endTimeInput = document.createElement('input');
        this.endTimeInput.type = 'time';
        this.endTimeInput.id = 'eventEndTime';
        this.endTimeInput.setAttribute('list', 'time-list');
        this.endTimeInput.required = true;
        endGroup.appendChild(this.endTimeInput);

        timeRow.appendChild(startGroup);
        timeRow.appendChild(endGroup);
        parentElement.appendChild(timeRow);

        // Description textarea
        const descriptionLabel = document.createElement('label');
        descriptionLabel.htmlFor = 'eventDescription';
        descriptionLabel.setAttribute('data-localize', '__MSG_eventDescription__');
        descriptionLabel.textContent = window.getLocalizedMessage('eventDescription');
        parentElement.appendChild(descriptionLabel);

        this.descriptionInput = document.createElement('textarea');
        this.descriptionInput.id = 'eventDescription';
        this.descriptionInput.className = 'event-description-input';
        this.descriptionInput.rows = 3;
        parentElement.appendChild(this.descriptionInput);

        // Reminder checkbox
        const reminderContainer = document.createElement('div');
        reminderContainer.className = 'reminder-container';
        reminderContainer.style.cssText = 'margin: 10px 0; display: flex; align-items: center;';

        this.reminderCheckbox = document.createElement('input');
        this.reminderCheckbox.type = 'checkbox';
        this.reminderCheckbox.id = 'eventReminder';
        this.reminderCheckbox.checked = true;
        this.reminderCheckbox.style.cssText = 'margin: 0; flex-shrink: 0;';

        const reminderLabel = document.createElement('label');
        reminderLabel.htmlFor = 'eventReminder';
        reminderLabel.setAttribute('data-localize', '__MSG_remindMeBefore__');
        reminderLabel.textContent = window.getLocalizedMessage('remindMeBefore');
        reminderLabel.style.cssText = 'margin-left: 8px; margin-bottom: 0; user-select: none; cursor: pointer; display: inline-block; font-weight: normal;';

        reminderContainer.appendChild(this.reminderCheckbox);
        reminderContainer.appendChild(reminderLabel);
        parentElement.appendChild(reminderContainer);

        // Recurrence section
        this.buildRecurrenceSection(parentElement);

        // Button group
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'modal-buttons';

        // Save button
        this.saveButton = document.createElement('button');
        this.saveButton.id = 'saveEventButton';
        this.saveButton.className = 'btn btn-success';
        this.saveButton.setAttribute('data-localize', '__MSG_save__');
        this.saveButton.textContent = window.getLocalizedMessage('save');

        // Delete button
        this.deleteButton = document.createElement('button');
        this.deleteButton.id = 'deleteEventButton';
        this.deleteButton.className = 'btn btn-danger';
        this.deleteButton.setAttribute('data-localize', '__MSG_delete__');
        this.deleteButton.textContent = window.getLocalizedMessage('delete');

        // Cancel button
        this.cancelButton = document.createElement('button');
        this.cancelButton.id = 'cancelEventButton';
        this.cancelButton.className = 'btn btn-secondary';
        this.cancelButton.setAttribute('data-localize', '__MSG_cancel__');
        this.cancelButton.textContent = window.getLocalizedMessage('cancel');

        buttonGroup.appendChild(this.saveButton);
        buttonGroup.appendChild(this.deleteButton);
        buttonGroup.appendChild(this.cancelButton);
        parentElement.appendChild(buttonGroup);

        // Set up the event listeners
        this._setupFormEventListeners(options);
    }

    /**
     * Build the recurrence section and append it to the parent element
     * @param {HTMLElement} parentElement - The container to append recurrence UI to
     */
    buildRecurrenceSection(parentElement) {
        const recurrenceSection = document.createElement('div');
        recurrenceSection.className = 'recurrence-section';
        recurrenceSection.style.cssText = 'margin: 15px 0; padding: 10px; background: var(--side-calendar-subtle-bg); border-radius: 5px;';

        // Recurrence label and select
        const recurrenceLabel = document.createElement('label');
        recurrenceLabel.htmlFor = 'recurrenceType';
        recurrenceLabel.setAttribute('data-localize', '__MSG_recurrence__');
        recurrenceLabel.textContent = window.getLocalizedMessage('recurrence') || 'Recurrence:';
        recurrenceSection.appendChild(recurrenceLabel);

        this.recurrenceSelect = document.createElement('select');
        this.recurrenceSelect.id = 'recurrenceType';
        this.recurrenceSelect.style.cssText = 'width: 100%; padding: 6px; margin-top: 5px; border: 1px solid var(--side-calendar-input-border); border-radius: 4px; background: var(--side-calendar-input-bg); color: inherit;';

        const recurrenceOptions = [
            { value: RECURRENCE_TYPES.NONE, msgKey: 'recurrenceNone', default: 'Does not repeat' },
            { value: RECURRENCE_TYPES.DAILY, msgKey: 'recurrenceDaily', default: 'Daily' },
            { value: RECURRENCE_TYPES.WEEKDAYS, msgKey: 'recurrenceWeekdays', default: 'Every weekday (Mon-Fri)' },
            { value: RECURRENCE_TYPES.WEEKLY, msgKey: 'recurrenceWeekly', default: 'Weekly' },
            { value: RECURRENCE_TYPES.MONTHLY, msgKey: 'recurrenceMonthly', default: 'Monthly' }
        ];

        recurrenceOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.setAttribute('data-localize', `__MSG_${opt.msgKey}__`);
            option.textContent = window.getLocalizedMessage(opt.msgKey) || opt.default;
            this.recurrenceSelect.appendChild(option);
        });

        recurrenceSection.appendChild(this.recurrenceSelect);

        // Recurrence options container (for weekly day selection)
        this.recurrenceOptionsContainer = document.createElement('div');
        this.recurrenceOptionsContainer.className = 'recurrence-options';
        this.recurrenceOptionsContainer.style.cssText = 'margin-top: 10px; display: none;';

        // Weekly day selection
        const weekdayContainer = document.createElement('div');
        weekdayContainer.className = 'weekday-container';
        weekdayContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px;';

        const weekdays = [
            { value: 0, msgKey: 'daySun', default: 'Sun' },
            { value: 1, msgKey: 'dayMon', default: 'Mon' },
            { value: 2, msgKey: 'dayTue', default: 'Tue' },
            { value: 3, msgKey: 'dayWed', default: 'Wed' },
            { value: 4, msgKey: 'dayThu', default: 'Thu' },
            { value: 5, msgKey: 'dayFri', default: 'Fri' },
            { value: 6, msgKey: 'daySat', default: 'Sat' }
        ];

        weekdays.forEach(day => {
            const dayLabel = document.createElement('label');
            dayLabel.style.cssText = 'display: flex; align-items: center; padding: 4px 8px; background: var(--side-calendar-btn-secondary-bg); border-radius: 3px; cursor: pointer; font-size: 0.85em;';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = day.value;
            checkbox.style.cssText = 'margin-right: 4px;';
            this.weekdayCheckboxes[day.value] = checkbox;

            const dayText = document.createElement('span');
            dayText.setAttribute('data-localize', `__MSG_${day.msgKey}__`);
            dayText.textContent = window.getLocalizedMessage(day.msgKey) || day.default;

            dayLabel.appendChild(checkbox);
            dayLabel.appendChild(dayText);
            weekdayContainer.appendChild(dayLabel);
        });

        this.recurrenceOptionsContainer.appendChild(weekdayContainer);
        recurrenceSection.appendChild(this.recurrenceOptionsContainer);

        // End date section
        const endDateSection = document.createElement('div');
        endDateSection.className = 'end-date-section';
        endDateSection.style.cssText = 'margin-top: 10px; display: none;';

        const endDateLabel = document.createElement('label');
        endDateLabel.htmlFor = 'recurrenceEndDate';
        endDateLabel.setAttribute('data-localize', '__MSG_recurrenceEndDate__');
        endDateLabel.textContent = window.getLocalizedMessage('recurrenceEndDate') || 'End date:';
        endDateSection.appendChild(endDateLabel);

        const endDateRow = document.createElement('div');
        endDateRow.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-top: 5px;';

        this.endDateInput = document.createElement('input');
        this.endDateInput.type = 'date';
        this.endDateInput.id = 'recurrenceEndDate';
        this.endDateInput.style.cssText = 'flex: 1; padding: 6px; border: 1px solid var(--side-calendar-input-border); border-radius: 4px; background: var(--side-calendar-input-bg); color: inherit;';

        const noEndDateContainer = document.createElement('label');
        noEndDateContainer.style.cssText = 'display: flex; align-items: center; cursor: pointer; white-space: nowrap;';

        this.noEndDateCheckbox = document.createElement('input');
        this.noEndDateCheckbox.type = 'checkbox';
        this.noEndDateCheckbox.id = 'noEndDate';
        this.noEndDateCheckbox.checked = true;
        this.noEndDateCheckbox.style.cssText = 'margin-right: 5px;';

        const noEndDateLabel = document.createElement('span');
        noEndDateLabel.setAttribute('data-localize', '__MSG_noEndDate__');
        noEndDateLabel.textContent = window.getLocalizedMessage('noEndDate') || 'No end date';
        noEndDateLabel.style.cssText = 'font-size: 0.9em;';

        noEndDateContainer.appendChild(this.noEndDateCheckbox);
        noEndDateContainer.appendChild(noEndDateLabel);

        endDateRow.appendChild(this.endDateInput);
        endDateRow.appendChild(noEndDateContainer);
        endDateSection.appendChild(endDateRow);

        recurrenceSection.appendChild(endDateSection);
        this.endDateSection = endDateSection;

        parentElement.appendChild(recurrenceSection);
    }

    /**
     * Set up form event listeners using the modal's addEventListener for proper cleanup
     * @param {Object} options - Callbacks: { onSave, onDelete, onCancel, onValidateTimes }
     * @private
     */
    _setupFormEventListeners(options = {}) {
        // Save button
        this.modal.addEventListener(this.saveButton, 'click', () => {
            if (options.onSave) options.onSave();
        });

        // Delete button
        this.modal.addEventListener(this.deleteButton, 'click', () => {
            if (options.onDelete) options.onDelete();
        });

        // Cancel button
        this.modal.addEventListener(this.cancelButton, 'click', () => {
            if (options.onCancel) options.onCancel();
        });

        // Save with Enter key
        this.modal.addEventListener(this.titleInput, 'keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (options.onSave) options.onSave();
            }
        });

        // The time input validation
        this.modal.addEventListener(this.startTimeInput, 'change', () => {
            if (options.onValidateTimes) options.onValidateTimes();
        });

        this.modal.addEventListener(this.endTimeInput, 'change', () => {
            if (options.onValidateTimes) options.onValidateTimes();
        });

        // Recurrence select change
        this.modal.addEventListener(this.recurrenceSelect, 'change', () => {
            this.updateRecurrenceOptions();
        });

        // No end date checkbox change
        this.modal.addEventListener(this.noEndDateCheckbox, 'change', () => {
            this.endDateInput.disabled = this.noEndDateCheckbox.checked;
            if (this.noEndDateCheckbox.checked) {
                this.endDateInput.value = '';
            }
        });
    }

    /**
     * Update recurrence options visibility based on selected type
     */
    updateRecurrenceOptions() {
        const recurrenceType = this.recurrenceSelect.value;

        // Show/hide weekday selection for weekly recurrence
        if (recurrenceType === RECURRENCE_TYPES.WEEKLY) {
            this.recurrenceOptionsContainer.style.display = 'block';
        } else {
            this.recurrenceOptionsContainer.style.display = 'none';
        }

        // Show/hide end date section for any recurrence except 'none'
        if (recurrenceType !== RECURRENCE_TYPES.NONE) {
            this.endDateSection.style.display = 'block';
        } else {
            this.endDateSection.style.display = 'none';
        }
    }

    /**
     * Populate the form with event data for editing
     * @param {Object} event - The event to populate the form with
     */
    populateForm(event) {
        // Set the values in the form
        this.titleInput.value = event.title || '';
        this.descriptionInput.value = event.description || '';
        this.startTimeInput.value = event.startTime || '';
        this.endTimeInput.value = event.endTime || '';
        this.reminderCheckbox.checked = event.reminder !== false;

        // Set recurrence values
        this._resetWeekdayCheckboxes();
        if (event.recurrence) {
            this.recurrenceSelect.value = event.recurrence.type || RECURRENCE_TYPES.NONE;

            // Set weekday checkboxes for weekly recurrence
            if (event.recurrence.type === RECURRENCE_TYPES.WEEKLY && event.recurrence.daysOfWeek) {
                event.recurrence.daysOfWeek.forEach(day => {
                    if (this.weekdayCheckboxes[day]) {
                        this.weekdayCheckboxes[day].checked = true;
                    }
                });
            }

            // Set end date
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
        this.updateRecurrenceOptions();

        // Update edit title
        this.editTitleElement.textContent = window.getLocalizedMessage('eventDialogTitle');
    }

    /**
     * Get form data
     * @param {Function} getStartDateFn - Function that returns the start date for recurrence in YYYY-MM-DD format
     * @returns {Object} The form data
     */
    getFormData(getStartDateFn) {
        const recurrenceType = this.recurrenceSelect?.value || RECURRENCE_TYPES.NONE;
        let recurrence = null;

        if (recurrenceType !== RECURRENCE_TYPES.NONE) {
            recurrence = {
                type: recurrenceType,
                interval: 1,
                startDate: getStartDateFn(),
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
            description: this.descriptionInput?.value.trim() || '',
            startTime: this.startTimeInput?.value || '',
            endTime: this.endTimeInput?.value || '',
            reminder: this.reminderCheckbox?.checked || false,
            recurrence: recurrence
        };
    }

    /**
     * Reset form to default values
     */
    resetForm() {
        if (this.titleInput) this.titleInput.value = '';
        if (this.descriptionInput) this.descriptionInput.value = '';
        if (this.startTimeInput) this.startTimeInput.value = '';
        if (this.endTimeInput) this.endTimeInput.value = '';
        if (this.reminderCheckbox) this.reminderCheckbox.checked = true;
    }

    /**
     * Reset form for create mode with optional default times
     * @param {string} defaultStartTime - Default start time
     * @param {string} defaultEndTime - Default end time
     */
    resetForCreate(defaultStartTime = '', defaultEndTime = '') {
        this.titleInput.value = '';
        this.descriptionInput.value = '';
        this.startTimeInput.value = defaultStartTime;
        this.endTimeInput.value = defaultEndTime;
        this.reminderCheckbox.checked = true;

        // Reset recurrence
        this.recurrenceSelect.value = RECURRENCE_TYPES.NONE;
        this._resetWeekdayCheckboxes();
        this.noEndDateCheckbox.checked = true;
        this.endDateInput.value = '';
        this.endDateInput.disabled = true;
        this.updateRecurrenceOptions();

        // Update edit title
        this.editTitleElement.textContent = window.getLocalizedMessage('eventDialogTitle');
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
}
