# Test Specifications

This document defines the **expected behavior** of each module.
Tests are written against these specifications, not against the implementation.

---

## locale-utils

### Time Display
- **en-US default**: 12-hour format (e.g. `2:30 PM`)
- **All other locales**: 24-hour format (e.g. `14:30`)
- **User override**: `12h` or `24h` setting persisted in sync storage overrides default
- **Invalid format**: Falls back to 24h

### Specific Time Values

English uses `hour: 'numeric'` (no leading zero), Japanese uses `hour: '2-digit'` (zero-padded).

| Input    | en (12h)     | ja (24h) |
|----------|-------------|----------|
| `00:00`  | `12:00 AM`  | `00:00`  |
| `09:00`  | `9:00 AM`   | `09:00`  |
| `12:00`  | `12:00 PM`  | `12:00`  |
| `14:30`  | `2:30 PM`   | `14:30`  |
| `23:59`  | `11:59 PM`  | `23:59`  |

### Date Display
| Locale | Format       | Example (March 5, 2025) |
|--------|-------------|------------------------|
| en     | MM/DD/YYYY  | `03/05/2025`           |
| ja     | YYYY/MM/DD  | `2025/03/05`           |

### Weekday Display
| Locale | Example (Monday, March 17, 2025) |
|--------|----------------------------------|
| en     | Contains `Mon`                   |
| ja     | Contains `月`                    |

### Input Validation (Q1)
- Valid range: `"00:00"` 〜 `"23:59"` only
- `"24:00"` → empty string `""` (invalid, not treated as midnight)
- `"25:00"`, `"99:99"` → empty string `""` (out of range)
- `"abc"`, non-HH:MM format → empty string `""`
- Empty/null/undefined input → empty string `""`

### Unsupported Locales (Q2)
- `"en"` → 12-hour format
- `"ja"` → 24-hour format
- Any other locale (`"fr"`, `"zh"`, etc.) → 24-hour format (international default)

### Storage Defaults
- No preference saved + en-US browser → `12h`
- No preference saved + ja browser → `24h`
- Invalid preference value → not saved

---

## localize

### Language Resolution (Q12)
| Setting | Browser Lang | Result |
|---------|-------------|--------|
| `auto`  | `ja` / `ja-JP` | `ja` |
| `auto`  | `en-US`     | `en`   |
| `auto`  | `fr-FR`     | `en`   |
| `ja`    | (any)       | `ja`   |
| `en`    | (any)       | `en`   |

### Invalid Input Handling
- `resolveLanguageCode(null)` → `"en"`
- `resolveLanguageCode(undefined)` → `"en"`
- `resolveLanguageCode("")` → `"en"`
- `resolveLanguageCode(123)` → `"en"`
- `resolveLanguageCode("fr")` → `"en"`
- Only `"auto"`, `"en"`, `"ja"` are valid inputs; all others fallback to `"en"`

### Message Lookup Fallback Chain
1. Cached messages (loaded from `_locales/[lang]/messages.json`)
2. `chrome.i18n.getMessage(key)`
3. Return the key itself as-is

### HTML Localization
- `[data-localize]` → replaces `innerHTML`
- `[data-localize-placeholder]` → sets `placeholder` attribute
- `[data-localize-title]` → sets `title` attribute
- `[data-localize-aria-label]` → sets `aria-label` attribute
- Pattern: `__MSG_keyName__` is replaced with the message for `keyName`
- Unknown language → falls back to English messages

### Graceful Degradation
- Network failure during message loading → does not crash, falls back to chrome.i18n
- Missing key → returns the key itself

---

## alarm-manager

### Reminder Timing
- Reminder fires `reminderMinutes` before event start
- Default `reminderMinutes`: 5
- Calculation: `eventStartTime - (reminderMinutes * 60 * 1000)`
- Midnight event (00:00) with 10min reminder → fires at 23:50 previous day

