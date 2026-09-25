/**
 * GoogleEventContentBuilder - Fills the rows of the Google event detail view
 *
 * Keeps the DOM building for event data out of GoogleEventModal. Each setter
 * receives the element to fill and the event, fills it, and returns whether
 * there was anything to show so the caller can hide an empty row.
 */
import { extractMeetUrl, extractVideoUrl } from '../../../lib/conference-url-utils.js';
import { createIcon, msg, msgWith, setLocalizedText } from './event-dialog-dom.js';

/** Guests at or under this count are listed straight away; more start folded. */
const ATTENDEES_EXPANDED_MAX = 3;

/** How each response status is drawn and named, in summary order. */
const RESPONSE_STATUSES = [
    { status: 'accepted', icon: 'fas fa-check-circle', labelKey: 'accepted', labelFallback: 'Accepted', countKey: 'guestSummaryYes', countFallback: '$1 yes' },
    { status: 'declined', icon: 'fas fa-times-circle', labelKey: 'declined', labelFallback: 'Declined', countKey: 'guestSummaryNo', countFallback: '$1 no' },
    { status: 'tentative', icon: 'far fa-question-circle', labelKey: 'tentative', labelFallback: 'Tentative', countKey: 'guestSummaryMaybe', countFallback: '$1 maybe' },
    { status: 'needsAction', icon: 'far fa-circle', labelKey: 'noResponse', labelFallback: 'No response', countKey: 'guestSummaryAwaiting', countFallback: '$1 awaiting' }
];

/**
 * The status entry for an attendee's responseStatus (unknown → awaiting).
 * @param {string} responseStatus
 * @returns {Object}
 */
function statusFor(responseStatus) {
    return RESPONSE_STATUSES.find(s => s.status === responseStatus) || RESPONSE_STATUSES[3];
}

export class GoogleEventContentBuilder {
    /**
     * Calendar the event is on.
     * @param {HTMLElement} content
     * @param {Object} event
     * @returns {boolean} whether there is anything to show
     */
    setCalendarInfo(content, event) {
        content.textContent = event.calendarName || '';
        return !!event.calendarName;
    }

