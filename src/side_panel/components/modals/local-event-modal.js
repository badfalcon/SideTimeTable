/**
 * LocalEventModal - Local event editing modal
 */
import { ModalComponent } from './modal-component.js';
import { RECURRENCE_TYPES } from '../../../lib/utils.js';

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
        const titleLabel = document.createElement('label');
        titleLabel.htmlFor = 'eventTitle';
        titleLabel.setAttribute('data-localize', '__MSG_eventTitle__');
        titleLabel.textContent = chrome.i18n.getMessage('eventTitle');
        content.appendChild(titleLabel);

        this.titleInput = document.createElement('input');
        this.titleInput.type = 'text';
        this.titleInput.id = 'eventTitle';
        this.titleInput.required = true;
        content.appendChild(this.titleInput);

        // The start time input
        const startLabel = document.createElement('label');
        startLabel.htmlFor = 'eventStartTime';
        startLabel.setAttribute('data-localize', '__MSG_startTime__');
        startLabel.textContent = chrome.i18n.getMessage('startTime');
        content.appendChild(startLabel);

        this.startTimeInput = document.createElement('input');
        this.startTimeInput.type = 'time';
        this.startTimeInput.id = 'eventStartTime';
        this.startTimeInput.setAttribute('list', 'time-list');
        this.startTimeInput.required = true;
        content.appendChild(this.startTimeInput);

        // The end time input
        const endLabel = document.createElement('label');
        endLabel.htmlFor = 'eventEndTime';
        endLabel.setAttribute('data-localize', '__MSG_endTime__');
        endLabel.textContent = chrome.i18n.getMessage('endTime');
        content.appendChild(endLabel);

        this.endTimeInput = document.createElement('input');
        this.endTimeInput.type = 'time';
        this.endTimeInput.id = 'eventEndTime';
        this.endTimeInput.setAttribute('list', 'time-list');
        this.endTimeInput.required = true;
        content.appendChild(this.endTimeInput);

        // Reminder checkbox
        const reminderContainer = document.createElement('div');
        reminderContainer.className = 'reminder-container';
        reminderContainer.style.cssText = 'margin: 10px 0; display: flex; align-items: center;';

        this.reminderCheckbox = document.createElement('input');
        this.reminderCheckbox.type = 'checkbox';
        this.reminderCheckbox.id = 'eventReminder';
        this.reminderCheckbox.checked = true; // Default: enabled
        this.reminderCheckbox.style.cssText = 'margin: 0; flex-shrink: 0;';

        const reminderLabel = document.createElement('label');
        reminderLabel.htmlFor = 'eventReminder';
        reminderLabel.setAttribute('data-localize', '__MSG_remindMeBefore__');
        reminderLabel.textContent = chrome.i18n.getMessage('remindMeBefore');
        reminderLabel.style.cssText = 'margin-left: 8px; user-select: none; cursor: pointer; display: inline-block;';

        reminderContainer.appendChild(this.reminderCheckbox);
        reminderContainer.appendChild(reminderLabel);
        content.appendChild(reminderContainer);

        // Recurrence section
        const recurrenceSection = document.createElement('div');
        recurrenceSection.className = 'recurrence-section';
        recurrenceSection.style.cssText = 'margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 5px;';

        // Recurrence label and select
        const recurrenceLabel = document.createElement('label');
        recurrenceLabel.htmlFor = 'recurrenceType';
        recurrenceLabel.setAttribute('data-localize', '__MSG_recurrence__');
        recurrenceLabel.textContent = chrome.i18n.getMessage('recurrence') || 'Recurrence:';
        recurrenceSection.appendChild(recurrenceLabel);

        this.recurrenceSelect = document.createElement('select');
        this.recurrenceSelect.id = 'recurrenceType';
        this.recurrenceSelect.style.cssText = 'width: 100%; padding: 6px; margin-top: 5px; border: 1px solid #ced4da; border-radius: 4px;';

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
            option.textContent = chrome.i18n.getMessage(opt.msgKey) || opt.default;
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
            dayLabel.style.cssText = 'display: flex; align-items: center; padding: 4px 8px; background: #e9ecef; border-radius: 3px; cursor: pointer; font-size: 0.85em;';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = day.value;
            checkbox.style.cssText = 'margin-right: 4px;';
            this.weekdayCheckboxes[day.value] = checkbox;

            const dayText = document.createElement('span');
            dayText.setAttribute('data-localize', `__MSG_${day.msgKey}__`);
            dayText.textContent = chrome.i18n.getMessage(day.msgKey) || day.default;

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
        endDateLabel.textContent = chrome.i18n.getMessage('recurrenceEndDate') || 'End date:';
        endDateSection.appendChild(endDateLabel);

        const endDateRow = document.createElement('div');
        endDateRow.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-top: 5px;';

        this.endDateInput = document.createElement('input');
        this.endDateInput.type = 'date';
        this.endDateInput.id = 'recurrenceEndDate';
        this.endDateInput.style.cssText = 'flex: 1; padding: 6px; border: 1px solid #ced4da; border-radius: 4px;';

        const noEndDateContainer = document.createElement('label');
        noEndDateContainer.style.cssText = 'display: flex; align-items: center; cursor: pointer; white-space: nowrap;';

        this.noEndDateCheckbox = document.createElement('input');
        this.noEndDateCheckbox.type = 'checkbox';
        this.noEndDateCheckbox.id = 'noEndDate';
        this.noEndDateCheckbox.checked = true;
        this.noEndDateCheckbox.style.cssText = 'margin-right: 5px;';

        const noEndDateLabel = document.createElement('span');
        noEndDateLabel.setAttribute('data-localize', '__MSG_noEndDate__');
        noEndDateLabel.textContent = chrome.i18n.getMessage('noEndDate') || 'No end date';
        noEndDateLabel.style.cssText = 'font-size: 0.9em;';

        noEndDateContainer.appendChild(this.noEndDateCheckbox);
        noEndDateContainer.appendChild(noEndDateLabel);

        endDateRow.appendChild(this.endDateInput);
        endDateRow.appendChild(noEndDateContainer);
        endDateSection.appendChild(endDateRow);

        recurrenceSection.appendChild(endDateSection);
        this.endDateSection = endDateSection;

        content.appendChild(recurrenceSection);

        // Button group
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'modal-buttons';

        // Save button
        this.saveButton = document.createElement('button');
        this.saveButton.id = 'saveEventButton';
        this.saveButton.className = 'btn btn-success';
        this.saveButton.setAttribute('data-localize', '__MSG_save__');
        this.saveButton.textContent = chrome.i18n.getMessage('save');

        // Delete button
        this.deleteButton = document.createElement('button');
        this.deleteButton.id = 'deleteEventButton';
        this.deleteButton.className = 'btn btn-danger';
        this.deleteButton.setAttribute('data-localize', '__MSG_delete__');
        this.deleteButton.textContent = chrome.i18n.getMessage('delete');

        // Cancel button
        this.cancelButton = document.createElement('button');
        this.cancelButton.id = 'cancelEventButton';
        this.cancelButton.className = 'btn btn-secondary';
        this.cancelButton.setAttribute('data-localize', '__MSG_cancel__');
        this.cancelButton.textContent = chrome.i18n.getMessage('cancel');

        buttonGroup.appendChild(this.saveButton);
        buttonGroup.appendChild(this.deleteButton);
        buttonGroup.appendChild(this.cancelButton);
        content.appendChild(buttonGroup);

        // Set up the event listeners
        this._setupFormEventListeners();

        return content;
    }

    /**
     * Set up form event listeners
     * @private
     */
    _setupFormEventListeners() {
        // Save button
        this.addEventListener(this.saveButton, 'click', () => {
            this._handleSave();
        });

        // Delete button
        this.addEventListener(this.deleteButton, 'click', () => {
            this._handleDelete();
        });

        // Cancel button
        this.addEventListener(this.cancelButton, 'click', () => {
            this._handleCancel();
        });

        // Save with Enter key
        this.addEventListener(this.titleInput, 'keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this._handleSave();
            }
        });

        // The time input validation
        this.addEventListener(this.startTimeInput, 'change', () => {
            this._validateTimes();
        });

        this.addEventListener(this.endTimeInput, 'change', () => {
            this._validateTimes();
        });

        // Recurrence select change
        this.addEventListener(this.recurrenceSelect, 'change', () => {
            this._updateRecurrenceOptions();
        });

        // No end date checkbox change
        this.addEventListener(this.noEndDateCheckbox, 'change', () => {
            this.endDateInput.disabled = this.noEndDateCheckbox.checked;
            if (this.noEndDateCheckbox.checked) {
                this.endDateInput.value = '';
            }
        });
    }

    /**
     * Update recurrence options visibility based on selected type
     * @private
     */
    _updateRecurrenceOptions() {
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

            // Validate end date is not before start date
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

            // Add days of week for weekly recurrence
            if (recurrenceType === RECURRENCE_TYPES.WEEKLY) {
                const selectedDays = [];
                Object.entries(this.weekdayCheckboxes).forEach(([day, checkbox]) => {
                    if (checkbox.checked) {
                        selectedDays.push(parseInt(day));
                    }
                });
                // If no days selected, default to the current day of week
                if (selectedDays.length === 0) {
                    const startDate = new Date(recurrence.startDate + 'T00:00:00');
                    selectedDays.push(startDate.getDay());
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
     * Get the start date for recurrence
     * @returns {string} The start date in YYYY-MM-DD format
     * @private
     */
    _getStartDateForRecurrence() {
        // Use the current display date from the side panel controller
        const controller = window.sidePanelController;
        if (controller && controller.currentDate) {
            const date = controller.currentDate;
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        // Fallback to today
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Delete processing
     * @private
     */
    _handleDelete() {
        if (!this.currentEvent) {
            return;
        }

        // Check if this is a recurring event instance
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
        // Create dialog overlay
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

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';

        // Delete this occurrence only
        const deleteThisBtn = document.createElement('button');
        deleteThisBtn.className = 'btn btn-outline-danger';
        deleteThisBtn.style.cssText = 'width: 100%; padding: 8px;';
        deleteThisBtn.setAttribute('data-localize', '__MSG_deleteThisOccurrence__');
        deleteThisBtn.textContent = chrome.i18n.getMessage('deleteThisOccurrence') || 'Delete this occurrence';
        deleteThisBtn.addEventListener('click', () => {
            overlay.remove();
            if (this.onDelete) {
                this.onDelete(this.currentEvent, 'this');
            }
            this.hide();
        });

        // Delete all occurrences
        const deleteAllBtn = document.createElement('button');
        deleteAllBtn.className = 'btn btn-danger';
        deleteAllBtn.style.cssText = 'width: 100%; padding: 8px;';
        deleteAllBtn.setAttribute('data-localize', '__MSG_deleteAllOccurrences__');
        deleteAllBtn.textContent = chrome.i18n.getMessage('deleteAllOccurrences') || 'Delete all occurrences';
        deleteAllBtn.addEventListener('click', () => {
            overlay.remove();
            if (this.onDeleteSeries) {
                this.onDeleteSeries(this.currentEvent);
            } else if (this.onDelete) {
                this.onDelete(this.currentEvent, 'all');
            }
            this.hide();
        });

        // Cancel
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.style.cssText = 'width: 100%; padding: 8px;';
        cancelBtn.setAttribute('data-localize', '__MSG_cancel__');
        cancelBtn.textContent = chrome.i18n.getMessage('cancel') || 'Cancel';
        cancelBtn.addEventListener('click', () => {
            overlay.remove();
        });

        buttonContainer.appendChild(deleteThisBtn);
        buttonContainer.appendChild(deleteAllBtn);
        buttonContainer.appendChild(cancelBtn);
        dialog.appendChild(buttonContainer);

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Close on overlay click
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
        // Title check
        if (!this.titleInput.value.trim()) {
            this._showError(chrome.i18n.getMessage('pleaseEnterTitle'));
            this.titleInput.focus();
            return false;
        }

        // Time check
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

        // The time validity check
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
            return true; // Skip if empty
        }

        const startTime = this.startTimeInput.value;
        const endTime = this.endTimeInput.value;

        if (startTime >= endTime) {
            this._showError(chrome.i18n.getMessage('endTimeMustBeLater'));
            this.endTimeInput.focus();
            return false;
        }

        this._clearError();
        return true;
    }

    /**
     * Display error message
     * @private
     */
    _showError(message) {
        // Remove the existing error messages
        this._clearError();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = 'color: red; font-size: 0.9em; margin-top: 5px;';
        errorDiv.textContent = message;

        this.modalContent.appendChild(errorDiv);
    }

    /**
     * Clear error messages
     * @private
     */
    _clearError() {
        const errorElement = this.modalContent?.querySelector('.error-message');
        if (errorElement) {
            errorElement.remove();
        }
    }

    /**
     * Display in create new mode
     * @param {string} defaultStartTime Default start time
     * @param {string} defaultEndTime Default end time
     */
    showCreate(defaultStartTime = '', defaultEndTime = '') {
        this.mode = 'create';
        this.currentEvent = null;

        // Reset form
        this.titleInput.value = '';
        this.startTimeInput.value = defaultStartTime;
        this.endTimeInput.value = defaultEndTime;
        this.reminderCheckbox.checked = true;

        // Reset recurrence
        this.recurrenceSelect.value = RECURRENCE_TYPES.NONE;
        this._resetWeekdayCheckboxes();
        this.noEndDateCheckbox.checked = true;
        this.endDateInput.value = '';
        this.endDateInput.disabled = true;
        this._updateRecurrenceOptions();

        // Adjust the button display
        this.deleteButton.style.display = 'none';

        // Update title
        this.setTitle(chrome.i18n.getMessage('eventDialogTitle'));

        this._clearError();
        this.show();

        // Apply the localization after showing the modal
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
     * @param {Object} event Event to edit
     */
    showEdit(event) {
        this.mode = 'edit';
        this.currentEvent = event;

        // Set the values in the form
        this.titleInput.value = event.title || '';
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
        this._updateRecurrenceOptions();

        // Adjust the button display
        this.deleteButton.style.display = '';

        // Update title
        this.setTitle(chrome.i18n.getMessage('eventDialogTitle'));

        this._clearError();
        this.show();

        // Apply the localization after showing the modal
        this._localizeModal();
    }

    /**
     * Get form data
     * @returns {Object} The form data
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

    /**
     * Apply localization to modal elements
     * @private
     */
    async _localizeModal() {
        if (window.localizeWithLanguage && this.element) {
            // Use the project's language-aware localization
            const userLanguageSetting = await window.getCurrentLanguageSetting?.() || 'auto';
            const targetLanguage = window.resolveLanguageCode?.(userLanguageSetting) || 'en';
            await window.localizeWithLanguage(targetLanguage);
        } else if (this.element) {
            // Fallback: manual localization for key elements
            const elementsToLocalize = this.element.querySelectorAll('[data-localize]');
            elementsToLocalize.forEach(element => {
                const key = element.getAttribute('data-localize');
                if (key && chrome.i18n && chrome.i18n.getMessage) {
                    const message = chrome.i18n.getMessage(key.replace('__MSG_', '').replace('__', ''));
                    if (message) {
                        element.textContent = message;
                    }
                }
            });
        }
    }
}