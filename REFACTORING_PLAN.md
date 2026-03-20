# SideTimeTable Refactoring Plan

## Overview

This plan addresses 6 structural issues in the codebase, organized into independent phases that each leave the project in a fully working state. The guiding principle is to split responsibilities while preserving the existing public API through re-export patterns, ensuring zero disruption to existing consumers.

---

## Phase 1: Split `utils.js` into Focused Modules (Low Risk, High Impact)

**Problem**: `utils.js` (442 lines, 17 exports) is a "god utility" mixing constants, event storage, settings persistence, recurring event logic, and miscellaneous helpers.

### New Files

**`src/lib/constants.js`** (~45 lines)
- `TIME_CONSTANTS`, `RECURRENCE_TYPES`, `STORAGE_KEYS`, `DEFAULT_SETTINGS`
- `COLOR_CSS_VARS`, `TEXT_COLOR_CSS_VARS`

**`src/lib/event-storage.js`** (~200 lines)
- `migrateEventDataToLocal()`, `loadLocalEvents()`, `loadLocalEventsForDate()`
- `saveLocalEventsForDate()`, `loadRecurringEvents()`, `saveRecurringEvents()`
- `getRecurringEventsForDate()`, `addRecurringEventException()`, `deleteRecurringEvent()`

**`src/lib/settings-storage.js`** (~40 lines)
- `loadSettings()`, `saveSettings()`, `loadSelectedCalendars()`, `saveSelectedCalendars()`

### Modified Files

**`src/lib/utils.js`** becomes a thin re-export facade (~40 lines) keeping only true utility functions (`generateTimeList`, `getFormattedDateFromDate`, `getContrastColor`, `reloadSidePanel`, `logError`) and re-exporting everything from the new modules.

### Backward Compatibility

All 12+ existing import sites continue to work unchanged since `utils.js` re-exports everything. New code should import from the specific modules directly.

### Verification
```bash
npm test && npm run lint && npm run build
```

---

## Phase 2: Extract Services from `side_panel.js` (Medium Risk)

**Problem**: `SidePanelUIController` (1,017 lines) handles component lifecycle, event CRUD operations, date navigation, reminders, tutorial/setup orchestration, and settings application.

### New Files

**`src/side_panel/services/local-event-service.js`** (~200 lines)
- Class `LocalEventService` with `createEvent()`, `updateEvent()`, `deleteEvent()`, `editRecurringEvent()`
- Pure data operations with no DOM dependencies — fully testable

**`src/side_panel/services/date-navigation-service.js`** (~60 lines)
- Class `DateNavigationService` with `setDate()`, `getDate()`, `isViewingToday()`, `getDateString()`
- Eliminates the `getCurrentDateString()` duplication with `getFormattedDateFromDate()`

### Modified Files

**`src/side_panel/side_panel.js`** → ~600 lines. `SidePanelUIController` becomes a thin orchestrator that delegates CRUD to `LocalEventService` and date management to `DateNavigationService`.

### Verification
```bash
npm test && npm run lint && npm run build
```
Manual test: create, edit, and delete events (both regular and recurring) in the side panel.

---

## Phase 3: Split `local-event-modal.js` (Medium Risk)

**Problem**: `LocalEventModal` (1,141 lines) handles view mode display, edit mode form building, recurrence UI, form validation, delete confirmation dialog, and localization — all in a single class.

### New Files

**`src/side_panel/components/modals/local-event-form-builder.js`** (~350 lines)
- Class `LocalEventFormBuilder` with `buildEditContent()`, `buildRecurrenceSection()`, `getFormData()`, `resetForm()`, `populateForm()`

**`src/side_panel/components/modals/delete-recurring-dialog.js`** (~100 lines)
- Class `DeleteRecurringDialog` with `show()` and `remove()`

### Modified Files

**`src/side_panel/components/modals/local-event-modal.js`** → ~500 lines. Delegates form building and delete dialog to helper classes.

### Verification
```bash
npm test && npm run lint && npm run build
```
Manual test: create new event, edit existing event, edit recurring event, delete recurring instance vs. series.

---

## Phase 4: Extract Background API Layer (Medium-High Risk)

