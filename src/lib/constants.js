/**
 * SideTimeTable - Centralized Constants
 *
 * All shared constants used throughout the extension are defined here.
 * Import only what you need from this module.
 */

// Time-related constants
export const TIME_CONSTANTS = {
    HOUR_MILLIS: 3600000,
    MINUTE_MILLIS: 60000,
    UNIT_HEIGHT: 60,
    DEFAULT_OPEN_HOUR: '09:00',
    DEFAULT_CLOSE_HOUR: '18:00',
    DEFAULT_BREAK_START: '12:00',
    DEFAULT_BREAK_END: '13:00'
};

// Recurrence type constants
export const RECURRENCE_TYPES = {
    NONE: 'none',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    WEEKDAYS: 'weekdays'
};

// Storage key constants
export const STORAGE_KEYS = {
    RECURRING_EVENTS: 'recurringEvents',
    LOCAL_EVENTS_PREFIX: 'localEvents_'
};

// Default settings
export const DEFAULT_SETTINGS = {
    googleIntegrated: false,
    openTime: TIME_CONSTANTS.DEFAULT_OPEN_HOUR,
    closeTime: TIME_CONSTANTS.DEFAULT_CLOSE_HOUR,
    workTimeColor: '#d4d4d4',
    breakTimeFixed: false,
    breakTimeStart: TIME_CONSTANTS.DEFAULT_BREAK_START,
    breakTimeEnd: TIME_CONSTANTS.DEFAULT_BREAK_END,
    localEventColor: '#bbf2b1',
    currentTimeLineColor: '#ff0000',
    selectedCalendars: [],
    language: 'auto',
    googleEventReminder: false,
    reminderMinutes: 5
};

// Event styling constants
export const EVENT_STYLING = {
    DURATION_THRESHOLDS: {
        MICRO: 15,
        COMPACT: 30
    },
    HEIGHT: {
        MIN_HEIGHT: 10,
        PADDING_OFFSET: 10
    },
    CSS_CLASSES: {
        MICRO: 'micro',
        COMPACT: 'compact'
    },
    DEFAULT_VALUES: {
        ZERO_DURATION_MINUTES: 15,
        INITIAL_WIDTH: 200,
        INITIAL_LEFT_OFFSET: 40
    }
};

// Layout constants for EventLayoutManager
export const LAYOUT_CONSTANTS = {
    BASE_LEFT: 40,
    GAP: 5,
    RESERVED_SPACE_MARGIN: 25,
    MIN_WIDTH: 100,
    DEFAULT_WIDTH: 200,
    MIN_CONTENT_WIDTH: 20,
    MIN_GAP: 2,
    MIN_DISPLAY_WIDTH: 40,
    Z_INDEX: 5,
    PADDING: {
        BASIC: 10,
        COMPACT: 8,
        MICRO: 6
    },
    LANE_THRESHOLDS: {
        COMPACT: 2,
        MICRO: 4
    }
};

// DOM element IDs used across the application
export const DOM_IDS = {
    SIDE_PANEL_CONTAINER: 'side-panel-container',
    HEADER_WRAPPER: 'sideTimeTableHeaderWrapper',
    TIMETABLE: 'sideTimeTable',
    TIMETABLE_BASE: 'sideTimeTableBase',
    CURRENT_TIME_LINE: 'currentTimeLine',
    TIME_LIST: 'time-list',
    LOCAL_EVENT_DIALOG: 'localEventDialog',
    GOOGLE_EVENT_DIALOG: 'googleEventDialog',
    ALERT_MODAL: 'alertModal'
};
