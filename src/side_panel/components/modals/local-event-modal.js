/**
 * LocalEventModal - Local event editing modal
 */
import { ModalComponent } from './modal-component.js';

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

        // Event being edited
        this.currentEvent = null;

        // Callbacks
        this.onSave = options.onSave || null;
        this.onDelete = options.onDelete || null;
        this.onCancel = options.onCancel || null;

        // Edit mode (create/edit)
        this.mode = 'create';
    }

    createContent() {
        const content = document.createElement('div');

        // Title
        const title = document.createElement('h2');
        title.setAttribute('data-localize', '__MSG_eventDialogTitle__');
        title.textContent = 'Create/Edit Event';
        content.appendChild(title);

        // Title input
        const titleLabel = document.createElement('label');
        titleLabel.htmlFor = 'eventTitle';
        titleLabel.setAttribute('data-localize', '__MSG_eventTitle__');
        titleLabel.textContent = 'Title:';
        content.appendChild(titleLabel);

        this.titleInput = document.createElement('input');
        this.titleInput.type = 'text';
        this.titleInput.id = 'eventTitle';
        this.titleInput.required = true;
        content.appendChild(this.titleInput);

        // Start time input
        const startLabel = document.createElement('label');
        startLabel.htmlFor = 'eventStartTime';
        startLabel.setAttribute('data-localize', '__MSG_startTime__');
        startLabel.textContent = 'Start Time:';
        content.appendChild(startLabel);

        this.startTimeInput = document.createElement('input');
        this.startTimeInput.type = 'time';
        this.startTimeInput.id = 'eventStartTime';
        this.startTimeInput.setAttribute('list', 'time-list');
        this.startTimeInput.required = true;
        content.appendChild(this.startTimeInput);

        // End time input
        const endLabel = document.createElement('label');
        endLabel.htmlFor = 'eventEndTime';
        endLabel.setAttribute('data-localize', '__MSG_endTime__');
        endLabel.textContent = 'End Time:';
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
        reminderLabel.textContent = 'Remind me 5 minutes before';
        reminderLabel.style.cssText = 'margin-left: 8px; user-select: none; cursor: pointer; display: inline-block;';

        reminderContainer.appendChild(this.reminderCheckbox);
        reminderContainer.appendChild(reminderLabel);
        content.appendChild(reminderContainer);

        // Button group
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'modal-buttons';

        // Save button
        this.saveButton = document.createElement('button');
        this.saveButton.id = 'saveEventButton';
        this.saveButton.className = 'btn btn-success';
        this.saveButton.setAttribute('data-localize', '__MSG_save__');
        this.saveButton.textContent = 'Save';

        // Delete button
        this.deleteButton = document.createElement('button');
        this.deleteButton.id = 'deleteEventButton';
        this.deleteButton.className = 'btn btn-danger';
        this.deleteButton.setAttribute('data-localize', '__MSG_delete__');
        this.deleteButton.textContent = 'Delete';

        // Cancel button
        this.cancelButton = document.createElement('button');
        this.cancelButton.id = 'cancelEventButton';
        this.cancelButton.className = 'btn btn-secondary';
        this.cancelButton.setAttribute('data-localize', '__MSG_cancel__');
        this.cancelButton.textContent = 'Cancel';

        buttonGroup.appendChild(this.saveButton);
        buttonGroup.appendChild(this.deleteButton);
        buttonGroup.appendChild(this.cancelButton);
        content.appendChild(buttonGroup);

        // Set up event listeners
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

        // Time input validation
        this.addEventListener(this.startTimeInput, 'change', () => {
            this._validateTimes();
        });

        this.addEventListener(this.endTimeInput, 'change', () => {
            this._validateTimes();
        });
    }

    /**
     * Save processing
     * @private
     */
    _handleSave() {
        if (!this._validateForm()) {
            return;
        }

        const eventData = {
            id: this.currentEvent?.id || null,
            title: this.titleInput.value.trim(),
            startTime: this.startTimeInput.value,
            endTime: this.endTimeInput.value,
            reminder: this.reminderCheckbox.checked
        };

        if (this.onSave) {
            this.onSave(eventData, this.mode);
        }

        this.hide();
    }

    /**
     * Delete processing
     * @private
     */
    _handleDelete() {
        if (!this.currentEvent) {
            return;
        }

        if (this.onDelete) {
            this.onDelete(this.currentEvent);
        }

        this.hide();
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
            this._showError('Please enter a title');
            this.titleInput.focus();
            return false;
        }

        // Time check
        if (!this.startTimeInput.value) {
            this._showError('Please enter a start time');
            this.startTimeInput.focus();
            return false;
        }

        if (!this.endTimeInput.value) {
            this._showError('Please enter an end time');
            this.endTimeInput.focus();
            return false;
        }

        // Time validity check
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
            this._showError('End time must be later than start time');
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
        // Remove existing error messages
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

        // Adjust button display
        this.deleteButton.style.display = 'none';

        // Update title
        this.setTitle('Create Event');

        this._clearError();
        this.show();
    }

    /**
     * Display in edit mode
     * @param {Object} event Event to edit
     */
    showEdit(event) {
        this.mode = 'edit';
        this.currentEvent = event;

        // Set values in form
        this.titleInput.value = event.title || '';
        this.startTimeInput.value = event.startTime || '';
        this.endTimeInput.value = event.endTime || '';
        this.reminderCheckbox.checked = event.reminder !== false;

        // Adjust button display
        this.deleteButton.style.display = '';

        // Update title
        this.setTitle('Edit Event');

        this._clearError();
        this.show();
    }

    /**
     * Get form data
     * @returns {Object} Form data
     */
    getFormData() {
        return {
            title: this.titleInput?.value.trim() || '',
            startTime: this.startTimeInput?.value || '',
            endTime: this.endTimeInput?.value || '',
            reminder: this.reminderCheckbox?.checked || false
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