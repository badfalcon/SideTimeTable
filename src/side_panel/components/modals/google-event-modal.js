/**
 * GoogleEventModal - Google event details modal
 */
import { ModalComponent } from './modal-component.js';
import { sendMessage } from '../../../lib/chrome-messaging.js';
import { GoogleEventContentBuilder } from './google-event-content-builder.js';

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

        // RSVP elements
        this.rsvpContainer = null;

        // Callback for when RSVP response is sent
        this.onRsvpResponse = options.onRsvpResponse || null;

        // The currently displayed event
        this.currentEvent = null;

        // Content builder for DOM construction
        this._contentBuilder = new GoogleEventContentBuilder();
    }

    createContent() {
        const content = document.createElement('div');

        // Event title
        this.titleElement = document.createElement('h2');
        this.titleElement.className = 'google-event-title';
        content.appendChild(this.titleElement);

        // Calendar name
        this.calendarElement = document.createElement('div');
        this.calendarElement.className = 'google-event-row google-event-calendar mb-2';
        content.appendChild(this.calendarElement);

        // Event time
        this.timeElement = document.createElement('div');
        this.timeElement.className = 'google-event-row google-event-time mb-2';
        content.appendChild(this.timeElement);

        // Description
        this.descriptionElement = document.createElement('div');
        this.descriptionElement.className = 'google-event-row google-event-description mb-2';
        content.appendChild(this.descriptionElement);

        // Location
        this.locationElement = document.createElement('div');
        this.locationElement.className = 'google-event-row google-event-location mb-2';
        content.appendChild(this.locationElement);

        // Meet information
        this.meetElement = document.createElement('div');
        this.meetElement.className = 'google-event-row google-event-meet';
        content.appendChild(this.meetElement);

        // Out of office information
        this.oooInfoElement = document.createElement('div');
        this.oooInfoElement.className = 'google-event-row google-event-ooo-info mb-2';
        content.appendChild(this.oooInfoElement);

        // Save the reference to the modalBody
        this.modalBody = content;

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

        this.show();

        // Apply the localization after showing the modal
        this._localizeModal();
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
        icon.style.cssText = 'margin-top: 6px; color: var(--side-calendar-secondary-text-color);';

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
            btnText.setAttribute('data-localize', `__MSG_${btn.labelKey}__`);
            btnText.textContent = window.getLocalizedMessage(btn.labelKey) || btn.fallback;
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
