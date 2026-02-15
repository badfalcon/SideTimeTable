/**
 * SideTimeTable - Background Script
 *
 * This file runs in the background of the Chrome extension,
 * managing side panel settings and Google Calendar integration.
 */

import { StorageHelper } from './lib/storage-helper.js';
import { AlarmManager } from './lib/alarm-manager.js';

// Side panel configuration - opens when clicking the action toolbar icon
chrome.sidePanel
    .setPanelBehavior({openPanelOnActionClick: true})
    .catch((error) => console.error("Side panel setup error:", error));

// Handler for when the extension is installed
chrome.runtime.onInstalled.addListener(async () => {
    // Set up daily alarm for Google event reminder sync (runs at 00:00 every day)
    await setupDailyReminderSync();

    // Initial sync on install
    await syncAllReminders();

    // Create context menu for "What's New"
    if (chrome.contextMenus) {
        chrome.contextMenus.create({
            id: 'whatsNew',
            title: chrome.i18n.getMessage('whatsNewContextMenu') || "What's New",
            contexts: ['action']
        });
    }
});

// Context menu click handler
if (chrome.contextMenus) {
    chrome.contextMenus.onClicked.addListener((info) => {
        if (info.menuItemId === 'whatsNew') {
            const whatsNewUrl = chrome.runtime.getURL('src/whats-new/whats-new.html');
            chrome.tabs.create({ url: whatsNewUrl });
        }
    });
}

// Handler for when the browser/profile starts
chrome.runtime.onStartup.addListener(async () => {
    // Sync reminders on startup
    await syncAllReminders();
});

// Keyboard shortcut handler
// StackOverflow solution: don't use await, call sidePanel.open() immediately with callback
if (chrome.commands && chrome.commands.onCommand && chrome.commands.onCommand.addListener) {
    chrome.commands.onCommand.addListener((command) => {
        
        switch (command) {
            case 'open-side-panel':
                // Minimize async operations and call sidePanel.open() immediately
                chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
                    if (activeTab) {
                        chrome.sidePanel.open({ tabId: activeTab.id });
                    } else {
                        console.error("Active tab not found");
                    }
                });
                break;
                
            default:
                console.warn("Unknown command:", command);
                break;
        }
    });
} else {
    console.warn("chrome.commands API is not available. Please check the commands configuration in manifest.json.");
}

/**
 * Get Google Calendar list
 * @returns {Promise<Array>} A promise that returns the calendar list
 */
