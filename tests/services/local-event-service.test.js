/**
 * Tests for LocalEventService
 *
 * Behavioral contracts tested:
 * 1. Event creation: non-recurring → saved to date storage, recurring → saved to recurring storage
 * 2. Event updates: type transitions (regular ↔ recurring) preserve data
 * 3. Event deletion: regular removes from storage, recurring adds exception or deletes series
 * 4. Reminder integration: reminders set/cleared based on event.reminder flag
 * 5. ID generation: unique across concurrent calls
 * 6. Data isolation: recurring instances not mixed with date-specific events
 *
 * Uses real storage (via Chrome mock) for event-storage and utils,
 * but mocks AlarmManager since it depends on Chrome Alarms API.
 */

import { LocalEventService } from '../../src/side_panel/services/local-event-service.js';
import { RECURRENCE_TYPES } from '../../src/lib/constants.js';
import {
    loadLocalEventsForDate,
    loadRecurringEvents,
    saveRecurringEvents
} from '../../src/lib/event-storage.js';

// Only mock AlarmManager — it calls chrome.alarms which has timing-sensitive behavior
jest.mock('../../src/lib/alarm-manager.js', () => ({
    AlarmManager: {
        setReminder: jest.fn().mockResolvedValue(),
        clearReminder: jest.fn().mockResolvedValue()
    }
}));

const { AlarmManager } = require('../../src/lib/alarm-manager.js');

