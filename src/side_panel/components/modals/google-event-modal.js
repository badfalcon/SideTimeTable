/**
 * GoogleEventModal - Google event details, edit form and delete confirmation
 *
 * The detail view shares the create form's layout: a sticky header (calendar
 * colour, title, open in Google Calendar, close), icon-led rows, and a sticky
 * footer. The footer holds whatever the event allows: Delete and Edit on an
 * event the user can change, the RSVP control on an invitation, the delete
 * confirmation while one is pending — or nothing on a read-only event.
 */
import { ModalComponent } from './modal-component.js';
import { sendMessage } from '../../../lib/chrome-messaging.js';
import { GoogleEventContentBuilder } from './google-event-content-builder.js';
import { GoogleEventEditFormBuilder } from './google-event-edit-form-builder.js';
import {
    createButton,
    createDeleteButton,
    createDeleteConfirmFooter,
    createDetailHeader,
    createDetailRow,
    createFooterSpacer,
    createIcon,
    createSegmented,
    createStatusLine,
    msg,
    setLocalizedText,
    setPressed,
    showStatusLine
} from './event-dialog-dom.js';
import { buildGoogleEventResource, extractTimeHHMM, isEditableGoogleEvent, isDeletableGoogleEvent } from '../../../lib/google-event-utils.js';
import { buildRequestId } from '../../../lib/request-dedupe.js';

/** RSVP choices, in display order. */
const RSVP_CHOICES = [
    { response: 'accepted', icon: 'fas fa-check', labelKey: 'rsvpAccept', fallback: 'Yes' },
    { response: 'tentative', icon: 'fas fa-question', labelKey: 'rsvpTentative', fallback: 'Maybe' },
    { response: 'declined', icon: 'fas fa-times', labelKey: 'rsvpDecline', fallback: 'No' }
];

/** How long a "response sent" line stays before it clears itself. */
const RSVP_FEEDBACK_MS = 3000;

/** Pause after declining before the dialog closes (the event then hides). */
const RSVP_DECLINE_CLOSE_MS = 1200;

export class GoogleEventModal extends ModalComponent {
    constructor(options = {}) {
        super({
            id: 'googleEventDialog',
            ...options
        });

        // View/edit containers
        this.viewContent = null;
        this.editContent = null;

        // View header
        this.headerSwatch = null;
        this.titleElement = null;
        this.openLink = null;
        this.viewCloseButton = null;

        // View rows: { row, content } pairs
        this.timeRow = null;
        this.calendarRow = null;
        this.locationRow = null;
        this.meetRow = null;
        this.oooRow = null;
        this.descriptionRow = null;
        this.attendeesContainer = null;
        this.rsvpBodyRow = null;
        this.viewError = null;

        // View footers (at most one shows)
        this.actionFooter = null;
        this.editButton = null;
        this.deleteButton = null;
        this.confirmFooter = null;
        this.confirmDeleteButton = null;
        this.cancelDeleteButton = null;
        this.rsvpFooter = null;

        // The RSVP control and its outcome line, wherever they are placed
        this.rsvpGroup = null;
        this.rsvpStatusLine = null;
        this._rsvpFeedbackTimer = null;
        this._rsvpCloseTimer = null;

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
        content.className = 'event-dialog-content';

        this.viewContent = document.createElement('div');
        this.viewContent.className = 'event-detail';
        this._buildViewContent();
        content.appendChild(this.viewContent);

        // Edit mode (hidden until the Edit button is pressed)
        this.editContent = document.createElement('div');
        this.editContent.className = 'event-edit';
        this.editContent.hidden = true;
        this._editFormBuilder.buildEditContent(this.editContent, {
            onSave: () => this._handleSaveEdit(),
            onCancel: () => this._showViewMode({ returnFocus: true }),
            onClose: () => this.hide()
        });
        content.appendChild(this.editContent);

        // Escape backs out of sub-states (edit form, delete confirmation)
        // instead of closing the whole modal and discarding input. Capture
        // phase so this runs before ModalComponent's close-on-Escape.
        this.addEventListener(document, 'keydown', (e) => {
            if (e.key !== 'Escape' || !this.isVisible()) {
                return;
            }
            if (!this.confirmFooter.hidden) {
                e.preventDefault();
                e.stopPropagation();
                this._showDeleteConfirm(false);
            } else if (!this.editContent.hidden) {
                e.preventDefault();
                e.stopPropagation();
                this._showViewMode({ returnFocus: true });
            }
        }, true);

        return content;
    }

