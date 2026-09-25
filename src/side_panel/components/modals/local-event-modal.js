/**
 * LocalEventModal - Local event modal with view and edit modes
 */
import { ModalComponent } from './modal-component.js';
import { RECURRENCE_TYPES } from '../../../lib/constants.js';
import { LocalEventFormBuilder } from './local-event-form-builder.js';
import { DeleteRecurringDialog } from './delete-recurring-dialog.js';
import {
    createButton,
    createDeleteButton,
    createDeleteConfirmFooter,
    createDetailHeader,
    createDetailRow,
    createFooterSpacer,
    msg,
    setLocalizedText
} from './event-dialog-dom.js';
import { buildGoogleEventResource } from '../../../lib/google-event-utils.js';
import { buildRequestId } from '../../../lib/request-dedupe.js';

export class LocalEventModal extends ModalComponent {
    constructor(options = {}) {
        super({
            id: 'localEventDialog',
            ...options
        });

        // View mode elements
        this.viewContent = null;
        this.viewTitleElement = null;
        this.viewCloseButton = null;
        this.viewTimeRow = null;
        this.viewRecurrenceRow = null;
        this.viewDescriptionRow = null;
        this.viewReminderRow = null;
        this.viewActionFooter = null;
        this.viewEditButton = null;
        this.viewDeleteButton = null;

        // Delete confirmation footers (one per mode, swapped in for the
        // mode's own footer)
        this.viewConfirmFooter = null;
        this.editConfirmFooter = null;

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
        this.onSaveGoogle = options.onSaveGoogle || null;
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
        this.viewContent.className = 'event-detail';
        this.viewContent.hidden = true;
        this._createViewContent();
        content.appendChild(this.viewContent);

        // === Edit mode content ===
        this.editContent = document.createElement('div');
        this.editContent.className = 'local-event-edit-content';
        this._createEditContent();
        content.appendChild(this.editContent);

        // Escape backs out of a pending delete confirmation instead of closing
        // the dialog. Capture phase so this runs before ModalComponent's
        // close-on-Escape; the recurring-delete dialog handles its own Escape.
        this.addEventListener(document, 'keydown', (e) => {
            if (e.key !== 'Escape' || !this.isVisible() || this.deleteDialog.isOpen()) {
                return;
            }
            if (this._isConfirmingDelete()) {
                e.preventDefault();
                e.stopPropagation();
                this._showDeleteConfirm(false);
            }
        }, true);

        return content;
    }

    /**
     * Create view mode content: the same header, rows and footer as the
     * Google event details.
     * @private
     */
    _createViewContent() {
        const header = createDetailHeader(this, { titleId: 'localEventViewTitle', onClose: () => this.hide() });
        header.swatch.classList.add('is-local');
        this.viewTitleElement = header.title;
        this.viewCloseButton = header.closeButton;
        this.viewContent.appendChild(header.header);

        const body = document.createElement('div');
        body.className = 'event-detail-body';

        this.viewTimeRow = createDetailRow('fas fa-clock');
        this.viewRecurrenceRow = createDetailRow('fas fa-sync-alt');
        this.viewDescriptionRow = createDetailRow('fas fa-align-left');
        this.viewDescriptionRow.content.classList.add('event-detail-description');
        this.viewReminderRow = createDetailRow('fas fa-bell');
        setLocalizedText(this.viewReminderRow.content, 'reminderOn', 'Reminder on');
        [this.viewTimeRow, this.viewRecurrenceRow, this.viewDescriptionRow, this.viewReminderRow]
            .forEach(({ row }) => body.appendChild(row));
        this.viewContent.appendChild(body);

        // Delete on the left, Edit on the right
        this.viewActionFooter = document.createElement('footer');
        this.viewActionFooter.className = 'event-form-footer';
        this.viewDeleteButton = createDeleteButton(this, {
            id: 'localEventViewDeleteButton',
            onClick: () => this._handleDelete()
        });
        this.viewActionFooter.appendChild(this.viewDeleteButton);
        this.viewActionFooter.appendChild(createFooterSpacer());
        this.viewEditButton = createButton(this, {
            id: 'localEventViewEditButton',
            variant: 'secondary',
            msgKey: 'editEvent',
            fallback: 'Edit',
            iconClass: 'fas fa-pen',
            onClick: () => this.showEdit(this.currentEvent)
        });
        this.viewActionFooter.appendChild(this.viewEditButton);
        this.viewContent.appendChild(this.viewActionFooter);

        this.viewConfirmFooter = this._createConfirmFooter('localEventView');
        this.viewContent.appendChild(this.viewConfirmFooter.footer);
    }

