# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SideTimeTable is a Chrome extension that provides a side panel interface for managing daily events. It integrates with Google Calendar and supports local event management with sophisticated time-based layout algorithms.

## Key Architecture

This is a Manifest V3 Chrome extension with the following core structure:

- **Background Service Worker** (`src/background.js`): Handles Google Calendar API integration and OAuth2 authentication
- **Side Panel** (`src/side_panel/`): Main UI displayed in Chrome's side panel
  - `side_panel.js`: Main controller (`UIController` class) using ES6 modules
  - `time-manager.js`: Exports `TimeTableManager` and `EventLayoutManager` classes
  - `event-handlers.js`: Exports `GoogleEventManager` and `LocalEventManager` classes
- **Options Page** (`src/options/`): Extension settings and configuration
- **Utilities** (`src/lib/`): Shared functions and Bootstrap 5.3.0 framework
  - `utils.js`: Core utilities including `generateTimeList`, `loadSettings`, `logError`
  - `localize.js`: i18n helper functions

The extension uses ES6 modules with imports/exports. Core functionality is split into specialized manager classes that handle time table rendering, sophisticated event overlap resolution, and Google/local event management.

## Development Commands

**This project does not use npm or webpack.** Files are used directly by Chrome.

**Packaging for distribution:**
- `zip_project.bat` (Windows) - Creates ZIP package excluding development files
- `zip_project.sh` (Unix/macOS) - Shell equivalent for packaging

## Extension Development

**Loading the extension:**
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"  
3. Click "Load unpacked" and select the project root directory (contains manifest.json)

**Development workflow:**
- Edit files directly in `src/` directory
- Reload extension in Chrome to see changes
- No build process required

**Google API Setup:**
- OAuth2 configuration is in `manifest.json`
- Requires Google Calendar API credentials for production use
- Current client_id in manifest.json is for development
- Uses `manifest.sample.json` as template for OAuth configuration

**Key Files for Modification:**
- `src/side_panel/side_panel.js`: Main UI logic and `UIController` initialization
- `src/background.js`: Google Calendar integration and background tasks
- `src/side_panel/side_panel.css`: UI styling
- `manifest.json`: Extension permissions and configuration

## Event Layout System

The extension uses a sophisticated event layout system with the `EventLayoutManager` class that:
- Groups overlapping events by time intersection
- Assigns events to lanes using efficient algorithms
- Calculates optimal widths and positions for overlapping events
- Uses time caching for performance optimization

Events are managed separately by `GoogleEventManager` (multi-calendar support) and `LocalEventManager` (daily-scoped with automatic midnight reset).

## Dependencies

- **Bootstrap 5.3.0**: UI framework (loaded locally from `src/lib/`)
- **Popper.js**: Tooltip and popover positioning (loaded locally from `src/lib/`)  
- **Font Awesome 6.7.1**: Icons (loaded via CDN)
- **Chrome Extension APIs**: Storage, Identity, Side Panel, i18n
- **Google Calendar API**: OAuth2 integration

## Localization

Supports multiple locales via `_locales/` directory with English, US English, and Japanese translations using Chrome's i18n system.

## Additional Structure

- **Documentation** (`docs/`): Project documentation and web assets
  - Contains project images, privacy policy, and web interface
- **Services** (`src/services/`): Currently empty, reserved for future service modules
- **Components** (`src/side_panel/components/`): Currently empty, reserved for UI components