### When Reminders Are NOT Set (Q3)
- `event.reminder` is false or missing
- `event.startTime` is missing
- Calculated reminder time is in the past (≤ Date.now()) → silently ignored, no log
- Google all-day events (has `start.date` but no `start.dateTime`)

### Notification Content
| Condition | Button 1 | Button 2 |
|-----------|----------|----------|
| Has `hangoutLink` | "Join Meet" | "Dismiss" |
| No `hangoutLink`  | "Open SideTimeTable" | "Dismiss" |
- `requireInteraction: true` (notification stays until dismissed)
- Icon: `src/img/icon48.png`, falls back to no icon if loading fails

### Event Data Retrieval
1. First checks `localEvents_YYYY-MM-DD` in local storage
2. Then checks `recurringEvents` in sync storage
3. Returns `null` if not found in either

### Date Scoping
- `clearDateReminders(dateStr)` clears ONLY alarms for that date
- `clearGoogleEventReminders(dateStr)` clears ONLY Google alarms for that date
- Different dates' alarms are unaffected

### reminderMinutes Validation (Q4)
- Valid range: `0` 〜 `60`
- Values outside range → use default `5`
- Negative values → use default `5`

### Settings Integration
- When `reminderMinutes` not passed, reads from `chrome.storage.sync`
- When not in storage either, defaults to 5

### Invalid Date Handling (Q5)
- Invalid `dateStr` → fallback: calculate reminder from current time instead of event date
- Alarm is still created (current behavior preserved)

---

## settings-storage

### Settings (Q10)
- `saveSettings(obj)` → persists to sync storage, **only keys present in `DEFAULT_SETTINGS`** are saved (unknown keys are silently dropped)
- `loadSettings()` → returns stored values merged over `DEFAULT_SETTINGS`
- Missing keys get default values

### Selected Calendars
- Stored as array of strings (calendar IDs)
- Non-string values in array are filtered out
- Non-array stored value → returns `[]`
- No saved data → returns `[]`

### Calendar Groups
- Each group: `{ id: string, name: string, calendarIds: string[], collapsed: boolean }`
- Sanitization rules (Q11):
  - Missing `id` (not a string) → group is dropped
  - Empty string `id` (`""`) → group is dropped
  - `name` not a string → defaults to `"Group"`
  - `name` longer than 50 chars → truncated to 50
  - `calendarIds` not an array → defaults to `[]`
  - Non-string entries in `calendarIds` → filtered out
  - `collapsed` not a boolean → defaults to `false`

---

## event-storage

### Storage Locations
| Data Type | Storage | Key Pattern |
|-----------|---------|-------------|
| Date-specific events | `chrome.storage.local` | `localEvents_YYYY-MM-DD` |
| Recurring events | `chrome.storage.sync` | `recurringEvents` |

### Save Behavior (Q7)
- `saveLocalEventsForDate(events, date)` **overwrites** all events for that date (not merge)
- Callers must load → edit → save to preserve existing events
- _Future consideration: evaluate merge-based approach_

### Loading Events for a Date
Returns: `[...recurringInstances, ...dateSpecificEvents]`

### Recurring Event Matching
| Type | Matches When |
|------|-------------|
| `daily` | `(targetDate - startDate) % interval === 0` |
| `weekly` | Day of week matches `daysOfWeek` AND week difference % interval === 0 |
| `monthly` | Day of month matches (with month-end adjustment) AND month difference % interval === 0 |
| `weekdays` | Monday (1) through Friday (5) |

### Interval Validation (Q6)
- `interval <= 0` → event is skipped (not displayed for any date)

### Monthly Edge Case
- Event on day 31 + target month has 28 days → shows on day 28

### Exceptions
- `recurrence.exceptions` array of `YYYY-MM-DD` strings
- If target date is in exceptions → event does not appear
- Adding same exception twice → only stored once

### Recurring Instance Shape
```
{ ...originalEvent, isRecurringInstance: true, instanceDate: "YYYY-MM-DD", originalId: "..." }
```

