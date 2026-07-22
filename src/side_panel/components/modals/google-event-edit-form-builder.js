/**
 * GoogleEventEditFormBuilder - Edit form for Google Calendar events
 *
 * Builds the edit-mode form of the Google event modal: title, start/end
 * time, description, location and reminder. Deliberately separate from
 * LocalEventFormBuilder, which is coupled to local-only concerns
 * (recurrence, save-destination toggle, calendar picker, Meet checkbox).
 */
export class GoogleEventEditFormBuilder {
    /**
     * @param {import('./google-event-modal.js').GoogleEventModal} modal - The parent modal (used for addEventListener tracking)
     */
    constructor(modal) {
        this.modal = modal;

        this.titleInput = null;
        this.startTimeInput = null;
        this.endTimeInput = null;
        this.descriptionInput = null;
        this.locationInput = null;
        this.reminderSelect = null;
        this.saveButton = null;
        this.cancelButton = null;
    }

    /**
     * Build the edit form and append it to the parent element.
     * @param {HTMLElement} parentElement
     * @param {Object} options - Callbacks: { onSave, onCancel }
     */
    buildEditContent(parentElement, options = {}) {
        // Title input
        const titleLabel = document.createElement('label');
        titleLabel.htmlFor = 'googleEditTitle';
        titleLabel.setAttribute('data-localize', '__MSG_eventTitle__');
        titleLabel.textContent = window.getLocalizedMessage('eventTitle');
        parentElement.appendChild(titleLabel);

        this.titleInput = document.createElement('input');
        this.titleInput.type = 'text';
        this.titleInput.id = 'googleEditTitle';
        this.titleInput.required = true;
        parentElement.appendChild(this.titleInput);

        // Time inputs row (side by side)
        const timeRow = document.createElement('div');
        timeRow.className = 'time-input-row';

        const startGroup = document.createElement('div');
        startGroup.className = 'time-input-group';

        const startLabel = document.createElement('label');
        startLabel.htmlFor = 'googleEditStartTime';
        startLabel.setAttribute('data-localize', '__MSG_startTime__');
        startLabel.textContent = window.getLocalizedMessage('startTime');
        startGroup.appendChild(startLabel);

        this.startTimeInput = document.createElement('input');
        this.startTimeInput.type = 'time';
        this.startTimeInput.id = 'googleEditStartTime';
        this.startTimeInput.setAttribute('list', 'time-list');
        this.startTimeInput.required = true;
        startGroup.appendChild(this.startTimeInput);

        const endGroup = document.createElement('div');
        endGroup.className = 'time-input-group';

        const endLabel = document.createElement('label');
        endLabel.htmlFor = 'googleEditEndTime';
        endLabel.setAttribute('data-localize', '__MSG_endTime__');
        endLabel.textContent = window.getLocalizedMessage('endTime');
        endGroup.appendChild(endLabel);

        this.endTimeInput = document.createElement('input');
        this.endTimeInput.type = 'time';
        this.endTimeInput.id = 'googleEditEndTime';
        this.endTimeInput.setAttribute('list', 'time-list');
        this.endTimeInput.required = true;
        endGroup.appendChild(this.endTimeInput);

        timeRow.appendChild(startGroup);
        timeRow.appendChild(endGroup);
        parentElement.appendChild(timeRow);

        // Description textarea
        const descriptionLabel = document.createElement('label');
        descriptionLabel.htmlFor = 'googleEditDescription';
        descriptionLabel.setAttribute('data-localize', '__MSG_eventDescription__');
        descriptionLabel.textContent = window.getLocalizedMessage('eventDescription');
        parentElement.appendChild(descriptionLabel);

        this.descriptionInput = document.createElement('textarea');
        this.descriptionInput.id = 'googleEditDescription';
        this.descriptionInput.className = 'event-description-input';
        this.descriptionInput.rows = 3;
        parentElement.appendChild(this.descriptionInput);

        // Location input
        const locationLabel = document.createElement('label');
        locationLabel.htmlFor = 'googleEditLocation';
        locationLabel.setAttribute('data-localize', '__MSG_eventLocation__');
        locationLabel.textContent = window.getLocalizedMessage('eventLocation') || 'Location';
        parentElement.appendChild(locationLabel);

        this.locationInput = document.createElement('input');
        this.locationInput.type = 'text';
        this.locationInput.id = 'googleEditLocation';
        parentElement.appendChild(this.locationInput);

        // Notification (reminder) select
        const reminderLabel = document.createElement('label');
        reminderLabel.htmlFor = 'googleEditReminder';
        reminderLabel.setAttribute('data-localize', '__MSG_notification__');
        reminderLabel.textContent = window.getLocalizedMessage('notification') || 'Notification';
        parentElement.appendChild(reminderLabel);

        this.reminderSelect = document.createElement('select');
        this.reminderSelect.id = 'googleEditReminder';
        this.reminderSelect.className = 'event-form-select';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.setAttribute('data-localize', '__MSG_reminderDefault__');
        defaultOption.textContent = window.getLocalizedMessage('reminderDefault') || 'Calendar default';
        this.reminderSelect.appendChild(defaultOption);

        const unit = window.getLocalizedMessage('minutesBeforeUnit') || ' min before';
        [5, 10, 15, 30, 60].forEach(minutes => {
            const option = document.createElement('option');
            option.value = String(minutes);
            option.textContent = `${minutes}${unit}`;
            this.reminderSelect.appendChild(option);
        });
        parentElement.appendChild(this.reminderSelect);

        // Button bar
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'modal-buttons';

        this.saveButton = document.createElement('button');
        this.saveButton.id = 'googleEditSaveButton';
        this.saveButton.className = 'btn btn-success';
        this.saveButton.setAttribute('data-localize', '__MSG_save__');
        this.saveButton.textContent = window.getLocalizedMessage('save');

        this.cancelButton = document.createElement('button');
        this.cancelButton.id = 'googleEditCancelButton';
        this.cancelButton.className = 'btn btn-secondary';
        this.cancelButton.setAttribute('data-localize', '__MSG_cancel__');
        this.cancelButton.textContent = window.getLocalizedMessage('cancel');

        buttonGroup.appendChild(this.saveButton);
        buttonGroup.appendChild(this.cancelButton);
        parentElement.appendChild(buttonGroup);

        if (options.onSave) {
            this.modal.addEventListener(this.saveButton, 'click', options.onSave);
        }
        if (options.onCancel) {
            this.modal.addEventListener(this.cancelButton, 'click', options.onCancel);
        }
    }

