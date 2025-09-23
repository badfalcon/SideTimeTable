# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SideTimeTable is a Chrome extension that provides a side panel interface for managing daily events. It integrates with Google Calendar and supports local event management with sophisticated time-based layout algorithms. This is a **Manifest V3** Chrome extension that demonstrates advanced patterns for side panel integration, OAuth2 authentication, and responsive event layout management.

## Key Architecture

This project follows a modular ES6 class-based architecture with clear separation of concerns:

### Core Components

- **Background Service Worker** (`src/background.js`):
  - Handles Google Calendar API integration and OAuth2 authentication
  - Manages Chrome Identity API for token management
  - Provides message-based communication with side panel
  - Implements keyboard shortcut handling (Ctrl+Shift+Y / Cmd+Shift+Y)
  - Functions: `getCalendarList()`, `getCalendarEvents()`, `checkGoogleAuth()`

- **Side Panel** (`src/side_panel/`): Main UI displayed in Chrome's side panel
  - `side_panel.js`: Main controller with `SidePanelUIController` class managing initialization and coordination
  - `time-manager.js`: Exports `EventLayoutManager` for sophisticated overlap resolution algorithms
  - `event-handlers.js`: Exports `GoogleEventManager` and `LocalEventManager` for event data management
  - `side_panel.html`: Bootstrap 5.3.0 based UI with modal dialogs and responsive design
  - `side_panel.css`: Custom styling with CSS variables for theming
  - `components/`: Modular component-based UI architecture
    - `timeline/timeline-component.js`: Main timeline display with integrated event layout
    - `header/header-component.js`: Date navigation and settings controls
    - `modals/`: Modal dialog components for event management
    - `base/component.js`: Base component class with lifecycle management

- **Options Page** (`src/options/`): Extension settings and calendar management
  - `options.js`: Settings management with `CalendarManager` class for calendar search and selection
  - `options.html`: Comprehensive settings interface with Google integration toggle
  - `options.css`: Styling for settings page with Google-style buttons

- **Utilities** (`src/lib/`): Shared functions and framework components
  - `utils.js`: Core utilities (`generateTimeList`, `loadSettings`, `logError`, event storage)
  - `time-utils.js`: Pure functions for time calculations (`calculateWorkHours`, `isToday`)
  - `localize.js`: i18n helper functions with Chrome extension API integration
  - `locale-utils.js`: Locale-aware date/time formatting (12h/24h format support)
  - `demo-data.js`: Mock data system for development and screenshots
  - `current-time-line-manager.js`: Dedicated current time indicator management with date-aware visibility
  - `storage-helper.js`: Chrome storage API wrapper with async/await support

### Specialized Systems

**Component-Based Architecture**: Modular UI system with proper lifecycle management:
- `Component` base class with standardized `createElement()`, `destroy()`, and lifecycle methods
- `SidePanelComponentManager` for centralized component registration and management
- Modal system with `ModalComponent` base class for dialog management
- Proper cleanup and memory management with explicit resource disposal

**Event Layout Engine**: The `EventLayoutManager` class implements sophisticated overlap resolution:
- Groups overlapping events by time intersection analysis
- Lane assignment algorithm for optimal horizontal placement with no overlaps
- Dynamic width calculation with responsive design support
- Performance optimization through time value caching
- Supports padding adjustments based on lane density (basic/compact/micro modes)
- Side-by-side display of duplicate events (e.g., same meeting with multiple participants)

**Current Time Line Management**: Dedicated `CurrentTimeLineManager` system:
- Single-source-of-truth for current time indicator display
- Date-aware visibility (only shows on current day)
- Automatic position updates every minute with efficient DOM manipulation
- Proper cleanup and duplicate prevention to avoid visual artifacts
- Integration with timeline component date changes

**Localization System**: Comprehensive i18n support:
- `_locales/en/`, `_locales/ja/` message files with 400+ localized strings
- Language detection with auto/manual selection
- Locale-aware time formatting (12h for English, 24h for Japanese)
- Demo data localization for consistent experience across languages

## Development Commands

**This project does not use npm, webpack, or any build system.** Files are used directly by Chrome for simplicity and transparency.

**Packaging for distribution:**
- `zip_project.bat` (Windows) - PowerShell-based packaging excluding development files
- `zip_project.sh` (Unix/macOS) - Shell equivalent for packaging
- Excludes: `.git`, `.idea`, `.md` files, `docs/`, sample configs, and development scripts

## Extension Development

**Loading the extension:**
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the project root directory (contains manifest.json)

**Development workflow:**
- Edit files directly in `src/` directory
- Reload extension in Chrome to see changes (click refresh icon or Ctrl+R on extensions page)
- Use Developer Tools for debugging (F12 on side panel)
- No build process required - instant feedback loop