### Migration (v2)
- Moves `localEvents_*` keys from sync to local storage (one-time)
- Restores `recurringEvents` from local to sync if sync is empty
- Does NOT overwrite existing sync recurring events
- Sets `eventDataMigratedToLocal_v2` flag to prevent re-running

---

## local-event-service

### Input Validation (Q8)
- `title` is required: empty/null/undefined → error (event not created)
- `startTime` is required: empty/null/undefined → error (event not created)
- `endTime`, `description` are optional

### Create Event
- Non-recurring → saved to `localEvents_YYYY-MM-DD` in local storage
- Recurring → saved to `recurringEvents` in sync storage
- `reminder` defaults to `true` when not explicitly `false`
- Alarm set only for non-recurring events with `reminder: true`

### Delete Event
| Event Type | deleteType | Action |
|-----------|-----------|--------|
| Regular | any | Remove from date storage, clear alarm |
| Recurring | `"all"` | Remove entire series from recurring storage |
| Recurring | `"this"` | Add exception for this date |

### Update Event (Type Transitions) (Q9)
| From | To | Action |
|------|-----|--------|
| Regular | Regular | Update in date storage |
| Regular | Recurring | Remove from date storage, add to recurring storage |
| Recurring | Recurring | Update in recurring storage |
| Recurring | Regular | Remove from recurring storage, add to date storage |
- If the target event is not found in storage → returns `false` (no changes made)

### Data Isolation
- Recurring instances (isRecurringInstance: true) are NEVER persisted to date storage
- They are computed at load time from recurring definitions

---

## color-themes

### Theme Structure
- 7 palette roles: background, surface, primary, secondary, surfaceVariant, outline, indicator
- All palette colors must be valid 6-digit hex (`#rrggbb`)
- Each theme has unique `id`

### Theme Lookup
- `getThemeById(id)` returns matching theme or default theme for unknown ID

### Theme Resolution
- `resolveThemeColors(theme)` produces:
  - `colorSettings`: 7 values mapped to setting keys
  - `cssVars`: Full CSS variable map including derived UI chrome variables
- Text color variables are auto-computed for contrast (black or white)
- Light themes: darker borders, dark text, `rgba(0,0,0,0.2)` shadows
- Dark themes: lighter borders, light text, `rgba(0,0,0,0.5)` shadows

---

## release-notes

### Version Ordering
- Entries ordered newest to oldest
- Each entry: `{ version: "X.Y.Z", date: "YYYY-MM-DD", highlights: { en: [...], ja: [...] } }`

