# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SideTimeTable is a Chrome extension (Manifest V3) providing a side panel interface for managing daily events with Google Calendar integration. ES6 class-based architecture with webpack+babel build system.

For detailed architecture reference: @.claude/skills/architecture/SKILL.md

## Commands

**Build commands:**
```bash
npm install           # Install dependencies (required once)
npm run build         # Production build (output to dist/)
npm run dev           # Development mode with file watching
npm run package       # Create release zip file (builds + packages)
```

**Quality checks (must run after any code change):**
```bash
npm test              # Run all tests (Jest)
npm run lint          # Run ESLint
npm run build         # Verify production build succeeds
```

> **IMPORTANT:** After modifying any source file in `src/`, always run `npm test` and `npm run lint` to catch regressions before committing. If tests fail, fix the issue before proceeding.

## Architecture Summary

- **Background Service Worker** (`src/background.js`): Google Calendar API, OAuth2 via Chrome Identity API, message-based communication
- **Side Panel** (`src/side_panel/`): Main UI with `SidePanelUIController`, `EventLayoutManager`, component-based architecture
- **Options Page** (`src/options/`): Settings management with component-based architecture
- **Utilities** (`src/lib/`): Shared functions, time utils, storage helpers, i18n, alarm manager

## Chrome Extension Gotchas

- MV3 service workers do not support ES6 `import`/`export` → webpack bundles all modules to `dist/`
- Entry points: `background.js`, `side_panel.js`, `options.js` → output as `*.bundle.js`
- Demo mode: `?demo=true` URL parameter or `localStorage.sideTimeTableDemo=true`
- OAuth2: configured in `manifest.json` (`oauth2.client_id`), uses Chrome Identity API
- Scope: `https://www.googleapis.com/auth/calendar.readonly`
- `manifest.sample.json` provides template for OAuth configuration

## Code Style

- ES modules (`import`/`export`), not CommonJS (`require`)
- Component base class pattern: `createElement()`, `destroy()` lifecycle
- CSS variable naming: `--side-calendar-*` (theme details in @.claude/rules/theme-support.md)
- **No debug logs in production code** — clean console output
- i18n: `_locales/en/` and `_locales/ja/` with 400+ localized strings, `__MSG_key__` placeholders
- Time formats: 12h for English, 24h for Japanese
- Date formats: MM/DD/YYYY (English), YYYY/MM/DD (Japanese)

## Event System

- **24h coordinate system**: `top = minutes_since_midnight + 30px` (30px offset for top extension zone)
- **Local events**: Chrome storage with date-scoped keys (`localEvents_YYYY-MM-DD`)
- **EventLayoutManager**: overlap detection → lane assignment → width calculation
- **Recurring events**: separate storage with daily/weekly/monthly/weekdays patterns and exception handling
- **Adaptive padding**: basic (10px), compact (8px), micro (6px) based on lane density

## Development Workflow

1. Run `npm run dev` for development (webpack watch mode)
2. Load extension: `chrome://extensions/` → Developer mode → Load unpacked (project root)
3. Reload extension in Chrome to see changes
4. Run `npm test && npm run lint` before committing
5. Use Developer Tools for debugging (F12 on side panel)