**Google API Setup:**
- OAuth2 configuration in `manifest.json` with `oauth2.client_id` and `oauth2.scopes`
- Requires Google Calendar API credentials for production use
- Current client_id in manifest.json is for development/demo
- `manifest.sample.json` provides template for OAuth configuration
- Uses Chrome Identity API for secure token management
- Scope: `https://www.googleapis.com/auth/calendar.readonly`

**Demo Mode**:
- URL parameter: `chrome-extension://[id]/src/side_panel/side_panel.html?demo=true`
- Or localStorage: `sideTimeTableDemo=true`
- Provides realistic mock data for development without API access

## Technical Implementation Details

### Time Management System
- **24-hour coordinate system**: Events positioned using `top: ${minutes_since_midnight}px`
- **Responsive width calculation**: Auto-adjusts to side panel width changes via ResizeObserver
- **Business hours visualization**: Configurable work time highlighting with break time support
- **Current time indicator**: Managed by `CurrentTimeLineManager` with date-aware visibility
- **Scroll positioning**: Smart scroll to current time or business hours
- **Date navigation**: Integrated with header component for seamless date switching

### Event Storage and Management
- **Google Events**: Fetched via Calendar API with multi-calendar support and color preservation
- **Local Events**: Stored in Chrome storage with date-scoped keys (`localEvents_YYYY-MM-DD`)
- **Automatic cleanup**: Local events auto-reset at midnight for daily scope
- **Event filtering**: Skips cancelled events and declined invitations
- **Overlap detection**: Time intersection algorithm for layout management
- **Duplicate handling**: Displays duplicate events separately (e.g., same meeting with multiple participants)
- **Event modals**: Dedicated modal components for Google and local event details

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
- `src/background.js`: Google Calendar integration, OAuth2, and message handling (production-ready, no debug logs)
- `src/side_panel/time-manager.js`: `EventLayoutManager` for sophisticated event layout algorithms
- `src/side_panel/event-handlers.js`: Event data management with `GoogleEventManager` and `LocalEventManager`
- `src/side_panel/components/`: Component-based UI architecture
  - `timeline/timeline-component.js`: Main timeline display with current time line integration
  - `header/header-component.js`: Date navigation controls
  - `modals/google-event-modal.js`: Google Calendar event details display
  - `modals/local-event-modal.js`: Local event creation and editing
  - `base/component.js`: Base component class with lifecycle management

### UI and Styling
- `src/side_panel/side_panel.html`: Main UI structure with Bootstrap components
- `src/side_panel/side_panel.css`: Custom styling with CSS variables for theming
- `src/options/options.html`: Settings page interface
- `src/options/options.css`: Settings page styling

### Configuration and Data
- `manifest.json`: Extension permissions, OAuth2 config, and Chrome API declarations
- `_locales/[lang]/messages.json`: Localized strings for UI text (en/ja with 400+ strings)
- `src/lib/utils.js`: Default settings and utility functions
- `src/lib/demo-data.js`: Mock data for development and demonstrations
- `src/lib/current-time-line-manager.js`: Current time indicator management
- `src/lib/storage-helper.js`: Chrome storage API utilities

### Development Support
- `manifest.sample.json`: Template for OAuth2 configuration
- `zip_project.bat` / `zip_project.sh`: Distribution packaging scripts
- `store-descriptions.md`: Chrome Web Store listing content in multiple languages

## Dependencies and Libraries

### UI Framework
- **Bootstrap 5.3.0**: Complete UI framework (loaded locally from `src/lib/bootstrap.min.css/js`)
- **Popper.js**: Tooltip and popover positioning (loaded locally from `src/lib/popper.min.js`)
- **Font Awesome 6.7.1**: Comprehensive icon library (loaded via CDN)

### Chrome Extension APIs
- **Storage API**: Settings and local event persistence with sync storage
- **Identity API**: OAuth2 authentication and token management
- **Side Panel API**: Chrome's native side panel integration
- **i18n API**: Built-in internationalization support
- **Runtime API**: Message passing between background and content scripts

### External APIs
- **Google Calendar API v3**: Read-only calendar access with multi-calendar support
- **OAuth2**: Secure authentication flow with minimal required permissions

## Localization and Internationalization

### Supported Locales
- **English** (`en`): Primary language with US English variant (`en_US`)
- **Japanese** (`ja`): Complete translation including cultural adaptations
- **Auto-detection**: Browser language detection with manual override option

### Localization Features
- **400+ localized strings**: Comprehensive coverage of all UI text
- **Cultural adaptations**:
  - Time formats: 12-hour (English) vs 24-hour (Japanese)
  - Date formats: MM/DD/YYYY (English) vs YYYY/MM/DD (Japanese)
  - Time separators: hyphen (-) vs tilde (～) for time ranges