**Problem**: `background.js` (851 lines) has all Google Calendar API logic, OAuth2 flows, message handling, alarm management, and notification handlers inline.

### New Files

**`src/services/google-calendar-client.js`** (~250 lines)
- Class `GoogleCalendarClient` with `getCalendarList()`, `getCalendarEvents()`, `getPrimaryCalendarEvents()`, `checkAuth()`, `respondToEvent()`
- Private `_getAuthToken()` and `_fetchWithAuth()` consolidate the repeated auth token + fetch pattern

**`src/services/reminder-sync-service.js`** (~80 lines)
- Class `ReminderSyncService` with `syncAll()`, `syncLocalEventReminders()`, `syncGoogleEventReminders()`, `setupDailySync()`

### Modified Files

**`src/background.js`** → ~300 lines. Becomes a message router that delegates to services.

### Verification
```bash
npm test && npm run lint && npm run build
```
Manual test: Google auth flow, calendar list fetch, event display, RSVP, reminders.

---

## Phase 5: Unify `event-handlers.js` with Shared Patterns (Low-Medium Risk)

**Problem**: `GoogleEventManager` and `LocalEventManager` (603 lines combined) share significant DOM construction patterns for event elements.

### New Files

**`src/side_panel/event-element-factory.js`** (~150 lines)
- Class `EventElementFactory` with `createEventElement()`, `buildPrimaryLine()`, `resolveLocaleSettings()`
- Consolidates `EVENT_STYLING`, `applyDurationBasedStyling()`, `onClickOnly()`, `TIMELINE_OFFSET`

### Modified Files

**`src/side_panel/event-handlers.js`** → ~400 lines. Both managers delegate element creation to factory, then add type-specific content.

### Verification
```bash
npm test && npm run lint && npm run build
```
Manual test: display events on timeline, verify positioning and styling.

---

## Phase 6: Minor Cleanups (Very Low Risk)

### 6a. Chrome Messaging Helper

**New: `src/lib/chrome-messaging.js`** (~20 lines) — Extract the `new Promise()` wrapper pattern used at 18+ sites.

### 6b. Move `_localizeModal()` to Base Class

Move identical `_localizeModal()` from both `GoogleEventModal` and `LocalEventModal` to `ModalComponent` base class.

### 6c. Add `destroy()` to Event Managers

Add `destroy()` methods to `GoogleEventManager` and `LocalEventManager` for proper memory cleanup.

### 6d. Remove `getCurrentDateString()` Duplication

Simplify `SidePanelUIController.getCurrentDateString()` to delegate to `getFormattedDateFromDate()` (or remove entirely after Phase 2).

---

## Implementation Order

```
Phase 1 (utils.js split) ← Start here, lowest risk
  ↓
Phase 6a,6b,6c (small cleanups) ← Quick wins
  ↓
Phase 2 (side_panel.js services) ← Leverages Phase 1
  ↓
Phase 3 (local-event-modal.js) ← Independent
Phase 4 (background.js API) ← Independent
Phase 5 (event-handlers.js) ← Independent
  ↓
Phase 6d (duplication removal) ← After Phase 2
```

Phases 3, 4, and 5 are mutually independent and can be done in parallel.

## New Files Summary

| Phase | File | Est. Lines |
|-------|------|-----------|
| 1 | `src/lib/constants.js` | ~45 |
| 1 | `src/lib/event-storage.js` | ~200 |
| 1 | `src/lib/settings-storage.js` | ~40 |
| 2 | `src/side_panel/services/local-event-service.js` | ~200 |
| 2 | `src/side_panel/services/date-navigation-service.js` | ~60 |
| 3 | `src/side_panel/components/modals/local-event-form-builder.js` | ~350 |
| 3 | `src/side_panel/components/modals/delete-recurring-dialog.js` | ~100 |
| 4 | `src/services/google-calendar-client.js` | ~250 |
| 4 | `src/services/reminder-sync-service.js` | ~80 |
| 5 | `src/side_panel/event-element-factory.js` | ~150 |
| 6a | `src/lib/chrome-messaging.js` | ~20 |
