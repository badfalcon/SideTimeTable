/**
 * SideTimeTable - Background Script
 *
 * This file runs in the background of the Chrome extension,
 * managing side panel settings and Google Calendar integration.
 */

import { StorageHelper } from './lib/storage-helper.js';
import { AlarmManager } from './lib/alarm-manager.js';
import { selectNotificationUrl } from './lib/conference-url-utils.js';
import { GoogleCalendarClient, AuthenticationError } from './services/google-calendar-client.js';
import { ReminderSyncService } from './services/reminder-sync-service.js';
import { logError, logWarn } from './lib/utils.js';

// Instantiate services
const calendarClient = new GoogleCalendarClient();
const reminderSync = new ReminderSyncService(calendarClient);

// Side panel configuration - opens when clicking the action toolbar icon
chrome.sidePanel
    .setPanelBehavior({openPanelOnActionClick: true})
    .catch((error) => logError('Side panel setup', error));

// Handler for when the extension is installed
chrome.runtime.onInstalled.addListener(async () => {
    // Set up daily alarm for Google event reminder sync (runs at 00:00 every day)
    await reminderSync.setupDailySync();

    // Set up recurring intra-day sync so events added/changed during the day
    // still get reminders without needing the side panel to be opened.
    await reminderSync.setupPeriodicSync();

    // Initial sync on install
    await reminderSync.syncAll();

    // Create context menu for "Changelog"
    // removeAll first: onInstalled also fires on update, where the menu already
    // exists and re-creating the same id would throw a "duplicate id" error.
    if (chrome.contextMenus) {
        chrome.contextMenus.removeAll(() => {
            chrome.contextMenus.create({
                id: 'changelog',
                title: chrome.i18n.getMessage('changelogContextMenu') || 'Changelog',
                contexts: ['action']
            });
        });
    }
});

// Context menu click handler
if (chrome.contextMenus) {
    chrome.contextMenus.onClicked.addListener((info) => {
        if (info.menuItemId === 'changelog') {
            const changelogUrl = chrome.runtime.getURL('src/changelog/changelog.html');
            chrome.tabs.create({ url: changelogUrl });
        }
    });
}

// Handler for when the browser/profile starts
chrome.runtime.onStartup.addListener(async () => {
    // Defensively re-create the sync alarms in case they were lost (alarms do
    // not always survive across restarts / crashes), then sync immediately.
    await reminderSync.setupDailySync();
    await reminderSync.setupPeriodicSync();

    // Sync reminders on startup
    await reminderSync.syncAll();
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
                        logError('Keyboard shortcut handler', 'Active tab not found');
                    }
                });
                break;

            default:
                logWarn('Keyboard shortcut handler', `Unknown command: ${command}`);
                break;
        }
    });
} else {
    logWarn('Keyboard shortcut handler', 'chrome.commands API is not available. Please check the commands configuration in manifest.json.');
}

/**
 * Build a standardized error response for calendar API failures.
 * @param {Error} error - The caught error
 * @param {string} requestId - Optional request ID for correlation
 * @returns {Object} Error response object
 */
function buildCalendarErrorResponse(error, requestId) {
    const detail = (error && (error.message || error.toString())) || 'Unknown error';
    return {
        error: detail,
        errorType: (error && error.name) || undefined,
        authExpired: error instanceof AuthenticationError,
        requestId
    };
}

/**
 * Error response for event write operations (insert/patch/delete).
 * Unlike reads, a 403 on a write usually means permission denied on that
 * specific event (e.g. forbiddenForNonOrganizer) — NOT an expired grant —
 * so it must not trigger the re-authentication banner.
 * @param {Error} error - The caught error (may carry a `status` from _checkResponse)
 * @param {string} requestId - Optional request ID for correlation
 * @returns {Object} Error response object with success: false
 */
function buildWriteErrorResponse(error, requestId) {
    const response = { ...buildCalendarErrorResponse(error, requestId), success: false };
    if (error && error.status === 403) {
        response.authExpired = false;
    }
    return response;
}