    /**
     * The delete confirmation that stands in for a mode's footer.
     * @param {string} idPrefix
     * @returns {{footer: HTMLElement, cancelButton: HTMLButtonElement, confirmButton: HTMLButtonElement}}
     * @private
     */
    _createConfirmFooter(idPrefix) {
        return createDeleteConfirmFooter(this, {
            idPrefix,
            messageKey: 'localDeleteConfirm',
            messageFallback: "Delete this event? This can't be undone.",
            onConfirm: () => this._confirmDelete(),
            onCancel: () => this._showDeleteConfirm(false)
        });
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

        this.editConfirmFooter = this._createConfirmFooter('localEventEdit');
        this.editContent.appendChild(this.editConfirmFooter.footer);

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
        this.viewContent.hidden = false;
        this.editContent.hidden = true;
        this._showDeleteConfirm(false);

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
        this.viewTitleElement.textContent = event.title || msg('noTitle', 'No Title');

        const hasTime = !!(event.startTime && event.endTime);
        this.viewTimeRow.content.textContent = hasTime
            ? this._formatViewTime(event.startTime, event.endTime, this._getDisplayDate(event))
            : '';
        this.viewTimeRow.row.hidden = !hasTime;

        const recurrenceText = this._getRecurrenceDisplayText(event);
        this.viewRecurrenceRow.content.textContent = recurrenceText || '';
        this.viewRecurrenceRow.row.hidden = !recurrenceText;

        this.viewDescriptionRow.content.textContent = event.description || '';
        this.viewDescriptionRow.row.hidden = !event.description;

        this.viewReminderRow.row.hidden = event.reminder === false;
    }

    /**
     * Resolve the display date for the event (recurring instance date or current panel date)
     * @private
     */
    _getDisplayDate(event) {
        if (event?.instanceDate) {
            return new Date(event.instanceDate + 'T00:00:00');
        }
        if (this._getCurrentDate) {
            return this._getCurrentDate();
        }
        return new Date();
    }