    /**
     * Build the view mode: header, one row per field, and the three footers.
     * @private
     */
    _buildViewContent() {
        const header = createDetailHeader(this, { titleId: 'googleEventTitle', onClose: () => this.hide() });
        this.headerSwatch = header.swatch;
        this.titleElement = header.title;
        this.viewCloseButton = header.closeButton;

        this.openLink = document.createElement('a');
        this.openLink.className = 'event-detail-icon-btn';
        this.openLink.target = '_blank';
        this.openLink.rel = 'noopener noreferrer';
        this.openLink.setAttribute('data-localize-aria-label', '__MSG_openInGoogleCalendar__');
        this.openLink.setAttribute('aria-label', msg('openInGoogleCalendar', 'Open in Google Calendar'));
        this.openLink.setAttribute('data-localize-title', '__MSG_openInGoogleCalendar__');
        this.openLink.title = msg('openInGoogleCalendar', 'Open in Google Calendar');
        this.openLink.appendChild(createIcon('fas fa-external-link-alt'));
        header.trailing.appendChild(this.openLink);

        this.viewContent.appendChild(header.header);

        const body = document.createElement('div');
        body.className = 'event-detail-body';

        this.timeRow = createDetailRow('fas fa-clock');
        this.calendarRow = createDetailRow('fas fa-calendar-alt');
        this.calendarRow.content.classList.add('is-secondary');
        this.locationRow = createDetailRow('fas fa-map-marker-alt');
        this.meetRow = createDetailRow('fas fa-video');
        this.meetRow.row.classList.add('event-detail-row-center');
        this.meetRow.content.classList.add('event-detail-joins');
        this.oooRow = createDetailRow('fas fa-plane-departure');
        this.oooRow.content.classList.add('event-detail-ooo');
        this.descriptionRow = createDetailRow('fas fa-align-left');
        this.descriptionRow.content.classList.add('event-detail-description');
        [this.timeRow, this.calendarRow, this.locationRow, this.meetRow, this.oooRow, this.descriptionRow]
            .forEach(({ row }) => body.appendChild(row));

        this.attendeesContainer = document.createElement('div');
        this.attendeesContainer.className = 'event-detail-attendees';
        // One delegated listener survives the container being refilled
        this.addEventListener(this.attendeesContainer, 'click', (e) => {
            const toggle = e.target.closest('.event-detail-attendees-toggle');
            if (!toggle) return;
            const expanded = toggle.getAttribute('aria-expanded') !== 'true';
            toggle.setAttribute('aria-expanded', String(expanded));
            const list = this.attendeesContainer.querySelector('.event-detail-attendee-list');
            if (list) list.hidden = !expanded;
        });
        body.appendChild(this.attendeesContainer);

        // RSVP in the body, used when the footer is taken by Delete/Edit
        this.rsvpBodyRow = document.createElement('div');
        this.rsvpBodyRow.className = 'event-detail-rsvp';
        this.rsvpBodyRow.hidden = true;
        body.appendChild(this.rsvpBodyRow);

        this.viewError = document.createElement('div');
        this.viewError.className = 'event-form-error';
        this.viewError.setAttribute('role', 'alert');
        this.viewError.hidden = true;
        body.appendChild(this.viewError);

        this.viewContent.appendChild(body);

        // Footer 1: Delete on the left, Edit on the right
        this.actionFooter = document.createElement('footer');
        this.actionFooter.className = 'event-form-footer';
        this.deleteButton = createDeleteButton(this, {
            id: 'googleEventDeleteButton',
            onClick: () => this._showDeleteConfirm(true)
        });
        this.actionFooter.appendChild(this.deleteButton);
        this.actionFooter.appendChild(createFooterSpacer());
        this.editButton = createButton(this, {
            id: 'googleEventEditButton',
            variant: 'secondary',
            msgKey: 'editEvent',
            fallback: 'Edit',
            iconClass: 'fas fa-pen',
            onClick: () => this._showEditMode()
        });
        this.actionFooter.appendChild(this.editButton);
        this.viewContent.appendChild(this.actionFooter);

        // Footer 2: the delete confirmation that replaces footer 1
        const confirm = createDeleteConfirmFooter(this, {
            idPrefix: 'googleEvent',
            messageKey: 'googleDeleteConfirm',
            messageFallback: "Delete this event from Google Calendar? This can't be undone.",
            onConfirm: () => this._handleDeleteConfirmed(),
            onCancel: () => this._showDeleteConfirm(false)
        });
        this.confirmFooter = confirm.footer;
        this.confirmDeleteButton = confirm.confirmButton;
        this.cancelDeleteButton = confirm.cancelButton;
        this.viewContent.appendChild(this.confirmFooter);

        // Footer 3: the RSVP control, on an invitation that has no actions
        this.rsvpFooter = document.createElement('footer');
        this.rsvpFooter.className = 'event-form-footer event-rsvp-footer';
        this.rsvpFooter.hidden = true;
        this.viewContent.appendChild(this.rsvpFooter);
    }

