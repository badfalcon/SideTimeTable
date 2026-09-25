/**
 * GoogleEventEditFormBuilder - Edit form for Google Calendar events
 *
 * Builds the edit mode of the Google event modal: title, time (with the same
 * duration picker as the create form), description, location and
 * notification. It uses the create form's layout — icon-led rows between a
 * sticky header and footer — but stays separate from LocalEventFormBuilder,
 * which is coupled to create-only concerns (save destination, recurrence,
 * event type, calendar picker, Meet).
 */
import {
    applyDurationPreset,
    createButton,
    createCloseButton,
    createFooterSpacer,
    createHiddenLabel,
    createIcon,
    createRow,
    createTimeRow,
    msg,
    setLocalizedText,
    syncDurationFromTimes,
    wrapSelect
} from './event-dialog-dom.js';

export class GoogleEventEditFormBuilder {
    /**
     * @param {import('./google-event-modal.js').GoogleEventModal} modal - The parent modal (used for addEventListener tracking)
     */
    constructor(modal) {
        this.modal = modal;

        this.titleInput = null;
        this.startTimeInput = null;
        this.endTimeInput = null;
        this.durationSelect = null;
        this.descriptionInput = null;
        this.locationInput = null;
        this.reminderSelect = null;
        this.saveButton = null;
        this.cancelButton = null;
        this.closeButton = null;
        this.calendarChip = null;
        this.calendarChipLabel = null;
        this.elsewhereLink = null;
        this.errorContainer = null;

        // Select value at populate() time, to detect an actual user change
        // (an unchanged reminder must NOT be patched, or it would clobber
        // email/multiple overrides the select cannot represent).
        this.initialReminderValue = '';
    }

    /**
     * Build the edit form and append it to the parent element.
     * @param {HTMLElement} parentElement
     * @param {Object} options - Callbacks: { onSave, onCancel, onClose }
     */
    buildEditContent(parentElement, options = {}) {
        this._buildHeader(parentElement, options);

        const body = document.createElement('div');
        body.className = 'event-form-body';

        this._buildTitleField(body);

        const time = createTimeRow({ start: 'googleEditStartTime', end: 'googleEditEndTime', duration: 'googleEditDuration' });
        this.startTimeInput = time.startInput;
        this.endTimeInput = time.endInput;
        this.durationSelect = time.durationSelect;
        body.appendChild(time.row);

        this._buildDescriptionField(body);
        this._buildLocationField(body);
        this._buildReminderField(body);
        this._buildElsewhereHint(body);

        this.errorContainer = document.createElement('div');
        this.errorContainer.className = 'event-form-error';
        this.errorContainer.setAttribute('role', 'alert');
        this.errorContainer.hidden = true;
        body.appendChild(this.errorContainer);

        parentElement.appendChild(body);

        this._buildFooter(parentElement, options);
        this._setupListeners(options);
    }

    /**
     * Header: dialog title, the event's calendar, close.
     * @private
     */
    _buildHeader(parentElement, options) {
        const header = document.createElement('header');
        header.className = 'event-form-header';

        const title = document.createElement('h2');
        title.className = 'event-form-title';
        header.appendChild(setLocalizedText(title, 'eventDialogTitleEdit', 'Edit event'));

        // Which calendar the event is on. It cannot be changed here, so it is
        // a label rather than a picker.
        this.calendarChip = document.createElement('span');
        this.calendarChip.className = 'event-form-calendar-chip';
        this.calendarChip.appendChild(createIcon('fab fa-google'));
        this.calendarChipLabel = document.createElement('span');
        this.calendarChip.appendChild(this.calendarChipLabel);
        header.appendChild(this.calendarChip);

        this.closeButton = createCloseButton(this.modal, () => options.onClose?.());
        header.appendChild(this.closeButton);

        parentElement.appendChild(header);
    }

    /** @private */
    _buildTitleField(parentElement) {
        parentElement.appendChild(createHiddenLabel('googleEditTitle', 'eventTitle', 'Title'));

        this.titleInput = document.createElement('input');
        this.titleInput.type = 'text';
        this.titleInput.id = 'googleEditTitle';
        this.titleInput.className = 'event-title-input';
        this.titleInput.required = true;
        this.titleInput.setAttribute('data-localize-placeholder', '__MSG_eventTitlePlaceholder__');
        this.titleInput.placeholder = msg('eventTitlePlaceholder', 'Title');
        parentElement.appendChild(this.titleInput);
    }

    /** @private */
    _buildDescriptionField(parentElement) {
        const row = createRow('fas fa-align-left');
        row.appendChild(createHiddenLabel('googleEditDescription', 'eventDescription', 'Description'));

        this.descriptionInput = document.createElement('textarea');
        this.descriptionInput.id = 'googleEditDescription';
        this.descriptionInput.className = 'event-form-field event-form-textarea is-multiline';
        // An existing description is usually several lines; show them
        this.descriptionInput.rows = 3;
        this.descriptionInput.setAttribute('data-localize-placeholder', '__MSG_addDescription__');
        this.descriptionInput.placeholder = msg('addDescription', 'Add a note');
        row.appendChild(this.descriptionInput);

        parentElement.appendChild(row);
    }

