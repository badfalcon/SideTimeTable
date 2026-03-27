/**
 * GoogleCalendarClient - Google Calendar API client
 *
 * Encapsulates all Google Calendar API interactions including
 * authentication, calendar listing, event fetching, and RSVP.
 */
import { StorageHelper } from '../lib/storage-helper.js';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export class GoogleCalendarClient {

    /**
     * Get an OAuth2 auth token from Chrome Identity API.
     * @param {boolean} interactive - Whether to show a login prompt
     * @returns {Promise<string>} The auth token
     * @private
     */
    _getAuthToken(interactive = true) {
        return new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ interactive }, (token) => {
                if (chrome.runtime.lastError || !token) {
                    const error = chrome.runtime.lastError || new Error('Failed to get authentication token');
                    reject(error);
                } else {
                    resolve(token);
                }
            });
        });
    }

    /**
     * Perform an authenticated fetch against the Google Calendar API.
     * @param {string} url - The full URL to fetch
     * @param {Object} [options={}] - Additional fetch options (method, body, etc.)
     * @returns {Promise<Response>} The fetch Response object
     * @private
     */
    async _fetchWithAuth(url, options = {}) {
        const token = await this._getAuthToken(
            options._interactive !== undefined ? options._interactive : true
        );
        const { _interactive, ...fetchOptions } = options;
        const headers = {
            Authorization: 'Bearer ' + token,
            ...(fetchOptions.headers || {})
        };
        return fetch(url, { ...fetchOptions, headers });
    }

    /**
     * Get Google Calendar list
     * @returns {Promise<Array>} A promise that returns the calendar list
     */
    async getCalendarList() {
        const calendarListUrl = `${CALENDAR_API_BASE}/users/me/calendarList`;

        const response = await this._fetchWithAuth(calendarListUrl);
        if (!response.ok) {
            const errorBody = await response.text();
            console.error('CalendarList API error body:', errorBody);
            throw new Error(`CalendarList API error: ${response.status} ${response.statusText}`);
        }

        const listData = await response.json();
        const calendars = (listData.items || [])
            .filter(cal => cal.accessRole && cal.accessRole !== 'none')
            .map(cal => ({
                id: cal.id,
                summary: cal.summary,
                primary: cal.primary || false,
                backgroundColor: cal.backgroundColor,
                foregroundColor: cal.foregroundColor
            }));

        // Auto-select only the primary calendar if no calendars are currently selected
        try {
            const existing = await StorageHelper.get(['selectedCalendars'], { selectedCalendars: [] });
            const existingIds = existing.selectedCalendars || [];
            if (existingIds.length === 0) {
                const primaryCalendar = calendars.find(cal => cal.primary);
                if (primaryCalendar) {
                    await StorageHelper.set({ selectedCalendars: [primaryCalendar.id] });
                }
            }
        } catch (error) {
            console.error('Primary calendar selection setting error:', error);
        }

        return calendars;
    }

    /**
     * Get events from Google Calendar (multi-calendar)
     * @param {Date|null} targetDate - The target date (today if omitted)
     * @returns {Promise<Array>} A promise that returns an array of events
     */
    async getCalendarEvents(targetDate = null) {
        // Get the list of the selected calendars
        const storageData = await StorageHelper.get(['selectedCalendars'], { selectedCalendars: [] });

        const token = await this._getAuthToken(true);

        // Set the target date range
        const targetDay = targetDate || new Date();
        const startOfDay = new Date(targetDay);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDay);
        endOfDay.setHours(23, 59, 59, 999);

        const selectedCalendarIds = storageData.selectedCalendars || [];

        // Fetch calendarList once and reuse for both calendar selection and color info
        const calendarListUrl = `${CALENDAR_API_BASE}/users/me/calendarList`;
        const listResponse = await fetch(calendarListUrl, {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (!listResponse.ok) {
            const errorBody = await listResponse.text();
            console.error('[getCalendarEvents] CalendarList API error body:', errorBody);
            console.error('[getCalendarEvents] Token used:', token.substring(0, 10) + '...');
            throw new Error(`CalendarList API error: ${listResponse.status} ${listResponse.statusText}`);
        }
        const listData = await listResponse.json();

        let calendarsToFetch;

        if (selectedCalendarIds.length === 0) {
            const allCalendars = listData.items || [];
            const selectedCalendars = allCalendars.filter(cal => cal.selected);
            const accessibleCalendars = selectedCalendars.filter(cal => cal.accessRole && cal.accessRole !== 'none');

            const calendarsToReturn = [...accessibleCalendars];
            const primaryCalendar = allCalendars.find(cal => cal.primary);

            if (primaryCalendar && !calendarsToReturn.some(cal => cal.id === primaryCalendar.id)) {
                calendarsToReturn.unshift(primaryCalendar);
            }

            if (calendarsToReturn.length === 0) {
                calendarsToFetch = [{ id: 'primary' }];
            } else {
                calendarsToFetch = calendarsToReturn.map(c => ({ id: c.id }));
            }
        } else {
            calendarsToFetch = selectedCalendarIds.map(id => ({ id }));
        }

        // Fetch events from each calendar in parallel
        const baseUrl = `${CALENDAR_API_BASE}/calendars`;

        const fetches = calendarsToFetch.map(cal => {
            const url = `${baseUrl}/${encodeURIComponent(cal.id)}/events?timeMin=${startOfDay.toISOString()}&timeMax=${endOfDay.toISOString()}&singleEvents=true&orderBy=startTime`;
            return fetch(url, {
                headers: { Authorization: 'Bearer ' + token }
            })
            .then(res => {
                if (!res.ok) {
                    // For individual calendar errors, just log and skip
                    console.warn(`Failed to get calendar(${cal.id}): ${res.status} ${res.statusText}`);
                    return { items: [] };
                }
                return res.json();
            })
            .then(data => {
                // Add the calendar ID to each event
                const events = data.items || [];
                events.forEach(event => {
                    event.calendarId = cal.id;
                });
                return { calendarId: cal.id, events };
            })
            .catch(err => {
                console.warn(`Skip exception when getting calendar(${cal.id}):`, err);
                return { calendarId: cal.id, events: [] };
            });
        });

        const resultsPerCalendar = await Promise.all(fetches);

        // Build color map from the already-fetched calendarList data
        try {
            const calendarColors = {};
            const ownedCalendarIds = new Set(
                (listData.items || []).filter(cal => cal.accessRole === 'owner').map(cal => cal.id)
            );
            listData.items?.forEach(cal => {
                calendarColors[cal.id] = {
                    backgroundColor: cal.backgroundColor,
                    foregroundColor: cal.foregroundColor,
                    summary: cal.summary
                };
            });

            // Flatten the results and add the color information
            const allEvents = [];
            resultsPerCalendar.forEach(result => {
                if (result.events) {
                    result.events.forEach(event => {
                        // Skip the cancelled events
                        if (event.status === 'cancelled') {
                            return;
                        }

                        // Skip the declined events
                        if (event.attendees && event.attendees.some(attendee =>
                            attendee.self && attendee.responseStatus === 'declined'
                        )) {
                            return;
                        }

                        const calendarInfo = calendarColors[event.calendarId];
                        if (calendarInfo) {
                            event.calendarBackgroundColor = calendarInfo.backgroundColor;
                            event.calendarForegroundColor = calendarInfo.foregroundColor;
                            event.calendarName = calendarInfo.summary;
                        }
                        event.isOwnedCalendar = ownedCalendarIds.has(event.calendarId);
                        allEvents.push(event);
                    });
                }
            });

            return allEvents;
        } catch (colorError) {
            console.warn('Calendar color information acquisition error:', colorError);
            // Return the events even without color information (excluding the cancelled and declined events)
            const merged = resultsPerCalendar.flatMap(r =>
                (r.events || []).filter(event => {
                    // Exclude the cancelled events
                    if (event.status === 'cancelled') {
                        return false;
                    }
                    // Exclude the declined events
                    return !(event.attendees && event.attendees.some(attendee =>
                        attendee.self && attendee.responseStatus === 'declined'
                    ));
                })
            );
            return merged;
        }
    }

    /**
     * Get events from PRIMARY Google Calendar only (for reminders)
     * @param {Date|null} targetDate - The target date (today if omitted)
     * @returns {Promise<Array>} A promise that returns an array of events
     */
    async getPrimaryCalendarEvents(targetDate = null) {
        // Set the target date range
        const targetDay = targetDate || new Date();
        const startOfDay = new Date(targetDay);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDay);
        endOfDay.setHours(23, 59, 59, 999);

        // Fetch from PRIMARY calendar only
        const url = `${CALENDAR_API_BASE}/calendars/primary/events?timeMin=${startOfDay.toISOString()}&timeMax=${endOfDay.toISOString()}&singleEvents=true&orderBy=startTime`;

        const response = await this._fetchWithAuth(url, { _interactive: false });
        if (!response.ok) {
            throw new Error(`Primary calendar API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const events = data.items || [];

        // Filter out cancelled and declined events
        return events.filter(event => {
            // Skip cancelled events
            if (event.status === 'cancelled') {
                return false;
            }
            // Skip declined events
            return !(event.attendees && event.attendees.some(attendee =>
                attendee.self && attendee.responseStatus === 'declined'
            ));
        });
    }

    /**
     * Check Google account authentication status
     * @returns {Promise<boolean>} A promise that returns the authentication status
     */
    async checkAuth() {
        try {
            const token = await this._getAuthToken(false);
            return !!token;
        } catch (error) {
            // Not authenticated — return false rather than rejecting
            return false;
        }
    }

    /**
     * Respond to a Google Calendar event (accept/decline/tentative)
     * @param {string} calendarId - The calendar ID
     * @param {string} eventId - The event ID
     * @param {string} response - The RSVP response ('accepted', 'declined', 'tentative')
     * @returns {Promise<Object>} The updated event object
     */
    async respondToEvent(calendarId, eventId, response) {
        if (!calendarId || !eventId || !response) {
            throw new Error('Missing required parameters');
        }

        // Validate response status
        const validStatuses = new Set(['accepted', 'declined', 'tentative']);
        if (!validStatuses.has(response)) {
            throw new Error('Invalid response status');
        }

        const baseUrl = `${CALENDAR_API_BASE}/calendars`;
        const eventUrl = `${baseUrl}/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;

        // First, get the current event to find the self attendee
        const getRes = await this._fetchWithAuth(eventUrl);
        if (!getRes.ok) {
            throw new Error(`Failed to get event: ${getRes.status} ${getRes.statusText}`);
        }
        const eventData = await getRes.json();

        // Update the self attendee's response status
        const attendees = eventData.attendees || [];
        const selfAttendee = attendees.find(a => a.self);
        if (!selfAttendee) {
            throw new Error('Self attendee not found in event');
        }
        selfAttendee.responseStatus = response;

        // PATCH the event with updated attendees
        const patchRes = await this._fetchWithAuth(eventUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ attendees })
        });

        if (!patchRes.ok) {
            throw new Error(`Failed to update event: ${patchRes.status} ${patchRes.statusText}`);
        }

        return await patchRes.json();
    }
}
