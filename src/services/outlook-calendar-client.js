/**
 * OutlookCalendarClient - Microsoft Graph API client for Outlook Calendar
 *
 * Uses PKCE-based OAuth2 flow via chrome.identity.launchWebAuthFlow
 * to authenticate with Microsoft and fetch calendar events.
 *
 * Security note: OAuth tokens are stored in chrome.storage.local in plaintext.
 * chrome.storage.local is accessible only to this extension (sandboxed by Chrome),
 * but is not encrypted at rest. This mirrors how chrome.identity stores Google tokens
 * internally. For higher security, consider encrypting tokens before storage.
 */
import { StorageHelper } from '../lib/storage-helper.js';
import { generateCodeVerifier, generateCodeChallenge } from '../lib/pkce.js';

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
const MS_AUTH_BASE = 'https://login.microsoftonline.com/common/oauth2/v2.0';
const SCOPES = 'openid profile offline_access Calendars.Read';

/**
 * Map Microsoft Graph calendar color enum values to hex colors.
 * These match the CalendarColor enum from the Microsoft Graph API.
 * @see https://learn.microsoft.com/en-us/graph/api/resources/calendar
 */
const OUTLOOK_CALENDAR_COLORS = {
    auto: '#0078d4',
    lightBlue: '#69afe5',
    lightGreen: '#7bd148',
    lightOrange: '#ffb878',
    lightYellow: '#fbd75b',
    lightTeal: '#46d6db',
    lightPink: '#e8a1b3',
    lightBrown: '#ac725e',
    lightRed: '#dc2127',
    maxColor: '#0078d4'
};

/**
 * Windows timezone name to IANA mapping (common entries).
 * Graph API may return Windows timezone names like "Tokyo Standard Time".
 */
const WINDOWS_TZ_TO_IANA = {
    'Tokyo Standard Time': 'Asia/Tokyo',
    'Pacific Standard Time': 'America/Los_Angeles',
    'Mountain Standard Time': 'America/Denver',
    'Central Standard Time': 'America/Chicago',
    'Eastern Standard Time': 'America/New_York',
    'UTC': 'UTC',
    'GMT Standard Time': 'Europe/London',
    'W. Europe Standard Time': 'Europe/Berlin',
    'Romance Standard Time': 'Europe/Paris',
    'Central European Standard Time': 'Europe/Warsaw',
    'AUS Eastern Standard Time': 'Australia/Sydney',
    'India Standard Time': 'Asia/Kolkata',
    'China Standard Time': 'Asia/Shanghai',
    'Korea Standard Time': 'Asia/Seoul',
    'Singapore Standard Time': 'Asia/Singapore',
    'Taipei Standard Time': 'Asia/Taipei',
    'SE Asia Standard Time': 'Asia/Bangkok',
    'Hawaiian Standard Time': 'Pacific/Honolulu',
    'Alaskan Standard Time': 'America/Anchorage',
    'New Zealand Standard Time': 'Pacific/Auckland',
    'Arabian Standard Time': 'Asia/Dubai',
    'Russian Standard Time': 'Europe/Moscow',
    'SA Pacific Standard Time': 'America/Bogota',
    'E. South America Standard Time': 'America/Sao_Paulo'
};

export class OutlookCalendarClient {

    /**
     * Get the stored Outlook configuration (clientId and tokens).
     * @returns {Promise<Object>} { outlookClientId, outlookAccessToken, outlookRefreshToken, outlookTokenExpiry }
     * @private
     */
    async _getConfig() {
        return StorageHelper.getLocal(
            ['outlookClientId', 'outlookAccessToken', 'outlookRefreshToken', 'outlookTokenExpiry'],
            { outlookClientId: '', outlookAccessToken: '', outlookRefreshToken: '', outlookTokenExpiry: 0 }
        );
    }

