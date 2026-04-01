/**
 * SideTimeTable - Constants
 *
 * Shared constants used throughout the extension.
 */

// Time-related constants
export const TIME_CONSTANTS = {
    HOUR_MILLIS: 3600000,  // The milliseconds per hour
    MINUTE_MILLIS: 60000,  // The milliseconds per minute
    UNIT_HEIGHT: 60,       // The height per hour (pixels)
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
    timelineBackgroundColor: '#ffffff', // Timeline (body) background color
    panelBackgroundColor: '#ffffff', // Header and memo panel background color
    googleEventDefaultColor: '#fff0b8', // Default Google event color
    workTimeColor: '#e3e3e3',
    breakTimeFixed: false,
    breakTimeStart: TIME_CONSTANTS.DEFAULT_BREAK_START,
    breakTimeEnd: TIME_CONSTANTS.DEFAULT_BREAK_END,
    breakTimeColor: '#bcdcfb', // Break time background color
    localEventColor: '#bbf2b1',
    currentTimeLineColor: '#ff0000', // Current time line color
    selectedCalendars: [], // An array of the selected calendar IDs
    language: 'auto', // Language setting (auto/en/ja)
    googleEventReminder: false, // Automatic reminder for Google events
    reminderMinutes: 5, // Reminder time in minutes before event starts
    darkMode: false, // Dark mode theme (legacy, kept for migration)
    useGoogleCalendarColors: true, // Use per-calendar colors from Google Calendar API
    colorTheme: 'default', // Active colour-set ID (see color-themes.js)
    memoMarkdown: false, // Enable Markdown rendering in memo panel
    memoFontSize: 13, // Memo font size in px
    thinScrollbar: false // Use thin (narrow) scrollbar in side panel
};

// Mapping from color setting keys to CSS variable names
// Order determines the display order in the settings UI
export const COLOR_CSS_VARS = {
    // Timeline area
    timelineBackgroundColor: '--side-calendar-timeline-background-color',
    workTimeColor: '--side-calendar-work-time-color',
    breakTimeColor: '--side-calendar-break-time-color',
    // Header / memo area
    panelBackgroundColor: '--side-calendar-panel-background-color',
    // Event colors
    googleEventDefaultColor: '--side-calendar-google-event-default-color',
    localEventColor: '--side-calendar-local-event-color',
    // Indicator
    currentTimeLineColor: '--side-calendar-current-time-line-color'
};

// Valid sync storage keys (single source of truth for cleanup)
// When adding new sync storage keys, add them here to prevent cleanup from removing them.
export const VALID_SYNC_KEYS = new Set([
    ...Object.keys(DEFAULT_SETTINGS),
    STORAGE_KEYS.RECURRING_EVENTS,
    'lastSeenVersion',
    'initialSetupCompleted',
    'tutorialCompleted',
    'timeFormat',
    'calendarGroups'
]);

// Valid local storage keys (exact match)
// When adding new local storage keys, add them here to prevent cleanup from removing them.
export const VALID_LOCAL_KEYS = new Set([
    'memoContent',
    'memoCollapsed',
    'memoHeight',
    'lastReminderSyncTime',
    'reviewStats',
    'eventDataMigratedToLocal_v2',
    'enableDeveloperFeatures',
    'enableReminderDebug'
]);

// Valid local storage key patterns (for dynamic keys like localEvents_2025-03-21)
// Each regex must match the entire key.
export const VALID_LOCAL_KEY_PATTERNS = [
    new RegExp(`^${STORAGE_KEYS.LOCAL_EVENTS_PREFIX}\\d{4}-\\d{2}-\\d{2}$`)
];

// Background color keys that need a corresponding computed text color CSS variable
export const TEXT_COLOR_CSS_VARS = {
    timelineBackgroundColor: '--side-calendar-timeline-text-color',
    panelBackgroundColor: '--side-calendar-panel-text-color',
    googleEventDefaultColor: '--side-calendar-google-event-default-text-color',
    localEventColor: '--side-calendar-local-event-text-color'
};
