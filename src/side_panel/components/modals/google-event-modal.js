/**
 * GoogleEventModal - Google event details modal
 */
import { ModalComponent } from './modal-component.js';
import { sendMessage } from '../../../lib/chrome-messaging.js';
import { GoogleEventContentBuilder } from './google-event-content-builder.js';
import { GoogleEventEditFormBuilder } from './google-event-edit-form-builder.js';
import { buildGoogleEventResource, extractTimeHHMM } from '../../../lib/google-event-utils.js';

// Event types that must never be edited or deleted from the panel
const NON_EDITABLE_EVENT_TYPES = ['outOfOffice', 'focusTime', 'workingLocation'];

export class GoogleEventModal extends ModalComponent {
    constructor(options = {}) {
        super({
            id: 'googleEventDialog',
            ...options
        });

        // Display elements
        this.titleElement = null;
        this.calendarElement = null;
        this.timeElement = null;
        this.descriptionElement = null;
        this.locationElement = null;
        this.meetElement = null;

        // View/edit containers
        this.viewContent = null;
        this.editContent = null;
        this.viewButtons = null;
        this.editButton = null;
        this.deleteButton = null;
        this.deleteConfirmRow = null;

        // RSVP elements
        this.rsvpContainer = null;

        // Callback for when RSVP response is sent
        this.onRsvpResponse = options.onRsvpResponse || null;

        // Callbacks for edit/delete. Both return Promise<boolean> so the
        // modal can stay open (preserving input) on failure.
        this.onSaveEdit = options.onSaveEdit || null;
        this.onDelete = options.onDelete || null;

        // The currently displayed event
        this.currentEvent = null;

        // Content builder for DOM construction
        this._contentBuilder = new GoogleEventContentBuilder();

        // Edit form builder
        this._editFormBuilder = new GoogleEventEditFormBuilder(this);

        // Re-entry guards for async actions
        this._submittingEdit = false;
        this._deletingEvent = false;
    }

    createContent() {
        const content = document.createElement('div');

        // ── View mode ────────────────────────────────────────────────
        this.viewContent = document.createElement('div');

        // Event title
        this.titleElement = document.createElement('h2');
        this.titleElement.className = 'google-event-title';
        this.viewContent.appendChild(this.titleElement);

        // Calendar name
        this.calendarElement = document.createElement('div');
        this.calendarElement.className = 'google-event-row google-event-calendar mb-2';
        this.viewContent.appendChild(this.calendarElement);

        // Event time
        this.timeElement = document.createElement('div');
        this.timeElement.className = 'google-event-row google-event-time mb-2';
        this.viewContent.appendChild(this.timeElement);

        // Description
        this.descriptionElement = document.createElement('div');
        this.descriptionElement.className = 'google-event-row google-event-description mb-2';
        this.viewContent.appendChild(this.descriptionElement);

        // Location
        this.locationElement = document.createElement('div');
        this.locationElement.className = 'google-event-row google-event-location mb-2';
        this.viewContent.appendChild(this.locationElement);

        // Meet information
        this.meetElement = document.createElement('div');
        this.meetElement.className = 'google-event-row google-event-meet';
        this.viewContent.appendChild(this.meetElement);

        // Out of office information
        this.oooInfoElement = document.createElement('div');
        this.oooInfoElement.className = 'google-event-row google-event-ooo-info mb-2';
        this.viewContent.appendChild(this.oooInfoElement);

        content.appendChild(this.viewContent);

        // ── Edit mode (hidden until the Edit button is pressed) ──────
        this.editContent = document.createElement('div');
        this.editContent.style.display = 'none';
        this._editFormBuilder.buildEditContent(this.editContent, {
            onSave: () => this._handleSaveEdit(),
            onCancel: () => this._showViewMode()
        });
        content.appendChild(this.editContent);

        // Attendees/RSVP (created lazily) must land inside viewContent so
        // they are hidden together with the rest of the view mode.
        this.modalBody = this.viewContent;

        return content;
    }