    /** @private */
    _buildLocationField(parentElement) {
        const row = createRow('fas fa-map-marker-alt');
        row.appendChild(createHiddenLabel('googleEditLocation', 'eventLocation', 'Location'));

        this.locationInput = document.createElement('input');
        this.locationInput.type = 'text';
        this.locationInput.id = 'googleEditLocation';
        this.locationInput.className = 'event-form-field';
        this.locationInput.setAttribute('data-localize-placeholder', '__MSG_addLocation__');
        this.locationInput.placeholder = msg('addLocation', 'Add a location');
        row.appendChild(this.locationInput);

        parentElement.appendChild(row);
    }

    /** @private */
    _buildReminderField(parentElement) {
        const row = createRow('fas fa-bell');
        row.appendChild(createHiddenLabel('googleEditReminder', 'notification', 'Notification'));

        this.reminderSelect = document.createElement('select');
        this.reminderSelect.id = 'googleEditReminder';
        this.reminderSelect.className = 'event-form-field';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        this.reminderSelect.appendChild(setLocalizedText(defaultOption, 'reminderDefault', 'Calendar default'));

        const unit = msg('minutesBeforeUnit', ' min before');
        [5, 10, 15, 30, 60].forEach(minutes => {
            const option = document.createElement('option');
            option.value = String(minutes);
            option.textContent = `${minutes}${unit}`;
            this.reminderSelect.appendChild(option);
        });
        row.appendChild(wrapSelect(this.reminderSelect));

        parentElement.appendChild(row);
    }

    /**
     * The form edits a subset of the event (no guests, recurrence, Meet or
     * calendar move). Say what is missing and link to where it can be done,
     * rather than leaving it out silently.
     * @private
     */
    _buildElsewhereHint(parentElement) {
        const hint = document.createElement('p');
        hint.className = 'event-form-hint event-form-hint-indented';

        const lead = document.createElement('span');
        hint.appendChild(setLocalizedText(lead, 'googleEditElsewhereLead', 'Guests, repeat and Meet:'));
        hint.appendChild(document.createTextNode(' '));

        this.elsewhereLink = document.createElement('a');
        this.elsewhereLink.className = 'event-form-link';
        this.elsewhereLink.target = '_blank';
        this.elsewhereLink.rel = 'noopener noreferrer';
        this.elsewhereLink.appendChild(setLocalizedText(
            document.createElement('span'), 'googleEditElsewhereLink', 'edit in Google Calendar'
        ));
        this.elsewhereLink.appendChild(createIcon('fas fa-external-link-alt event-form-link-icon'));
        hint.appendChild(this.elsewhereLink);

        parentElement.appendChild(hint);
    }

    /** @private */
    _buildFooter(parentElement, options) {
        const footer = document.createElement('footer');
        footer.className = 'event-form-footer';

        footer.appendChild(createFooterSpacer());

        this.cancelButton = createButton(this.modal, {
            id: 'googleEditCancelButton', variant: 'secondary', msgKey: 'cancel', fallback: 'Cancel',
            onClick: () => options.onCancel?.()
        });
        footer.appendChild(this.cancelButton);

        this.saveButton = createButton(this.modal, {
            id: 'googleEditSaveButton', variant: 'primary', msgKey: 'save', fallback: 'Save',
            onClick: () => options.onSave?.()
        });
        footer.appendChild(this.saveButton);

        parentElement.appendChild(footer);
    }

    /** @private */
    _setupListeners(options) {
        // Enter in the title saves, as in the create form
        this.modal.addEventListener(this.titleInput, 'keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                options.onSave?.();
            }
        });

        // The duration picker only reports the gap between the times, and
        // writes the end time when a preset is picked
        const sync = () => syncDurationFromTimes(this.startTimeInput, this.endTimeInput, this.durationSelect);
        this.modal.addEventListener(this.startTimeInput, 'change', sync);
        this.modal.addEventListener(this.endTimeInput, 'change', sync);
        this.modal.addEventListener(this.durationSelect, 'change', () => {
            applyDurationPreset(this.startTimeInput, this.endTimeInput, this.durationSelect);
        });
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
        syncDurationFromTimes(this.startTimeInput, this.endTimeInput, this.durationSelect);
        // Keep the raw description so a save round-trips without loss
        this.descriptionInput.value = event.description || '';
        this.locationInput.value = event.location || '';
        this._populateReminder(event.reminders);
        this.initialReminderValue = this.reminderSelect.value;

        this.calendarChipLabel.textContent = event.calendarName || '';
        this.calendarChip.hidden = !event.calendarName;

        if (event.htmlLink) {
            this.elsewhereLink.href = event.htmlLink;
        } else {
            this.elsewhereLink.removeAttribute('href');
        }
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
            custom.textContent = `${override.minutes}${msg('minutesBeforeUnit', ' min before')}`;
            this.reminderSelect.appendChild(custom);
        }
        this.reminderSelect.value = value;
    }

    /**
     * Whether the user changed the reminder selection since populate().
     * @returns {boolean}
     */
    isReminderChanged() {
        return this.reminderSelect.value !== this.initialReminderValue;
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
