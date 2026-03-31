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
  - `header/header-component.js`: Date navigation and settings controls
  - `modals/`: Modal dialog components (Google events, local events, alerts, What's New, review)
  - `memo/memo-component.js`: Collapsible memo panel with persistent storage and resizable height
  - `setup/initial-setup-component.js`: First-time user setup wizard
  - `tutorial/tutorial-component.js`: Interactive tutorial for new users
  - `base/component.js`: Base component class with lifecycle management
- `services/`: Service modules for business logic
  - `date-navigation-service.js`: Date navigation logic
  - `local-event-service.js`: Local event data operations
- `event-element-factory.js`: Factory for creating event DOM elements

### Options Page (`src/options/`)
Extension settings and calendar management:
- `options.js`: Settings management with component-based architecture
- `options.html`: Settings interface with nav-pills sidebar navigation layout
- `options.css`: Styling for settings page with Google-style buttons and sidebar nav
- `components/`:
  - `calendar/`: Google integration and calendar management components
  - `settings/`: Time, color (with color blindness presets), language, shortcut, reminder, memo, scrollbar, storage, extension info, and developer settings components
  - `base/`: Base card and control button components

### Changelog Page (`src/changelog/`)
Standalone changelog page:
- `changelog.js`: Changelog display logic with version history rendering
- `changelog.html`: Changelog page structure
- `changelog.css`: Changelog page styling

### Services (`src/services/`)
Shared service modules:
- `google-calendar-client.js`: Google Calendar API client with multi-calendar support
- `reminder-sync-service.js`: Reminder synchronization service

### Utilities (`src/lib/`)
Shared functions and framework components:
- `utils.js`: Core utilities (`generateTimeList`, `loadSettings`, `logError`, event storage, recurring events)
- `time-utils.js`: Pure functions for time calculations (`calculateWorkHours`, `isToday`)
- `localize.js`: i18n helper functions with Chrome extension API integration
- `locale-utils.js`: Locale-aware date/time formatting (12h/24h format support)
- `demo-data.js`: Mock data system for development and screenshots
- `current-time-line-manager.js`: Dedicated current time indicator management with date-aware visibility
- `storage-helper.js`: Chrome storage API wrapper with async/await support
- `alarm-manager.js`: Event reminder system using Chrome alarms API
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
- Locale-aware time formatting (12h for English, 24h for Japanese)
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
- Integration with both local and recurring events

## Technical Implementation Details

### Time Management System
- **24-hour coordinate system**: Events positioned using `top: ${minutes_since_midnight + 30}px` (30px offset for top extension zone)
- **Responsive width calculation**: Auto-adjusts to side panel width changes via ResizeObserver
- **Business hours visualization**: Configurable work time highlighting with break time support
- **Current time indicator**: Managed by `CurrentTimeLineManager` with date-aware visibility
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
- **Adaptive padding**: Adjusts based on lane density (basic: 10px, compact: 8px, micro: 6px)
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
- Google Calendar API v3: Read-only calendar access with multi-calendar support
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
