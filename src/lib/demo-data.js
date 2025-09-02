/**
 * SideTimeTable - デモデータ
 * 
 * サンプル画像用のモックイベントデータ
 */

/**
 * デモ用のGoogleカレンダーイベントデータ
 * @returns {Array} デモイベントの配列
 */
export function getDemoEvents() {
    const today = new Date();
    // 今日の日付でイベントを生成
    const events = [
        {
            id: 'demo-1',
            summary: chrome.i18n.getMessage('demo_event_summary_morning_meeting'),
            description: chrome.i18n.getMessage('demo_event_description_morning_meeting'),
            location: chrome.i18n.getMessage('demo_event_location_meeting_room_a'),
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0).toISOString()
            },
            eventType: 'default',
            calendarId: 'primary',
            calendarName: chrome.i18n.getMessage('demo_event_calendar_main'),
            calendarBackgroundColor: '#3F51B5',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-1',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo1'
        },
        {
            id: 'demo-2',
            summary: chrome.i18n.getMessage('demo_event_summary_project_work'),
            description: chrome.i18n.getMessage('demo_event_description_project_work'),
            location: '',
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 30).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0).toISOString()
            },
            eventType: 'default',
            calendarId: 'work@example.com',
            calendarName: chrome.i18n.getMessage('demo_event_calendar_work'),
            calendarBackgroundColor: '#4CAF50',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo2'
        },
        {
            id: 'demo-3',
            summary: chrome.i18n.getMessage('demo_event_summary_lunch_meeting'),
            description: chrome.i18n.getMessage('demo_event_description_lunch_meeting'),
            location: chrome.i18n.getMessage('demo_event_location_restaurant_xyz'),
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 30).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 30).toISOString()
            },
            eventType: 'default',
            calendarId: 'business@example.com',
            calendarName: chrome.i18n.getMessage('demo_event_calendar_business'),
            calendarBackgroundColor: '#FF9800',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo3'
        },
        {
            id: 'demo-4',
            summary: chrome.i18n.getMessage('demo_event_summary_short_call'),
            description: chrome.i18n.getMessage('demo_event_description_short_call'),
            location: '',
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 15).toISOString()
            },
            eventType: 'default',
            calendarId: 'primary',
            calendarName: chrome.i18n.getMessage('demo_event_calendar_main'),
            calendarBackgroundColor: '#3F51B5',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-2',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo4'
        },
        {
            id: 'demo-5',
            summary: chrome.i18n.getMessage('demo_event_summary_design_review'),
            description: chrome.i18n.getMessage('demo_event_description_design_review'),
            location: chrome.i18n.getMessage('demo_event_location_online'),
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 30).toISOString()
            },
            eventType: 'default',
            calendarId: 'work@example.com',
            calendarName: chrome.i18n.getMessage('demo_event_calendar_work'),
            calendarBackgroundColor: '#4CAF50',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-3',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo5'
        },
        {
            id: 'demo-6',
            summary: chrome.i18n.getMessage('demo_event_summary_overlap_a'),
            description: chrome.i18n.getMessage('demo_event_description_overlap_a'),
            location: chrome.i18n.getMessage('demo_event_location_meeting_room_b'),
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 30).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 30).toISOString()
            },
            eventType: 'default',
            calendarId: 'test@example.com',
            calendarName: chrome.i18n.getMessage('demo_event_calendar_test'),
            calendarBackgroundColor: '#E91E63',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo6'
        },
        {
            id: 'demo-7',
            summary: chrome.i18n.getMessage('demo_event_summary_overlap_b'),
            description: chrome.i18n.getMessage('demo_event_description_overlap_b'),
            location: chrome.i18n.getMessage('demo_event_location_online'),
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 45).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 45).toISOString()
            },
            eventType: 'default',
            calendarId: 'personal@example.com',
            calendarName: chrome.i18n.getMessage('demo_event_calendar_private'),
            calendarBackgroundColor: '#9C27B0',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-4',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo7'
        },
        {
            id: 'demo-9',
            summary: chrome.i18n.getMessage('demo_event_summary_overlap_c'),
            description: chrome.i18n.getMessage('demo_event_description_overlap_c'),
            location: '',
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0).toISOString()
            },
            eventType: 'default',
            calendarId: 'overlap1@example.com',
            calendarName: chrome.i18n.getMessage('demo_event_calendar_overlap1'),
            calendarBackgroundColor: '#FF5722',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo9'
        },
        {
            id: 'demo-10',
            summary: chrome.i18n.getMessage('demo_event_summary_overlap_d'),
            description: chrome.i18n.getMessage('demo_event_description_overlap_d'),
            location: chrome.i18n.getMessage('demo_event_location_cafe'),
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 15).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 15).toISOString()
            },
            eventType: 'default',
            calendarId: 'overlap2@example.com',
            calendarName: chrome.i18n.getMessage('demo_event_calendar_overlap2'),
            calendarBackgroundColor: '#607D8B',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo10'
        },
        {
            id: 'demo-11',
            summary: chrome.i18n.getMessage('demo_event_summary_morning_overlap_a'),
            description: chrome.i18n.getMessage('demo_event_description_morning_overlap_a'),
            location: chrome.i18n.getMessage('demo_event_location_online'),
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 45).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 30).toISOString()
            },
            eventType: 'default',
            calendarId: 'morning1@example.com',
            calendarName: chrome.i18n.getMessage('demo_event_calendar_morning1'),
            calendarBackgroundColor: '#00BCD4',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-5',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo11'
        },
        {
            id: 'demo-12',
            summary: chrome.i18n.getMessage('demo_event_summary_morning_overlap_b'),
            description: chrome.i18n.getMessage('demo_event_description_morning_overlap_b'),
            location: chrome.i18n.getMessage('demo_event_location_meeting_room_c'),
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 45).toISOString()
            },
            eventType: 'default',
            calendarId: 'morning2@example.com',
            calendarName: chrome.i18n.getMessage('demo_event_calendar_morning2'),
            calendarBackgroundColor: '#8BC34A',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo12'
        },
        {
            id: 'demo-13',
            summary: chrome.i18n.getMessage('demo_event_summary_morning_overlap_c'),
            description: chrome.i18n.getMessage('demo_event_description_morning_overlap_c'),
            location: '',
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 15).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 30).toISOString()
            },
            eventType: 'default',
            calendarId: 'morning3@example.com',
            calendarName: chrome.i18n.getMessage('demo_event_calendar_morning3'),
            calendarBackgroundColor: '#FFC107',
            calendarForegroundColor: '#000000',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo13'
        },
        {
            id: 'demo-8',
            summary: chrome.i18n.getMessage('demo_event_summary_evening_review'),
            description: chrome.i18n.getMessage('demo_event_description_evening_review'),
            location: '',
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 30).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 19, 0).toISOString()
            },
            eventType: 'default',
            calendarId: 'primary',
            calendarName: chrome.i18n.getMessage('demo_event_calendar_main'),
            calendarBackgroundColor: '#3F51B5',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo8'
        }
    ];
    return events;
}

