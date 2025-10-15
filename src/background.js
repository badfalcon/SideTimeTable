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
chrome.runtime.onInstalled.addListener(() => {
    // Add initial setup as needed
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

                    let calendarsPromise;

                    if (selectedCalendarIds.length === 0) {
                        // If no calendars are selected, use the calendars set to display in Google Calendar
                        const calendarListUrl = `https://www.googleapis.com/calendar/v3/users/me/calendarList`;

                        calendarsPromise = fetch(calendarListUrl, {
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
                        .then(listData => {
                            const allCalendars = listData.items || [];
                            const selectedCalendars = allCalendars.filter(cal => cal.selected);
                            const accessibleCalendars = selectedCalendars.filter(cal => cal.accessRole && cal.accessRole !== 'none');

                            // Always include the primary calendar
                            const calendarsToReturn = [...accessibleCalendars];
                            const primaryCalendar = allCalendars.find(cal => cal.primary);

                            // Ensure the primary calendar is included regardless of the selected flag
                            if (primaryCalendar && !calendarsToReturn.some(cal => cal.id === primaryCalendar.id)) {
                                calendarsToReturn.unshift(primaryCalendar);
                            }

                            if (calendarsToReturn.length === 0) {
                                return [ { id: 'primary' } ];
                            }

                            return calendarsToReturn.map(c => ({ id: c.id }));
                        });
                    } else {
                        // Use the selected calendars
                        calendarsPromise = Promise.resolve(selectedCalendarIds.map(id => ({ id })));
                    }

                    calendarsPromise
                .then(calendarsToFetch => {

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


                    return Promise.all(fetches);
                })
                .then(async (resultsPerCalendar) => {
                    // Get the calendar information and add the color information to the events
                    try {
                        const calendarListUrl = `https://www.googleapis.com/calendar/v3/users/me/calendarList`;
                        const calendarResponse = await fetch(calendarListUrl, {
                            headers: { Authorization: "Bearer " + token }
                        });
                        
                        let calendarColors = {};
                        if (calendarResponse.ok) {
                            const calendarData = await calendarResponse.json();
                            calendarData.items?.forEach(cal => {
                                calendarColors[cal.id] = {
                                    backgroundColor: cal.backgroundColor,
                                    foregroundColor: cal.foregroundColor,
                                    summary: cal.summary
                                };
                            });
                        }
                        
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
            
        case "checkAuth":
            checkGoogleAuth()
                .then(isAuthenticated => sendResponse({isAuthenticated}))
                .catch(error => {
                                    const detail = (error && (error.message || error.toString())) || "Authentication check error";
                                    console.error("Authentication check error details:", error);
                                    sendResponse({ error: detail, errorType: (error && error.name) || undefined });
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
                    .then(() => {
                        sendResponse({ success: true, token: token });
                    })
                    .catch((error) => {
                        console.error("Calendar list initialization error:", error);
                        // Still return success as authentication worked
                        sendResponse({ success: true, token: token });
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
            
        default:
            console.warn("Unknown action:", request.action);
            sendResponse({error: "Unknown action"});
            return false; // Synchronous response
    }
});

// Alarm listener for event reminders
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name.startsWith(AlarmManager.ALARM_PREFIX)) {
        await AlarmManager.showReminderNotification(alarm.name);
    }
});

// Notification click handler
chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId.startsWith('reminder_')) {
        // Open the side panel when the notification is clicked
        chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
            if (activeTab) {
                chrome.sidePanel.open({ tabId: activeTab.id });
            }
        });

        // Clear the notification
        chrome.notifications.clear(notificationId);
    }
});

// Notification button click handler
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (notificationId.startsWith('reminder_')) {
        if (buttonIndex === 0) {
            // The "Open SideTimeTable" button clicked
            chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
                if (activeTab) {
                    chrome.sidePanel.open({ tabId: activeTab.id });
                }
            });
        }

        // Clear the notification regardless of which button was clicked
        chrome.notifications.clear(notificationId);
    }
});