    /**
     * Display Google event
     * @param {Object} event Google event data
     */
    showEvent(event) {
        this.currentEvent = event;

        // Create the element if it doesn't exist
        if (!this.element) {
            this.createElement();
        }

        // Title
        this._setTitle(event);

        // Calendar name
        this._contentBuilder.setCalendarInfo(this.calendarElement, event);

        // Time information
        this._contentBuilder.setTimeInfo(this.timeElement, event);

        // Description
        this._contentBuilder.setDescription(this.descriptionElement, event);

        // Location
        this._contentBuilder.setLocation(this.locationElement, event);

        // Meet information
        this._contentBuilder.setMeetInfo(this.meetElement, event);

        // Out of office information
        this._contentBuilder.setOutOfOfficeInfo(this.oooInfoElement, event);

        // Attendees and RSVP (skip for out-of-office events)
        if (event.eventType === 'outOfOffice') {
            if (this.attendeesElement) this.attendeesElement.innerHTML = '';
            if (this.rsvpContainer) this.rsvpContainer.innerHTML = '';
        } else {
            this._setAttendeesInfo(event);
            this._setRsvpButtons(event);
        }

        // Edit/Delete actions (hidden when the event is not editable)
        this._setEditDeleteButtons(event);

        // Always open in view mode with a clean state
        this._showViewMode();

        this.show();

        // Apply the localization after showing the modal
        this._localizeModal();
    }

    /**
     * Whether the event can be edited/deleted from the panel:
     * a timed, non-recurring event on a writable (owner/writer) calendar.
     * Unlike RSVP this does not require the user to be an attendee.
     * @param {Object} event
     * @returns {boolean}
     * @private
     */
    _isEditableEvent(event) {
        return !!(
            event &&
            event.isWritableCalendar &&
            event.id &&
            event.calendarId &&
            event.start?.dateTime &&
            !event.recurringEventId &&
            !event.recurrence &&
            !NON_EDITABLE_EVENT_TYPES.includes(event.eventType)
        );
    }

    /**
     * Build (once) and toggle the view-mode Edit/Delete button bar.
     * @param {Object} event
     * @private
     */
    _setEditDeleteButtons(event) {
        if (!this.viewButtons) {
            this.viewButtons = document.createElement('div');
            this.viewButtons.className = 'modal-buttons';

            this.editButton = document.createElement('button');
            this.editButton.type = 'button';
            this.editButton.id = 'googleEventEditButton';
            this.editButton.className = 'btn btn-primary';
            this.editButton.setAttribute('data-localize', '__MSG_editEvent__');
            this.editButton.textContent = window.getLocalizedMessage('editEvent') || 'Edit';
            this.addEventListener(this.editButton, 'click', () => this._showEditMode());

            this.deleteButton = document.createElement('button');
            this.deleteButton.type = 'button';
            this.deleteButton.id = 'googleEventDeleteButton';
            this.deleteButton.className = 'btn btn-danger';
            this.deleteButton.setAttribute('data-localize', '__MSG_delete__');
            this.deleteButton.textContent = window.getLocalizedMessage('delete') || 'Delete';
            this.addEventListener(this.deleteButton, 'click', () => this._showDeleteConfirm(true));

            this.viewButtons.appendChild(this.editButton);
            this.viewButtons.appendChild(this.deleteButton);

            // Inline two-step delete confirmation (hidden by default)
            this.deleteConfirmRow = document.createElement('div');
            this.deleteConfirmRow.className = 'modal-buttons google-event-delete-confirm';
            this.deleteConfirmRow.style.display = 'none';

            const confirmText = document.createElement('span');
            confirmText.setAttribute('data-localize', '__MSG_googleDeleteConfirm__');
            confirmText.textContent = window.getLocalizedMessage('googleDeleteConfirm') || 'Delete this event?';

            this.confirmDeleteButton = document.createElement('button');
            this.confirmDeleteButton.type = 'button';
            this.confirmDeleteButton.id = 'googleEventConfirmDeleteButton';
            this.confirmDeleteButton.className = 'btn btn-danger';
            this.confirmDeleteButton.setAttribute('data-localize', '__MSG_confirmDelete__');
            this.confirmDeleteButton.textContent = window.getLocalizedMessage('confirmDelete') || 'Delete';
            this.addEventListener(this.confirmDeleteButton, 'click', () => this._handleDeleteConfirmed());

            this.cancelDeleteButton = document.createElement('button');
            this.cancelDeleteButton.type = 'button';
            this.cancelDeleteButton.id = 'googleEventCancelDeleteButton';
            this.cancelDeleteButton.className = 'btn btn-secondary';
            this.cancelDeleteButton.setAttribute('data-localize', '__MSG_cancel__');
            this.cancelDeleteButton.textContent = window.getLocalizedMessage('cancel') || 'Cancel';
            this.addEventListener(this.cancelDeleteButton, 'click', () => this._showDeleteConfirm(false));

            this.deleteConfirmRow.appendChild(confirmText);
            this.deleteConfirmRow.appendChild(this.confirmDeleteButton);
            this.deleteConfirmRow.appendChild(this.cancelDeleteButton);

            this.viewContent.appendChild(this.viewButtons);
            this.viewContent.appendChild(this.deleteConfirmRow);
        }

        const editable = this._isEditableEvent(event);
        this.viewButtons.style.display = editable ? '' : 'none';
        this._showDeleteConfirm(false);
    }