    /**
     * Display Google event
     * @param {Object} event Google event data
     */
    showEvent(event) {
        this.currentEvent = event;
        // A new event is a new logical request: never let a previous event's
        // id replay its recorded response for this one
        this._editSeed = null;
        this._deleteRequestId = null;
        this._clearRsvpTimers();

        // Create the element if it doesn't exist
        if (!this.element) {
            this.createElement();
        }

        this._setHeader(event);

        const b = this._contentBuilder;
        this.timeRow.row.hidden = !b.setTimeInfo(this.timeRow.content, event);
        this.calendarRow.row.hidden = !b.setCalendarInfo(this.calendarRow.content, event);
        this.locationRow.row.hidden = !b.setLocation(this.locationRow.content, event);
        this.meetRow.row.hidden = !b.setMeetInfo(this.meetRow.content, event);
        this.oooRow.row.hidden = !b.setOutOfOfficeInfo(this.oooRow.content, event);
        this.descriptionRow.row.hidden = !b.setDescription(this.descriptionRow.content, event);

        // Attendees and RSVP do not apply to an absence
        const isOoo = event.eventType === 'outOfOffice';
        this.attendeesContainer.hidden = isOoo
            || !b.setAttendeesInfo(this.attendeesContainer, event, 'googleEventAttendeeList');
        if (isOoo) this.attendeesContainer.innerHTML = '';

        this._setFooters(event);

        // Always open in view mode with a clean state
        this._showViewMode();

        this.show();

        // Apply the localization after showing the modal
        this._localizeModal();
    }

    /**
     * Header: calendar colour, title, link to the event in Google Calendar.
     * @param {Object} event
     * @private
     */
    _setHeader(event) {
        // The calendar's own colour, so the dialog matches the timeline block
        this.headerSwatch.hidden = !event.calendarBackgroundColor;
        this.headerSwatch.style.backgroundColor = event.calendarBackgroundColor || '';

        this.titleElement.textContent = event.summary || (event.eventType === 'outOfOffice'
            ? msg('outOfOffice', 'Out of office')
            : msg('noTitle', 'No Title'));

        this.openLink.hidden = !event.htmlLink;
        if (event.htmlLink) {
            this.openLink.href = event.htmlLink;
        } else {
            this.openLink.removeAttribute('href');
        }
    }

    /**
     * Decide which footer shows and where the RSVP control goes.
     * @param {Object} event
     * @private
     */
    _setFooters(event) {
        const deletable = this._isDeletableEvent(event);
        const canRsvp = this._canRsvp(event);

        this.editButton.hidden = !this._isEditableEvent(event);
        this.actionFooter.hidden = !deletable;
        this.confirmFooter.hidden = true;

        // The RSVP control takes the footer when nothing else needs it (an
        // invitation); otherwise it sits in the body above Delete/Edit.
        const inFooter = canRsvp && !deletable;
        this.rsvpBodyRow.innerHTML = '';
        this.rsvpFooter.innerHTML = '';
        this.rsvpBodyRow.hidden = !(canRsvp && !inFooter);
        this.rsvpFooter.hidden = !inFooter;
        this.rsvpGroup = null;
        this.rsvpStatusLine = null;

        if (canRsvp) {
            this._buildRsvp(event, inFooter ? this.rsvpFooter : this.rsvpBodyRow, inFooter);
        }
    }

    /**
     * Whether the user can answer the invitation from here: they are a guest,
     * and the calendar is their own (a shared calendar's copy cannot RSVP).
     * @param {Object} event
     * @returns {boolean}
     * @private
     */
    _canRsvp(event) {
        if (event.eventType === 'outOfOffice') return false;
        const selfAttendee = (event.attendees || []).find(a => a.self);
        return !!(selfAttendee && event.isOwnedCalendar && event.calendarId && event.id);
    }

