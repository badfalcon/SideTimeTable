/**
 * SideTimeTable - Demo Data
 *
 * Mock event data for sample images
 */

/**
 * Get locale-compatible message
 * @param {string} key - Message key
 * @returns {Promise<string>} Localized message
 */
async function getLocalizedMessage(key) {
    try {
        // Get current locale setting
        const locale = await window.getCurrentLocale();
        
        // Determine message file path
        const messageFiles = {
            'en': '_locales/en/messages.json',
            'ja': '_locales/ja/messages.json'
        };
        
        if (messageFiles[locale]) {
            const messagesUrl = chrome.runtime.getURL(messageFiles[locale]);
            const response = await fetch(messagesUrl);
            const messages = await response.json();
            
            return messages[key]?.message || key;
        }
    } catch (error) {
        console.warn('Localized message acquisition error:', error);
    }
    
    // Fallback
    return await getLocalizedMessage(key) || key;
}

/**
 * Demo Google Calendar event data
 * @returns {Promise<Array>} Promise that returns array of demo events
 */
export async function getDemoEvents() {
    const today = new Date();
    // Generate events with today's date
    const events = [
        {
            id: 'demo-1',
            summary: await getLocalizedMessage('demo_event_summary_morning_meeting'),
            description: await getLocalizedMessage('demo_event_description_morning_meeting'),
            location: await getLocalizedMessage('demo_event_location_meeting_room_a'),
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0).toISOString()
            },
            eventType: 'default',
            calendarId: 'primary',
            calendarName: await getLocalizedMessage('demo_event_calendar_main'),
            calendarBackgroundColor: '#3F51B5',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-1',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo1'
        },
        {
            id: 'demo-2',
            summary: await getLocalizedMessage('demo_event_summary_project_work'),
            description: await getLocalizedMessage('demo_event_description_project_work'),
            location: '',
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 30).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0).toISOString()
            },
            eventType: 'default',
            calendarId: 'work@example.com',
            calendarName: await getLocalizedMessage('demo_event_calendar_work'),
            calendarBackgroundColor: '#4CAF50',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo2'
        },
        {
            id: 'demo-3',
            summary: await getLocalizedMessage('demo_event_summary_lunch_meeting'),
            description: await getLocalizedMessage('demo_event_description_lunch_meeting'),
            location: await getLocalizedMessage('demo_event_location_restaurant_xyz'),
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 30).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 30).toISOString()
            },
            eventType: 'default',
            calendarId: 'business@example.com',
            calendarName: await getLocalizedMessage('demo_event_calendar_business'),
            calendarBackgroundColor: '#FF9800',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo3'
        },
        {
            id: 'demo-4',
            summary: await getLocalizedMessage('demo_event_summary_short_call'),
            description: await getLocalizedMessage('demo_event_description_short_call'),
            location: '',
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 15).toISOString()
            },
            eventType: 'default',
            calendarId: 'primary',
            calendarName: await getLocalizedMessage('demo_event_calendar_main'),
            calendarBackgroundColor: '#3F51B5',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-2',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo4'
        },
        {
            id: 'demo-5',
            summary: await getLocalizedMessage('demo_event_summary_design_review'),
            description: await getLocalizedMessage('demo_event_description_design_review'),
            location: await getLocalizedMessage('demo_event_location_online'),
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 30).toISOString()
            },
            eventType: 'default',
            calendarId: 'work@example.com',
            calendarName: await getLocalizedMessage('demo_event_calendar_work'),
            calendarBackgroundColor: '#4CAF50',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-3',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo5'
        },
        {
            id: 'demo-6',
            summary: await getLocalizedMessage('demo_event_summary_overlap_a'),
            description: await getLocalizedMessage('demo_event_description_overlap_a'),
            location: await getLocalizedMessage('demo_event_location_meeting_room_b'),
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 30).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 30).toISOString()
            },
            eventType: 'default',
            calendarId: 'test@example.com',
            calendarName: await getLocalizedMessage('demo_event_calendar_test'),
            calendarBackgroundColor: '#E91E63',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo6'
        },
        {
            id: 'demo-7',
            summary: await getLocalizedMessage('demo_event_summary_overlap_b'),
            description: await getLocalizedMessage('demo_event_description_overlap_b'),
            location: await getLocalizedMessage('demo_event_location_online'),
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 45).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 45).toISOString()
            },
            eventType: 'default',
            calendarId: 'personal@example.com',
            calendarName: await getLocalizedMessage('demo_event_calendar_private'),
            calendarBackgroundColor: '#9C27B0',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-4',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo7'
        },
        {
            id: 'demo-9',
            summary: await getLocalizedMessage('demo_event_summary_overlap_c'),
            description: await getLocalizedMessage('demo_event_description_overlap_c'),
            location: '',
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0).toISOString()
            },
            eventType: 'default',
            calendarId: 'overlap1@example.com',
            calendarName: await getLocalizedMessage('demo_event_calendar_overlap1'),
            calendarBackgroundColor: '#FF5722',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo9'
        },
        {
            id: 'demo-10',
            summary: await getLocalizedMessage('demo_event_summary_overlap_d'),
            description: await getLocalizedMessage('demo_event_description_overlap_d'),
            location: await getLocalizedMessage('demo_event_location_cafe'),
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 15).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 15).toISOString()
            },
            eventType: 'default',
            calendarId: 'overlap2@example.com',
            calendarName: await getLocalizedMessage('demo_event_calendar_overlap2'),
            calendarBackgroundColor: '#607D8B',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo10'
        },
        {
            id: 'demo-11',
            summary: await getLocalizedMessage('demo_event_summary_morning_overlap_a'),
            description: await getLocalizedMessage('demo_event_description_morning_overlap_a'),
            location: await getLocalizedMessage('demo_event_location_online'),
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 45).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 30).toISOString()
            },
            eventType: 'default',
            calendarId: 'morning1@example.com',
            calendarName: await getLocalizedMessage('demo_event_calendar_morning1'),
            calendarBackgroundColor: '#00BCD4',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-5',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo11'
        },
        {
            id: 'demo-12',
            summary: await getLocalizedMessage('demo_event_summary_morning_overlap_b'),
            description: await getLocalizedMessage('demo_event_description_morning_overlap_b'),
            location: await getLocalizedMessage('demo_event_location_meeting_room_c'),
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 45).toISOString()
            },
            eventType: 'default',
            calendarId: 'morning2@example.com',
            calendarName: await getLocalizedMessage('demo_event_calendar_morning2'),
            calendarBackgroundColor: '#8BC34A',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo12'
        },
        {
            id: 'demo-13',
            summary: await getLocalizedMessage('demo_event_summary_morning_overlap_c'),
            description: await getLocalizedMessage('demo_event_description_morning_overlap_c'),
            location: '',
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 15).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 30).toISOString()
            },
            eventType: 'default',
            calendarId: 'morning3@example.com',
            calendarName: await getLocalizedMessage('demo_event_calendar_morning3'),
            calendarBackgroundColor: '#FFC107',
            calendarForegroundColor: '#000000',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo13'
        },
        {
            id: 'demo-8',
            summary: await getLocalizedMessage('demo_event_summary_evening_review'),
            description: await getLocalizedMessage('demo_event_description_evening_review'),
            location: '',
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 30).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 19, 0).toISOString()
            },
            eventType: 'default',
            calendarId: 'primary',
            calendarName: await getLocalizedMessage('demo_event_calendar_main'),
            calendarBackgroundColor: '#3F51B5',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo8'
        }
    ];
    return events;
}

