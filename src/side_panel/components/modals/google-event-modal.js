/**
 * GoogleEventModal - Google event details modal
 */
import { ModalComponent } from './modal-component.js';

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

        // Currently displayed event
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
        this.calendarElement.className = 'google-event-calendar mb-2';
        content.appendChild(this.calendarElement);

        // Event time
        this.timeElement = document.createElement('div');
        this.timeElement.className = 'google-event-time mb-2';
        content.appendChild(this.timeElement);

        // Description
        this.descriptionElement = document.createElement('div');
        this.descriptionElement.className = 'google-event-description mb-2';
        content.appendChild(this.descriptionElement);

        // Location
        this.locationElement = document.createElement('div');
        this.locationElement.className = 'google-event-location mb-2';
        content.appendChild(this.locationElement);

        // Meet information
        this.meetElement = document.createElement('div');
        this.meetElement.className = 'google-event-meet';
        content.appendChild(this.meetElement);

        // Save reference to modalBody
        this.modalBody = content;

        return content;
    }

    /**
     * Display Google event
     * @param {Object} event Google event data
     */
    showEvent(event) {
        this.currentEvent = event;

        // Create element if it doesn't exist
        if (!this.element) {
            this.createElement();
        }

        // Title
        this.titleElement.textContent = event.summary || 'No Title';

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

            // Set background color if calendar color is available
            if (event.calendarBackgroundColor) {
                const colorIndicator = document.createElement('span');
                colorIndicator.style.cssText = `
                    display: inline-block;
                    width: 12px;
                    height: 12px;
                    background-color: ${event.calendarBackgroundColor};
                    border-radius: 2px;
                    margin-right: 8px;
                    vertical-align: middle;
                `;
                this.calendarElement.appendChild(colorIndicator);
            }

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
                return 'No time information';
            }

            const startDate = new Date(start);
            const endDate = new Date(end);

            // For all-day events
            if (event.start.date && event.end.date) {
                return 'All day';
            }

            // For timed events
            const startTime = startDate.toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const endTime = endDate.toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit'
            });

            return `${startTime} ～ ${endTime}`;
        } catch (error) {
            console.warn('Time format error:', error);
            return 'Time information error';
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
            text.style.cssText = 'margin-left: 20px; white-space: pre-wrap; word-break: break-word;';

            // Remove HTML tags and display text only
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
            link.textContent = 'Join Google Meet';
            link.style.cssText = 'color: #4285f4; text-decoration: none;';

            this.meetElement.appendChild(icon);
            this.meetElement.appendChild(link);
        }

        // Search for other video conference links
        const otherVideoUrl = this._extractVideoUrl(event);
        if (otherVideoUrl && !meetUrl) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-video me-1';

            const link = document.createElement('a');
            link.href = otherVideoUrl;
            link.target = '_blank';
            link.textContent = 'Join video conference';
            link.style.cssText = 'color: #4285f4; text-decoration: none;';

            this.meetElement.appendChild(icon);
            this.meetElement.appendChild(link);
        }
    }

    /**
     * Set attendees information
     * @private
     */
    _setAttendeesInfo(event) {
        // Create attendees element if it doesn't exist
        if (!this.attendeesElement) {
            this.attendeesElement = document.createElement('div');
            this.attendeesElement.className = 'mb-3';
            this.attendeesElement.style.cssText = 'display: flex; align-items: flex-start; font-size: 14px;';
            this.modalBody.appendChild(this.attendeesElement);
        }

        this.attendeesElement.innerHTML = '';

        if (event.attendees && event.attendees.length > 0) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-users me-1';
            icon.style.cssText = 'margin-top: 2px; color: #6c757d;';

            const container = document.createElement('div');
            container.style.cssText = 'margin-left: 20px;';

            const title = document.createElement('div');
            title.textContent = `Attendees (${event.attendees.length})`;
            title.style.cssText = 'font-weight: bold; margin-bottom: 5px;';

            const attendeesList = document.createElement('div');

            event.attendees.forEach(attendee => {
                const attendeeDiv = document.createElement('div');
                attendeeDiv.style.cssText = 'margin-bottom: 3px; display: flex; align-items: center;';

                // Participation status icon
                const statusIcon = document.createElement('i');
                switch (attendee.responseStatus) {
                    case 'accepted':
                        statusIcon.className = 'fas fa-check-circle';
                        statusIcon.style.color = '#28a745';
                        statusIcon.title = 'Accepted';
                        break;
                    case 'declined':
                        statusIcon.className = 'fas fa-times-circle';
                        statusIcon.style.color = '#dc3545';
                        statusIcon.title = 'Declined';
                        break;
                    case 'tentative':
                        statusIcon.className = 'fas fa-question-circle';
                        statusIcon.style.color = '#ffc107';
                        statusIcon.title = 'Tentative';
                        break;
                    default:
                        statusIcon.className = 'fas fa-circle';
                        statusIcon.style.color = '#6c757d';
                        statusIcon.title = 'No response';
                }
                statusIcon.style.cssText += ' margin-right: 8px; font-size: 12px;';

                // Attendee name and email
                const nameSpan = document.createElement('span');
                nameSpan.textContent = attendee.displayName || attendee.email;
                if (attendee.organizer) {
                    nameSpan.textContent += ' (Organizer)';
                    nameSpan.style.fontWeight = 'bold';
                }

                attendeeDiv.appendChild(statusIcon);
                attendeeDiv.appendChild(nameSpan);
                attendeesList.appendChild(attendeeDiv);
            });

            container.appendChild(title);
            container.appendChild(attendeesList);

            this.attendeesElement.appendChild(icon);
            this.attendeesElement.appendChild(container);
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
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    /**
     * Get currently displayed event
     * @returns {Object|null} Current event
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
}