/**
 * Validate the shape of an event-write request before touching the API.
 * The UI always sends well-formed requests; this guards the message surface.
 * @param {Object} request
 * @param {boolean} [needsEventId=false]
 * @param {boolean} [needsEvent=false]
 * @returns {string|null} An error string, or null when valid
 */
function validateWriteRequest(request, needsEventId = false, needsEvent = false) {
    if (request.calendarId !== undefined && request.calendarId !== null && typeof request.calendarId !== 'string') {
        return 'Invalid calendarId';
    }
    if (needsEventId && typeof request.eventId !== 'string') {
        return 'Invalid eventId';
    }
    if (needsEvent && (typeof request.event !== 'object' || request.event === null || Array.isArray(request.event))) {
        return 'Invalid event';
    }
    return null;
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    switch (request.action) {
        case "getEvents": {
            const targetDate = request.targetDate ? new Date(request.targetDate) : null;
            const requestId = request.requestId;
            calendarClient.getCalendarEvents(targetDate)
                .then(events => sendResponse({events, requestId}))
                .catch(error => {
                    if (error instanceof AuthenticationError) {
                        logWarn('Event acquisition', 'auth expired');
                    } else {
                        logError('Event acquisition', error);
                    }
                    sendResponse(buildCalendarErrorResponse(error, requestId));
                });
            return true; // Indicates async response
        }

        case "getEventsForCalendars": {
            const targetDate = request.targetDate ? new Date(request.targetDate) : null;
            const requestId = request.requestId;
            const calendarIds = request.calendarIds || [];
            calendarClient.getCalendarEventsForIds(targetDate, calendarIds)
                .then(events => sendResponse({ events, requestId }))
                .catch(error => {
                    sendResponse(buildCalendarErrorResponse(error, requestId));
                });
            return true;
        }

        case "getCalendarList": {
            const reqIdList = request.requestId;
            calendarClient.getCalendarList()
                .then(calendars => sendResponse({calendars, requestId: reqIdList}))
                .catch(error => {
                    if (error instanceof AuthenticationError) {
                        logWarn('Calendar list acquisition', 'auth expired');
                    } else {
                        logError('Calendar list acquisition', error);
                    }
                    sendResponse(buildCalendarErrorResponse(error, reqIdList));
                });
            return true; // Indicates async response
        }

        case "checkGoogleAuth":
            calendarClient.checkAuth()
                .then(isAuthenticated => {
                    sendResponse({authenticated: isAuthenticated});
                })
                .catch(error => {
                    logWarn('Authentication check', error.message);
                    sendResponse(buildCalendarErrorResponse(error));
                });
            return true; // Indicates async response

        case "authenticateGoogle":
            // Execute the Google authentication
            chrome.identity.getAuthToken({interactive: true}, (token) => {
                if (chrome.runtime.lastError || !token) {
                    const error = chrome.runtime.lastError || new Error("Authentication failed");
                    logError('Google authentication', error);
                    sendResponse({ success: false, error: error.message });
                    return;
                }

                // After successful authentication, fetch calendar list to set up primary calendar
                calendarClient.getCalendarList()
                    .then(async () => {
                        // After authentication and calendar list fetch, sync reminders
                        await reminderSync.syncAll();
                        sendResponse({ success: true });
                    })
                    .catch((error) => {
                        logError('Calendar list initialization', error);
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
                        logError('Token removal', chrome.runtime.lastError);
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
        case "calendarSelectionChanged":
            // These messages are handled by the side panel; just acknowledge
            sendResponse({success: true});
            return false; // Synchronous response

        case "updateReminderSettings":
            // Handle reminder settings update. Force-recreate the periodic sync
            // alarm so a changed sync interval takes effect immediately, then sync.
            reminderSync.setupPeriodicSync({ force: true })
                .then(() => reminderSync.syncGoogleEventReminders())
                .then(() => {
                    sendResponse({ success: true });
                })
                .catch(error => {
                    logError('Reminder settings update', error);
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
                    logError('Test notification send', error);
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
                    logError('Alarm debug info', error);
                    sendResponse({ success: false, error: error.message });
                }
            })();
            return true; // Indicates async response

        case "forceSyncReminders":
            // Force sync reminders immediately (for testing)
            reminderSync.syncAll()
                .then(() => {
                    sendResponse({ success: true, message: 'Reminder sync completed' });
                })
                .catch(error => {
                    logError('Force sync reminders', error);
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
                        sendResponse({ success: true, skipped: true, message: 'Skipped (recently synced)' });
                    } else {
                        await reminderSync.syncAll();
                        sendResponse({ success: true, skipped: false, message: 'Reminder sync completed' });
                    }
                } catch (error) {
                    logError('Auto sync reminders', error);
                    sendResponse({ success: false, error: error.message });
                }
            })();
            return true; // Indicates async response

        case "respondToEvent":
            // Respond to a Google Calendar event (accept/decline/tentative)
            (async () => {
                try {
                    const { calendarId, eventId, response: rsvpResponse } = request;
                    const updatedEvent = await calendarClient.respondToEvent(calendarId, eventId, rsvpResponse);
                    sendResponse({ success: true, event: updatedEvent });
                } catch (error) {
                    logError('Event response', error);
                    sendResponse({ success: false, error: error.message });
                }
            })();
            return true; // Indicates async response

        case "createEvent":
            // Create a new event on a Google Calendar
            (async () => {
                const invalid = validateWriteRequest(request, false, true);
                if (invalid) {
                    sendResponse({ success: false, error: invalid });
                    return;
                }
                try {
                    const { calendarId, event } = request;
                    const createdEvent = await calendarClient.createEvent(calendarId, event);
                    // Ensure the new event gets a reminder alarm if reminders are enabled
                    reminderSync.syncAll().catch(() => {});
                    sendResponse({ success: true, event: createdEvent });
                } catch (error) {
                    if (error instanceof AuthenticationError) {
                        logWarn('Event creation', 'auth error');
                    } else {
                        logError('Event creation', error);
                    }
                    sendResponse(buildWriteErrorResponse(error, request.requestId));
                }
            })();
            return true; // Indicates async response

        case "updateEvent":
            // Partially update an event on a Google Calendar (events.patch)
            (async () => {
                const invalid = validateWriteRequest(request, true, true);
                if (invalid) {
                    sendResponse({ success: false, error: invalid });
                    return;
                }
                try {
                    const { calendarId, eventId, event } = request;
                    const updatedEvent = await calendarClient.patchEvent(calendarId, eventId, event);
                    // The reminder lead time may have changed — resync alarms
                    reminderSync.syncAll().catch(() => {});
                    sendResponse({ success: true, event: updatedEvent });
                } catch (error) {
                    if (error instanceof AuthenticationError) {
                        logWarn('Event update', 'auth error');
                    } else {
                        logError('Event update', error);
                    }
                    sendResponse(buildWriteErrorResponse(error, request.requestId));
                }
            })();
            return true; // Indicates async response

        case "deleteEvent":
            // Delete an event from a Google Calendar (events.delete)
            (async () => {
                const invalid = validateWriteRequest(request, true, false);
                if (invalid) {
                    sendResponse({ success: false, error: invalid });
                    return;
                }
                try {
                    const { calendarId, eventId } = request;
                    await calendarClient.deleteEvent(calendarId, eventId);
                    // Clear any reminder alarm still scheduled for the deleted event
                    reminderSync.syncAll().catch(() => {});
                    sendResponse({ success: true });
                } catch (error) {
                    if (error instanceof AuthenticationError) {
                        logWarn('Event deletion', 'auth error');
                    } else {
                        logError('Event deletion', error);
                    }
                    sendResponse(buildWriteErrorResponse(error, request.requestId));
                }
            })();
            return true; // Indicates async response

        default:
            logWarn('Message handler', `Unknown action: ${request.action}`);
            sendResponse({error: "Unknown action"});
            return false; // Synchronous response
    }
});

// Alarm listener for event reminders and periodic sync
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'daily_reminder_sync' || alarm.name === 'periodic_reminder_sync') {
        await reminderSync.syncAll();
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
            logError('Notification click', e);
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
                    const urlToOpen = selectNotificationUrl(eventData);
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
            logError('Notification button click', e);
        } finally {
            // Clear the notification regardless of which button was clicked
            chrome.notifications.clear(notificationId);
        }
    }
});