    /**
     * Save tokens to local storage.
     * @param {Object} tokenData - Token response from Microsoft
     * @param {string} [existingRefreshToken] - Fallback refresh token if not in response
     * @private
     */
    async _saveTokens(tokenData, existingRefreshToken = '') {
        const expiresIn = tokenData.expires_in || 3600;
        await StorageHelper.setLocal({
            outlookAccessToken: tokenData.access_token,
            outlookRefreshToken: tokenData.refresh_token || existingRefreshToken,
            outlookTokenExpiry: Date.now() + (expiresIn * 1000) - 60000 // 1 min buffer
        });
    }

    /**
     * Clear all Outlook tokens.
     */
    async clearTokens() {
        await StorageHelper.removeLocal([
            'outlookAccessToken', 'outlookRefreshToken', 'outlookTokenExpiry'
        ]);
    }

    /**
     * Get redirect URL for Chrome extension.
     * @returns {string} The redirect URL
     * @private
     */
    _getRedirectUrl() {
        return chrome.identity.getRedirectURL('outlook');
    }

    /**
     * Start the interactive PKCE OAuth2 flow.
     * @returns {Promise<boolean>} true if authenticated successfully
     */
    async authenticate() {
        const config = await this._getConfig();
        if (!config.outlookClientId) {
            throw new Error('Outlook Client ID is not configured. Set it in the options page.');
        }

        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        const redirectUrl = this._getRedirectUrl();
        const state = generateCodeVerifier(32);

        const authUrl = `${MS_AUTH_BASE}/authorize?` + new URLSearchParams({
            client_id: config.outlookClientId,
            response_type: 'code',
            redirect_uri: redirectUrl,
            scope: SCOPES,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            state: state,
            prompt: 'select_account'
        }).toString();

        // Launch the auth flow
        const responseUrl = await new Promise((resolve, reject) => {
            chrome.identity.launchWebAuthFlow(
                { url: authUrl, interactive: true },
                (callbackUrl) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(callbackUrl);
                    }
                }
            );
        });

        // Extract authorization code from redirect
        const url = new URL(responseUrl);
        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');

        if (!code) {
            const error = url.searchParams.get('error_description') || url.searchParams.get('error') || 'No authorization code received';
            throw new Error(error);
        }

        if (returnedState !== state) {
            throw new Error('State mismatch in OAuth2 callback');
        }

        // Exchange code for tokens
        const tokenResponse = await fetch(`${MS_AUTH_BASE}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: config.outlookClientId,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUrl,
                code_verifier: codeVerifier,
                scope: SCOPES
            }).toString()
        });

        if (!tokenResponse.ok) {
            const errorBody = await tokenResponse.text();
            throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorBody}`);
        }

        const tokenData = await tokenResponse.json();
        await this._saveTokens(tokenData);

        return true;
    }

    /**
     * Refresh the access token using the refresh token.
     * @returns {Promise<string>} The new access token
     * @private
     */
    async _refreshToken() {
        const config = await this._getConfig();
        if (!config.outlookRefreshToken) {
            throw new Error('No refresh token available. Please re-authenticate.');
        }

        const tokenResponse = await fetch(`${MS_AUTH_BASE}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: config.outlookClientId,
                grant_type: 'refresh_token',
                refresh_token: config.outlookRefreshToken,
                scope: SCOPES
            }).toString()
        });

        if (!tokenResponse.ok) {
            // Refresh token is likely expired; clear tokens
            await this.clearTokens();
            throw new Error('Token refresh failed. Please re-authenticate.');
        }

        const tokenData = await tokenResponse.json();
        // Pass existing refresh token as fallback (token refresh responses
        // may not include a new refresh_token)
        await this._saveTokens(tokenData, config.outlookRefreshToken);

        return tokenData.access_token;
    }

    /**
     * Get a valid access token, refreshing if necessary.
     * @returns {Promise<string>} The access token
     * @private
     */
    async _getAccessToken() {
        const config = await this._getConfig();

        if (config.outlookAccessToken && config.outlookTokenExpiry > Date.now()) {
            return config.outlookAccessToken;
        }

        // Token expired or missing, try refresh
        return this._refreshToken();
    }

    /**
     * Perform an authenticated fetch against the Microsoft Graph API.
     * Automatically retries once on 401 by refreshing the access token.
     * @param {string} url - The full URL to fetch
     * @param {Object} [options={}] - Additional fetch options
     * @returns {Promise<Response>} The fetch Response object
     * @private
     */
    async _fetchWithAuth(url, options = {}) {
        const token = await this._getAccessToken();
        const headers = {
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        };
        const response = await fetch(url, { ...options, headers });

        // Retry once on 401 with a refreshed token
        if (response.status === 401) {
            const newToken = await this._refreshToken();
            const retryHeaders = {
                Authorization: `Bearer ${newToken}`,
                ...(options.headers || {})
            };
            return fetch(url, { ...options, headers: retryHeaders });
        }

        return response;
    }

    /**
     * Check if Outlook is authenticated.
     * @returns {Promise<boolean>} true if we have valid tokens
     */
    async checkAuth() {
        try {
            const config = await this._getConfig();
            if (!config.outlookClientId) return false;
            if (!config.outlookAccessToken && !config.outlookRefreshToken) return false;

            // Try to get a valid token
            await this._getAccessToken();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get the list of Outlook calendars.
     * @returns {Promise<Array>} Array of calendar objects
     */
    async getCalendarList() {
        const response = await this._fetchWithAuth(`${GRAPH_API_BASE}/me/calendars`);
        if (!response.ok) {
            throw new Error(`Outlook CalendarList API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const calendars = (data.value || []).map(cal => ({
            id: cal.id,
            summary: cal.name,
            primary: cal.isDefaultCalendar || false,
            backgroundColor: this._mapCalendarColor(cal.color),
            foregroundColor: '#ffffff',
            provider: 'outlook'
        }));

        // Auto-select default calendar if none selected
        try {
            const existing = await StorageHelper.get(['selectedOutlookCalendars'], { selectedOutlookCalendars: [] });
            if ((existing.selectedOutlookCalendars || []).length === 0) {
                const defaultCal = calendars.find(cal => cal.primary);
                if (defaultCal) {
                    await StorageHelper.set({ selectedOutlookCalendars: [defaultCal.id] });
                }
            }
        } catch (error) {
            console.error('Outlook default calendar selection error:', error);
        }

        return calendars;
    }

    /**
     * Get events from Outlook Calendar.
     * @param {Date|null} targetDate - The target date (today if omitted)
     * @returns {Promise<Array>} Array of events in Google-compatible format
     */
    async getCalendarEvents(targetDate = null) {
        const storageData = await StorageHelper.get(['selectedOutlookCalendars'], { selectedOutlookCalendars: [] });
        const selectedIds = storageData.selectedOutlookCalendars || [];

        const targetDay = targetDate || new Date();
        const startOfDay = new Date(targetDay);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDay);
        endOfDay.setHours(23, 59, 59, 999);

        // If no calendars selected, use /me/calendarView
        let calendarsToFetch;
        if (selectedIds.length === 0) {
            calendarsToFetch = [{ id: null }]; // null = default calendar view
        } else {
            calendarsToFetch = selectedIds.map(id => ({ id }));
        }

        const startDateTime = startOfDay.toISOString();
        const endDateTime = endOfDay.toISOString();

        // Build a calendar color map from the calendar list
        const calendarColorMap = {};
        try {
            const calListResponse = await this._fetchWithAuth(`${GRAPH_API_BASE}/me/calendars?$select=id,color`);
            if (calListResponse.ok) {
                const calListData = await calListResponse.json();
                for (const cal of (calListData.value || [])) {
                    calendarColorMap[cal.id] = this._mapCalendarColor(cal.color);
                }
            }
        } catch {
            // Non-fatal: events will use default color
        }

        const fetches = calendarsToFetch.map(async (cal) => {
            try {
                let url;
                if (cal.id) {
                    url = `${GRAPH_API_BASE}/me/calendars/${encodeURIComponent(cal.id)}/calendarView?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$orderby=start/dateTime&$top=200`;
                } else {
                    url = `${GRAPH_API_BASE}/me/calendarView?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$orderby=start/dateTime&$top=200`;
                }

                const response = await this._fetchWithAuth(url);
                if (!response.ok) {
                    console.warn(`Failed to get Outlook calendar(${cal.id}): ${response.status}`);
                    return { calendarId: cal.id, events: [] };
                }

                const data = await response.json();
                const calColor = calendarColorMap[cal.id] || '#0078d4';
                const events = (data.value || []).map(ev => this._normalizeEvent(ev, cal.id, calColor));
                return { calendarId: cal.id, events };
            } catch (err) {
                console.warn(`Exception when getting Outlook calendar(${cal.id}):`, err);
                return { calendarId: cal.id, events: [] };
            }
        });

        const results = await Promise.all(fetches);

        // Flatten and filter
        const allEvents = [];
        for (const result of results) {
            for (const event of result.events) {
                // Skip cancelled events
                if (event.status === 'cancelled') continue;
                // Skip declined events
                if (event._responseStatus === 'declined') continue;
                allEvents.push(event);
            }
        }

        return allEvents;
    }

    /**
     * Normalize an Outlook event to the Google Calendar event format
     * used throughout the application.
     * @param {Object} outlookEvent - Raw Microsoft Graph event
     * @param {string|null} calendarId - The calendar ID
     * @param {string} calendarColor - The calendar's hex color
     * @returns {Object} Normalized event
     * @private
     */
    _normalizeEvent(outlookEvent, calendarId, calendarColor = '#0078d4') {
        const isAllDay = outlookEvent.isAllDay || false;

        // Convert Outlook dateTime to Google format
        const start = {};
        const end = {};
        if (isAllDay) {
            start.date = outlookEvent.start.dateTime.split('T')[0];
            end.date = outlookEvent.end.dateTime.split('T')[0];
        } else {
            // Outlook returns times in the event's timezone; convert to full ISO
            const startTz = outlookEvent.start.timeZone || 'UTC';
            const endTz = outlookEvent.end.timeZone || 'UTC';
            start.dateTime = this._toISOWithTimezone(outlookEvent.start.dateTime, startTz);
            end.dateTime = this._toISOWithTimezone(outlookEvent.end.dateTime, endTz);
        }

        // Determine user's response status
        let responseStatus = 'needsAction';
        if (outlookEvent.responseStatus && outlookEvent.responseStatus.response) {
            const msResponse = outlookEvent.responseStatus.response;
            const statusMap = {
                accepted: 'accepted',
                tentativelyAccepted: 'tentative',
                declined: 'declined',
                notResponded: 'needsAction',
                organizer: 'accepted',
                none: 'needsAction'
            };
            responseStatus = statusMap[msResponse] || 'needsAction';
        }

        // Determine the organizer email for self-attendee detection
        const organizerEmail = outlookEvent.organizer?.emailAddress?.address?.toLowerCase() || '';

        return {
            id: outlookEvent.id,
            summary: outlookEvent.subject || '(No title)',
            description: outlookEvent.bodyPreview || '',
            location: outlookEvent.location?.displayName || '',
            start,
            end,
            status: outlookEvent.isCancelled ? 'cancelled' : 'confirmed',
            _responseStatus: responseStatus,
            htmlLink: outlookEvent.webLink || '',
            hangoutLink: outlookEvent.onlineMeeting?.joinUrl || '',
            calendarId: calendarId,
            calendarBackgroundColor: calendarColor,
            calendarForegroundColor: '#ffffff',
            isOwnedCalendar: outlookEvent.isOrganizer || false,
            eventType: 'default',
            provider: 'outlook',
            attendees: (outlookEvent.attendees || []).map(a => {
                const email = a.emailAddress?.address || '';
                return {
                    email,
                    displayName: a.emailAddress?.name || '',
                    // Mark self if this attendee is the organizer viewing their own event,
                    // or if the response status on the event itself is set (best effort)
                    self: outlookEvent.isOrganizer && email.toLowerCase() === organizerEmail,
                    responseStatus: a.status?.response || 'needsAction'
                };
            })
        };
    }

    /**
     * Convert Outlook datetime + timezone to an ISO 8601 string.
     *
     * Graph API returns event times as a local datetime string
     * (e.g. "2025-03-21T09:00:00.0000000") plus a timezone name
     * (e.g. "Tokyo Standard Time" or "Asia/Tokyo").
     *
     * We use Intl.DateTimeFormat to resolve the UTC offset for that timezone
     * at the given date/time, then build a proper ISO string.
     *
     * @param {string} dateTimeStr - e.g. "2025-03-21T09:00:00.0000000"
     * @param {string} timeZone - IANA or Windows timezone name
     * @returns {string} ISO datetime string
     * @private
     */
    _toISOWithTimezone(dateTimeStr, timeZone) {
        // If the string already has an offset or Z, return as-is
        if (dateTimeStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateTimeStr)) {
            return dateTimeStr;
        }

        // Clean up the datetime string (remove extra precision from Graph API)
        const cleanDt = dateTimeStr.replace(/\.?\d*$/, '').replace(/T$/, '');

        // Resolve Windows timezone names to IANA
        const ianaTz = WINDOWS_TZ_TO_IANA[timeZone] || timeZone;

        try {
            // Parse the local date components
            const parts = cleanDt.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):?(\d{2})?/);
            if (!parts) {
                return dateTimeStr + 'Z';
            }

            const [, year, month, day, hour, minute, second = '0'] = parts;

            // Use Intl to format a known date in the target timezone,
            // then compare to find the UTC offset.
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: ianaTz,
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false
            });

            // Create a UTC date with the local components
            // (we'll adjust by comparing formatted output)
            const utcGuess = new Date(Date.UTC(
                parseInt(year), parseInt(month) - 1, parseInt(day),
                parseInt(hour), parseInt(minute), parseInt(second)
            ));

            // Format the UTC guess in the target timezone
            const formatted = formatter.format(utcGuess);
            // Parse back: "MM/DD/YYYY, HH:MM:SS"
            const fMatch = formatted.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2}):(\d{2})/);
            if (!fMatch) {
                return utcGuess.toISOString();
            }

            const [, fMonth, fDay, fYear, fHour, fMinute, fSecond] = fMatch;
            const tzDate = new Date(Date.UTC(
                parseInt(fYear), parseInt(fMonth) - 1, parseInt(fDay),
                parseInt(fHour), parseInt(fMinute), parseInt(fSecond)
            ));

            // The offset in milliseconds: utcGuess is what we want in the tz,
            // tzDate is what that UTC time actually looks like in the tz.
            // So the real UTC = utcGuess - (tzDate - utcGuess) = 2*utcGuess - tzDate
            const offsetMs = tzDate.getTime() - utcGuess.getTime();
            const realUtc = new Date(utcGuess.getTime() - offsetMs);

            return realUtc.toISOString();
        } catch {
            // If timezone is unknown to Intl, fall back to treating as UTC
            try {
                const fallback = new Date(cleanDt + 'Z');
                if (!isNaN(fallback.getTime())) {
                    return fallback.toISOString();
                }
            } catch {
                // final fallback
            }
            return dateTimeStr + 'Z';
        }
    }

    /**
     * Map Microsoft Graph CalendarColor enum to hex color.
     * Used for calendar-level colors (not event categories).
     * @param {string} color - Graph API CalendarColor enum value
     * @returns {string} Hex color
     * @private
     */
    _mapCalendarColor(color) {
        return OUTLOOK_CALENDAR_COLORS[color] || '#0078d4';
    }
}
