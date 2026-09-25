/**
 * LocalEventFormBuilder - Helper class for building and managing the local event form
 *
 * Handles DOM construction for edit mode, form population, data retrieval, and reset.
 * This is a plain helper class (not a Component subclass).
 *
 * The form is laid out for the side panel, which is ~384px wide: every field is
 * one row of "icon + control" rather than a label line above a control, so a
 * field costs 46px instead of 79px and no state needs to scroll. The icons are
 * decorative (`aria-hidden`); each control keeps a real `<label>` that is only
 * visually hidden, and empty fields name themselves through their placeholder.
 */
import { RECURRENCE_TYPES } from '../../../lib/constants.js';
import { timeStringToMinutes, minutesToTimeString } from '../../../lib/time-utils.js';

/** Duration presets offered next to the time inputs, in minutes. */
const DURATION_PRESETS = [
    { minutes: 15, msgKey: 'duration15m', fallback: '15 min' },
    { minutes: 30, msgKey: 'duration30m', fallback: '30 min' },
    { minutes: 45, msgKey: 'duration45m', fallback: '45 min' },
    { minutes: 60, msgKey: 'duration1h', fallback: '1 hr' },
    { minutes: 90, msgKey: 'duration90m', fallback: '1 hr 30 min' },
    { minutes: 120, msgKey: 'duration2h', fallback: '2 hr' },
    { minutes: 180, msgKey: 'duration3h', fallback: '3 hr' }
];