function getCalendarList() {
    return new Promise((resolve, reject) => {
        try {
            chrome.identity.getAuthToken({interactive: true}, (token) => {
                if (chrome.runtime.lastError || !token) {
                    const error = chrome.runtime.lastError || new Error("Failed to get authentication token");
                    console.error("Authentication token acquisition error:", error);
                    reject(error);
                    return;
                }

                const calendarListUrl = `https://www.googleapis.com/calendar/v3/users/me/calendarList`;
                fetch(calendarListUrl, {
                    headers: {
                        Authorization: "Bearer " + token
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`CalendarList API error: ${response.status} ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(async listData => {
                    const calendars = (listData.items || [])
                        .filter(cal => cal.accessRole && cal.accessRole !== 'none')
                        .map(cal => ({
                            id: cal.id,
                            summary: cal.summary,
                            primary: cal.primary || false,
                            backgroundColor: cal.backgroundColor,
                            foregroundColor: cal.foregroundColor
                        }));


                    // Automatically select only the primary calendar
                    const primaryCalendar = calendars.find(cal => cal.primary);
                    if (primaryCalendar) {
                        const primaryCalendarIds = [primaryCalendar.id];
                        try {
                            await StorageHelper.set({ selectedCalendars: primaryCalendarIds });
                        } catch (error) {
                            console.error("Primary calendar selection setting error:", error);
                        }
                    }

                    resolve(calendars);
                })
                .catch(error => {
                    console.error("Calendar list acquisition error:", error);
                    reject(error);
                });
            });
        } catch (error) {
            console.error("Calendar list acquisition exception:", error);
            reject(error);
        }
    });
}

/**
 * Get events from Google Calendar
 * @param {Date} targetDate - The target date (today if omitted)
 * @returns {Promise<Array>} A promise that returns an array of events
 */
function getCalendarEvents(targetDate = null) {
    return new Promise((resolve, reject) => {
        try {
            // Get the list of the selected calendars
            StorageHelper.get(['selectedCalendars'], { selectedCalendars: [] })
                .then((storageData) => {
                chrome.identity.getAuthToken({interactive: true}, (token) => {
                    if (chrome.runtime.lastError || !token) {
                        const error = chrome.runtime.lastError || new Error("Failed to get authentication token");
                        console.error("Authentication token acquisition error:", error);
                        reject(error);
                        return;
                    }

                    
                    // Set the target date range
                    const targetDay = targetDate || new Date();
                    const startOfDay = new Date(targetDay);
                    startOfDay.setHours(0, 0, 0, 0);
                    const endOfDay = new Date(targetDay);
                    endOfDay.setHours(23, 59, 59, 999);
                    
                    const selectedCalendarIds = storageData.selectedCalendars || [];

                    // Fetch calendarList once and reuse for both calendar selection and color info
                    const calendarListUrl = `https://www.googleapis.com/calendar/v3/users/me/calendarList`;
                    let calendarListDataPromise = fetch(calendarListUrl, {
                        headers: { Authorization: "Bearer " + token }
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`CalendarList API error: ${response.status} ${response.statusText}`);
                        }
                        return response.json();
                    });

                    calendarListDataPromise
                .then(listData => {
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

                    // Set today's date range (use the previously calculated startOfDay/endOfDay)
                    const baseUrl = 'https://www.googleapis.com/calendar/v3/calendars';

                    const fetches = calendarsToFetch.map(cal => {
                        const url = `${baseUrl}/${encodeURIComponent(cal.id)}/events?timeMin=${startOfDay.toISOString()}&timeMax=${endOfDay.toISOString()}&singleEvents=true&orderBy=startTime`;
                        return fetch(url, {
                            headers: { Authorization: "Bearer " + token }
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

                    return Promise.all(fetches).then(results => ({ listData, results }));
                })
                .then(async ({ listData, results: resultsPerCalendar }) => {
                    // Build color map from the already-fetched calendarList data
                    try {
                        let calendarColors = {};
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
                                    allEvents.push(event);
                                });
                            }
                        });
                        
                        resolve(allEvents);
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
                                if (event.attendees && event.attendees.some(attendee => 
                                    attendee.self && attendee.responseStatus === 'declined'
                                )) {
                                    return false;
                                }
                                return true;
                            })
                        );
                        resolve(merged);
                    }
                })
                .catch(error => {
                    console.error("Calendar event acquisition error:", error);
                    reject(error);
                });
                });
                })
                .catch((error) => {
                    console.error("Selected calendar acquisition error:", error);
                    reject(error);
                });
        } catch (error) {
            console.error("Calendar event acquisition exception:", error);
            reject(error);
        }
    });
}

/**
 * Get events from PRIMARY Google Calendar only (for reminders)
 * @param {Date} targetDate - The target date (today if omitted)
 * @returns {Promise<Array>} A promise that returns an array of events
 */
