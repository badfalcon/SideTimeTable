/**
 * GoogleEventContentBuilder - Builds content sections for the Google event modal
 *
 * Extracts DOM-building logic from GoogleEventModal into a standalone class.
 * Methods receive DOM elements and event data as parameters, mutating the DOM directly.
 */
import { extractMeetUrl, extractVideoUrl } from '../../../lib/conference-url-utils.js';

export class GoogleEventContentBuilder {
    /**
     * Set calendar information
     * @param {HTMLElement} calendarElement - The calendar row element
     * @param {Object} event - Google event data
     */
    setCalendarInfo(calendarElement, event) {
        calendarElement.innerHTML = '';

        if (event.calendarName) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-calendar me-1';

            const text = document.createElement('span');
            text.textContent = event.calendarName;

            calendarElement.appendChild(icon);

            calendarElement.appendChild(text);
        }
    }

    /**
     * Set time information
     * @param {HTMLElement} timeElement - The time row element
     * @param {Object} event - Google event data
     */
    setTimeInfo(timeElement, event) {
        timeElement.innerHTML = '';

        if (event.start && event.end) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-clock me-1';

            const timeText = this.formatEventTime(event);
            const text = document.createElement('span');
            text.textContent = timeText;

            timeElement.appendChild(icon);
            timeElement.appendChild(text);
        }
    }

    /**
     * Format event time
     * @param {Object} event - Google event data
     * @returns {string} Formatted time string
     */
    formatEventTime(event) {
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
                const MS_PER_DAY = 24 * 60 * 60 * 1000;
                // Parse as local time (not UTC) to avoid off-by-one in negative UTC timezones
                const localStart = new Date(event.start.date + 'T00:00:00');
                const localEnd = new Date(event.end.date + 'T00:00:00');
                const dayCount = Math.round((localEnd - localStart) / MS_PER_DAY);
                if (dayCount > 1) {
                    // Show date range: "06/01 – 06/03 (3 days)" / "06/01 〜 06/03（3日間）"
                    const locale = navigator.language || 'en';
                    const dateOpts = { month: '2-digit', day: '2-digit' };
                    // end.date is exclusive in Google Calendar API, so show (end - 1 day) as the last day
                    const lastDay = new Date(localEnd.getTime() - MS_PER_DAY);
                    const startStr = localStart.toLocaleDateString(locale, dateOpts);
                    const endStr = lastDay.toLocaleDateString(locale, dateOpts);
                    const template = window.getLocalizedMessage('allDayDateRange');
                    if (template) {
                        return template.replace('$1', startStr).replace('$2', endStr).replace('$3', dayCount);
                    }
                    return `${startStr} – ${endStr} (${dayCount} days)`;
                }
                const locale = navigator.language || 'en';
                const dateOpts = { year: 'numeric', month: '2-digit', day: '2-digit' };
                const dateStr = localStart.toLocaleDateString(locale, dateOpts);
                return `${dateStr} ${window.getLocalizedMessage('allDay')}`;
            }

            // For the timed events - use browser locale
            const locale = navigator.language || 'en';
            const timeOptions = { hour: '2-digit', minute: '2-digit' };
            const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
            const startTime = startDate.toLocaleTimeString(locale, timeOptions);
            const endTime = endDate.toLocaleTimeString(locale, timeOptions);
            const startDateStr = startDate.toLocaleDateString(locale, dateOptions);
            const separator = locale.startsWith('ja') ? ' ～ ' : ' - ';

            // If the event spans multiple calendar days, show the end date as well
            const sameDay = startDate.getFullYear() === endDate.getFullYear()
                && startDate.getMonth() === endDate.getMonth()
                && startDate.getDate() === endDate.getDate();

            if (sameDay) {
                return `${startDateStr} ${startTime}${separator}${endTime}`;
            }

            const endDateStr = endDate.toLocaleDateString(locale, dateOptions);
            return `${startDateStr} ${startTime}${separator}${endDateStr} ${endTime}`;
        } catch (error) {
            console.warn('Time format error:', error);
            return window.getLocalizedMessage('timeInfoError');
        }
    }

    /**
     * Set description
     * @param {HTMLElement} descriptionElement - The description row element
     * @param {Object} event - Google event data
     */
    setDescription(descriptionElement, event) {
        descriptionElement.innerHTML = '';

        if (event.description) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-align-left me-1';

            const text = document.createElement('div');
            text.className = 'google-event-detail-text';

            // Remove the HTML tags and display text only
            text.textContent = this.stripHtml(event.description);

            descriptionElement.appendChild(icon);
            descriptionElement.appendChild(text);
        }
    }

    /**
     * Set location
     * @param {HTMLElement} locationElement - The location row element
     * @param {Object} event - Google event data
     */
    setLocation(locationElement, event) {
        locationElement.innerHTML = '';

        if (event.location) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-map-marker-alt me-1';

            const text = document.createElement('span');
            text.textContent = event.location;

            locationElement.appendChild(icon);
            locationElement.appendChild(text);
        }
    }

    /**
     * Set Meet information
     * @param {HTMLElement} meetElement - The meet row element
     * @param {Object} event - Google event data
     */
    setMeetInfo(meetElement, event) {
        meetElement.innerHTML = '';

        // Render non-Meet video conference link first to match the notification button priority
        // (a Zoom/Teams/Webex URL pasted in the description is treated as the user's intended room).
        const otherVideoUrl = extractVideoUrl(event);
        if (otherVideoUrl) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-video me-1';

            const link = document.createElement('a');
            link.href = otherVideoUrl;
            link.target = '_blank';
            link.setAttribute('data-localize', '__MSG_joinVideoConference__');
            link.textContent = window.getLocalizedMessage('joinVideoConference');
            link.style.cssText = 'color: var(--side-calendar-link-color); text-decoration: none;';

            meetElement.appendChild(icon);
            meetElement.appendChild(link);
        }

        const meetUrl = extractMeetUrl(event);
        if (meetUrl) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-video me-1';

            const link = document.createElement('a');
            link.href = meetUrl;
            link.target = '_blank';
            link.setAttribute('data-localize', '__MSG_joinGoogleMeet__');
            link.textContent = window.getLocalizedMessage('joinGoogleMeet');
            link.style.cssText = 'color: var(--side-calendar-link-color); text-decoration: none;';

            meetElement.appendChild(icon);
            meetElement.appendChild(link);
        }
    }

    /**
     * Set out of office information
     * @param {HTMLElement} oooInfoElement - The out-of-office row element
     * @param {Object} event - Google event data
     */
    setOutOfOfficeInfo(oooInfoElement, event) {
        oooInfoElement.innerHTML = '';

        if (event.eventType !== 'outOfOffice') return;

        const icon = document.createElement('i');
        icon.className = 'fas fa-plane-departure me-1';

        const text = document.createElement('span');
        const declineMessage = event.outOfOfficeProperties?.declineMessage;
        text.textContent = declineMessage || window.getLocalizedMessage('outOfOffice');

        oooInfoElement.appendChild(icon);
        oooInfoElement.appendChild(text);
    }

    /**
     * Set attendees information
     * @param {HTMLElement} attendeesElement - The attendees row element
     * @param {Object} event - Google event data
     */
    setAttendeesInfo(attendeesElement, event) {
        attendeesElement.innerHTML = '';

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

            attendeesElement.appendChild(icon);
            attendeesElement.appendChild(container);
        }
    }

    /**
     * Remove HTML tags
     * @param {string} html - HTML string
     * @returns {string} Plain text
     */
    stripHtml(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || '';
    }
}