/**
 * Demo local event data
 * @returns {Promise<Array>} Promise that returns array of demo local events
 */
export async function getDemoLocalEvents() {
    return [
        {
            id: 'demo_local_1',
            title: await getLocalizedMessage('demo_local_event_title_morning_routine'),
            startTime: '08:00',
            endTime: '08:30',
            reminder: true
        },
        {
            id: 'demo_local_2',
            title: await getLocalizedMessage('demo_local_event_title_focus_time'),
            startTime: '13:45',
            endTime: '14:45',
            reminder: false
        },
        {
            id: 'demo_local_3',
            title: await getLocalizedMessage('demo_local_event_title_exercise'),
            startTime: '16:45',
            endTime: '17:15',
            reminder: true
        },
        {
            id: 'demo_local_4',
            title: await getLocalizedMessage('demo_local_event_title_reading_time'),
            startTime: '20:00',
            endTime: '21:00',
            reminder: false
        }
    ];
}

/**
 * Determine if in demo mode
 * @returns {boolean} true if in demo mode
 */
export function isDemoMode() {
    // Determine demo mode from URL parameters or settings
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('demo') === 'true' || localStorage.getItem('sideTimeTableDemo') === 'true';
}

/**
 * Enable/disable demo mode
 * @param {boolean} enabled - Whether to enable demo mode
 */
export function setDemoMode(enabled) {
    if (enabled) {
        localStorage.setItem('sideTimeTableDemo', 'true');
    } else {
        localStorage.removeItem('sideTimeTableDemo');
    }
}