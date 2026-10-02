---
name: architecture
description: Detailed architecture and component reference for SideTimeTable Chrome extension
---
# SideTimeTable Architecture Detail

## Core Components

### Background Service Worker (`src/background.js`)
- Handles Google Calendar API integration and OAuth2 authentication
- Manages Chrome Identity API for token management
- Provides message-based communication with side panel
- Implements keyboard shortcut handling (Ctrl+Shift+S / Cmd+Shift+S)
- Functions: `getCalendarList()`, `getCalendarEvents()`, `checkGoogleAuth()`
- Manages alarm-based event reminders and notifications

### Side Panel (`src/side_panel/`)
Main UI displayed in Chrome's side panel:
- `side_panel.js`: Main controller with `SidePanelUIController` class managing initialization and coordination
- `time-manager.js`: Exports `EventLayoutManager` for sophisticated overlap resolution algorithms
- `event-handlers.js`: Exports `GoogleEventManager` and `LocalEventManager` for event data management
- `side_panel.html`: Main UI with modal dialogs and responsive design
- `side_panel.css`: Custom styling with CSS variables for theming
- `components/`: Modular component-based UI architecture
  - `timeline/timeline-component.js`: Main timeline display with integrated event layout
  - `timeline/timeline-calendar-filter.js` + `calendar-filter-renderer.js`: Calendar filter popover in the header — title with refresh, calendars as colour / name / checkbox, folding groups with a group checkbox, search box only for long lists (9+), "Manage calendars in Settings" link
  - `header/header-component.js`: Date navigation (the date label opens a month calendar from `lib/date-field.js`), add/sync/settings buttons, and the slot the calendar filter mounts into
  - `modals/`: Modal dialog components (Google events, local events, alerts, What's New, review)
    - `event-dialog-dom.js`: Shared DOM builders for the event dialogs (sticky header/footer, icon-led rows, segmented controls, buttons, inline delete confirmation, status line, time row with duration picker)
    - `delete-recurring-dialog.js`: "This event / All events" choice before deleting a recurring local event
    - `guest-field.js`: Guests on the Google create form — address box with suggestions, chips (invalid ones in red, each person's initial in a colour from their address — `guestTone()`), and the "email invitations" choice (`sendUpdates`)
  - `memo/memo-component.js`: Collapsible memo panel with persistent storage and resizable height; collapsed, it is a full-width bar showing the memo's first line (`memo-summary.js`)
  - `setup/initial-setup-component.js`: First-time user setup wizard
  - `tutorial/tutorial-component.js`: Interactive tutorial for new users
  - `base/component.js`: Base component class with lifecycle management
- `event-element-factory.js`: Factory for creating event DOM elements

> Side-panel service modules (date navigation, event loading, local events,
> onboarding, theme) live in the shared `src/services/` directory — see the
> Services section below.

### Options Page (`src/options/`)
Extension settings and calendar management, in the side panel's design language:
- `options.js`: Settings management with component-based architecture
- `options.html`: Header (app mark, title, version), the sections on the left (Integration / Display / General / Developer; tabs from `settings-tabs.js`, no Bootstrap) with tutorial, changelog and reset under them, and the cards on the right. At 760px or narrower the sections become the dialogs' segmented control and the extras move to the bottom
- `settings-tokens.css`: The page colours (`--settings-*`, light and `[data-theme="dark"]`) and the shape/type values, shared with the changelog page. The side panel's `--side-calendar-*` colours are rewritten at runtime when a theme is picked, so these pages keep their own
- `options.css`: Layout, cards, setting rows and controls (switch, select, buttons, notices), calendar list/groups, theme previews
- `components/`:
  - `base/settings-dom.js`: Shared builders — `createSettingRow()` (name and hint on the left, control on the right), `createSwitch()`, `createSelect()`, `createButton()`, `createIconButton()`, `createNotice()`
  - `base/card-component.js`: A card — single-colour icon, title, optional description, then the rows
  - `calendar/`: Google connection (Google's own sign-in button when not connected, "Disconnect" when connected) and calendar management (search, groups, assign popover, create-group dialog)
  - `settings/`: Time, color (theme cards with a small preview), language, shortcut, reminder, memo, scrollbar, What's New, and the developer tab cards (extension info, demo mode, reminder debug, storage viewer)

### Changelog Page (`src/changelog/`)
Standalone changelog page, in the options page's design:
- `changelog.js`: Renders each version as a row in one card — version chip (the newest marked "Latest"), the date in the language shown (`formatReleaseDate()` in `release-notes.js`), and what changed
- `changelog.html`: Header (app mark, title, subtitle) and the card
- `changelog.css`: Changelog page styling (colours from `../options/settings-tokens.css`)

### Services (`src/services/`)
All service modules live here in a single flat directory (background and side-panel scope alike):
- `google-calendar-client.js`: Google Calendar API client with multi-calendar support
- `reminder-sync-service.js`: Reminder synchronization service
- `date-navigation-service.js`: Current date state and navigation logic
- `event-loading-service.js`: Coordinates loading Google and local events (debounce, scroll positioning)
- `local-event-service.js`: CRUD operations for local and recurring events
- `onboarding-service.js`: First-launch tutorial, initial setup, and changelog flow
- `event-focus-service.js`: Scrolls to and highlights a single event (reminder notification click)
- `theme-service.js`: Applies color theme, dark mode, and scrollbar settings

### Utilities (`src/lib/`)
Shared functions and framework components:
- `utils.js`: Core utilities (`generateTimeList`, `loadSettings`, `logError`, event storage, recurring events)
- `time-utils.js`: Pure functions for time calculations (`calculateWorkHours`, `isToday`)
- `localize.js`: i18n helper functions with Chrome extension API integration
- `locale-utils.js`: Locale-aware date/time formatting (12h/24h format support); a plain script exposing `window.getCurrentLocale()` / `window.getTimeFormatPreference()` (loaded by the side panel and the settings page)
- `display-prefs.js`: The language and 12/24-hour choice times are written in (`getDisplayPrefs()` / `refreshDisplayPrefs()`), shared by the dialogs, the setup and the settings page
- `time-field.js`: Time field in the extension's language and 12/24-hour setting — a text box (`value` stays "HH:MM") that reads typed times ("930", "9:30pm", "午後3時") and opens a list of times every 15 minutes (a popover); replaces `<input type="time">`, which Chrome draws in its own language
- `date-field.js`: Date field and month calendar in the extension's language — a text box (`value` stays "YYYY-MM-DD", `min` greys out earlier days) that shows the date like the header ("10月31日(土)" / "Sat, Oct 31"), reads typed dates ("10/31", "2026-10-31", "10月31日", "Oct 31") and opens a month calendar (a popover); the calendar alone (`createDateCalendar()`) is what the header's date label opens. Replaces `<input type="date">`, which Chrome draws in its own language
- `demo-data.js`: Mock data system for development and screenshots
- `current-time-line-manager.js`: Dedicated current time indicator management with date-aware visibility
- `storage-helper.js`: Chrome storage API wrapper with async/await support
- `alarm-manager.js`: Event reminder system using Chrome alarms API
- `event-focus.js`: Parks/consumes "show me this event" requests handed from the service worker to the side panel
- `guest-utils.js`: Guest address checks/parsing, `attendees` body, and `GuestDirectory` (people from loaded events, suggested when adding guests)
- `release-notes.js`: Version history and update highlights for What's New modal
- `google-button-helper.js`: Helper utilities for Google-style buttons
- `chrome-messaging.js`: Chrome runtime message passing utilities
- `color-themes.js`: Color theme definitions and dark mode support
- `constants.js`: Shared constants and configuration values
- `event-storage.js`: Event persistence and retrieval from Chrome storage
- `settings-storage.js`: Settings persistence and retrieval
- `storage-cleanup.js`: Storage maintenance and cleanup utilities

## Specialized Systems

### Component-Based Architecture
Modular UI system with proper lifecycle management:
- `Component` base class with standardized `createElement()`, `destroy()`, and lifecycle methods
- `SidePanelComponentManager` for centralized component registration and management
- Modal system with `ModalComponent` base class for dialog management
- Proper cleanup and memory management with explicit resource disposal

### Event Layout Engine
The `EventLayoutManager` class implements sophisticated overlap resolution:
- Groups overlapping events by time intersection analysis
- Lane assignment algorithm for optimal horizontal placement with no overlaps
- Dynamic width calculation with responsive design support
- Performance optimization through time value caching
- Supports padding adjustments based on lane density (basic/compact/micro modes)
- Side-by-side display of duplicate events (e.g., same meeting with multiple participants)

### Current Time Line Management
Dedicated `CurrentTimeLineManager` system:
- Single-source-of-truth for current time indicator display
- Date-aware visibility (only shows on current day)
- Automatic position updates every minute with efficient DOM manipulation
- Proper cleanup and duplicate prevention to avoid visual artifacts
- Integration with timeline component date changes

### Localization System
Comprehensive i18n support:
- `_locales/en/`, `_locales/en_US/`, `_locales/ja/` message files with 400+ localized strings
- Language detection with auto/manual selection
- Locale-aware time formatting: the extension language plus the 12h/24h setting (default 12h only for a US-English Chrome), the same in event blocks, the time axis, dialogs and time fields
- Demo data localization for consistent experience across languages
- Chrome's native i18n system with `__MSG_key__` placeholders
- Custom locale utilities for complex formatting needs
- Cultural adaptations: time formats, date formats, time separators (hyphen vs tilde)

### Recurring Events System
- Supports daily, weekly, monthly, and weekdays recurrence patterns
- Exception handling for modified/deleted instances
- Seamless integration with local and Google events
- Stored separately with efficient date-based retrieval

### Reminder and Notification System
Chrome alarm-based reminders:
- `AlarmManager` class for centralized alarm management
- Configurable reminder timing (default: 5 minutes before)
- Chrome notifications for upcoming events
- Automatic cleanup of past alarms
- Clicking a notification opens the side panel on that event: the alarm name is parsed back into `{date, eventId}`, parked in local storage, and the panel navigates to the date, scrolls to the event and highlights it
- Integration with both local and recurring events

## Technical Implementation Details

### Time Management System
- **24-hour coordinate system**: Events positioned using `top: ${minutes_since_midnight + 30}px` (30px offset for top extension zone)
- **Responsive width calculation**: Auto-adjusts to side panel width changes via ResizeObserver
- **Business hours visualization**: Configurable work time highlighting with break time support
- **Current time indicator**: Managed by `CurrentTimeLineManager` with date-aware visibility; drawn over the events with the time in a pill, and its per-minute tick fades ended events (`is-past`)
- **Event blocks**: a tint of the event's colour with the text in a deep shade of the same hue, no accent stripe (`--event-color`, `--event-tint`, `--event-ink-mix`; `.has-calendar-color` for a Google calendar's own colour), text is title → time → place in one clamped box (`--event-lines`), no description; lanes 200px or wider (`wide-display`) put time · place on one line
- **Scroll positioning**: Smart scroll to current time or business hours
- **Date navigation**: Integrated with header component for seamless date switching

### Event Storage and Management
- **Google Events**: Fetched via Calendar API with multi-calendar support and color preservation
- **Local Events**: Stored in Chrome storage with date-scoped keys (`localEvents_YYYY-MM-DD`)
- **Recurring Events**: Separate storage with pattern definitions and exception handling
- **Automatic cleanup**: Local events auto-reset at midnight for daily scope
- **Event filtering**: Skips cancelled events and declined invitations
- **Overlap detection**: Time intersection algorithm for layout management
- **Duplicate handling**: Displays duplicate events separately
- **Event modals**: Dedicated modal components for Google and local event details
- **Reminders**: Optional per-event reminders with Chrome alarm integration

### Responsive Design Features
- **Auto-width adjustment**: ResizeObserver monitors side panel width changes
- **Lane-based layout**: Events distributed across lanes when overlapping
- **Adaptive padding**: Adjusts based on lane density (basic: 6px, compact: 5px, micro: 4px)
- **Minimum width enforcement**: Ensures readability even in narrow panels
- **Content optimization**: Shows title-only for very narrow events

### Performance Optimizations
- **Time value caching**: `Map` cache for repeated time calculations
- **Debounced operations**: 300ms debounce for date navigation and resize events
- **Efficient DOM updates**: Batch DOM modifications and use `requestAnimationFrame`
- **Memory management**: Explicit cleanup of event references and listeners

## Key Files for Modification

### Core Functionality
- `src/side_panel/side_panel.js`: Main UI controller with `SidePanelUIController` class
- `src/background.js`: Google Calendar integration, OAuth2, and message handling
- `src/side_panel/time-manager.js`: `EventLayoutManager` for event layout algorithms
- `src/side_panel/event-handlers.js`: Event data management
- `src/side_panel/components/timeline/timeline-component.js`: Main timeline display
- `src/side_panel/components/header/header-component.js`: Date navigation controls
- `src/side_panel/components/modals/google-event-modal.js`: Google Calendar event details
- `src/side_panel/components/modals/local-event-modal.js`: Local event creation/editing
- `src/side_panel/components/base/component.js`: Base component class

### UI and Styling
- `src/side_panel/side_panel.html`: Main UI structure with Bootstrap components
- `src/side_panel/side_panel.css`: Custom styling with CSS variables for theming
- `src/options/options.html`: Settings page interface
- `src/options/options.css`: Settings page styling

### Configuration and Data
- `manifest.json`: Extension permissions, OAuth2 config, Chrome API declarations
- `_locales/[lang]/messages.json`: Localized strings (en/ja with 400+ strings)
- `src/lib/utils.js`: Default settings and utility functions
- `src/lib/demo-data.js`: Mock data for development
- `src/lib/current-time-line-manager.js`: Current time indicator management
- `src/lib/storage-helper.js`: Chrome storage API utilities

## Dependencies and Libraries

### UI Framework
- **Bootstrap 5.3.0**: Complete UI framework (loaded locally from `src/vendor/`)
- **Popper.js**: Tooltip and popover positioning (loaded locally from `src/vendor/`)
- **Font Awesome 6.7.1**: Icon library (loaded via CDN)

### Chrome Extension APIs
- Storage API, Identity API, Side Panel API, i18n API
- Runtime API, Alarms API, Notifications API, Context Menus API

### External APIs
- Google Calendar API v3: read/write event access (list/insert/patch/delete + RSVP) with multi-calendar support
- OAuth2: Secure authentication flow via Chrome Identity API

## Advanced Features

### Event Layout Algorithm
1. Time-based grouping: Events grouped by temporal overlap detection
2. Lane assignment: Greedy algorithm assigns events to minimum lanes
3. Width calculation: Dynamic width based on available space and lane count
4. Conflict resolution: Handles edge cases like zero-duration events
5. Visual optimization: Adjusts padding and gaps based on layout density

### Calendar Management
- Multi-calendar support with selective visibility
- Calendar search for large calendar lists
- Color preservation from Google Calendar
- Auto-discovery of available calendars
