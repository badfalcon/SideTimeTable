/**
 * OutlookCalendarClient - Microsoft Graph API client for Outlook Calendar
 *
 * Uses PKCE-based OAuth2 flow via chrome.identity.launchWebAuthFlow
 * to authenticate with Microsoft and fetch calendar events.
 */
import { StorageHelper } from '../lib/storage-helper.js';
import { generateCodeVerifier, generateCodeChallenge } from '../lib/pkce.js';

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
const MS_AUTH_BASE = 'https://login.microsoftonline.com/common/oauth2/v2.0';
const SCOPES = 'openid profile offline_access Calendars.Read';

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
     * @private
     */
    async _saveTokens(tokenData) {
        const expiresIn = tokenData.expires_in || 3600;
        await StorageHelper.setLocal({
            outlookAccessToken: tokenData.access_token,
            outlookRefreshToken: tokenData.refresh_token || (await this._getConfig()).outlookRefreshToken,
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
        await this._saveTokens(tokenData);

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
        return fetch(url, { ...options, headers });
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
            backgroundColor: this._mapOutlookColor(cal.color),
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

        const fetches = calendarsToFetch.map(async (cal) => {
            try {
                let url;
                if (cal.id) {
                    url = `${GRAPH_API_BASE}/me/calendars/${encodeURIComponent(cal.id)}/calendarView?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$orderby=start/dateTime&$top=100`;
                } else {
                    url = `${GRAPH_API_BASE}/me/calendarView?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$orderby=start/dateTime&$top=100`;
                }

                const response = await this._fetchWithAuth(url);
                if (!response.ok) {
                    console.warn(`Failed to get Outlook calendar(${cal.id}): ${response.status}`);
                    return { calendarId: cal.id, events: [] };
                }

                const data = await response.json();
                const events = (data.value || []).map(ev => this._normalizeEvent(ev, cal.id));
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
     * @returns {Object} Normalized event
     * @private
     */
    _normalizeEvent(outlookEvent, calendarId) {
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

        const bgColor = this._mapOutlookColor(outlookEvent.categories?.[0]) || '#0078d4';

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
            calendarBackgroundColor: bgColor,
            calendarForegroundColor: '#ffffff',
            isOwnedCalendar: outlookEvent.isOrganizer || false,
            eventType: 'default',
            provider: 'outlook',
            attendees: (outlookEvent.attendees || []).map(a => ({
                email: a.emailAddress?.address || '',
                displayName: a.emailAddress?.name || '',
                self: false,
                responseStatus: a.status?.response || 'needsAction'
            }))
        };
    }

    /**
     * Convert Outlook datetime (without offset) + timezone to ISO string.
     * @param {string} dateTimeStr - e.g. "2025-03-21T09:00:00.0000000"
     * @param {string} timeZone - IANA timezone name
     * @returns {string} ISO datetime string
     * @private
     */
    _toISOWithTimezone(dateTimeStr, _timeZone) {
        // Outlook sometimes returns already-offset dates, sometimes UTC
        // For simplicity, if the string ends with Z or has an offset, use as-is
        if (dateTimeStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateTimeStr)) {
            return dateTimeStr;
        }

        // Try to create a Date in the given timezone
        try {
            // Clean up the datetime string (remove extra precision)
            const cleanDt = dateTimeStr.replace(/\.0+$/, '');
            // Create date assuming the string is in the specified timezone
            const date = new Date(cleanDt);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
        } catch {
            // fallback
        }

        return dateTimeStr + 'Z';
    }

    /**
     * Map Outlook color names/categories to hex colors.
     * @param {string} color - Outlook color or category name
     * @returns {string} Hex color
     * @private
     */
    _mapOutlookColor(color) {
        const colorMap = {
            auto: '#0078d4',
            lightBlue: '#69afe5',
            lightGreen: '#7bd148',
            lightOrange: '#ffb878',
            lightYellow: '#fbd75b',
            lightTeal: '#46d6db',
            lightPink: '#dc2127',
            lightBrown: '#ac725e',
            lightRed: '#dc2127',
            maxColor: '#0078d4',
            preset0: '#dc2127',
            preset1: '#ff887c',
            preset2: '#ffb878',
            preset3: '#fbd75b',
            preset4: '#7bd148',
            preset5: '#46d6db',
            preset6: '#69afe5',
            preset7: '#7986cb',
            preset8: '#b3bef6',
            preset9: '#dbadff'
        };
        return colorMap[color] || '#0078d4';
    }
}