/**
 * デモ用のローカルイベントデータ
 * @returns {Array} デモローカルイベントの配列
 */
export function getDemoLocalEvents() {
    return [
        {
            title: chrome.i18n.getMessage('demo_local_event_title_morning_routine'),
            startTime: '08:00',
            endTime: '08:30'
        },
        {
            title: chrome.i18n.getMessage('demo_local_event_title_focus_time'),
            startTime: '13:45',
            endTime: '14:45'
        },
        {
            title: chrome.i18n.getMessage('demo_local_event_title_exercise'),
            startTime: '16:45',
            endTime: '17:15'
        },
        {
            title: chrome.i18n.getMessage('demo_local_event_title_reading_time'),
            startTime: '20:00',
            endTime: '21:00'
        }
    ];
}

/**
 * デモモードかどうかを判定
 * @returns {boolean} デモモードの場合true
 */
export function isDemoMode() {
    // URLパラメータまたは設定でデモモードを判定
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('demo') === 'true' || localStorage.getItem('sideTimeTableDemo') === 'true';
}

/**
 * デモモードを有効/無効にする
 * @param {boolean} enabled - デモモードを有効にするかどうか
 */
export function setDemoMode(enabled) {
    if (enabled) {
        localStorage.setItem('sideTimeTableDemo', 'true');
    } else {
        localStorage.removeItem('sideTimeTableDemo');
    }
}