/** Value of the duration option shown when the times match no preset. */
const CUSTOM_DURATION = 'custom';

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
        this.durationSelect = null;
        this.descriptionInput = null;
        this.reminderCheckbox = null;
        this.saveButton = null;
        this.deleteButton = null;
        this.cancelButton = null;
        this.closeButton = null;

        // Containers
        this.errorContainer = null;

        // Recurrence elements
        this.recurrenceSelect = null;
        this.recurrenceOptionsContainer = null;
        this.weekdayCheckboxes = {};
        this.endDateInput = null;
        this.noEndDateCheckbox = null;
        this.endDateSection = null;

        // Save destination (local / google) elements
        this.sourceToggle = null;
        this.sourceLocalBtn = null;
        this.sourceGoogleBtn = null;
        this.googleHiddenHint = null;
        this.currentSource = 'local';

        // Event type (default / outOfOffice) elements — a property of a Google
        // event, so its row only shows under the Google destination
        this.eventTypeRow = null;
        this.typeDefaultBtn = null;
        this.typeOooBtn = null;
        this.oooPrimaryHint = null;
        this.currentEventType = 'default';
        // The writable+displayed primary calendar, or null when there is none.
        // Out-of-office events can only be created on the primary calendar.
        this.primaryCalendar = null;

        // Out-of-office-only fields
        this.oooFields = null;
        this.allDayCheckbox = null;
        this.allDayRow = null;
        this.autoDeclineCheckbox = null;

        // Google-only fields
        this.googleFields = null;
        this.calendarSelect = null;
        this.locationInput = null;
        this.meetCheckbox = null;

        // Google advanced (accordion) fields
        this.googleAdvanced = null;
        this.advancedToggle = null;
        this.advancedBody = null;
        this.reminderSelect = null;

        // Containers toggled by save destination / event type
        this.reminderRow = null;
        this.recurrenceSection = null;
        this.descriptionRow = null;
        this.timeRow = null;

        // Callbacks handed in by buildEditContent, kept so controls added later
        // (the duration picker) can re-run validation.
        this._callbacks = {};
    }

    // ===== Small DOM helpers =====

    /**
     * Build a decorative icon. Every icon in this form sits beside a control
     * that carries its own accessible name, so icons are never announced.
     * @param {string} className
     * @returns {HTMLElement}
     * @private
     */
    _createIcon(className) {
        const icon = document.createElement('i');
        icon.className = className;
        icon.setAttribute('aria-hidden', 'true');
        return icon;
    }

    /**
     * Build a real label that is only visually hidden, so the control keeps its
     * accessible name now that the form shows no label text.
     * @param {string} htmlFor - id of the labelled control
     * @param {string} msgKey
     * @param {string} fallback
     * @returns {HTMLLabelElement}
     * @private
     */
    _createHiddenLabel(htmlFor, msgKey, fallback) {
        const label = document.createElement('label');
        label.className = 'visually-hidden';
        label.htmlFor = htmlFor;
        label.setAttribute('data-localize', `__MSG_${msgKey}__`);
        label.textContent = window.getLocalizedMessage(msgKey) || fallback;
        return label;
    }

    /**
     * Build an icon-led form row.
     * @param {string} iconClass - Font Awesome classes for the row icon
     * @returns {HTMLElement}
     * @private
     */
    _createRow(iconClass) {
        const row = document.createElement('div');
        row.className = 'event-form-row';
        row.appendChild(this._createIcon(`${iconClass} event-form-row-icon`));
        return row;
    }

    /**
     * Wrap a select so the custom chevron can be positioned over it.
     * @param {HTMLSelectElement} select
     * @returns {HTMLElement}
     * @private
     */
    _wrapSelect(select) {
        const wrap = document.createElement('div');
        wrap.className = 'event-form-select-wrap';
        wrap.appendChild(select);
        wrap.appendChild(this._createIcon('fas fa-chevron-down event-form-select-chevron'));
        return wrap;
    }

    /**
     * Build a chip that toggles a checkbox. The checkbox stays a real one (only
     * visually hidden) so callers keep reading `.checked`.
     * @param {string} inputId
     * @param {string} msgKey
     * @param {string} fallback
     * @returns {{chip: HTMLLabelElement, input: HTMLInputElement}}
     * @private
     */
    _createChipToggle(inputId, msgKey, fallback) {
        const chip = document.createElement('label');
        chip.className = 'chip-toggle';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = inputId;
        input.className = 'chip-toggle-input';

        const text = document.createElement('span');
        text.setAttribute('data-localize', `__MSG_${msgKey}__`);
        text.textContent = window.getLocalizedMessage(msgKey) || fallback;

        chip.appendChild(input);
        chip.appendChild(text);
        return { chip, input };
    }

    /**
     * Build a settings-style row: icon, label text, checkbox on the right. The
     * whole row is the label, so the entire width is clickable.
     * @param {string} inputId
     * @param {string} iconClass
     * @param {string} msgKey
     * @param {string} fallback
     * @returns {{row: HTMLLabelElement, input: HTMLInputElement}}
     * @private
     */
    _createCheckRow(inputId, iconClass, msgKey, fallback) {
        const row = document.createElement('label');
        row.className = 'event-form-check-row';
        row.htmlFor = inputId;
        row.appendChild(this._createIcon(`${iconClass} event-form-row-icon`));

        const text = document.createElement('span');
        text.className = 'event-form-check-label';
        text.setAttribute('data-localize', `__MSG_${msgKey}__`);
        text.textContent = window.getLocalizedMessage(msgKey) || fallback;
        row.appendChild(text);

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = inputId;
        input.className = 'event-form-check-input';
        row.appendChild(input);

        return { row, input };
    }

    /**
     * Build an explanatory hint paragraph.
     * @param {string} msgKey
     * @param {string} fallback
     * @returns {HTMLElement}
     * @private
     */
    _createHint(msgKey, fallback) {
        const hint = document.createElement('p');
        hint.className = 'event-form-hint';
        hint.setAttribute('data-localize', `__MSG_${msgKey}__`);
        hint.textContent = window.getLocalizedMessage(msgKey) || fallback;
        return hint;
    }

    // ===== Sections =====

    /**
     * Build the sticky header: dialog title plus a close button.
     * @param {HTMLElement} parentElement
     * @private
     */
    _buildHeader(parentElement) {
        const header = document.createElement('header');
        header.className = 'event-form-header';

        this.editTitleElement = document.createElement('h2');
        this.editTitleElement.className = 'event-form-title';
        this.editTitleElement.setAttribute('data-localize', '__MSG_eventDialogTitleCreate__');
        this.editTitleElement.textContent = window.getLocalizedMessage('eventDialogTitleCreate') || 'Create event';
        header.appendChild(this.editTitleElement);

        // The base ModalComponent's "×" is hidden in edit mode (it cannot live
        // inside this header), so the form supplies its own real button.
        this.closeButton = document.createElement('button');
        this.closeButton.type = 'button';
        this.closeButton.className = 'event-form-close';
        this.closeButton.setAttribute('data-localize-aria-label', '__MSG_close__');
        this.closeButton.setAttribute('aria-label', window.getLocalizedMessage('close') || 'Close');
        this.closeButton.appendChild(this._createIcon('fas fa-times'));
        this.modal.addEventListener(this.closeButton, 'click', () => this.modal.hide());
        header.appendChild(this.closeButton);

        parentElement.appendChild(header);
    }

    /**
     * Build a segmented control: mutually exclusive toggle buttons (Tab reaches
     * each, Enter/Space activates). We deliberately use role=group +
     * aria-pressed rather than radiogroup/radio, which would promise arrow-key
     * navigation we don't wire.
     * @param {string} ariaMsgKey - Message key for the group's accessible name
     * @param {string} ariaFallback
     * @returns {HTMLElement}
     * @private
     */
    _createSegmented(ariaMsgKey, ariaFallback) {
        const group = document.createElement('div');
        group.className = 'event-segmented';
        group.setAttribute('role', 'group');
        group.setAttribute('data-localize-aria-label', `__MSG_${ariaMsgKey}__`);
        group.setAttribute('aria-label', window.getLocalizedMessage(ariaMsgKey) || ariaFallback);
        return group;
    }

    /**
     * Build one button of a segmented control.
     * @param {string} msgKey
     * @param {string} fallback
     * @param {string|null} iconClass - Font Awesome classes, or null for text only
     * @param {Function} onPick
     * @returns {HTMLButtonElement}
     * @private
     */
    _createSegmentButton(msgKey, fallback, iconClass, onPick) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'event-segmented-btn';
        btn.setAttribute('aria-pressed', 'false');

        if (iconClass) {
            btn.appendChild(this._createIcon(iconClass));
        }

        const label = document.createElement('span');
        label.setAttribute('data-localize', `__MSG_${msgKey}__`);
        label.textContent = window.getLocalizedMessage(msgKey) || fallback;
        btn.appendChild(label);

        this.modal.addEventListener(btn, 'click', onPick);
        return btn;
    }

    /**
     * Build the save-destination toggle (Local / Google). Hidden until a
     * Google calendar list is provided via setGoogleAvailability().
     * @param {HTMLElement} parentElement
     * @private
     */
    _buildSourceToggle(parentElement) {
        const toggle = this._createSegmented('saveDestination', 'Save destination');

        // Local = stored on this device; Google = written to Google Calendar
        this.sourceLocalBtn = this._createSegmentButton(
            'destinationLocal', 'Local', 'fas fa-laptop', () => this.setSource('local')
        );
        this.sourceGoogleBtn = this._createSegmentButton(
            'destinationGoogle', 'Google', 'fab fa-google', () => this.setSource('google')
        );

        toggle.appendChild(this.sourceLocalBtn);
        toggle.appendChild(this.sourceGoogleBtn);
        // Stays hidden until setGoogleAvailability() reports a writable
        // calendar: with no Google destination there is nothing to choose.
        toggle.hidden = true;
        parentElement.appendChild(toggle);
        this.sourceToggle = toggle;

        // Shown when writable Google calendars exist but none are displayed on
        // the timeline (the toggle would otherwise vanish with no explanation
        // of why Google saving is unavailable).
        this.googleHiddenHint = this._createHint(
            'googleDestinationHidden',
            'To save to Google, show a writable calendar in the calendar filter first.'
        );
        this.googleHiddenHint.hidden = true;
        parentElement.appendChild(this.googleHiddenHint);
    }

    /**
     * Build the event-type row (Event / Out of office). An absence is a kind
     * of Google event rather than a third place to save to, so this sits as
     * the first field under the Google destination and is hidden otherwise.
     * @param {HTMLElement} parentElement
     * @private
     */
    _buildEventTypeRow(parentElement) {
        const row = this._createRow('fas fa-tag');
        row.hidden = true;

        const toggle = this._createSegmented('eventTypeGroup', 'Event type');
        this.typeDefaultBtn = this._createSegmentButton(
            'eventTypeDefault', 'Event', null, () => this.setEventType('default')
        );
        this.typeOooBtn = this._createSegmentButton(
            'outOfOffice', 'Out of office', null, () => this.setEventType('outOfOffice')
        );
        toggle.appendChild(this.typeDefaultBtn);
        toggle.appendChild(this.typeOooBtn);
        row.appendChild(toggle);

        parentElement.appendChild(row);
        this.eventTypeRow = row;

        // Explains a disabled "Out of office" button. A disabled button cannot
        // be focused, so the reason has to be visible text rather than a tooltip.
        this.oooPrimaryHint = this._createHint(
            'oooPrimaryOnly',
            'Out-of-office events can only be created on your primary calendar. Show it in the calendar filter first.'
        );
        this.oooPrimaryHint.hidden = true;
        parentElement.appendChild(this.oooPrimaryHint);
    }

    /**
     * Build the title field. It leads the form as a single underlined line
     * rather than a boxed input with a label above it.
     * @param {HTMLElement} parentElement
     * @private
     */
    _buildTitleField(parentElement) {
        parentElement.appendChild(this._createHiddenLabel('eventTitle', 'eventTitle', 'Title'));

        this.titleInput = document.createElement('input');
        this.titleInput.type = 'text';
        this.titleInput.id = 'eventTitle';
        this.titleInput.className = 'event-title-input';
        this.titleInput.required = true;
        this.titleInput.setAttribute('data-localize-placeholder', '__MSG_eventTitlePlaceholder__');
        this.titleInput.placeholder = window.getLocalizedMessage('eventTitlePlaceholder') || 'Title';
        parentElement.appendChild(this.titleInput);
    }

    /**
     * Build the all-day toggle (absences only). It gets its own row above the
     * times rather than a chip beside them: the time row has no width to spare
     * in a 12-hour locale, and a toggle that hides the times reads best when it
     * does not move as they disappear.
     * @param {HTMLElement} parentElement
     * @private
     */
    _buildAllDayRow(parentElement) {
        const allDay = this._createCheckRow('oooEventAllDay', 'fas fa-sun', 'allDay', 'All day');
        this.allDayRow = allDay.row;
        this.allDayCheckbox = allDay.input;
        this.allDayRow.hidden = true;
        parentElement.appendChild(this.allDayRow);
    }

    /**
     * Build the time row: start, end and a duration picker on one line.
     * @param {HTMLElement} parentElement
     * @private
     */
    _buildTimeRow(parentElement) {
        const row = this._createRow('fas fa-clock');
        // The tightest row in the form; it gets its own spacing.
        row.classList.add('event-time-row');

        const makeTimeInput = (id, msgKey, fallback) => {
            row.appendChild(this._createHiddenLabel(id, msgKey, fallback));

            const input = document.createElement('input');
            input.type = 'time';
            input.id = id;
            input.className = 'event-form-field event-time-input';
            input.setAttribute('list', 'time-list');
            input.required = true;
            row.appendChild(input);
            return input;
        };

        this.startTimeInput = makeTimeInput('eventStartTime', 'startTime', 'Start time');

        const separator = document.createElement('span');
        separator.className = 'event-time-separator';
        separator.setAttribute('aria-hidden', 'true');
        separator.textContent = '–';
        row.appendChild(separator);

        this.endTimeInput = makeTimeInput('eventEndTime', 'endTime', 'End time');

        // Duration picker: sets the end time from the start time. It only ever
        // writes the end time, so changing the start never silently moves it.
        row.appendChild(this._createHiddenLabel('eventDuration', 'duration', 'Duration'));

        this.durationSelect = document.createElement('select');
        this.durationSelect.id = 'eventDuration';
        this.durationSelect.className = 'event-duration-select';

        DURATION_PRESETS.forEach(preset => {
            const option = document.createElement('option');
            option.value = String(preset.minutes);
            option.setAttribute('data-localize', `__MSG_${preset.msgKey}__`);
            option.textContent = window.getLocalizedMessage(preset.msgKey) || preset.fallback;
            this.durationSelect.appendChild(option);
        });

        // Shown when the times match no preset. Disabled because picking it
        // would mean nothing — it reports a state, it does not set one.
        const customOption = document.createElement('option');
        customOption.value = CUSTOM_DURATION;
        customOption.disabled = true;
        customOption.setAttribute('data-localize', '__MSG_durationCustom__');
        customOption.textContent = window.getLocalizedMessage('durationCustom') || 'Custom';
        this.durationSelect.appendChild(customOption);

        row.appendChild(this._wrapSelect(this.durationSelect));

        parentElement.appendChild(row);
        this.timeRow = row;
    }

    /**
     * Build Google-only fields (the target calendar picker). Hidden unless the
     * save destination is Google.
     * @param {HTMLElement} parentElement
     * @private
     */
    _buildGoogleFields(parentElement) {
        const row = this._createRow('fas fa-calendar-alt');
        row.hidden = true;

        row.appendChild(this._createHiddenLabel('googleEventCalendar', 'targetCalendar', 'Calendar'));

        this.calendarSelect = document.createElement('select');
        this.calendarSelect.id = 'googleEventCalendar';
        this.calendarSelect.className = 'event-form-field';
        row.appendChild(this._wrapSelect(this.calendarSelect));

        parentElement.appendChild(row);
        this.googleFields = row;
    }

    /**
     * Build the out-of-office-only fields (auto-decline). "All day" has its own
     * row above the times. Hidden unless the event type is Out of office.
     * @param {HTMLElement} parentElement
     * @private
     */
    _buildOooFields(parentElement) {
        const container = document.createElement('div');
        container.className = 'ooo-event-fields';
        container.hidden = true;

        const decline = this._createCheckRow(
            'oooEventAutoDecline',
            'fas fa-ban',
            'autoDeclineInvitations',
            'Decline all conflicting invitations'
        );
        this.autoDeclineCheckbox = decline.input;
        this.autoDeclineCheckbox.setAttribute('aria-describedby', 'oooAutoDeclineHint');
        container.appendChild(decline.row);

        // Auto-decline reaches outside the panel (organizers are notified), so
        // spell out the consequence next to the checkbox rather than hiding it.
        const declineHint = this._createHint(
            'autoDeclineHint',
            'Meetings you already accepted are declined too, and organizers are notified.'
        );
        declineHint.id = 'oooAutoDeclineHint';
        declineHint.classList.add('event-form-hint-indented');
        container.appendChild(declineHint);

        parentElement.appendChild(container);
        this.oooFields = container;
    }

    /**
     * Build the description field.
     * @param {HTMLElement} parentElement
     * @private
     */
    _buildDescriptionField(parentElement) {
        const row = this._createRow('fas fa-align-left');

        row.appendChild(this._createHiddenLabel('eventDescription', 'eventDescription', 'Description'));

        this.descriptionInput = document.createElement('textarea');
        this.descriptionInput.id = 'eventDescription';
        this.descriptionInput.className = 'event-form-field event-form-textarea';
        this.descriptionInput.rows = 1;
        this.descriptionInput.setAttribute('data-localize-placeholder', '__MSG_addDescription__');
        this.descriptionInput.placeholder = window.getLocalizedMessage('addDescription') || 'Add a note';
        row.appendChild(this.descriptionInput);

        parentElement.appendChild(row);
        this.descriptionRow = row;
    }

    /**
     * Build the reminder toggle (local events only).
     * @param {HTMLElement} parentElement
     * @private
     */
    _buildReminderRow(parentElement) {
        const reminder = this._createCheckRow(
            'eventReminder',
            'fas fa-bell',
            'remindMeBefore',
            'Notify me before the event'
        );
        this.reminderCheckbox = reminder.input;
        this.reminderCheckbox.checked = true;
        parentElement.appendChild(reminder.row);
        this.reminderRow = reminder.row;
    }

    /**
     * Build the collapsible "Advanced settings" accordion for Google events
     * (location, reminder). Hidden unless the save destination is Google;
     * collapsed by default. Extra detail fields (colour, guests, …) go here.
     * @param {HTMLElement} parentElement
     * @private
     */
    _buildGoogleAdvanced(parentElement) {
        const container = document.createElement('div');
        container.className = 'google-advanced';
        container.hidden = true; // toggled with the Google destination

        // Accordion header (button)
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'accordion-toggle';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-controls', 'googleAdvancedBody');

        toggle.appendChild(this._createIcon('fas fa-chevron-down accordion-chevron'));

        const toggleLabel = document.createElement('span');
        toggleLabel.setAttribute('data-localize', '__MSG_advancedSettings__');
        toggleLabel.textContent = window.getLocalizedMessage('advancedSettings') || 'Advanced settings';
        toggle.appendChild(toggleLabel);

        container.appendChild(toggle);

        // Accordion body
        const body = document.createElement('div');
        body.className = 'accordion-body';
        body.id = 'googleAdvancedBody';
        body.hidden = true;

        // Location
        const locationRow = this._createRow('fas fa-map-marker-alt');
        locationRow.appendChild(this._createHiddenLabel('googleEventLocation', 'eventLocation', 'Location'));

        this.locationInput = document.createElement('input');
        this.locationInput.type = 'text';
        this.locationInput.id = 'googleEventLocation';
        this.locationInput.className = 'event-form-field';
        this.locationInput.setAttribute('data-localize-placeholder', '__MSG_addLocation__');
        this.locationInput.placeholder = window.getLocalizedMessage('addLocation') || 'Add a location';
        locationRow.appendChild(this.locationInput);
        body.appendChild(locationRow);

        // Notification (reminder)
        const reminderRow = this._createRow('fas fa-bell');
        reminderRow.appendChild(this._createHiddenLabel('googleEventReminder', 'notification', 'Notification'));

        this.reminderSelect = document.createElement('select');
        this.reminderSelect.id = 'googleEventReminder';
        this.reminderSelect.className = 'event-form-field';

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
        reminderRow.appendChild(this._wrapSelect(this.reminderSelect));
        body.appendChild(reminderRow);

        // Google Meet
        const meet = this._createCheckRow('googleEventMeet', 'fas fa-video', 'addGoogleMeet', 'Add Google Meet');
        this.meetCheckbox = meet.input;
        body.appendChild(meet.row);

        container.appendChild(body);
        parentElement.appendChild(container);

        this.googleAdvanced = container;
        this.advancedToggle = toggle;
        this.advancedBody = body;

        this.modal.addEventListener(toggle, 'click', () => this.setAdvancedExpanded());
    }

    /**
     * Build the recurrence section: the type picker, plus the weekday chips and
     * end date that only apply to some types.
     * @param {HTMLElement} parentElement - The container to append recurrence UI to
     */
    buildRecurrenceSection(parentElement) {
        const section = document.createElement('div');
        section.className = 'recurrence-section';
        this.recurrenceSection = section;

        const row = this._createRow('fas fa-sync-alt');
        row.appendChild(this._createHiddenLabel('recurrenceType', 'recurrence', 'Recurrence'));

        this.recurrenceSelect = document.createElement('select');
        this.recurrenceSelect.id = 'recurrenceType';
        this.recurrenceSelect.className = 'event-form-field';

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

        row.appendChild(this._wrapSelect(this.recurrenceSelect));
        section.appendChild(row);

        // Weekly day selection, indented to line up with the controls above
        this.recurrenceOptionsContainer = document.createElement('div');
        this.recurrenceOptionsContainer.className = 'weekday-chips';
        this.recurrenceOptionsContainer.setAttribute('role', 'group');
        this.recurrenceOptionsContainer.setAttribute('data-localize-aria-label', '__MSG_recurrenceWeekdaysGroup__');
        this.recurrenceOptionsContainer.setAttribute(
            'aria-label',
            window.getLocalizedMessage('recurrenceWeekdaysGroup') || 'Days of the week'
        );
        this.recurrenceOptionsContainer.hidden = true;

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
            const { chip, input } = this._createChipToggle(`recurrenceDay${day.value}`, day.msgKey, day.default);
            chip.classList.add('weekday-chip');
            input.value = String(day.value);
            this.weekdayCheckboxes[day.value] = input;
            this.recurrenceOptionsContainer.appendChild(chip);
        });

        section.appendChild(this.recurrenceOptionsContainer);

        // End date, indented the same way
        const endDateSection = document.createElement('div');
        endDateSection.className = 'end-date-section';
        endDateSection.hidden = true;

        endDateSection.appendChild(
            this._createHiddenLabel('recurrenceEndDate', 'recurrenceEndDate', 'End date')
        );

        this.endDateInput = document.createElement('input');
        this.endDateInput.type = 'date';
        this.endDateInput.id = 'recurrenceEndDate';
        this.endDateInput.className = 'event-form-field';
        endDateSection.appendChild(this.endDateInput);

        const noEnd = this._createChipToggle('noEndDate', 'noEndDate', 'No end date');
        this.noEndDateCheckbox = noEnd.input;
        this.noEndDateCheckbox.checked = true;
        endDateSection.appendChild(noEnd.chip);

        section.appendChild(endDateSection);
        this.endDateSection = endDateSection;

        parentElement.appendChild(section);
    }

    /**
     * Build the sticky footer: delete on the left, cancel and save on the right
     * so the destructive action is not adjacent to the primary one.
     * @param {HTMLElement} parentElement
     * @private
     */
    _buildFooter(parentElement) {
        const footer = document.createElement('footer');
        footer.className = 'event-form-footer';

        this.deleteButton = document.createElement('button');
        this.deleteButton.type = 'button';
        this.deleteButton.id = 'deleteEventButton';
        this.deleteButton.className = 'event-form-delete';
        this.deleteButton.appendChild(this._createIcon('fas fa-trash-alt'));

        const deleteLabel = document.createElement('span');
        deleteLabel.setAttribute('data-localize', '__MSG_delete__');
        deleteLabel.textContent = window.getLocalizedMessage('delete') || 'Delete';
        this.deleteButton.appendChild(deleteLabel);
        footer.appendChild(this.deleteButton);

        const spacer = document.createElement('div');
        spacer.className = 'event-form-footer-spacer';
        footer.appendChild(spacer);

        this.cancelButton = document.createElement('button');
        this.cancelButton.type = 'button';
        this.cancelButton.id = 'cancelEventButton';
        this.cancelButton.className = 'event-form-btn event-form-btn-secondary';
        this.cancelButton.setAttribute('data-localize', '__MSG_cancel__');
        this.cancelButton.textContent = window.getLocalizedMessage('cancel') || 'Cancel';
        footer.appendChild(this.cancelButton);

        this.saveButton = document.createElement('button');
        this.saveButton.type = 'button';
        this.saveButton.id = 'saveEventButton';
        this.saveButton.className = 'event-form-btn event-form-btn-primary';
        this.saveButton.setAttribute('data-localize', '__MSG_save__');
        this.saveButton.textContent = window.getLocalizedMessage('save') || 'Save';
        footer.appendChild(this.saveButton);

        parentElement.appendChild(footer);
    }

    /**
     * Build the edit mode content and append it to the parent element
     * @param {HTMLElement} parentElement - The container to append form elements to
     * @param {Object} options - Callbacks: { onSave, onDelete, onCancel, onValidateTimes }
     */
    buildEditContent(parentElement, options = {}) {
        this._callbacks = options;

        this._buildHeader(parentElement);

        const body = document.createElement('div');
        body.className = 'event-form-body';

        this._buildSourceToggle(body);
        this._buildEventTypeRow(body);
        this._buildTitleField(body);
        this._buildAllDayRow(body);
        this._buildTimeRow(body);

        // Order below decides what each mode shows: the calendar picker sits
        // right under the time for a Google event, the absence fields do the
        // same for an absence, and recurrence/description/reminder follow for a
        // local one.
        this._buildGoogleFields(body);
        this._buildOooFields(body);
        this.buildRecurrenceSection(body);
        this._buildDescriptionField(body);
        this._buildReminderRow(body);
        this._buildGoogleAdvanced(body);

        // Validation failures land here rather than after the footer.
        this.errorContainer = document.createElement('div');
        this.errorContainer.className = 'event-form-error';
        this.errorContainer.setAttribute('role', 'alert');
        this.errorContainer.hidden = true;
        body.appendChild(this.errorContainer);

        parentElement.appendChild(body);

        this._buildFooter(parentElement);

        // Set up the event listeners
        this._setupFormEventListeners(options);

        this._applyFieldVisibility();
    }

    // ===== Duration =====

    /**
     * Write the end time from the start time plus the picked duration.
     * @private
     */
    _applyDurationPreset() {
        const minutes = Number(this.durationSelect?.value);
        const start = timeStringToMinutes(this.startTimeInput?.value);

        if (Number.isFinite(minutes) && minutes > 0 && start !== null) {
            this.endTimeInput.value = minutesToTimeString(start + minutes);
        }

        // Re-read the times rather than trusting the preset: without a start
        // time nothing was applied, and a duration crossing midnight is clamped.
        this._syncDurationFromTimes();

        if (this._callbacks.onValidateTimes) this._callbacks.onValidateTimes();
    }

    /**
     * Point the duration picker at whatever the times currently say.
     * @private
     */
    _syncDurationFromTimes() {
        if (!this.durationSelect) return;

        const start = timeStringToMinutes(this.startTimeInput?.value);
        const end = timeStringToMinutes(this.endTimeInput?.value);
        const diff = start !== null && end !== null ? end - start : null;
        const matched = diff !== null && DURATION_PRESETS.some(preset => preset.minutes === diff);

        this.durationSelect.value = matched ? String(diff) : CUSTOM_DURATION;
    }

    /**
     * Expand/collapse the advanced accordion.
     * @param {boolean} [expanded] - Explicit state; toggles when omitted
     */
    setAdvancedExpanded(expanded) {
        if (!this.advancedToggle) return;
        const next = typeof expanded === 'boolean'
            ? expanded
            : this.advancedToggle.getAttribute('aria-expanded') !== 'true';
        this.advancedToggle.setAttribute('aria-expanded', String(next));
        this.advancedBody.hidden = !next;
    }

    /**
     * Set the dialog heading for the mode being shown. The attribute is updated
     * alongside the text so a later re-localization keeps the right one.
     * @param {string} mode - 'create' or 'edit'
     */
    setDialogTitle(mode) {
        if (!this.editTitleElement) return;
        const msgKey = mode === 'edit' ? 'eventDialogTitleEdit' : 'eventDialogTitleCreate';
        const fallback = mode === 'edit' ? 'Edit event' : 'Create event';
        this.editTitleElement.setAttribute('data-localize', `__MSG_${msgKey}__`);
        this.editTitleElement.textContent = window.getLocalizedMessage(msgKey) || fallback;
    }

    /**
     * Enable or disable the Google save destination and populate its calendar list.
     * @param {Array<{id: string, summary: string, primary: boolean}>} calendars - Writable calendars (empty disables Google)
     * @param {Object} [options]
     * @param {boolean} [options.hiddenWritable] - Writable calendars exist but
     *   none are displayed; show the explanatory hint instead of the toggle
     */
    setGoogleAvailability(calendars, { hiddenWritable = false } = {}) {
        const writable = Array.isArray(calendars) ? calendars : [];
        const available = writable.length > 0;

        if (this.sourceToggle) {
            this.sourceToggle.hidden = !available;
        }
        if (this.googleHiddenHint) {
            this.googleHiddenHint.hidden = available || !hiddenWritable;
        }

        // Out of office can only be created on the primary calendar, and only
        // shows up afterwards if that calendar is displayed. Recomputed on every
        // call: the modal opens with an empty list and is enriched once the real
        // one resolves.
        const primary = writable.find(cal => cal.primary) || null;
        this.primaryCalendar = primary;
        if (this.typeOooBtn) {
            this.typeOooBtn.disabled = !primary;
            this.typeOooBtn.setAttribute('aria-disabled', String(!primary));
        }

        if (available) {
            this.calendarSelect.innerHTML = '';
            writable.forEach(cal => {
                const option = document.createElement('option');
                option.value = cal.id;
                option.textContent = cal.primary
                    ? `${cal.summary} (${window.getLocalizedMessage('primaryCalendar') || 'Primary'})`
                    : cal.summary;
                this.calendarSelect.appendChild(option);
            });
            this.calendarSelect.value = primary ? primary.id : writable[0].id;
        }

        // Always reset to local when (re)configuring
        this.setSource('local');
    }

    /**
     * Apply every piece of field visibility that derives from the current save
     * destination and event type. All the setters funnel through here so the two
     * dimensions cannot get out of step.
     * @private
     */
    _applyFieldVisibility() {
        const isGoogle = this.currentSource === 'google';
        const isOoo = isGoogle && this.currentEventType === 'outOfOffice';

        const setPressed = (btn, pressed) => {
            if (!btn) return;
            btn.classList.toggle('active', pressed);
            btn.setAttribute('aria-pressed', String(pressed));
        };
        setPressed(this.sourceLocalBtn, !isGoogle);
        setPressed(this.sourceGoogleBtn, isGoogle);
        setPressed(this.typeDefaultBtn, !isOoo);
        setPressed(this.typeOooBtn, isOoo);

        // The event type only applies to Google events
        if (this.eventTypeRow) {
            this.eventTypeRow.hidden = !isGoogle;
        }
        if (this.oooPrimaryHint) {
            this.oooPrimaryHint.hidden = !(isGoogle && !this.primaryCalendar);
        }

        // Target calendar, Meet, location and reminder do not apply to an
        // absence: it always lands on the primary calendar and is not a meeting.
        if (this.googleFields) {
            this.googleFields.hidden = !(isGoogle && !isOoo);
        }
        if (this.googleAdvanced) {
            this.googleAdvanced.hidden = !(isGoogle && !isOoo);
        }
        if (this.descriptionRow) {
            this.descriptionRow.hidden = isOoo;
        }
        if (this.oooFields) {
            this.oooFields.hidden = !isOoo;
        }
        if (this.allDayRow) {
            this.allDayRow.hidden = !isOoo;
        }
        // Google names an untitled absence "Out of office" — show that as the
        // placeholder, since the title is optional in this mode.
        if (this.titleInput) {
            const msgKey = isOoo ? 'outOfOffice' : 'eventTitlePlaceholder';
            const fallback = isOoo ? 'Out of office' : 'Title';
            this.titleInput.setAttribute('data-localize-placeholder', `__MSG_${msgKey}__`);
            this.titleInput.placeholder = window.getLocalizedMessage(msgKey) || fallback;
        }

        // Local-only fields are hidden when creating a Google event
        if (this.reminderRow) {
            this.reminderRow.hidden = isGoogle;
        }
        if (this.recurrenceSection) {
            this.recurrenceSection.hidden = isGoogle;
        }
    }

    /**
     * Switch the active save destination and update field visibility.
     * @param {string} source - 'local' or 'google'
     */
    setSource(source) {
        this.currentSource = source === 'google' ? 'google' : 'local';
        if (this.currentSource !== 'google') {
            // Out of office is a Google-only shape; leaving Google drops it
            // (and the all-day state that only exists inside it).
            this.currentEventType = 'default';
            this.setAllDay(false);
        }
        this._applyFieldVisibility();
    }

    /**
     * Get the currently selected save destination.
     * @returns {string} 'local' or 'google'
     */
    getSource() {
        return this.currentSource;
    }

    /**
     * Switch the event type being created and update field visibility.
     * Out of office is refused when there is no primary calendar to write to.
     * @param {string} type - 'default' or 'outOfOffice'
     */
    setEventType(type) {
        const next = type === 'outOfOffice' && this.primaryCalendar ? 'outOfOffice' : 'default';
        this.currentEventType = next;
        if (next !== 'outOfOffice') {
            // Restore the time inputs: an all-day absence hid them, and a plain
            // event has no way to get them back.
            this.setAllDay(false);
        }
        this._applyFieldVisibility();
    }

    /**
     * Get the event type being created.
     * Degrades to 'default' unless the Google destination is active, so a
     * stale toggle can never leak out-of-office state into a local save.
     * @returns {string} 'default' or 'outOfOffice'
     */
    getEventType() {
        return this.currentSource === 'google' ? this.currentEventType : 'default';
    }

    /**
     * Toggle the whole-day absence state, hiding or restoring the time inputs.
     * Keeps the checkbox itself in sync so isAllDay() cannot report a stale
     * true after the event type is switched back.
     * @param {boolean} checked
     */
    setAllDay(checked) {
        if (this.allDayCheckbox) {
            this.allDayCheckbox.checked = !!checked;
        }
        if (this.timeRow) {
            this.timeRow.hidden = !!checked;
        }
    }

    /**
     * Whether a whole-day absence is being created.
     * @returns {boolean}
     */
    isAllDay() {
        return this.getEventType() === 'outOfOffice' && !!this.allDayCheckbox?.checked;
    }

    /**
     * Whether conflicting invitations should be auto-declined.
     * @returns {boolean}
     */
    isAutoDecline() {
        return this.getEventType() === 'outOfOffice' && !!this.autoDeclineCheckbox?.checked;
    }

    /**
     * The calendar id an out-of-office event must be created on.
     * @returns {string|null} The primary calendar's id, or null when there is none
     */
    getPrimaryCalendarId() {
        return this.primaryCalendar ? this.primaryCalendar.id : null;
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

        // The time input validation. Editing either time also re-points the
        // duration picker, which only ever reports the current gap.
        this.modal.addEventListener(this.startTimeInput, 'change', () => {
            this._syncDurationFromTimes();
            if (options.onValidateTimes) options.onValidateTimes();
        });

        this.modal.addEventListener(this.endTimeInput, 'change', () => {
            this._syncDurationFromTimes();
            if (options.onValidateTimes) options.onValidateTimes();
        });

        // Duration picker writes the end time from the start time
        this.modal.addEventListener(this.durationSelect, 'change', () => {
            this._applyDurationPreset();
        });

        // All-day toggle: hides the time inputs, so re-run validation to clear
        // any error the now-irrelevant times left on screen
        this.modal.addEventListener(this.allDayCheckbox, 'change', () => {
            this.setAllDay(this.allDayCheckbox.checked);
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
        this.recurrenceOptionsContainer.hidden = recurrenceType !== RECURRENCE_TYPES.WEEKLY;

        // Show/hide end date section for any recurrence except 'none'
        this.endDateSection.hidden = recurrenceType === RECURRENCE_TYPES.NONE;
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
        this._syncDurationFromTimes();

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

        this.setDialogTitle('edit');
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
        this._syncDurationFromTimes();
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
        this._syncDurationFromTimes();

        // Reset Google-only fields and save destination
        if (this.locationInput) this.locationInput.value = '';
        if (this.meetCheckbox) this.meetCheckbox.checked = false;
        if (this.reminderSelect) this.reminderSelect.value = '';
        if (this.autoDeclineCheckbox) this.autoDeclineCheckbox.checked = false;
        this.setAdvancedExpanded(false); // collapse the accordion
        // Resets the event type, the all-day state and the time row along with it
        this.setSource('local');

        // Reset recurrence
        this.recurrenceSelect.value = RECURRENCE_TYPES.NONE;
        this._resetWeekdayCheckboxes();
        this.noEndDateCheckbox.checked = true;
        this.endDateInput.value = '';
        this.endDateInput.disabled = true;
        this.updateRecurrenceOptions();

        this.setDialogTitle('create');
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