function getPrimaryCalendarEvents(targetDate = null) {
    return new Promise((resolve, reject) => {
        try {
            chrome.identity.getAuthToken({interactive: false}, (token) => {
                if (chrome.runtime.lastError || !token) {
                    const error = chrome.runtime.lastError || new Error("Failed to get authentication token");
                    console.error("Authentication token acquisition error:", error);
                    reject(error);
                    return;
                }

                // Set the target date range
                const targetDay = targetDate || new Date();
                const startOfDay = new Date(targetDay);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(targetDay);
                endOfDay.setHours(23, 59, 59, 999);

                // Fetch from PRIMARY calendar only
                const baseUrl = 'https://www.googleapis.com/calendar/v3/calendars';
                const url = `${baseUrl}/primary/events?timeMin=${startOfDay.toISOString()}&timeMax=${endOfDay.toISOString()}&singleEvents=true&orderBy=startTime`;

                fetch(url, {
                    headers: { Authorization: "Bearer " + token }
                })
                .then(res => {
                    if (!res.ok) {
                        throw new Error(`Primary calendar API error: ${res.status} ${res.statusText}`);
                    }
                    return res.json();
                })
                .then(data => {
                    const events = data.items || [];

                    // Filter out cancelled and declined events
                    const filteredEvents = events.filter(event => {
                        // Skip cancelled events
                        if (event.status === 'cancelled') {
                            return false;
                        }
                        // Skip declined events
                        if (event.attendees && event.attendees.some(attendee =>
                            attendee.self && attendee.responseStatus === 'declined'
                        )) {
                            return false;
                        }
                        return true;
                    });

                    resolve(filteredEvents);
                })
                .catch(error => {
                    console.error("Primary calendar event acquisition error:", error);
                    reject(error);
                });
            });
        } catch (error) {
            console.error("Primary calendar event acquisition exception:", error);
            reject(error);
        }
    });
}

/**
 * Check Google account authentication status
 * @returns {Promise<boolean>} A promise that returns the authentication status
 */