    /**
     * Build the RSVP control and its outcome line.
     * @param {Object} event
     * @param {HTMLElement} container - The body row or the footer
     * @param {boolean} inFooter - Footer placement has a visible label; the
     *   body row uses an icon like the other rows
     * @private
     */
    _buildRsvp(event, container, inFooter) {
        const selfAttendee = event.attendees.find(a => a.self);
        // A reply to one occurrence of a series only applies to that one;
        // say so on the choice that hides the event.
        const isRecurringInstance = !!event.recurringEventId;

        this.rsvpStatusLine = createStatusLine();

        const row = document.createElement('div');
        row.className = 'event-rsvp-row';

        if (inFooter) {
            const label = document.createElement('span');
            label.className = 'event-rsvp-label';
            label.id = 'googleEventRsvpLabel';
            row.appendChild(setLocalizedText(label, 'rsvpLabel', 'Going?'));
        } else {
            row.appendChild(createIcon('fas fa-reply event-form-row-icon'));
        }

        this.rsvpGroup = createSegmented('rsvpLabel', 'Going?');
        this.rsvpGroup.classList.add('event-rsvp-group');
        if (inFooter) {
            // The visible label names the group
            this.rsvpGroup.removeAttribute('aria-label');
            this.rsvpGroup.removeAttribute('data-localize-aria-label');
            this.rsvpGroup.setAttribute('aria-labelledby', 'googleEventRsvpLabel');
        }

        RSVP_CHOICES.forEach(choice => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `event-segmented-btn event-rsvp-btn is-${choice.response}`;
            button.dataset.response = choice.response;
            button.appendChild(createIcon(`${choice.icon} event-rsvp-icon`));

            const text = document.createElement('span');
            text.className = 'event-rsvp-text';
            text.appendChild(setLocalizedText(document.createElement('span'), choice.labelKey, choice.fallback));
            if (choice.response === 'declined' && isRecurringInstance) {
                const scope = document.createElement('span');
                scope.className = 'event-rsvp-scope';
                text.appendChild(setLocalizedText(scope, 'rsvpDeclineScope', 'this only'));
                this.rsvpGroup.classList.add('has-scope');
            }
            button.appendChild(text);

            setPressed(button, selfAttendee.responseStatus === choice.response);
            this.addEventListener(button, 'click', () => this._sendRsvpResponse(event, choice.response));
            this.rsvpGroup.appendChild(button);
        });
        row.appendChild(this.rsvpGroup);