    /**
     * Date and time.
     * @param {HTMLElement} content
     * @param {Object} event
     * @returns {boolean}
     */
    setTimeInfo(content, event) {
        const hasTime = !!(event.start && event.end);
        content.textContent = hasTime ? this.formatEventTime(event) : '';
        return hasTime;
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

            const locale = navigator.language || 'en';
            const localeHint = locale.startsWith('ja') ? 'ja' : 'en';

            // For all-day events
            if (event.start.date && event.end.date) {
                const MS_PER_DAY = 24 * 60 * 60 * 1000;
                // Parse as local time (not UTC) to avoid off-by-one in negative UTC timezones
                const localStart = new Date(event.start.date + 'T00:00:00');
                const localEnd = new Date(event.end.date + 'T00:00:00');
                const dayCount = Math.round((localEnd - localStart) / MS_PER_DAY);
                if (dayCount > 1) {
                    // Show date range: "06/01/2026 – 06/03/2026 (3 days)" / "2026/06/01 〜 2026/06/03（3日間）"
                    // end.date is exclusive in Google Calendar API, so show (end - 1 day) as the last day
                    const lastDay = new Date(localEnd.getTime() - MS_PER_DAY);
                    const startStr = window.formatDateForLocale(localStart, localeHint);
                    const endStr = window.formatDateForLocale(lastDay, localeHint);
                    const template = window.getLocalizedMessage('allDayDateRange');
                    if (template) {
                        return template.replace('$1', startStr).replace('$2', endStr).replace('$3', dayCount);
                    }
                    return `${startStr} – ${endStr} (${dayCount} days)`;
                }
                const dateStr = window.formatDateForLocale(localStart, localeHint);
                return `${dateStr} ${window.getLocalizedMessage('allDay')}`;
            }

            // For the timed events - use browser locale
            const timeOptions = { hour: '2-digit', minute: '2-digit' };
            const startTime = startDate.toLocaleTimeString(locale, timeOptions);
            const endTime = endDate.toLocaleTimeString(locale, timeOptions);
            const startDateStr = window.formatDateForLocale(startDate, localeHint);
            const separator = localeHint === 'ja' ? ' ～ ' : ' - ';

            // If the event spans multiple calendar days, show the end date as well.
            // An event ending exactly at midnight belongs to the day it started,
            // so compare against the last instant before the end time.
            const lastInstant = endDate > startDate ? new Date(endDate.getTime() - 1) : endDate;
            const sameDay = startDate.getFullYear() === lastInstant.getFullYear()
                && startDate.getMonth() === lastInstant.getMonth()
                && startDate.getDate() === lastInstant.getDate();

            if (sameDay) {
                return `${startDateStr} ${startTime}${separator}${endTime}`;
            }

            const endDateStr = window.formatDateForLocale(endDate, localeHint);
            return `${startDateStr} ${startTime}${separator}${endDateStr} ${endTime}`;
        } catch (error) {
            console.warn('Time format error:', error);
            return window.getLocalizedMessage('timeInfoError');
        }
    }

    /**
     * Description, as plain text with its line breaks.
     * @param {HTMLElement} content
     * @param {Object} event
     * @returns {boolean}
     */
    setDescription(content, event) {
        content.textContent = event.description ? this.stripHtml(event.description) : '';
        return !!content.textContent;
    }

    /**
     * Location.
     * @param {HTMLElement} content
     * @param {Object} event
     * @returns {boolean}
     */
    setLocation(content, event) {
        content.textContent = event.location || '';
        return !!event.location;
    }

    /**
     * Buttons that join the event's video call. A non-Meet link (Zoom, Teams,
     * Webex pasted into the description) comes first, matching the button on
     * the reminder notification, which treats it as the room people meant.
     * @param {HTMLElement} container
     * @param {Object} event
     * @returns {boolean}
     */
    setMeetInfo(container, event) {
        container.innerHTML = '';

        const otherVideoUrl = extractVideoUrl(event);
        if (otherVideoUrl) {
            container.appendChild(this._createJoinLink(otherVideoUrl, 'joinVideoConference', 'Join video conference'));
        }

        const meetUrl = extractMeetUrl(event);
        if (meetUrl) {
            container.appendChild(this._createJoinLink(meetUrl, 'joinGoogleMeet', 'Join Google Meet'));
        }

        return !!(otherVideoUrl || meetUrl);
    }

    /**
     * One join button: what it does, plus where it goes (the Meet code, or
     * the service's host) so two calls can be told apart.
     * @param {string} url
     * @param {string} msgKey
     * @param {string} fallback
     * @returns {HTMLAnchorElement}
     * @private
     */
    _createJoinLink(url, msgKey, fallback) {
        const link = document.createElement('a');
        link.className = 'event-detail-join';
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        const label = document.createElement('span');
        label.className = 'event-detail-join-label';
        link.appendChild(setLocalizedText(label, msgKey, fallback));

        const meta = this._joinLinkMeta(url);
        if (meta) {
            const metaEl = document.createElement('span');
            metaEl.className = 'event-detail-join-meta';
            metaEl.textContent = meta;
            link.appendChild(metaEl);
        }
        return link;
    }

    /**
     * Short identifier for a call URL: the Meet code, else the host name.
     * @param {string} url
     * @returns {string}
     * @private
     */
    _joinLinkMeta(url) {
        try {
            const parsed = new URL(url);
            if (parsed.hostname === 'meet.google.com') {
                return parsed.pathname.replace(/^\/+/, '').split('/')[0];
            }
            return parsed.hostname.replace(/^www\./, '');
        } catch {
            return '';
        }
    }

    /**
     * Out-of-office details: the type (an absence may carry any title), whether
     * conflicting invitations are declined, and the decline message.
     * @param {HTMLElement} content
     * @param {Object} event
     * @returns {boolean}
     */
    setOutOfOfficeInfo(content, event) {
        content.innerHTML = '';
        if (event.eventType !== 'outOfOffice') return false;

        const type = document.createElement('span');
        type.className = 'event-detail-ooo-type';
        content.appendChild(setLocalizedText(type, 'outOfOffice', 'Out of office'));

        const props = event.outOfOfficeProperties || {};
        const declineKey = {
            declineAllConflictingInvitations: ['autoDeclineInvitations', 'Decline all conflicting invitations'],
            declineOnlyNewConflictingInvitations: ['oooDeclineNewOnly', 'Decline only new conflicting invitations']
        }[props.autoDeclineMode];
        if (declineKey) {
            const decline = document.createElement('span');
            decline.className = 'event-detail-ooo-decline';
            decline.appendChild(createIcon('fas fa-check'));
            decline.appendChild(setLocalizedText(document.createElement('span'), declineKey[0], declineKey[1]));
            content.appendChild(decline);
        }

        if (props.declineMessage) {
            const message = document.createElement('blockquote');
            message.className = 'event-detail-ooo-message';
            message.textContent = props.declineMessage;
            content.appendChild(message);
        }
        return true;
    }

    /**
     * Guests: a one-line summary ("4 guests  2 yes · 1 maybe · 1 awaiting")
     * that folds the list away, then the list with a coloured response icon
     * each. A short list starts open; a long one starts folded so the actions
     * stay in view. Conference rooms and other resources are left out.
     * @param {HTMLElement} container
     * @param {Object} event
     * @param {string} listId - id for the list, referenced by aria-controls
     * @returns {boolean}
     */
    setAttendeesInfo(container, event, listId) {
        container.innerHTML = '';

        const attendees = (event.attendees || []).filter(attendee => !attendee.resource);
        if (attendees.length === 0) return false;

        // Organizer first, everyone else in the order Google returns them
        const ordered = [
            ...attendees.filter(a => a.organizer),
            ...attendees.filter(a => !a.organizer)
        ];
        const expanded = attendees.length <= ATTENDEES_EXPANDED_MAX;

        const header = document.createElement('div');
        header.className = 'event-detail-row event-detail-row-center';
        header.appendChild(createIcon('fas fa-user-friends event-form-row-icon'));

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'event-detail-attendees-toggle';
        toggle.setAttribute('aria-expanded', String(expanded));
        toggle.setAttribute('aria-controls', listId);

        const count = document.createElement('span');
        count.className = 'event-detail-attendees-count';
        count.textContent = attendees.length === 1
            ? msg('guestCountOne', '1 guest')
            : msgWith('guestCountMany', '$1 guests', attendees.length);
        toggle.appendChild(count);

        const breakdown = document.createElement('span');
        breakdown.className = 'event-detail-attendees-breakdown';
        breakdown.textContent = RESPONSE_STATUSES
            .map(s => ({ s, n: attendees.filter(a => statusFor(a.responseStatus) === s).length }))
            .filter(({ n }) => n > 0)
            .map(({ s, n }) => msgWith(s.countKey, s.countFallback, n))
            .join(' · ');
        toggle.appendChild(breakdown);

        toggle.appendChild(createIcon('fas fa-chevron-right event-detail-attendees-chevron'));
        header.appendChild(toggle);
        container.appendChild(header);

        const list = document.createElement('ul');
        list.className = 'event-detail-attendee-list';
        list.id = listId;
        list.hidden = !expanded;

        ordered.forEach(attendee => {
            const status = statusFor(attendee.responseStatus);
            const item = document.createElement('li');
            item.className = `event-detail-attendee is-${status.status}`;

            const icon = document.createElement('i');
            icon.className = `${status.icon} attendee-status attendee-status-${status.status}`;
            icon.setAttribute('role', 'img');
            icon.setAttribute('aria-label', msg(status.labelKey, status.labelFallback));
            icon.title = msg(status.labelKey, status.labelFallback);
            item.appendChild(icon);

            const name = document.createElement('span');
            name.className = 'event-detail-attendee-name';
            name.textContent = attendee.displayName || attendee.email;
            item.appendChild(name);

            if (attendee.organizer) {
                const badge = document.createElement('span');
                badge.className = 'event-detail-badge';
                item.appendChild(setLocalizedText(badge, 'organizer', 'Organizer'));
            }
            list.appendChild(item);
        });
        container.appendChild(list);

        return true;
    }

    /**
     * Remove HTML tags while preserving line breaks from <br> and block elements.
     * Google Calendar stores rich descriptions as HTML, so raw textContent would
     * collapse all whitespace and drop newlines.
     * @param {string} html - HTML string
     * @returns {string} Plain text with newline characters preserved
     */
    stripHtml(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        doc.body.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
        doc.body.querySelectorAll('p, div, li, tr, h1, h2, h3, h4, h5, h6, blockquote, pre')
            .forEach(el => el.append('\n'));
        return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '');
    }
}