    /**
     * Toggle between the action bar and the inline delete confirmation.
     * @param {boolean} confirming
     * @private
     */
    _showDeleteConfirm(confirming) {
        if (!this.viewButtons) return;
        const editable = this._isEditableEvent(this.currentEvent);
        this.viewButtons.style.display = confirming || !editable ? 'none' : '';
        this.deleteConfirmRow.style.display = confirming ? '' : 'none';
    }

    /**
     * Switch to view mode and clear transient edit state.
     * @private
     */
    _showViewMode() {
        this._clearError();
        this.viewContent.style.display = '';
        this.editContent.style.display = 'none';
        this._showDeleteConfirm(false);
    }

    /**
     * Switch to edit mode, prefilled from the current event.
     * @private
     */
    _showEditMode() {
        const event = this.currentEvent;
        if (!this._isEditableEvent(event)) {
            return;
        }

        this._clearError();
        this._editFormBuilder.populate(
            event,
            extractTimeHHMM(event.start.dateTime),
            extractTimeHHMM(event.end?.dateTime)
        );

        this.viewContent.style.display = 'none';
        this.editContent.style.display = '';
        this._localizeModal();
    }

    /**
     * Validate the edit form and delegate the update to the controller.
     * Keeps the modal open (with an error message) on failure so the
     * user's input is not lost.
     * @private
     */
    async _handleSaveEdit() {
        if (this._submittingEdit) {
            return;
        }
        const event = this.currentEvent;
        if (!event) {
            return;
        }

        this._clearError();
        const values = this._editFormBuilder.getValues();

        if (!values.summary.trim()) {
            this._showError(window.getLocalizedMessage('pleaseEnterTitle') || 'Please enter a title');
            return;
        }
        if (!values.startTime) {
            this._showError(window.getLocalizedMessage('pleaseEnterStartTime') || 'Please enter a start time');
            return;
        }
        if (!values.endTime) {
            this._showError(window.getLocalizedMessage('pleaseEnterEndTime') || 'Please enter an end time');
            return;
        }
        // Zero-padded "HH:MM" strings compare correctly lexicographically
        if (values.endTime <= values.startTime) {
            this._showError(window.getLocalizedMessage('endTimeMustBeLater') || 'End time must be later than start time');
            return;
        }

        // Patch on the event's own date — the panel may be viewing another day
        const patchResource = buildGoogleEventResource({
            summary: values.summary,
            description: values.description,
            location: values.location,
            date: new Date(event.start.dateTime),
            startTime: values.startTime,
            endTime: values.endTime,
            reminderMinutes: values.reminderMinutes
        }, { forPatch: true });

        if (!this.onSaveEdit) {
            this.hide();
            return;
        }

        this._submittingEdit = true;
        this._editFormBuilder.saveButton.disabled = true;
        let succeeded;
        try {
            succeeded = await this.onSaveEdit(event.calendarId, event.id, patchResource);
        } catch (error) {
            console.error('Google event update error:', error);
            succeeded = false;
        } finally {
            this._submittingEdit = false;
            this._editFormBuilder.saveButton.disabled = false;
        }

        if (succeeded) {
            this.hide();
        } else {
            this._showError(window.getLocalizedMessage('googleEventUpdateFailed') || 'Failed to update Google event');
        }
    }

    /**
     * Delete the current event after the inline confirmation.
     * @private
     */
    async _handleDeleteConfirmed() {
        if (this._deletingEvent) {
            return;
        }
        const event = this.currentEvent;
        if (!event || !this.onDelete) {
            return;
        }

        this._clearError();
        this._deletingEvent = true;
        this.confirmDeleteButton.disabled = true;
        let succeeded;
        try {
            succeeded = await this.onDelete(event.calendarId, event.id);
        } catch (error) {
            console.error('Google event delete error:', error);
            succeeded = false;
        } finally {
            this._deletingEvent = false;
            this.confirmDeleteButton.disabled = false;
        }

        if (succeeded) {
            this.hide();
        } else {
            this._showDeleteConfirm(false);
            this._showError(window.getLocalizedMessage('googleEventDeleteFailed') || 'Failed to delete Google event');
        }
    }

    /**
     * Display an error message at the bottom of the modal.
     * @param {string} message
     * @private
     */
    _showError(message) {
        this._clearError();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;

        this.modalContent.appendChild(errorDiv);
    }