### getUnseenReleaseNotes(lastSeen, current)
| lastSeen | current | Result |
|----------|---------|--------|
| `null` | any | `[]` (first install, don't show) |
| same as current | same | `[]` (no update) |
| `"1.7.0"` | `"1.8.0"` | All entries where `1.7.0 < version <= 1.8.0` |

### compareVersions
- Semver comparison: `1.10.0 > 1.9.0` (numeric, not lexicographic)
- Equal versions → `0`
- Different lengths padded with 0: `1.0 == 1.0.0`

---

## chrome-messaging

### sendMessage(message)
- Sends message via `chrome.runtime.sendMessage`
- Returns Promise
- Resolves with response on success
- Rejects with `chrome.runtime.lastError` on error
- Passes message object exactly as-is (no transformation)

---

## demo-data.stub (production)

### Contracts
1. `isDemoMode()` always returns `false`, even after `setDemoMode()` called
2. All data functions return safe defaults: `[]`, `null`, or `{}`
3. All setters are true no-ops (no state change, no error)
4. `getCurrentTime()` returns real current time (not fixed demo time)
5. Exports same interface as real demo-data.js

---

## date-navigation-service

### State
- Holds current viewed date, normalized to midnight (00:00:00.000)
- Initial value: today at midnight

### getDate()
- Returns a **copy** (mutating the returned Date does not affect internal state)

### getDateString()
- Returns `YYYY-MM-DD` format with zero-padded month and day

### advanceToTodayIfNeeded()
- Returns `true` and advances ONLY when: user was viewing today AND date has rolled past midnight
- Returns `false` when: user navigated away from today, OR still viewing today

---

## google-calendar-client

### AuthenticationError
- Extends `Error` (instanceof check works)
- `name` property is `"AuthenticationError"` (for serialization across message boundaries)

### API Response Error Classification
| HTTP Status | Error Type |
|-------------|-----------|
| 200-299 | No error |
| 401 | `AuthenticationError` |
| 403 | `AuthenticationError` |
| 500, other | Generic `Error` |
- Error message includes the API label and HTTP status code

### checkAuth()
- Returns `true` when token exists AND is valid (API returns 200)
- Returns `false` when no token exists
- Returns `false` when token is revoked (API returns 401) → clears cached token
- Returns `false` on network failure (does not throw)
- Always uses non-interactive mode (`interactive: false`)

---

## event-handlers (auth expiry)

### Auth Expiry Detection
- When API response contains `authExpired: true` → calls `onAuthExpired` callback
- When error is not auth-related (`authExpired: false`) → does NOT call `onAuthExpired`

### Fetch Suppression
- After auth expiry detected → stops fetching Google events (no API calls)
- When Google Calendar is not integrated → does not fetch

### Recovery
- `resetAuthState()` → resumes fetching on next call

---

## utils

### getContrastColor(hexColor)
- Returns `"#000000"` (black) for light backgrounds (luminance > 0.5)
- Returns `"#ffffff"` (white) for dark backgrounds (luminance ≤ 0.5)
- Luminance formula: `(0.299 * R + 0.587 * G + 0.114 * B) / 255`

| Input | Expected |
|-------|----------|
| `"#ffffff"` (white) | `"#000000"` |
| `"#000000"` (black) | `"#ffffff"` |
| `"#ff0000"` (red) | `"#ffffff"` |
| `"#00ff00"` (green) | `"#000000"` |
| `"#0000ff"` (blue) | `"#ffffff"` |
| `"#808080"` (mid-gray) | `"#000000"` (luminance ≈ 0.502) |

### getFormattedDateFromDate(date)
- Returns `YYYY-MM-DD` format with zero-padded month and day
- Uses local timezone (not UTC)

| Input | Expected |
|-------|----------|
| `new Date(2025, 0, 1)` (Jan 1) | `"2025-01-01"` |
| `new Date(2025, 11, 31)` (Dec 31) | `"2025-12-31"` |
| `new Date(2025, 2, 5)` (Mar 5) | `"2025-03-05"` |

### logError(context, error)
- Logs to `console.error` with format `[context] Error: <error>`
- Does not throw

---

## reminder-sync-service

### syncAll()
- Runs `syncLocalEventReminders()` and `syncGoogleEventReminders()` in parallel

### syncLocalEventReminders()
- Calls `AlarmManager.setDateReminders(todayDateStr)`
- On error → logs, does not throw

### syncGoogleEventReminders()
| Condition | Action |
|-----------|--------|
| `googleEventReminder` is false | Returns early (no sync) |
| `googleIntegrated` is false | Returns early (no sync) |
| Both enabled | Clears old date alarms, fetches primary calendar events, sets reminders |
- Clears only google alarms NOT matching today's date
- Also clears stored event data for cleared alarms
- Records sync timestamp in local storage after success
- `AuthenticationError` → logs warning, does not throw
- Other errors → logs error, does not throw

### setupDailySync()
- Creates alarm named `"daily_reminder_sync"` at next midnight
- Repeats every 24 hours (`periodInMinutes: 1440`)
- Clears existing alarm before creating new one

---

## google-calendar-client (respondToEvent)

### respondToEvent(calendarId, eventId, response)
- Required parameters: `calendarId`, `eventId`, `response` — all must be truthy
- Missing any → throws `Error("Missing required parameters")`
- Valid response values: `"accepted"`, `"declined"`, `"tentative"`
- Invalid response → throws `Error("Invalid response status")`
- Self attendee not found → throws `Error("Self attendee not found in event")`