    /**
     * Format time for view mode display (locale-aware)
     * @private
     */
    _formatViewTime(startTime, endTime, displayDate = new Date()) {
        let dateStr = '';
        try {
            const locale = navigator.language || 'en';
            const localeHint = locale.startsWith('ja') ? 'ja' : 'en';
            const timeOptions = { hour: '2-digit', minute: '2-digit' };

            dateStr = window.formatDateForLocale(displayDate, localeHint);

            const [sh, sm] = startTime.split(':').map(Number);
            const [eh, em] = endTime.split(':').map(Number);

            const startDate = new Date(displayDate.getFullYear(), displayDate.getMonth(), displayDate.getDate(), sh, sm);
            const endDate = new Date(displayDate.getFullYear(), displayDate.getMonth(), displayDate.getDate(), eh, em);

            const startStr = startDate.toLocaleTimeString(locale, timeOptions);
            const endStr = endDate.toLocaleTimeString(locale, timeOptions);
            const separator = localeHint === 'ja' ? ' \uff5e ' : ' - ';

            return `${dateStr} ${startStr}${separator}${endStr}`;
        } catch {
            return dateStr ? `${dateStr} ${startTime} - ${endTime}` : `${startTime} - ${endTime}`;
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

        // Google event creation path (create mode only)
        if (this.mode === 'create' && this.formBuilder.getSource() === 'google') {
            this._handleSaveGoogle();
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
     * Build the Google event resource and delegate creation to the controller.
     * @private
     */
    async _handleSaveGoogle() {
        // Re-entry guard: the title's Enter-key handler routes through _handleSave
        // too, so a disabled save button alone cannot prevent a double submit.
        if (this._submittingGoogle) {
            return;
        }

        const date = this._getCurrentDate ? this._getCurrentDate() : new Date();
        const isOutOfOffice = this.formBuilder.getEventType() === 'outOfOffice';
        // Out of office can only be created on the primary calendar; the picker
        // is hidden in that mode, so the resolved primary is used directly.
        const calendarId = isOutOfOffice
            ? this.formBuilder.getPrimaryCalendarId()
            : (this.formBuilder.calendarSelect?.value || 'primary');

        const eventResource = buildGoogleEventResource({
            // createEvent requires a summary, so stand in Google's own default
            // title for an absence the user left untitled.
            summary: this.titleInput.value.trim()
                || (isOutOfOffice ? (window.getLocalizedMessage('outOfOffice') || 'Out of office') : ''),
            description: this.descriptionInput.value,
            location: this.formBuilder.locationInput?.value,
            date,
            startTime: this.startTimeInput.value,
            endTime: this.endTimeInput.value,
            addMeet: !!this.formBuilder.meetCheckbox?.checked,
            reminderMinutes: this.formBuilder.reminderSelect?.value,
            eventType: isOutOfOffice ? 'outOfOffice' : undefined,
            allDay: this.formBuilder.isAllDay(),
            autoDecline: this.formBuilder.isAutoDecline()
        });

        if (!this.onSaveGoogle) {
            this.hide();
            return;
        }

        // Stable across retries of this submission so the background can
        // deduplicate a retry whose first attempt actually committed. The id
        // also covers the payload, so if the user corrects the form after a
        // failure the corrected request really runs instead of replaying the
        // recorded response. The seed is cleared on success/close so the next
        // creation is a new logical request.
        if (!this._googleCreateSeed) {
            this._googleCreateSeed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        }
        const requestId = buildRequestId('create-evt', this._googleCreateSeed, [calendarId, eventResource]);

        // Keep the modal open until the create succeeds, so the user does not
        // lose their input on a network/API failure.
        this._submittingGoogle = true;
        this._setSaving(true);
        let succeeded;
        try {
            succeeded = await this.onSaveGoogle(eventResource, calendarId, requestId);
        } catch (error) {
            // The controller handler already catches and returns a boolean, so
            // this is defensive: never let a rejection escape as an unhandled
            // promise and skip the failure message.
            console.error('Google event save error:', error);
            succeeded = false;
        } finally {
            this._submittingGoogle = false;
            this._setSaving(false);
        }

        if (succeeded) {
            this._googleCreateSeed = null;
            this.hide();
        } else {
            this._showError(window.getLocalizedMessage('googleEventCreateFailed') || 'Failed to create Google event');
        }
    }

    /**
     * Toggle the saving state (disables the save button to prevent double submit).
     * @param {boolean} saving
     * @private
     */
    _setSaving(saving) {
        if (this.saveButton) {
            this.saveButton.disabled = saving;
        }
    }

    /**
     * Enable or disable the Google save destination on an already-open create
     * modal (used when writable calendars resolve asynchronously after open).
     * @param {Array} writableCalendars
     * @param {Object} [options]
     * @param {boolean} [options.hiddenWritable] - Writable calendars exist but
     *   none are displayed on the timeline; shows an explanatory hint
     */
    setGoogleAvailability(writableCalendars, options = {}) {
        if (this.mode !== 'create' || !this.formBuilder) {
            return;
        }
        this.formBuilder.setGoogleAvailability(writableCalendars, options);
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
     * Delete processing. A recurring event first asks which occurrences to
     * delete; any other event asks for confirmation in the footer.
     * @private
     */
    _handleDelete() {
        if (!this.currentEvent) {
            return;
        }

        if (this.currentEvent.isRecurringInstance || this.currentEvent.recurrence) {
            const opener = this.mode === 'view' ? this.viewDeleteButton : this.deleteButton;
            this.deleteDialog.show(this.currentEvent, {
                date: this._getDisplayDate(this.currentEvent),
                returnFocusTo: opener,
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
            this._showDeleteConfirm(true);
        }
    }

    /**
     * Delete the current (non-recurring) event once confirmed.
     * @private
     */
    _confirmDelete() {
        if (!this.currentEvent) {
            return;
        }
        if (this.onDelete) {
            this.onDelete(this.currentEvent);
        }
        this.hide();
    }

    /**
     * The visible mode's own footer and its confirmation stand-in.
     * @returns {{footer: HTMLElement, confirm: Object, deleteButton: HTMLElement}|null}
     * @private
     */
    _footersForMode() {
        if (this.mode === 'view') {
            return { footer: this.viewActionFooter, confirm: this.viewConfirmFooter, deleteButton: this.viewDeleteButton };
        }
        if (this.mode === 'edit') {
            return { footer: this.formBuilder.footer, confirm: this.editConfirmFooter, deleteButton: this.deleteButton };
        }
        return null;
    }

    /**
     * Whether a delete confirmation is showing.
     * @returns {boolean}
     * @private
     */
    _isConfirmingDelete() {
        return [this.viewConfirmFooter, this.editConfirmFooter].some(c => c && !c.footer.hidden);
    }

    /**
     * Swap the visible mode's footer for the delete confirmation, or back.
     * Focus follows: Cancel when it opens, Delete when it is dismissed.
     * @param {boolean} confirming
     * @private
     */
    _showDeleteConfirm(confirming) {
        const wasConfirming = this._isConfirmingDelete();

        // Only one confirmation at a time, and none outside view/edit
        [
            [this.viewActionFooter, this.viewConfirmFooter],
            [this.formBuilder.footer, this.editConfirmFooter]
        ].forEach(([footer, confirm]) => {
            if (footer) footer.hidden = false;
            if (confirm) confirm.footer.hidden = true;
        });

        const current = this._footersForMode();
        if (!current) return;

        if (confirming) {
            current.footer.hidden = true;
            current.confirm.footer.hidden = false;
            current.confirm.cancelButton.focus();
        } else if (wasConfirming) {
            current.deleteButton.focus();
        }
    }

    /**
     * Hide modal and clean up overlays
     */
    hide() {
        this.deleteDialog.remove();
        // Abandoned submission: the next creation is a new logical request
        this._googleCreateSeed = null;
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
        // Both getters degrade to the plain-event answer unless the Google
        // destination and the out-of-office type are actually active, so the
        // local save path is unaffected.
        const isOutOfOffice = this.formBuilder.getEventType() === 'outOfOffice';

        // Title check — an untitled absence is allowed; Google's own default
        // title is filled in on save.
        if (!isOutOfOffice && !this.titleInput.value.trim()) {
            this._showError(window.getLocalizedMessage('pleaseEnterTitle'));
            this.titleInput.focus();
            return false;
        }

        // Time check (skipped for a whole-day absence, which has no time inputs)
        if (!this.formBuilder.isAllDay()) {
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
        }

        // The time validity check
        return this._validateTimes();
    }

    /**
     * Validate time validity
     * @private
     */
    _validateTimes() {
        // A whole-day absence hides the time inputs; whatever they still hold
        // is not part of the event and must not raise an error. This runs on
        // every time-input change too, not just on save.
        if (this.formBuilder.isAllDay()) {
            this._clearError();
            return true;
        }

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
        const errorElement = this.formBuilder?.errorContainer;
        if (!errorElement) {
            return;
        }
        // Reveal first, then write: a role=alert region that is already
        // populated when it appears is not reliably announced.
        errorElement.hidden = false;
        errorElement.textContent = message;
    }

    /**
     * Clear error messages
     * @private
     */
    _clearError() {
        const errorElement = this.formBuilder?.errorContainer;
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.hidden = true;
        }
    }

    /**
     * Display in create new mode
     * @param {string} defaultStartTime Default start time
     * @param {string} defaultEndTime Default end time
     */
    showCreate(defaultStartTime = '', defaultEndTime = '', writableCalendars = []) {
        this.mode = 'create';
        this.currentEvent = null;

        // Create the element if it doesn't exist
        if (!this.element) {
            this.createElement();
        }

        // Show edit content, hide view content
        this.viewContent.hidden = true;
        this.editContent.hidden = false;
        this._showDeleteConfirm(false);

        // Reset form via formBuilder
        this.formBuilder.resetForCreate(defaultStartTime, defaultEndTime);

        // Enable/disable the Google save destination based on writable calendars
        this.formBuilder.setGoogleAvailability(writableCalendars);

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
        this.viewContent.hidden = true;
        this.editContent.hidden = false;
        this._showDeleteConfirm(false);

        // Editing is always a local event: hide the Google save destination toggle
        this.formBuilder.setGoogleAvailability([]);

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
     * Place initial focus: Edit in view mode (the view has no inputs), the
     * form's first field otherwise.
     * @private
     */
    _focusFirstInput() {
        if (this.mode === 'view') {
            setTimeout(() => (this.viewEditButton || this.viewCloseButton)?.focus(), 100);
            return;
        }
        super._focusFirstInput();
    }
}