- **Demo data localization**: Even mock data respects user's language preference
- **Dynamic language switching**: Runtime language changes with extension reload

### Implementation Details
- Chrome's native i18n system with `__MSG_key__` placeholders
- Custom locale utilities for complex formatting needs
- Graceful fallbacks for missing translations
- Locale-aware number and date formatting

## Advanced Features

### Event Layout Algorithm
1. **Time-based grouping**: Events grouped by temporal overlap detection
2. **Lane assignment**: Greedy algorithm assigns events to minimum lanes
3. **Width calculation**: Dynamic width based on available space and lane count
4. **Conflict resolution**: Handles edge cases like zero-duration events
5. **Visual optimization**: Adjusts padding and gaps based on layout density

### Calendar Management
- **Multi-calendar support**: Display events from multiple Google Calendars
- **Calendar search**: Real-time search functionality for large calendar lists
- **Color preservation**: Maintains Google Calendar colors for visual consistency
- **Selective visibility**: Per-calendar show/hide toggles
- **Auto-discovery**: Automatically detects and suggests available calendars

### Accessibility and UX
- **Keyboard shortcuts**: Configurable hotkeys for side panel access
- **Screen reader support**: Semantic HTML and ARIA labels
- **Responsive design**: Adapts to various side panel widths
- **Error handling**: Graceful degradation with user-friendly error messages
- **Loading states**: Visual feedback for async operations

## Development Best Practices

### Code Organization
- **ES6 modules**: Clean import/export pattern with explicit dependencies
- **Component-based architecture**: Modular UI with lifecycle management and single responsibility
- **Manager classes**: Dedicated classes for event handling, layout, and time management
- **Pure functions**: Time utilities are side-effect free for testability
- **Event-driven design**: Loose coupling through Chrome message passing
- **Production-ready**: No debug logs in production code, clean console output

### Error Handling
- **Graceful degradation**: App functions even without Google Calendar access
- **User feedback**: Clear error messages with actionable guidance
- **Logging**: Comprehensive error logging for debugging
- **Fallback behaviors**: Demo mode when API access fails

### Security Considerations
- **Minimal permissions**: Only requests necessary Chrome extension permissions
- **OAuth2 best practices**: Secure token handling with automatic refresh
- **Data privacy**: No external data transmission beyond Google APIs
- **Input validation**: Sanitization of user inputs and API responses

### Performance Guidelines
- **Lazy loading**: Components initialized only when needed
- **Memory efficiency**: Explicit cleanup of event listeners and DOM references
- **Caching strategies**: Time calculations cached for repeated operations
- **Batch operations**: DOM updates batched to minimize reflows

## Additional Project Structure

### Documentation and Assets
- **`docs/`**: Project website with privacy policy and promotional content
  - `index.html`: Project landing page with feature showcase
  - `privacy.html`: Privacy policy for Chrome Web Store compliance
  - `img/`: Screenshots and promotional images
  - `style.css`: Website styling

### Reserved Directories
- **`src/services/`**: Reserved for future service modules (currently empty)
- **`src/side_panel/components/`**: Component-based UI architecture (active)
  - `base/`: Base component classes
  - `timeline/`: Timeline display components
  - `header/`: Header and navigation components
  - `modals/`: Modal dialog components
- **`.idea/`**: IntelliJ IDEA project configuration
- **`.git/`**: Git version control (excluded from distribution)

### Distribution Files
- **`store-descriptions.md`**: Chrome Web Store listing content in Japanese and English
- **`README.md`**: Project overview and installation instructions
- **`LICENSE`**: Apache License 2.0 (referenced in README)

## Recent Improvements (Latest Updates)

### Current Time Line Management
- **Resolved duplicate time line issue**: Replaced duplicate implementations with unified `CurrentTimeLineManager`
- **Date-aware visibility**: Current time line only displays on today's date
- **Proper lifecycle management**: Automatic cleanup and memory management
- **Integration**: Seamless integration with timeline component date changes

### Code Quality Improvements
- **Removed debug logs**: Production-ready code with clean console output
- **Component lifecycle**: Proper cleanup in destroy methods
- **Memory management**: Explicit resource disposal and DOM cleanup
- **Duplicate prevention**: Systematic cleanup of existing elements before creating new ones

### Event Layout Enhancements
- **Side-by-side display**: Duplicate events (same meeting with multiple participants) now display separately
- **Lane assignment**: Improved algorithm ensures proper horizontal spacing without overlaps
- **ResponsiveObserver**: Dynamic width adjustments for optimal layout

This architecture demonstrates modern Chrome extension development with clean separation of concerns, robust error handling, comprehensive internationalization support, and production-ready code quality.