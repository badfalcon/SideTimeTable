/**
 * LocalEventModal - Local event modal with view and edit modes
 */
import { ModalComponent } from './modal-component.js';
import { RECURRENCE_TYPES } from '../../../lib/constants.js';
import { LocalEventFormBuilder } from './local-event-form-builder.js';
import { DeleteRecurringDialog } from './delete-recurring-dialog.js';

export class LocalEventModal extends ModalComponent {
    constructor(options = {}) {
        super({
            id: 'localEventDialog',
            ...options
        });

        // View mode elements
        this.viewContent = null;
        this.viewTitleElement = null;
        this.viewTimeElement = null;
        this.viewDescriptionElement = null;
        this.viewReminderElement = null;
        this.viewRecurrenceElement = null;
        this.viewButtons = null;

        // Edit mode container
        this.editContent = null;

        // Helper instances
        this.formBuilder = new LocalEventFormBuilder(this);
        this.deleteDialog = new DeleteRecurringDialog();

        // The event being edited
        this.currentEvent = null;

        // Date getter for recurrence (injected to avoid global controller access)
        this._getCurrentDate = options.getCurrentDate || null;

        // Callbacks
        this.onSave = options.onSave || null;
        this.onDelete = options.onDelete || null;
        this.onCancel = options.onCancel || null;
        this.onDeleteSeries = options.onDeleteSeries || null;

        // Edit mode (create/edit/view)
        this.mode = 'create';
    }

    createContent() {
        const content = document.createElement('div');

        // === View mode content ===
        this.viewContent = document.createElement('div');
        this.viewContent.className = 'local-event-view-content';
        this.viewContent.style.display = 'none';
        this._createViewContent();
        content.appendChild(this.viewContent);

        // === Edit mode content ===
        this.editContent = document.createElement('div');
        this.editContent.className = 'local-event-edit-content';
        this._createEditContent();
        content.appendChild(this.editContent);

        return content;
    }

    /**
     * Create view mode content (Google event modal style)
     * @private
     */
    _createViewContent() {
        // Event title
        this.viewTitleElement = document.createElement('h2');
        this.viewTitleElement.className = 'google-event-title';
        this.viewContent.appendChild(this.viewTitleElement);

        // Time row
        this.viewTimeElement = document.createElement('div');
        this.viewTimeElement.className = 'google-event-row mb-2';
        this.viewContent.appendChild(this.viewTimeElement);

        // Description row
        this.viewDescriptionElement = document.createElement('div');
        this.viewDescriptionElement.className = 'google-event-row mb-2';
        this.viewContent.appendChild(this.viewDescriptionElement);

        // Reminder row
        this.viewReminderElement = document.createElement('div');
        this.viewReminderElement.className = 'google-event-row mb-2';
        this.viewContent.appendChild(this.viewReminderElement);

        // Recurrence row
        this.viewRecurrenceElement = document.createElement('div');
        this.viewRecurrenceElement.className = 'google-event-row mb-2';
        this.viewContent.appendChild(this.viewRecurrenceElement);

        // View mode buttons
        this.viewButtons = document.createElement('div');
        this.viewButtons.className = 'modal-buttons';

        const editButton = document.createElement('button');
        editButton.className = 'btn btn-primary';
        editButton.setAttribute('data-localize', '__MSG_editEvent__');
        editButton.textContent = window.getLocalizedMessage('editEvent') || 'Edit';
        this.addEventListener(editButton, 'click', () => {
            this.showEdit(this.currentEvent);
        });

        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-danger';
        deleteButton.setAttribute('data-localize', '__MSG_delete__');
        deleteButton.textContent = window.getLocalizedMessage('delete');
        this.addEventListener(deleteButton, 'click', () => {
            this._handleDelete();
        });

        this.viewButtons.appendChild(editButton);
        this.viewButtons.appendChild(deleteButton);
        this.viewContent.appendChild(this.viewButtons);
    }