    /**
     * Remove any displayed error message.
     * @private
     */
    _clearError() {
        this.modalContent?.querySelector('.error-message')?.remove();
    }

    /**
     * Set event title
     * @private
     */
    _setTitle(event) {
        this.titleElement.innerHTML = '';
        if (event.htmlLink) {
            if (event.calendarBackgroundColor) {
                const colorIndicator = document.createElement('span');
                colorIndicator.className = 'google-event-title-color';
                colorIndicator.style.backgroundColor = event.calendarBackgroundColor;
                this.titleElement.appendChild(colorIndicator);
            }
            const titleLink = document.createElement('a');
            titleLink.href = event.htmlLink;
            titleLink.target = '_blank';
            titleLink.textContent = event.summary || (event.eventType === 'outOfOffice' ? window.getLocalizedMessage('outOfOffice') : window.getLocalizedMessage('noTitle'));
            titleLink.style.cssText = 'color: inherit; text-decoration: none;';
            titleLink.addEventListener('mouseenter', () => {
                titleLink.style.textDecoration = 'underline';
            });
            titleLink.addEventListener('mouseleave', () => {
                titleLink.style.textDecoration = 'none';
            });
            this.titleElement.appendChild(titleLink);
        } else {
            if (event.calendarBackgroundColor) {
                const colorIndicator = document.createElement('span');
                colorIndicator.className = 'google-event-title-color';
                colorIndicator.style.backgroundColor = event.calendarBackgroundColor;
                this.titleElement.appendChild(colorIndicator);
            }
            const titleText = document.createElement('span');
            titleText.textContent = event.summary || (event.eventType === 'outOfOffice' ? window.getLocalizedMessage('outOfOffice') : window.getLocalizedMessage('noTitle'));
            this.titleElement.appendChild(titleText);
        }
    }

    /**
     * Set attendees information (delegates to content builder, manages element lifecycle)
     * @private
     */
    _setAttendeesInfo(event) {
        // Create the attendees element if it doesn't exist
        if (!this.attendeesElement) {
            this.attendeesElement = document.createElement('div');
            this.attendeesElement.className = 'google-event-row google-event-attendees mb-3';
            this.modalBody.appendChild(this.attendeesElement);
        }

        this._contentBuilder.setAttendeesInfo(this.attendeesElement, event);
    }