function checkGoogleAuth() {
    return new Promise((resolve, reject) => {
        try {
            chrome.identity.getAuthToken({interactive: false}, (token) => {
                if (chrome.runtime.lastError) {
                    resolve(false); // Even if there's an error, just not authenticated so don't reject
                    return;
                }

                const isAuthenticated = !!token;
                resolve(isAuthenticated);
            });
        } catch (error) {
            console.error("Authentication status check exception:", error);
            reject(error);
        }
    });
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    switch (request.action) {
        case "getEvents":
            const targetDate = request.targetDate ? new Date(request.targetDate) : null;
            const requestId = request.requestId;
            getCalendarEvents(targetDate)
                .then(events => sendResponse({events, requestId}))
                .catch(error => {
                    const detail = (error && (error.message || error.toString())) || "Event acquisition error";
                    console.error("Event acquisition error details:", error);
                    sendResponse({ error: detail, errorType: (error && error.name) || undefined, requestId });
                });
            return true; // Indicates async response
            
        case "getCalendarList":
            const reqIdList = request.requestId;
            getCalendarList()
                .then(calendars => sendResponse({calendars, requestId: reqIdList}))
                .catch(error => {
                    const detail = (error && (error.message || error.toString())) || "Calendar list acquisition error";
                    console.error("Calendar list acquisition error details:", error);
                    sendResponse({ error: detail, errorType: (error && error.name) || undefined, requestId: reqIdList });
                });
            return true; // Indicates async response
            
        case "checkGoogleAuth":
            checkGoogleAuth()
                .then(isAuthenticated => {
                    sendResponse({authenticated: isAuthenticated});
                })
                .catch(error => {
                    const detail = (error && (error.message || error.toString())) || "Authentication check error";
                    console.error("Authentication check error details:", error);
                    sendResponse({ error: detail, errorType: (error && error.name) || undefined });
                });
            return true; // Indicates async response

        case "authenticateGoogle":
            // Execute the Google authentication
            chrome.identity.getAuthToken({interactive: true}, (token) => {
                if (chrome.runtime.lastError || !token) {
                    const error = chrome.runtime.lastError || new Error("Authentication failed");
                    console.error("Google authentication error:", error);
                    sendResponse({ success: false, error: error.message });
                    return;
                }

                // After successful authentication, fetch calendar list to set up primary calendar
                getCalendarList()
                    .then(async () => {
                        // After authentication and calendar list fetch, sync reminders
                        await syncAllReminders();
                        sendResponse({ success: true });
                    })
                    .catch((error) => {
                        console.error("Calendar list initialization error:", error);
                        // Still return success as authentication worked
                        sendResponse({ success: true });
                    });
            });
            return true; // Indicates async response

        case "disconnectGoogle":
            // Disconnect the Google account integration
            chrome.identity.getAuthToken({interactive: false}, (token) => {
                if (chrome.runtime.lastError || !token) {
                    // If no token, already disconnected
                    sendResponse({ success: true, alreadyDisconnected: true });
                    return;
                }

                // Remove the cached token
                chrome.identity.removeCachedAuthToken({ token: token }, () => {
                    if (chrome.runtime.lastError) {
                        console.error("Token removal error:", chrome.runtime.lastError);
                        sendResponse({ success: false, error: chrome.runtime.lastError.message });
                        return;
                    }

                    sendResponse({
                        success: true,
                        requiresManualRevoke: true,
                        revokeUrl: 'https://myaccount.google.com/permissions'
                    });
                });
            });
            return true; // Indicates async response

        case "reloadSideTimeTable":
            // The side panel reload request just returns a response
            sendResponse({success: true});
            return false; // Synchronous response

        case "updateReminderSettings":
            // Handle reminder settings update
            syncGoogleEventReminders()
                .then(() => {
                    sendResponse({ success: true });
                })
                .catch(error => {
                    console.error('Failed to update reminder settings:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true; // Indicates async response

        case "testReminder":
            // Test notification immediately (developer features only)
            (async () => {
                try {
                    const { enableDeveloperFeatures = false, enableReminderDebug = false } = await chrome.storage.local.get(['enableDeveloperFeatures', 'enableReminderDebug']);
                    const devEnabled = !!(enableDeveloperFeatures || enableReminderDebug);
                    if (!devEnabled) {
                        sendResponse({ success: false, error: 'Developer features are disabled. Enable with chrome.storage.local.set({ enableDeveloperFeatures: true }) (or legacy: enableReminderDebug).' });
                        return;
                    }

                    const testNotification = {
                        type: 'basic',
                        title: chrome.i18n.getMessage('eventReminder') || 'Event Reminder (Test)',
                        message: 'This is a test reminder notification.',
                        iconUrl: chrome.runtime.getURL('src/img/icon48.png'),
                        buttons: [
                            { title: chrome.i18n.getMessage('openSideTimeTable') || 'Open SideTimeTable' },
                            { title: chrome.i18n.getMessage('dismissNotification') || 'Dismiss' }
                        ],
                        requireInteraction: true
                    };
                    await chrome.notifications.create('test_reminder', testNotification);
                    sendResponse({ success: true, message: 'Test notification sent' });
                } catch (error) {
                    console.error('Failed to send test notification:', error);
                    sendResponse({ success: false, error: error.message });
                }
            })();
            return true; // Indicates async response

        case "debugAlarms":
            // Get all current alarms for debugging (developer features only)
            (async () => {
                try {
                    const { enableDeveloperFeatures = false, enableReminderDebug = false } = await chrome.storage.local.get(['enableDeveloperFeatures', 'enableReminderDebug']);
                    const devEnabled = !!(enableDeveloperFeatures || enableReminderDebug);
                    if (!devEnabled) {
                        sendResponse({ success: false, error: 'Developer features are disabled. Enable with chrome.storage.local.set({ enableDeveloperFeatures: true }) (or legacy: enableReminderDebug).' });
                        return;
                    }

                    const alarms = await chrome.alarms.getAll();
                    const settings = await StorageHelper.get(['googleEventReminder', 'googleIntegrated', 'reminderMinutes'], {
                        googleEventReminder: false,
                        googleIntegrated: false,
                        reminderMinutes: 5
                    });
                    sendResponse({
                        success: true,
                        alarms: alarms.map(a => ({
                            name: a.name,
                            scheduledTime: new Date(a.scheduledTime).toLocaleString()
                        })),
                        settings: settings
                    });
                } catch (error) {
                    console.error('Failed to get alarm debug info:', error);
                    sendResponse({ success: false, error: error.message });
                }
            })();
            return true; // Indicates async response

        case "forceSyncReminders":
            // Force sync reminders immediately (for testing)
            syncAllReminders()
                .then(() => {
                    sendResponse({ success: true, message: 'Reminder sync completed' });
                })
                .catch(error => {
                    console.error('Failed to force sync reminders:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true; // Indicates async response

        case "autoSyncReminders":
            // Auto-sync with throttle (skip if synced within last 5 minutes)
            (async () => {
                try {
                    const SYNC_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes
                    const lastSyncData = await StorageHelper.getLocal(['lastReminderSyncTime'], { lastReminderSyncTime: 0 });
                    const lastSyncTime = lastSyncData.lastReminderSyncTime || 0;
                    const now = Date.now();

                    if (now - lastSyncTime < SYNC_THROTTLE_MS) {
                        console.log(`[Auto Sync] Skipping sync (last sync was ${Math.round((now - lastSyncTime) / 1000)}s ago)`);
                        sendResponse({ success: true, skipped: true, message: 'Skipped (recently synced)' });
                    } else {
                        console.log(`[Auto Sync] Starting sync (last sync was ${Math.round((now - lastSyncTime) / 1000)}s ago)`);
                        await syncAllReminders();
                        sendResponse({ success: true, skipped: false, message: 'Reminder sync completed' });
                    }
                } catch (error) {
                    console.error('[Auto Sync] Failed to auto-sync reminders:', error);
                    sendResponse({ success: false, error: error.message });
                }
            })();
            return true; // Indicates async response

        default:
            console.warn("Unknown action:", request.action);
            sendResponse({error: "Unknown action"});
            return false; // Synchronous response
    }
});

// Alarm listener for event reminders and periodic sync
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'daily_reminder_sync') {
        console.log('[Alarm] Running daily reminder sync');
        await syncAllReminders();
    } else if (alarm.name.startsWith(AlarmManager.ALARM_PREFIX) || alarm.name.startsWith(AlarmManager.GOOGLE_ALARM_PREFIX)) {
        await AlarmManager.showReminderNotification(alarm.name);
    }
});

// Notification click handler
// User preference: Clicking the notification body should open the Side Panel
chrome.notifications.onClicked.addListener(async (notificationId) => {
    if (notificationId.startsWith('reminder_')) {
        try {
            chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
                if (activeTab) {
                    chrome.sidePanel.open({ tabId: activeTab.id });
                }
            });
        } catch (e) {
            console.error('Failed to handle notification click:', e);
        } finally {
            chrome.notifications.clear(notificationId);
        }
    }
});