    /**
     * Create edit mode content - delegates to formBuilder
     * @private
     */
    _createEditContent() {
        this.formBuilder.buildEditContent(this.editContent, {
            onSave: () => this._handleSave(),
            onDelete: () => this._handleDelete(),
            onCancel: () => this._handleCancel(),
            onValidateTimes: () => this._validateTimes()
        });

        // Expose form element references for backward compatibility within this class
        this.titleInput = this.formBuilder.titleInput;
        this.startTimeInput = this.formBuilder.startTimeInput;
        this.endTimeInput = this.formBuilder.endTimeInput;
        this.descriptionInput = this.formBuilder.descriptionInput;
        this.reminderCheckbox = this.formBuilder.reminderCheckbox;
        this.saveButton = this.formBuilder.saveButton;
        this.deleteButton = this.formBuilder.deleteButton;
        this.cancelButton = this.formBuilder.cancelButton;
        this.recurrenceSelect = this.formBuilder.recurrenceSelect;
        this.recurrenceOptionsContainer = this.formBuilder.recurrenceOptionsContainer;
        this.weekdayCheckboxes = this.formBuilder.weekdayCheckboxes;
        this.endDateInput = this.formBuilder.endDateInput;
        this.noEndDateCheckbox = this.formBuilder.noEndDateCheckbox;
        this.endDateSection = this.formBuilder.endDateSection;
        this.editTitleElement = this.formBuilder.editTitleElement;
    }

    /**
     * Update recurrence options visibility based on selected type
     * @private
     */
    _updateRecurrenceOptions() {
        this.formBuilder.updateRecurrenceOptions();
    }

    // ========== View Mode ==========

    /**
     * Display event in view mode (read-only, Google event style)
     * @param {Object} event Event to display
     */
    showView(event) {
        this.mode = 'view';
        this.currentEvent = event;

        // Create the element if it doesn't exist
        if (!this.element) {
            this.createElement();
        }

        // Show view content, hide edit content
        this.viewContent.style.display = '';
        this.editContent.style.display = 'none';

        // Populate view content
        this._populateViewContent(event);

        this.show();
        this._localizeModal();
    }

    /**
     * Populate view mode content with event data
     * @private
     */
    _populateViewContent(event) {
        // Title
        this.viewTitleElement.textContent = event.title || window.getLocalizedMessage('noTitle');

        // Time
        this.viewTimeElement.innerHTML = '';
        if (event.startTime && event.endTime) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-clock';

            const text = document.createElement('span');
            text.textContent = this._formatViewTime(event.startTime, event.endTime);

            this.viewTimeElement.appendChild(icon);
            this.viewTimeElement.appendChild(text);
            this.viewTimeElement.style.display = '';
        } else {
            this.viewTimeElement.style.display = 'none';
        }

        // Description
        this.viewDescriptionElement.innerHTML = '';
        if (event.description) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-align-left';

            const text = document.createElement('div');
            text.className = 'google-event-detail-text';
            text.textContent = event.description;