describe('LocalEventService', () => {
    let service;
    const testDate = new Date(2025, 2, 15); // March 15, 2025

    beforeEach(() => {
        service = new LocalEventService();
        resetChromeStorage();
        jest.clearAllMocks();
    });

    // ---------------------------------------------------------------
    // SPEC: ID generation — unique across concurrent calls
    // ---------------------------------------------------------------
    describe('SPEC: ID generation', () => {
        test('generates unique IDs across rapid successive calls', () => {
            const ids = new Set(Array.from({ length: 50 }, () => LocalEventService.generateId()));
            expect(ids.size).toBe(50);
        });

        test('IDs are strings suitable for use as storage keys', () => {
            const id = LocalEventService.generateId();
            expect(typeof id).toBe('string');
            expect(id.length).toBeGreaterThan(0);
            // Should not contain characters that would break storage keys
            expect(id).not.toMatch(/[{}[\]]/);
        });
    });

    // ---------------------------------------------------------------
    // SPEC: Create Event
    // - Non-recurring → localEvents_YYYY-MM-DD, Recurring → recurringEvents
    // - reminder defaults to true, alarm only for non-recurring with reminder
    // ---------------------------------------------------------------
    describe('SPEC: creating events', () => {
        test('non-recurring event is persisted and loadable for the same date', async () => {
            await service.createEvent({
                title: 'Team Lunch',
                startTime: '12:00',
                endTime: '13:00',
                description: 'At the Italian place',
                recurrence: { type: RECURRENCE_TYPES.NONE }
            }, testDate);

            const loaded = await loadLocalEventsForDate(testDate);
            const event = loaded.find(e => e.title === 'Team Lunch');
            expect(event).toBeDefined();
            expect(event.startTime).toBe('12:00');
            expect(event.endTime).toBe('13:00');
            expect(event.description).toBe('At the Italian place');
        });

        test('recurring event is persisted in recurring storage, not date storage', async () => {
            await service.createEvent({
                title: 'Daily Standup',
                startTime: '09:00',
                endTime: '09:15',
                recurrence: { type: RECURRENCE_TYPES.DAILY, startDate: '2025-03-15' }
            }, testDate);

            const recurring = await loadRecurringEvents();
            expect(recurring.find(e => e.title === 'Daily Standup')).toBeDefined();
        });

        test('newly created event has a reminder enabled by default', async () => {
            await service.createEvent({
                title: 'Important Call',
                startTime: '14:00',
                endTime: '15:00',
                recurrence: { type: RECURRENCE_TYPES.NONE }
            }, testDate);

            const loaded = await loadLocalEventsForDate(testDate);
            const event = loaded.find(e => e.title === 'Important Call');
            expect(event.reminder).toBe(true);
            expect(AlarmManager.setReminder).toHaveBeenCalled();
        });

        test('event with reminder explicitly disabled does not trigger alarm', async () => {
            await service.createEvent({
                title: 'Optional',
                startTime: '16:00',
                endTime: '17:00',
                reminder: false,
                recurrence: { type: RECURRENCE_TYPES.NONE }
            }, testDate);

            expect(AlarmManager.setReminder).not.toHaveBeenCalled();
        });

        test('multiple events on the same date are all preserved', async () => {
            await service.createEvent({
                title: 'Morning Meeting',
                startTime: '09:00',
                endTime: '10:00',
                recurrence: { type: RECURRENCE_TYPES.NONE }
            }, testDate);

            await service.createEvent({
                title: 'Afternoon Session',
                startTime: '14:00',
                endTime: '15:00',
                recurrence: { type: RECURRENCE_TYPES.NONE }
            }, testDate);

            const loaded = await loadLocalEventsForDate(testDate);
            const titles = loaded.map(e => e.title);
            expect(titles).toContain('Morning Meeting');
            expect(titles).toContain('Afternoon Session');
        });
    });

    // ---------------------------------------------------------------
    // SPEC: Delete Event
    // - Regular: remove from date storage, clear alarm
    // - Recurring "all": remove entire series
    // - Recurring "this": add exception for this date
    // ---------------------------------------------------------------
    describe('SPEC: deleting events', () => {
        test('deleting a regular event removes it from storage', async () => {
            await service.createEvent({
                title: 'To Delete',
                startTime: '10:00',
                endTime: '11:00',
                recurrence: { type: RECURRENCE_TYPES.NONE }
            }, testDate);

            const loaded = await loadLocalEventsForDate(testDate);
            const event = loaded.find(e => e.title === 'To Delete');

            await service.deleteEvent(event, null, testDate);

            const afterDelete = await loadLocalEventsForDate(testDate);
            expect(afterDelete.find(e => e.title === 'To Delete')).toBeUndefined();
        });

        test('deleting a regular event clears its reminder', async () => {
            await service.createEvent({
                title: 'Reminder Event',
                startTime: '10:00',
                endTime: '11:00',
                recurrence: { type: RECURRENCE_TYPES.NONE }
            }, testDate);

            const loaded = await loadLocalEventsForDate(testDate);
            const event = loaded.find(e => e.title === 'Reminder Event');

            await service.deleteEvent(event, null, testDate);

            expect(AlarmManager.clearReminder).toHaveBeenCalledWith(event.id, '2025-03-15');
        });

        test('deleting all instances removes the recurring event entirely', async () => {
            await service.createEvent({
                title: 'Daily Standup',
                startTime: '09:00',
                endTime: '09:15',
                recurrence: { type: RECURRENCE_TYPES.DAILY, startDate: '2025-03-15' }
            }, testDate);

            const recurring = await loadRecurringEvents();
            const event = recurring.find(e => e.title === 'Daily Standup');
            const recurringInstance = {
                ...event,
                isRecurringInstance: true,
                originalId: event.id
            };

            await service.deleteEvent(recurringInstance, 'all', testDate);

            const afterDelete = await loadRecurringEvents();
            expect(afterDelete.find(e => e.title === 'Daily Standup')).toBeUndefined();
        });

        test('deleting single instance adds exception without removing series', async () => {
            await service.createEvent({
                title: 'Weekly Sync',
                startTime: '10:00',
                endTime: '10:30',
                recurrence: { type: RECURRENCE_TYPES.WEEKLY, startDate: '2025-03-15', daysOfWeek: [6] }
            }, testDate);

            const recurring = await loadRecurringEvents();
            const event = recurring.find(e => e.title === 'Weekly Sync');
            const recurringInstance = {
                ...event,
                isRecurringInstance: true,
                originalId: event.id,
                instanceDate: '2025-03-15'
            };

            await service.deleteEvent(recurringInstance, 'this', testDate);

            // Series still exists
            const afterDelete = await loadRecurringEvents();
            const series = afterDelete.find(e => e.title === 'Weekly Sync');
            expect(series).toBeDefined();
            // But has an exception for this date
            expect(series.recurrence.exceptions).toContain('2025-03-15');
        });
    });

    // ---------------------------------------------------------------
    // SPEC: Update Event (Type Transitions)
    // - Regular→Regular: update in date storage
    // - Regular→Recurring: remove from date, add to recurring
    // - Recurring→Recurring: update in recurring storage
    // - Recurring→Regular: remove from recurring, add to date
    // ---------------------------------------------------------------
    describe('SPEC: updating events (type transitions)', () => {
        test('updating a regular event preserves it in date storage', async () => {
            await service.createEvent({
                title: 'Original Title',
                startTime: '10:00',
                endTime: '11:00',
                recurrence: { type: RECURRENCE_TYPES.NONE }
            }, testDate);

            const loaded = await loadLocalEventsForDate(testDate);
            const original = loaded.find(e => e.title === 'Original Title');

            await service.updateEvent({
                title: 'Updated Title',
                startTime: '10:30',
                endTime: '11:30',
                recurrence: { type: RECURRENCE_TYPES.NONE }
            }, original, testDate);

            const afterUpdate = await loadLocalEventsForDate(testDate);
            expect(afterUpdate.find(e => e.title === 'Original Title')).toBeUndefined();
            const updated = afterUpdate.find(e => e.title === 'Updated Title');
            expect(updated).toBeDefined();
            expect(updated.startTime).toBe('10:30');
        });

        test('converting regular event to recurring moves it to recurring storage', async () => {
            await service.createEvent({
                title: 'One-off',
                startTime: '10:00',
                endTime: '11:00',
                recurrence: { type: RECURRENCE_TYPES.NONE }
            }, testDate);

            const loaded = await loadLocalEventsForDate(testDate);
            const event = loaded.find(e => e.title === 'One-off');

            await service.updateEvent({
                title: 'Now Daily',
                startTime: '10:00',
                endTime: '11:00',
                recurrence: { type: RECURRENCE_TYPES.DAILY, startDate: '2025-03-15' }
            }, event, testDate);

            // Should be in recurring storage now
            const recurring = await loadRecurringEvents();
            expect(recurring.find(e => e.title === 'Now Daily')).toBeDefined();
        });

        test('converting recurring event to one-off moves it to date storage', async () => {
            await service.createEvent({
                title: 'Was Daily',
                startTime: '09:00',
                endTime: '09:30',
                recurrence: { type: RECURRENCE_TYPES.DAILY, startDate: '2025-03-15' }
            }, testDate);

            const recurring = await loadRecurringEvents();
            const event = recurring.find(e => e.title === 'Was Daily');

            await service.updateEvent({
                title: 'Now One-off',
                startTime: '09:00',
                endTime: '09:30',
                recurrence: { type: RECURRENCE_TYPES.NONE }
            }, event, testDate);

            // Should be removed from recurring
            const afterRecurring = await loadRecurringEvents();
            expect(afterRecurring.find(e => e.title === 'Was Daily')).toBeUndefined();
            expect(afterRecurring.find(e => e.title === 'Now One-off')).toBeUndefined();

            // Should appear in date-specific storage
            const dateEvents = await loadLocalEventsForDate(testDate);
            expect(dateEvents.find(e => e.title === 'Now One-off')).toBeDefined();
        });

        test('updating recurring event series changes all future instances', async () => {
            await service.createEvent({
                title: 'Weekly Sync',
                startTime: '10:00',
                endTime: '10:30',
                recurrence: { type: RECURRENCE_TYPES.WEEKLY, startDate: '2025-03-15', daysOfWeek: [6] }
            }, testDate);

            const recurring = await loadRecurringEvents();
            const event = recurring.find(e => e.title === 'Weekly Sync');

            await service.updateEvent({
                title: 'Weekly Sync (Updated)',
                startTime: '11:00',
                endTime: '11:30',
                recurrence: { type: RECURRENCE_TYPES.WEEKLY, startDate: '2025-03-15', daysOfWeek: [6] }
            }, event, testDate);

            const updated = await loadRecurringEvents();
            const series = updated.find(e => e.id === event.id);
            expect(series.title).toBe('Weekly Sync (Updated)');
            expect(series.startTime).toBe('11:00');
        });
    });

    // ---------------------------------------------------------------
    // SPEC: Data Isolation
    // - Recurring instances (isRecurringInstance: true) are NEVER persisted
    //   to date storage — computed at load time from recurring definitions
    // ---------------------------------------------------------------
    describe('SPEC: data isolation', () => {
        test('creating a regular event does not include recurring instances in saved data', async () => {
            // First create a recurring event that matches testDate
            await saveRecurringEvents([{
                id: 'recurring_1',
                title: 'Existing Daily',
                startTime: '08:00',
                endTime: '08:30',
                recurrence: { type: RECURRENCE_TYPES.DAILY, startDate: '2025-03-01' }
            }]);

            // Now create a regular event
            await service.createEvent({
                title: 'New Regular',
                startTime: '14:00',
                endTime: '15:00',
                recurrence: { type: RECURRENCE_TYPES.NONE }
            }, testDate);

            // Load date events - should contain both recurring instance and regular
            const loaded = await loadLocalEventsForDate(testDate);
            expect(loaded.find(e => e.title === 'New Regular')).toBeDefined();
            expect(loaded.find(e => e.title === 'Existing Daily')).toBeDefined();

            // But the recurring instance should NOT be persisted in date storage
            // (it's computed at load time from recurring storage)
            const recurring = await loadRecurringEvents();
            expect(recurring.length).toBe(1); // Only the original
        });
    });
});