// Notification button click handler
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
    if (notificationId.startsWith('reminder_')) {
        try {
            const alarmName = notificationId.replace('reminder_', '');

            if (buttonIndex === 0) {
                // Primary button: If Google event with Meet link, open it; otherwise open SideTimeTable
                if (alarmName.startsWith(AlarmManager.GOOGLE_ALARM_PREFIX)) {
                    const eventData = await AlarmManager.getGoogleEventData(alarmName);
                    const urlToOpen = eventData?.hangoutLink || eventData?.htmlLink;
                    if (urlToOpen) {
                        await chrome.tabs.create({ url: urlToOpen, active: true });
                    } else {
                        chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
                            if (activeTab) {
                                chrome.sidePanel.open({ tabId: activeTab.id });
                            }
                        });
                    }
                } else {
                    // Local events: open side panel
                    chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
                        if (activeTab) {
                            chrome.sidePanel.open({ tabId: activeTab.id });
                        }
                    });
                }
            }
        } catch (e) {
            console.error('Failed to handle notification button click:', e);
        } finally {
            // Clear the notification regardless of which button was clicked
            chrome.notifications.clear(notificationId);
        }
    }
});

/**
 * Set up daily alarm for Google event reminder sync
 */
async function setupDailyReminderSync() {
    try {
        // Clear existing daily sync alarm
        await chrome.alarms.clear('daily_reminder_sync');

        // Calculate next midnight
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);

        // Create alarm for midnight (00:00) every day
        await chrome.alarms.create('daily_reminder_sync', {
            when: tomorrow.getTime(),
            periodInMinutes: 24 * 60 // Repeat every 24 hours
        });

        console.log('Daily reminder sync alarm set for:', tomorrow);
    } catch (error) {
        console.error('Failed to setup daily reminder sync:', error);
    }
}