        // In the footer the outcome reads above the control, like the delete
        // confirmation; in the body it follows the control.
        if (inFooter) {
            container.appendChild(this.rsvpStatusLine);
            container.appendChild(row);
        } else {
            container.appendChild(row);
            container.appendChild(this.rsvpStatusLine);
        }
    }

    /**
     * Whether the event can be edited from the panel.
     * Delegates to the pure, unit-tested predicate in google-event-utils.
     * @param {Object} event
     * @returns {boolean}
     * @private
     */
    _isEditableEvent(event) {
        return isEditableGoogleEvent(event);
    }

    /**
     * Whether the event can be deleted from the panel. A superset of editable:
     * out-of-office events cannot be edited but can be removed, since the panel
     * can create them.
     * @param {Object} event
     * @returns {boolean}
     * @private
     */
    _isDeletableEvent(event) {
        return isDeletableGoogleEvent(event);
    }

    /**
     * Swap the action footer for the inline delete confirmation, or back.
     * Moves keyboard focus with the state change: into the confirmation (on
     * its non-destructive Cancel) when opening, back to Delete when dismissing.
     * @param {boolean} confirming
     * @private
     */
    _showDeleteConfirm(confirming) {
        if (!this.actionFooter) return;
        const wasConfirming = !this.confirmFooter.hidden;
        const deletable = !!this.currentEvent && this._isDeletableEvent(this.currentEvent);

        this.actionFooter.hidden = confirming || !deletable;
        this.confirmFooter.hidden = !confirming;

        if (confirming) {
            this.cancelDeleteButton.focus();
        } else if (wasConfirming && deletable) {
            this.deleteButton.focus();
        }
    }

    /**
     * Switch to view mode and clear transient edit state.
     * @param {Object} [options]
     * @param {boolean} [options.returnFocus=false] - Focus the Edit button
     *   (used when backing out of edit mode, so keyboard focus is not lost
     *   inside the now-hidden form)
     * @private
     */
    _showViewMode({ returnFocus = false } = {}) {
        this._clearError();
        this.viewContent.hidden = false;
        this.editContent.hidden = true;
        this._showDeleteConfirm(false);

        if (returnFocus) {
            this.editButton?.focus();
        }
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

        this.viewContent.hidden = true;
        this.editContent.hidden = false;
        this._localizeModal();

        // Move focus into the form (the Edit button that opened it is now hidden)
        setTimeout(() => this._editFormBuilder.titleInput?.focus(), 0);
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
            this._showError(msg('pleaseEnterTitle', 'Please enter a title'));
            return;
        }
        if (!values.startTime) {
            this._showError(msg('pleaseEnterStartTime', 'Please enter a start time'));
            return;
        }
        if (!values.endTime) {
            this._showError(msg('pleaseEnterEndTime', 'Please enter an end time'));
            return;
        }
        // Zero-padded "HH:MM" strings compare correctly lexicographically
        if (values.endTime <= values.startTime) {
            this._showError(msg('endTimeMustBeLater', 'End time must be later than start time'));
            return;
        }

        // Patch on the event's own date — the panel may be viewing another day.
        // Only include reminders when the user actually changed the selection:
        // an unchanged select must not clobber overrides it cannot represent
        // (email reminders, multiple overrides).
        const patchResource = buildGoogleEventResource({
            summary: values.summary,
            description: values.description,
            location: values.location,
            date: new Date(event.start.dateTime),
            startTime: values.startTime,
            endTime: values.endTime,
            reminderMinutes: this._editFormBuilder.isReminderChanged() ? values.reminderMinutes : undefined
        }, { forPatch: true });

        if (!this.onSaveEdit) {
            this.hide();
            return;
        }

        // Stable across retries of this edit session so the background can
        // deduplicate a retry whose first attempt actually committed. The id
        // also covers the patch, so a correction made after a failure is not
        // swallowed by the recorded response of the previous attempt.
        if (!this._editSeed) {
            this._editSeed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        }
        const requestId = buildRequestId('update-evt', this._editSeed, [event.calendarId, event.id, patchResource]);

        this._submittingEdit = true;
        this._editFormBuilder.saveButton.disabled = true;
        let succeeded;
        try {
            succeeded = await this.onSaveEdit(event.calendarId, event.id, patchResource, requestId);
        } catch (error) {
            console.error('Google event update error:', error);
            succeeded = false;
        } finally {
            this._submittingEdit = false;
            this._editFormBuilder.saveButton.disabled = false;
        }

        if (succeeded) {
            this._editSeed = null;
            this.hide();
        } else {
            this._showError(msg('googleEventUpdateFailed', 'Failed to update Google event'));
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

        // Stable across retries of this delete so the background can
        // deduplicate a retry whose first attempt actually committed
        if (!this._deleteRequestId) {
            this._deleteRequestId = `delete-evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        }

        this._deletingEvent = true;
        this.confirmDeleteButton.disabled = true;
        let succeeded;
        try {
            succeeded = await this.onDelete(event.calendarId, event.id, this._deleteRequestId);
        } catch (error) {
            console.error('Google event delete error:', error);
            succeeded = false;
        } finally {
            this._deletingEvent = false;
            this.confirmDeleteButton.disabled = false;
        }

        if (succeeded) {
            this._deleteRequestId = null;
            this.hide();
        } else {
            this._showDeleteConfirm(false);
            this._showError(msg('googleEventDeleteFailed', 'Failed to delete Google event'));
        }
    }

    /**
     * Show an error in the visible mode's error slot (end of the body).
     * @param {string} message
     * @private
     */
    _showError(message) {
        const slot = this.editContent && !this.editContent.hidden
            ? this._editFormBuilder.errorContainer
            : this.viewError;
        if (!slot) return;
        // Reveal first, then write: a role=alert region that is already
        // populated when it appears is not reliably announced.
        slot.hidden = false;
        slot.textContent = message;
    }

    /**
     * Remove any displayed error message.
     * @private
     */
    _clearError() {
        [this.viewError, this._editFormBuilder.errorContainer].forEach(slot => {
            if (!slot) return;
            slot.textContent = '';
            slot.hidden = true;
        });
    }

    /**
     * Send the RSVP response to Google Calendar.
     * @param {Object} event
     * @param {string} response - accepted | tentative | declined
     * @private
     */
    async _sendRsvpResponse(event, response) {
        const group = this.rsvpGroup;
        if (!group) return;
        const buttons = [...group.querySelectorAll('.event-rsvp-btn')];
        buttons.forEach(btn => { btn.disabled = true; });
        this._clearRsvpTimers();

        let result;
        try {
            result = await sendMessage({
                action: 'respondToEvent',
                calendarId: event.calendarId,
                eventId: event.id,
                response: response
            });
        } catch (error) {
            console.error('Failed to send RSVP response:', error);
            result = null;
        }

        // The dialog may have moved on to another event while this was in flight
        if (this.rsvpGroup !== group) return;
        buttons.forEach(btn => { btn.disabled = false; });

        if (!result || !result.success) {
            if (result) console.error('RSVP response failed:', result.error);
            // The pressed button still shows the answer Google has
            this._showRsvpFeedback(msg('rsvpErrorFeedback', 'Failed to send response.'), 'error');
            return;
        }

        buttons.forEach(btn => setPressed(btn, btn.dataset.response === response));

        // Reflect the new answer in the guest list and its summary
        const selfAttendee = this.currentEvent?.attendees?.find(a => a.self);
        if (selfAttendee) {
            selfAttendee.responseStatus = response;
            const list = this.attendeesContainer.querySelector('.event-detail-attendee-list');
            const wasExpanded = list ? !list.hidden : null;
            this._contentBuilder.setAttendeesInfo(this.attendeesContainer, this.currentEvent, 'googleEventAttendeeList');
            if (wasExpanded !== null) this._setAttendeesExpanded(wasExpanded);
        }

        if (response === 'declined') {
            // A declined event leaves the timeline, so close once the user
            // has had a moment to read why
            this._showRsvpFeedback(msg('rsvpDeclinedFeedback', 'Declined. Event will be hidden.'), 'neutral');
            this._rsvpCloseTimer = setTimeout(() => {
                this.hide();
                if (this.onRsvpResponse) {
                    this.onRsvpResponse(response, event);
                }
            }, RSVP_DECLINE_CLOSE_MS);
        } else {
            this._showRsvpFeedback(msg('rsvpSuccessFeedback', 'Response sent.'), 'success');
            if (this.onRsvpResponse) {
                this.onRsvpResponse(response, event);
            }
        }
    }

    /**
     * Keep the guest list's folded state across a refill.
     * @param {boolean} expanded
     * @private
     */
    _setAttendeesExpanded(expanded) {
        const toggle = this.attendeesContainer.querySelector('.event-detail-attendees-toggle');
        const list = this.attendeesContainer.querySelector('.event-detail-attendee-list');
        if (!toggle || !list) return;
        toggle.setAttribute('aria-expanded', String(expanded));
        list.hidden = !expanded;
    }

    /**
     * Show the outcome of an RSVP next to the control.
     * @param {string} message
     * @param {'success'|'neutral'|'error'} tone
     * @private
     */
    _showRsvpFeedback(message, tone) {
        if (!this.rsvpStatusLine) return;
        showStatusLine(this.rsvpStatusLine, tone, message);

        // A plain confirmation clears itself; an error stays until the next try
        if (tone === 'success') {
            const line = this.rsvpStatusLine;
            this._rsvpFeedbackTimer = setTimeout(() => { line.hidden = true; }, RSVP_FEEDBACK_MS);
        }
    }

    /** @private */
    _clearRsvpTimers() {
        clearTimeout(this._rsvpFeedbackTimer);
        clearTimeout(this._rsvpCloseTimer);
        this._rsvpFeedbackTimer = null;
        this._rsvpCloseTimer = null;
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
        this._clearRsvpTimers();
        // Abandoned sessions: the next edit/delete is a new logical request
        this._editSeed = null;
        this._deleteRequestId = null;
    }

    /**
     * Place initial focus inside the dialog: the form's title in edit mode;
     * in view mode the first action the event offers, else close.
     * @private
     */
    _focusFirstInput() {
        setTimeout(() => {
            if (this.editContent && !this.editContent.hidden) {
                this._editFormBuilder.titleInput?.focus();
                return;
            }
            let target = this.viewCloseButton;
            if (this.actionFooter && !this.actionFooter.hidden) {
                // Edit is hidden on a delete-only event (out of office)
                target = this.editButton.hidden ? this.deleteButton : this.editButton;
            }
            target?.focus();
        }, 100);
    }
}