            this.viewDescriptionElement.appendChild(icon);
            this.viewDescriptionElement.appendChild(text);
            this.viewDescriptionElement.style.display = '';
        } else {
            this.viewDescriptionElement.style.display = 'none';
        }

        // Reminder
        this.viewReminderElement.innerHTML = '';
        if (event.reminder !== false) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-bell';

            const text = document.createElement('span');
            text.setAttribute('data-localize', '__MSG_reminderOn__');
            text.textContent = window.getLocalizedMessage('reminderOn') || 'Reminder on';

            this.viewReminderElement.appendChild(icon);
            this.viewReminderElement.appendChild(text);
            this.viewReminderElement.style.display = '';
        } else {
            this.viewReminderElement.style.display = 'none';
        }

        // Recurrence
        this.viewRecurrenceElement.innerHTML = '';
        const recurrenceText = this._getRecurrenceDisplayText(event);
        if (recurrenceText) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-sync-alt';

            const text = document.createElement('span');
            text.textContent = recurrenceText;

            this.viewRecurrenceElement.appendChild(icon);
            this.viewRecurrenceElement.appendChild(text);
            this.viewRecurrenceElement.style.display = '';
        } else {
            this.viewRecurrenceElement.style.display = 'none';
        }
    }

    /**
     * Format time for view mode display (locale-aware)
     * @private
     */
    _formatViewTime(startTime, endTime) {
        try {
            const locale = navigator.language || 'en';
            const today = new Date();
            const timeOptions = { hour: '2-digit', minute: '2-digit' };

            const [sh, sm] = startTime.split(':').map(Number);
            const [eh, em] = endTime.split(':').map(Number);

            const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), sh, sm);
            const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), eh, em);

            const startStr = startDate.toLocaleTimeString(locale, timeOptions);
            const endStr = endDate.toLocaleTimeString(locale, timeOptions);
            const separator = locale.startsWith('ja') ? ' \uff5e ' : ' - ';

            return `${startStr}${separator}${endStr}`;
        } catch {
            return `${startTime} - ${endTime}`;
        }
    }

    /**
     * Get recurrence display text
     * @private
     */
    _getRecurrenceDisplayText(event) {
        const recurrence = event.recurrence || (event.isRecurringInstance ? event : null);
        if (!recurrence || !recurrence.type || recurrence.type === RECURRENCE_TYPES.NONE) {
            // Check if it's a recurring instance without explicit recurrence data
            if (event.isRecurringInstance) {
                return window.getLocalizedMessage('recurrence')?.replace(':', '') || 'Recurring';
            }
            return null;
        }

        const typeMap = {
            [RECURRENCE_TYPES.DAILY]: 'recurrenceDaily',
            [RECURRENCE_TYPES.WEEKDAYS]: 'recurrenceWeekdays',
            [RECURRENCE_TYPES.WEEKLY]: 'recurrenceWeekly',
            [RECURRENCE_TYPES.MONTHLY]: 'recurrenceMonthly'
        };

        const msgKey = typeMap[recurrence.type];
        if (!msgKey) return null;

        let text = window.getLocalizedMessage(msgKey) || recurrence.type;

        // For weekly, add day names
        if (recurrence.type === RECURRENCE_TYPES.WEEKLY && recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
            const dayKeys = ['daySun', 'dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat'];
            const dayNames = recurrence.daysOfWeek.map(d => window.getLocalizedMessage(dayKeys[d]) || dayKeys[d]);
            text += ` (${dayNames.join(', ')})`;
        }

        return text;
    }

    // ========== Edit Mode ==========

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
                this._showError(window.getLocalizedMessage('endDateMustBeLater') || 'End date must be on or after start date');
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
            description: this.descriptionInput.value.trim(),
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

        if (this.mode === 'edit') {
            // Edit mode: switch back to view mode with updated data
            const updatedEvent = { ...this.currentEvent, ...eventData };
            this.showView(updatedEvent);
        } else {
            // Create mode: close the modal
            this.hide();
        }
    }

    /**
     * Get the start date for recurrence
     * @returns {string} The start date in YYYY-MM-DD format
     * @private
     */
    _getStartDateForRecurrence() {
        // Use injected date getter
        if (this._getCurrentDate) {
            const date = this._getCurrentDate();
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
            this.deleteDialog.show(this.currentEvent, {
                onDeleteThis: (event) => {
                    if (this.onDelete) {
                        this.onDelete(event, 'this');
                    }
                    this.hide();
                },
                onDeleteAll: (event) => {
                    if (this.onDeleteSeries) {
                        this.onDeleteSeries(event);
                    } else if (this.onDelete) {
                        this.onDelete(event, 'all');
                    }
                    this.hide();
                }
            });
        } else {
            if (this.onDelete) {
                this.onDelete(this.currentEvent);
            }
            this.hide();
        }
    }

    /**
     * Hide modal and clean up overlays
     */
    hide() {
        this.deleteDialog.remove();
        super.hide();
    }

    /**
     * Cancel processing
     * @private
     */
    _handleCancel() {
        if (this.mode === 'edit' && this.currentEvent) {
            // Return to view mode instead of closing
            this.showView(this.currentEvent);
            return;
        }

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
            this._showError(window.getLocalizedMessage('pleaseEnterTitle'));
            this.titleInput.focus();
            return false;
        }

        // Time check
        if (!this.startTimeInput.value) {
            this._showError(window.getLocalizedMessage('pleaseEnterStartTime'));
            this.startTimeInput.focus();
            return false;
        }

        if (!this.endTimeInput.value) {
            this._showError(window.getLocalizedMessage('pleaseEnterEndTime'));
            this.endTimeInput.focus();
            return false;
        }

        // The time validity check
        return this._validateTimes();
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
            this._showError(window.getLocalizedMessage('endTimeMustBeLater'));
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

        // Create the element if it doesn't exist
        if (!this.element) {
            this.createElement();
        }

        // Show edit content, hide view content
        this.viewContent.style.display = 'none';
        this.editContent.style.display = '';

        // Reset form via formBuilder
        this.formBuilder.resetForCreate(defaultStartTime, defaultEndTime);

        // Adjust the button display
        this.deleteButton.style.display = 'none';

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

        // Create the element if it doesn't exist
        if (!this.element) {
            this.createElement();
        }

        // Show edit content, hide view content
        this.viewContent.style.display = 'none';
        this.editContent.style.display = '';

        // Populate form via formBuilder
        this.formBuilder.populateForm(event);

        // Adjust the button display
        this.deleteButton.style.display = '';

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
        return this.formBuilder.getFormData(() => this._getStartDateForRecurrence());
    }

    /**
     * Reset form
     */
    resetForm() {
        this.formBuilder.resetForm();
        this.currentEvent = null;
        this.mode = 'create';
        this._clearError();
    }

    /**
     * Apply localization to modal elements
     * @private
     */
}