/**
 * Sync all event reminders (local and Google)
 */
async function syncAllReminders() {
    await Promise.all([
        syncLocalEventReminders(),
        syncGoogleEventReminders()
    ]);
}

/**
 * Sync local event reminders for today
 */
async function syncLocalEventReminders() {
    try {
        console.log('[Reminder Sync] Starting local event reminder sync...');

        // Get today's date
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // Set reminders for all local events today
        await AlarmManager.setDateReminders(dateStr);
        console.log(`[Reminder Sync] ✓ Synced local event reminders for ${dateStr}`);
    } catch (error) {
        console.error('[Reminder Sync] Failed to sync local event reminders:', error);
    }
}

/**
 * Sync Google event reminders for today
 */
async function syncGoogleEventReminders() {
    try {
        console.log('[Reminder Sync] Starting Google event reminder sync...');

        // Check if Google event reminders are enabled
        const settings = await StorageHelper.get(['googleEventReminder', 'googleIntegrated', 'reminderMinutes'], {
            googleEventReminder: false,
            googleIntegrated: false,
            reminderMinutes: 5
        });

        console.log('[Reminder Sync] Settings:', settings);

        if (!settings.googleEventReminder) {
            console.log('[Reminder Sync] Google event reminders are DISABLED in settings');
            return;
        }

        if (!settings.googleIntegrated) {
            console.log('[Reminder Sync] Google is NOT INTEGRATED');
            return;
        }

        // Get today's date
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        console.log('[Reminder Sync] Target date:', dateStr);

        // Clear old reminders from previous dates
        console.log('[Reminder Sync] Clearing old reminders from previous dates...');
        const allAlarms = await chrome.alarms.getAll();
        const oldReminders = allAlarms.filter(alarm =>
            alarm.name.startsWith(AlarmManager.GOOGLE_ALARM_PREFIX) &&
            !alarm.name.includes(`${AlarmManager.GOOGLE_ALARM_PREFIX}${dateStr}_`)
        );

        for (const alarm of oldReminders) {
            await chrome.alarms.clear(alarm.name);
            // Also clear stored event data
            const storageKey = `googleEventData_${alarm.name}`;
            await chrome.storage.local.remove(storageKey);
        }

        if (oldReminders.length > 0) {
            console.log(`[Reminder Sync] Cleared ${oldReminders.length} old reminders from previous dates`);
        }

        // Fetch today's Google events from PRIMARY calendar only
        console.log('[Reminder Sync] Fetching Google events from PRIMARY calendar only...');
        const events = await getPrimaryCalendarEvents(today);
        console.log('[Reminder Sync] Fetched events:', events ? events.length : 0);

        if (events && events.length > 0) {
            console.log('[Reminder Sync] Event list:', events.map(e => ({
                id: e.id,
                summary: e.summary,
                start: e.start?.dateTime || e.start?.date,
                hasDateTime: !!e.start?.dateTime
            })));

            // Set reminders for all events
            await AlarmManager.setGoogleEventReminders(events, dateStr);
            console.log(`[Reminder Sync] ✓ Synced ${events.length} Google event reminders for ${dateStr}`);
        } else {
            console.log('[Reminder Sync] No Google events found for today');
        }

        // Record sync timestamp
        await StorageHelper.setLocal({ lastReminderSyncTime: Date.now() });
    } catch (error) {
        console.error('[Reminder Sync] ERROR:', error);
        console.error('[Reminder Sync] Stack trace:', error.stack);
    }
}