    /**
     * Set RSVP response buttons
     * @private
     */
    _setRsvpButtons(event) {
        // Create the RSVP container if it doesn't exist
        if (!this.rsvpContainer) {
            this.rsvpContainer = document.createElement('div');
            this.rsvpContainer.className = 'google-event-rsvp mb-2';
            this.modalBody.appendChild(this.rsvpContainer);
        }

        this.rsvpContainer.innerHTML = '';

        // Only show RSVP buttons if:
        // - The event is from a calendar owned by the user (not shared/read-only calendars)
        // - The event has attendees and the user is one of them
        const attendees = event.attendees || [];
        const selfAttendee = attendees.find(a => a.self);
        if (!selfAttendee || !event.isOwnedCalendar || !event.calendarId || !event.id) {
            return;
        }

        const icon = document.createElement('i');
        icon.className = 'fas fa-reply me-1';
        icon.style.cssText = 'color: var(--side-calendar-secondary-text-color);';

        const buttonsWrapper = document.createElement('div');
        buttonsWrapper.className = 'google-event-rsvp-wrapper';

        const label = document.createElement('div');
        label.className = 'google-event-rsvp-label';
        const labelText = document.createElement('span');
        labelText.setAttribute('data-localize', '__MSG_rsvpLabel__');
        labelText.textContent = window.getLocalizedMessage('rsvpLabel') || 'Your response';
        label.appendChild(labelText);

        const btnGroup = document.createElement('div');
        btnGroup.className = 'google-event-rsvp-buttons';

        const isRecurringInstance = !!event.recurringEventId;
        const buttons = [
            { response: 'accepted', icon: 'fa-check', labelKey: 'rsvpAccept', fallback: 'Accept' },
            { response: 'tentative', icon: 'fa-question', labelKey: 'rsvpTentative', fallback: 'Maybe' },
            { response: 'declined', icon: 'fa-times', labelKey: 'rsvpDecline', fallback: 'Decline' }
        ];

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = 'google-event-rsvp-btn';
            if (selfAttendee.responseStatus === btn.response) {
                button.classList.add('active');
            }
            button.type = 'button';
            button.dataset.response = btn.response;

            const btnIcon = document.createElement('i');
            btnIcon.className = `fas ${btn.icon}`;
            button.appendChild(btnIcon);

            const btnText = document.createElement('span');
            btnText.className = 'google-event-rsvp-btn-text';

            const btnTextMain = document.createElement('span');
            btnTextMain.setAttribute('data-localize', `__MSG_${btn.labelKey}__`);
            btnTextMain.textContent = window.getLocalizedMessage(btn.labelKey) || btn.fallback;
            btnText.appendChild(btnTextMain);

            if (btn.response === 'declined' && isRecurringInstance) {
                const btnTextSub = document.createElement('span');
                btnTextSub.className = 'google-event-rsvp-btn-text-sub';
                btnTextSub.setAttribute('data-localize', '__MSG_rsvpDeclineScope__');
                btnTextSub.textContent = window.getLocalizedMessage('rsvpDeclineScope') || '(this only)';
                btnText.appendChild(btnTextSub);
            }

            button.appendChild(btnText);

            button.addEventListener('click', () => {
                this._sendRsvpResponse(event, btn.response, btnGroup);
            });

            btnGroup.appendChild(button);
        });

        buttonsWrapper.appendChild(label);
        buttonsWrapper.appendChild(btnGroup);

        this.rsvpContainer.appendChild(icon);
        this.rsvpContainer.appendChild(buttonsWrapper);
    }

    /**
     * Send RSVP response to Google Calendar
     * @private
     */
    async _sendRsvpResponse(event, response, btnGroup) {
        // Disable all buttons while sending
        const allButtons = btnGroup.querySelectorAll('.google-event-rsvp-btn');
        allButtons.forEach(btn => {
            btn.disabled = true;
        });

        try {
            const result = await sendMessage({
                action: 'respondToEvent',
                calendarId: event.calendarId,
                eventId: event.id,
                response: response
            });

            if (result && result.success) {
                // Update button states
                allButtons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.disabled = false;
                });
                // Find the clicked button and mark as active
                const activeIndex = ['accepted', 'tentative', 'declined'].indexOf(response);
                if (activeIndex >= 0 && allButtons[activeIndex]) {
                    allButtons[activeIndex].classList.add('active');
                }

                // Update the self attendee's status in the attendees list display
                if (this.currentEvent && this.currentEvent.attendees) {
                    const selfAttendee = this.currentEvent.attendees.find(a => a.self);
                    if (selfAttendee) {
                        selfAttendee.responseStatus = response;
                    }
                    this._setAttendeesInfo(this.currentEvent);
                }

                // If declined, close modal after a brief delay (event will be removed from timeline)
                if (response === 'declined') {
                    this._showRsvpFeedback(window.getLocalizedMessage('rsvpDeclinedFeedback') || 'Declined. Event will be hidden.', 'declined');
                    setTimeout(() => {
                        this.hide();
                        if (this.onRsvpResponse) {
                            this.onRsvpResponse(response, event);
                        }
                    }, 1200);
                } else {
                    this._showRsvpFeedback(window.getLocalizedMessage('rsvpSuccessFeedback') || 'Response sent.', 'success');
                    // Notify parent to refresh events
                    if (this.onRsvpResponse) {
                        this.onRsvpResponse(response, event);
                    }
                }
            } else {
                console.error('RSVP response failed:', result?.error);
                allButtons.forEach(btn => btn.disabled = false);
                this._showRsvpFeedback(window.getLocalizedMessage('rsvpErrorFeedback') || 'Failed to send response.', 'error');
            }
        } catch (error) {
            console.error('Failed to send RSVP response:', error);
            allButtons.forEach(btn => btn.disabled = false);
            this._showRsvpFeedback(window.getLocalizedMessage('rsvpErrorFeedback') || 'Failed to send response.', 'error');
        }
    }

    /**
     * Show a brief feedback message in the RSVP area
     * @private
     */
    _showRsvpFeedback(message, type) {
        if (!this.rsvpContainer) return;

        // Remove existing feedback
        const existing = this.rsvpContainer.querySelector('.google-event-rsvp-feedback');
        if (existing) existing.remove();

        const feedback = document.createElement('div');
        feedback.className = `google-event-rsvp-feedback rsvp-feedback-${type}`;
        feedback.textContent = message;
        this.rsvpContainer.appendChild(feedback);

        // Auto-remove after delay (unless declined, which closes modal)
        if (type !== 'declined') {
            setTimeout(() => feedback.remove(), 3000);
        }
    }

    /**
     * Get currently displayed event
     * @returns {Object|null} The current event
     */
    getCurrentEvent() {
        return this.currentEvent;
    }

    /**
     * Cleanup when closing the modal
     */
    hide() {
        super.hide();
        this.currentEvent = null;
    }

    /**
     * Apply localization to modal elements
     * @private
     */
}
