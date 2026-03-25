/**
 * GoogleEventModal - Google event details modal
 */
import { ModalComponent } from './modal-component.js';
import { sendMessage } from '../../../lib/chrome-messaging.js';

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
            titleLink.textContent = event.summary || window.getLocalizedMessage('noTitle');
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
            titleText.textContent = event.summary || window.getLocalizedMessage('noTitle');
            this.titleElement.appendChild(titleText);
        }

        // Calendar name
        this._setCalendarInfo(event);

        // Time information
        this._setTimeInfo(event);

        // Description
        this._setDescription(event);

        // Location
        this._setLocation(event);

        // Meet information
        this._setMeetInfo(event);

        // Attendees information
        this._setAttendeesInfo(event);

        this.show();

        // Apply the localization after showing the modal
        this._localizeModal();
    }

    /**
     * Set calendar information
     * @private
     */
    _setCalendarInfo(event) {
        this.calendarElement.innerHTML = '';

        if (event.calendarName) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-calendar me-1';

            const text = document.createElement('span');
            text.textContent = event.calendarName;

            this.calendarElement.appendChild(icon);

            this.calendarElement.appendChild(text);
        }
    }

    /**
     * Set time information
     * @private
     */
    _setTimeInfo(event) {
        this.timeElement.innerHTML = '';

        if (event.start && event.end) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-clock me-1';

            const timeText = this._formatEventTime(event);
            const text = document.createElement('span');
            text.textContent = timeText;

            this.timeElement.appendChild(icon);
            this.timeElement.appendChild(text);
        }
    }

    /**
     * Format event time
     * @private
     */
    _formatEventTime(event) {
        try {
            const start = event.start.dateTime || event.start.date;
            const end = event.end.dateTime || event.end.date;

            if (!start || !end) {
                return window.getLocalizedMessage('noTimeInfo');
            }

            const startDate = new Date(start);
            const endDate = new Date(end);

            // For all-day events
            if (event.start.date && event.end.date) {
                return window.getLocalizedMessage('allDay');
            }

            // For the timed events - use browser locale
            const locale = navigator.language || 'en';
            const timeOptions = { hour: '2-digit', minute: '2-digit' };
            const startTime = startDate.toLocaleTimeString(locale, timeOptions);
            const endTime = endDate.toLocaleTimeString(locale, timeOptions);
            const separator = locale.startsWith('ja') ? ' ～ ' : ' - ';

            return `${startTime}${separator}${endTime}`;
        } catch (error) {
            console.warn('Time format error:', error);
            return window.getLocalizedMessage('timeInfoError');
        }
    }

    /**
     * Set description
     * @private
     */
    _setDescription(event) {
        this.descriptionElement.innerHTML = '';

        if (event.description) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-align-left me-1';

            const text = document.createElement('div');
            text.className = 'google-event-detail-text';

            // Remove the HTML tags and display text only
            text.textContent = this._stripHtml(event.description);

            this.descriptionElement.appendChild(icon);
            this.descriptionElement.appendChild(text);
        }
    }

    /**
     * Set location
     * @private
     */
    _setLocation(event) {
        this.locationElement.innerHTML = '';

        if (event.location) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-map-marker-alt me-1';

            const text = document.createElement('span');
            text.textContent = event.location;

            this.locationElement.appendChild(icon);
            this.locationElement.appendChild(text);
        }
    }

    /**
     * Set Meet information
     * @private
     */
    _setMeetInfo(event) {
        this.meetElement.innerHTML = '';

        // Search for Google Meet URL
        const meetUrl = this._extractMeetUrl(event);

        if (meetUrl) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-video me-1';

            const link = document.createElement('a');
            link.href = meetUrl;
            link.target = '_blank';
            link.setAttribute('data-localize', '__MSG_joinGoogleMeet__');
            link.textContent = window.getLocalizedMessage('joinGoogleMeet');
            link.style.cssText = 'color: var(--side-calendar-link-color); text-decoration: none;';

            this.meetElement.appendChild(icon);
            this.meetElement.appendChild(link);
        }

        // Search for the other video conference links
        const otherVideoUrl = this._extractVideoUrl(event);
        if (otherVideoUrl && !meetUrl) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-video me-1';

            const link = document.createElement('a');
            link.href = otherVideoUrl;
            link.target = '_blank';
            link.setAttribute('data-localize', '__MSG_joinVideoConference__');
            link.textContent = window.getLocalizedMessage('joinVideoConference');
            link.style.cssText = 'color: var(--side-calendar-link-color); text-decoration: none;';

            this.meetElement.appendChild(icon);
            this.meetElement.appendChild(link);
        }
    }

    /**
     * Set attendees information
     * @private
     */
    _setAttendeesInfo(event) {
        // Create the attendees element if it doesn't exist
        if (!this.attendeesElement) {
            this.attendeesElement = document.createElement('div');
            this.attendeesElement.className = 'google-event-row google-event-attendees mb-3';
            this.modalBody.appendChild(this.attendeesElement);
        }

        this.attendeesElement.innerHTML = '';

        // Filter out conference rooms and other resources
        const realAttendees = (event.attendees || []).filter(attendee => !attendee.resource);

        if (realAttendees.length > 0) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-users me-1';
            icon.style.cssText = 'margin-top: 2px; color: var(--side-calendar-secondary-text-color);';

            const container = document.createElement('div');
            container.className = 'google-event-detail-text';

            const title = document.createElement('div');
            title.style.cssText = 'margin-bottom: 5px;';

            // Store attendee count for later use
            title.dataset.attendeeCount = realAttendees.length;

            // Create a span for the localized text
            const titleText = document.createElement('span');
            titleText.setAttribute('data-localize', '__MSG_attendees__');
            titleText.textContent = window.getLocalizedMessage('attendees');

            // Create a span for the count
            const countText = document.createTextNode(` (${realAttendees.length})`);

            title.appendChild(titleText);
            title.appendChild(countText);

            const attendeesList = document.createElement('div');

            realAttendees.forEach(attendee => {
                const attendeeDiv = document.createElement('div');
                attendeeDiv.className = 'google-event-attendee-row';

                // The participation status icon
                const statusIcon = document.createElement('i');
                switch (attendee.responseStatus) {
                    case 'accepted':
                        statusIcon.className = 'fas fa-check-circle attendee-status-accepted';
                        statusIcon.title = window.getLocalizedMessage('accepted');
                        break;
                    case 'declined':
                        statusIcon.className = 'fas fa-times-circle attendee-status-declined';
                        statusIcon.title = window.getLocalizedMessage('declined');
                        break;
                    case 'tentative':
                        statusIcon.className = 'fas fa-question-circle attendee-status-tentative';
                        statusIcon.title = window.getLocalizedMessage('tentative');
                        break;
                    default:
                        statusIcon.className = 'fas fa-circle attendee-status-default';
                        statusIcon.title = window.getLocalizedMessage('noResponse');
                }
                statusIcon.style.cssText = 'margin-right: 8px; font-size: 12px;';

                // The attendee name and email
                const nameSpan = document.createElement('span');
                nameSpan.className = 'google-event-attendee-name';
                nameSpan.textContent = attendee.displayName || attendee.email;
                if (attendee.organizer) {
                    nameSpan.textContent += ` (${window.getLocalizedMessage('organizer')})`;
                    nameSpan.style.fontWeight = 'bold';
                }

                attendeeDiv.appendChild(statusIcon);
                attendeeDiv.appendChild(nameSpan);
                if (attendee.organizer) {
                    attendeesList.prepend(attendeeDiv);
                } else {
                    attendeesList.appendChild(attendeeDiv);
                }
            });

            container.appendChild(title);
            container.appendChild(attendeesList);

            this.attendeesElement.appendChild(icon);
            this.attendeesElement.appendChild(container);
        }
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
     * Extract Google Meet URL
     * @private
     */
    _extractMeetUrl(event) {
        const sources = [
            event.hangoutLink,
            event.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri,
            event.description,
            event.location
        ].filter(Boolean);

        for (const source of sources) {
            const meetMatch = source.match(/https:\/\/meet\.google\.com\/[a-z-]+/i);
            if (meetMatch) {
                return meetMatch[0];
            }
        }

        return null;
    }

    /**
     * Extract other video conference URLs
     * @private
     */
    _extractVideoUrl(event) {
        const sources = [
            event.description,
            event.location
        ].filter(Boolean);

        const videoPatterns = [
            /https:\/\/.*zoom\.us\/[^\s]+/i,
            /https:\/\/.*teams\.microsoft\.com\/[^\s]+/i,
            /https:\/\/.*webex\.com\/[^\s]+/i
        ];

        for (const source of sources) {
            for (const pattern of videoPatterns) {
                const match = source.match(pattern);
                if (match) {
                    return match[0];
                }
            }
        }

        return null;
    }

    /**
     * Remove HTML tags
     * @private
     */
    _stripHtml(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || '';
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