    /**
     * Prefill the form from a Google event object.
     * @param {Object} event - The event (Google Calendar API shape)
     * @param {string} startTime - "HH:MM" start (extracted by the caller)
     * @param {string} endTime - "HH:MM" end
     */
    populate(event, startTime, endTime) {
        this.titleInput.value = event.summary || '';
        this.startTimeInput.value = startTime;
        this.endTimeInput.value = endTime;
        // Keep the raw description so a save round-trips without loss
        this.descriptionInput.value = event.description || '';
        this.locationInput.value = event.location || '';
        this._populateReminder(event.reminders);
    }

    /**
     * Reflect the event's current reminder setting in the select.
     * A popup override that is not one of the preset choices gets its own
     * option so that saving does not silently revert it to the default.
     * @param {Object|undefined} reminders - The event's `reminders` field
     * @private
     */
    _populateReminder(reminders) {
        // Drop any custom option added by a previous populate
        this.reminderSelect.querySelector('option[data-custom]')?.remove();

        const override = !reminders || reminders.useDefault
            ? null
            : (reminders.overrides || []).find(o => o.method === 'popup');
        if (!override || !Number.isFinite(Number(override.minutes))) {
            this.reminderSelect.value = '';
            return;
        }

        const value = String(override.minutes);
        if (![...this.reminderSelect.options].some(o => o.value === value)) {
            const custom = document.createElement('option');
            custom.value = value;
            custom.dataset.custom = 'true';
            custom.textContent = `${override.minutes}${window.getLocalizedMessage('minutesBeforeUnit') || ' min before'}`;
            this.reminderSelect.appendChild(custom);
        }
        this.reminderSelect.value = value;
    }

    /**
     * Read the current form values.
     * @returns {{summary: string, startTime: string, endTime: string, description: string, location: string, reminderMinutes: string}}
     */
    getValues() {
        return {
            summary: this.titleInput.value,
            startTime: this.startTimeInput.value,
            endTime: this.endTimeInput.value,
            description: this.descriptionInput.value,
            location: this.locationInput.value,
            reminderMinutes: this.reminderSelect.value
        };
    }
}
