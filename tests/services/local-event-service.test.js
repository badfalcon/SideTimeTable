import { LocalEventService } from '../../src/side_panel/services/local-event-service.js';
import { RECURRENCE_TYPES } from '../../src/lib/constants.js';

// Mock dependencies
jest.mock('../../src/lib/event-storage.js', () => ({
    loadLocalEventsForDate: jest.fn().mockResolvedValue([]),
    saveLocalEventsForDate: jest.fn().mockResolvedValue(),
    loadRecurringEvents: jest.fn().mockResolvedValue([]),
    saveRecurringEvents: jest.fn().mockResolvedValue(),
    addRecurringEventException: jest.fn().mockResolvedValue(),
    deleteRecurringEvent: jest.fn().mockResolvedValue()
}));

jest.mock('../../src/lib/utils.js', () => ({
    getFormattedDateFromDate: jest.fn((date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    })
}));

jest.mock('../../src/lib/alarm-manager.js', () => ({
    AlarmManager: {
        setReminder: jest.fn().mockResolvedValue(),
        clearReminder: jest.fn().mockResolvedValue()
    }
}));

const {
    loadLocalEventsForDate, saveLocalEventsForDate,
    loadRecurringEvents, saveRecurringEvents,
    addRecurringEventException, deleteRecurringEvent
} = require('../../src/lib/event-storage.js');
const { AlarmManager } = require('../../src/lib/alarm-manager.js');

describe('LocalEventService', () => {
    let service;
    const testDate = new Date(2025, 2, 15);

    beforeEach(() => {
        service = new LocalEventService();
        jest.clearAllMocks();
        loadLocalEventsForDate.mockResolvedValue([]);
        loadRecurringEvents.mockResolvedValue([]);
    });

    describe('generateId', () => {
        test('returns a string starting with local_', () => {
            const id = LocalEventService.generateId();
            expect(typeof id).toBe('string');
            expect(id.startsWith('local_')).toBe(true);
        });

        test('generates unique IDs', () => {
            const ids = new Set(Array.from({ length: 100 }, () => LocalEventService.generateId()));
            expect(ids.size).toBe(100);
        });
    });

    describe('createEvent', () => {
        test('creates a non-recurring event and saves to local storage', async () => {
            const eventData = {
                title: 'Meeting',
                startTime: '10:00',
                endTime: '11:00',
                recurrence: { type: RECURRENCE_TYPES.NONE }
            };

            await service.createEvent(eventData, testDate);

            expect(saveLocalEventsForDate).toHaveBeenCalledTimes(1);
            const savedEvents = saveLocalEventsForDate.mock.calls[0][0];
            expect(savedEvents.length).toBe(1);
            expect(savedEvents[0].title).toBe('Meeting');
            expect(savedEvents[0].startTime).toBe('10:00');
            expect(savedEvents[0].reminder).toBe(true);
        });

        test('creates a recurring event and saves to recurring storage', async () => {
            const eventData = {
                title: 'Standup',
                startTime: '09:00',
                endTime: '09:15',
                recurrence: { type: RECURRENCE_TYPES.DAILY, startDate: '2025-03-15' }
            };

            await service.createEvent(eventData, testDate);

            expect(saveRecurringEvents).toHaveBeenCalledTimes(1);
            expect(saveLocalEventsForDate).not.toHaveBeenCalled();
        });

        test('sets reminder for non-recurring event with reminder enabled', async () => {
            const eventData = {
                title: 'Call',
                startTime: '14:00',
                endTime: '15:00',
                reminder: true,
                recurrence: { type: RECURRENCE_TYPES.NONE }
            };

            await service.createEvent(eventData, testDate);
            expect(AlarmManager.setReminder).toHaveBeenCalled();
        });

        test('does not set reminder when reminder is false', async () => {
            const eventData = {
                title: 'Optional',
                startTime: '14:00',
                endTime: '15:00',
                reminder: false,
                recurrence: { type: RECURRENCE_TYPES.NONE }
            };

            await service.createEvent(eventData, testDate);
            expect(AlarmManager.setReminder).not.toHaveBeenCalled();
        });

        test('filters out recurring instances from local events before saving', async () => {
            loadLocalEventsForDate.mockResolvedValue([
                { id: 'rec1', title: 'Recurring', isRecurringInstance: true },
                { id: 'local1', title: 'Local' }
            ]);

            const eventData = {
                title: 'New',
                startTime: '10:00',
                endTime: '11:00',
                recurrence: { type: RECURRENCE_TYPES.NONE }
            };

            await service.createEvent(eventData, testDate);
            const savedEvents = saveLocalEventsForDate.mock.calls[0][0];
            // Should contain existing local + new, but not recurring instance
            expect(savedEvents.length).toBe(2);
            expect(savedEvents.find(e => e.isRecurringInstance)).toBeUndefined();
        });
    });

    describe('deleteEvent', () => {
        test('deletes a regular event', async () => {
            const event = { id: 'local1', title: 'Test' };
            loadLocalEventsForDate.mockResolvedValue([event]);

            await service.deleteEvent(event, null, testDate);

            expect(AlarmManager.clearReminder).toHaveBeenCalledWith('local1', '2025-03-15');
            expect(saveLocalEventsForDate).toHaveBeenCalledWith([], testDate);
        });

        test('deletes all instances of a recurring event', async () => {
            const event = { id: 'rec1', isRecurringInstance: true, originalId: 'orig1' };

            await service.deleteEvent(event, 'all', testDate);

            expect(deleteRecurringEvent).toHaveBeenCalledWith('orig1');
        });

        test('deletes single instance of a recurring event', async () => {
            const event = {
                id: 'rec1',
                isRecurringInstance: true,
                originalId: 'orig1',
                instanceDate: '2025-03-15'
            };

            await service.deleteEvent(event, 'this', testDate);

            expect(addRecurringEventException).toHaveBeenCalledWith('orig1', '2025-03-15');
        });
    });

    describe('updateEvent', () => {
        test('updates a regular event', async () => {
            const currentEvent = { id: 'local1', title: 'Old' };
            loadLocalEventsForDate.mockResolvedValue([currentEvent]);

            const eventData = {
                title: 'Updated',
                startTime: '10:00',
                endTime: '11:00',
                recurrence: { type: RECURRENCE_TYPES.NONE }
            };

            await service.updateEvent(eventData, currentEvent, testDate);

            expect(AlarmManager.clearReminder).toHaveBeenCalled();
            expect(saveLocalEventsForDate).toHaveBeenCalled();
            const savedEvents = saveLocalEventsForDate.mock.calls[0][0];
            expect(savedEvents[0].title).toBe('Updated');
        });

        test('converts regular event to recurring', async () => {
            const currentEvent = { id: 'local1', title: 'Old' };
            loadLocalEventsForDate.mockResolvedValue([currentEvent]);

            const eventData = {
                title: 'Now Recurring',
                startTime: '10:00',
                endTime: '11:00',
                recurrence: { type: RECURRENCE_TYPES.DAILY, startDate: '2025-03-15' }
            };

            await service.updateEvent(eventData, currentEvent, testDate);

            expect(saveRecurringEvents).toHaveBeenCalled();
            // Regular events list should have the event removed
            expect(saveLocalEventsForDate).toHaveBeenCalled();
        });

        test('updates a recurring event series', async () => {
            const currentEvent = {
                id: 'rec1',
                recurrence: { type: RECURRENCE_TYPES.DAILY, startDate: '2025-03-01' }
            };
            loadRecurringEvents.mockResolvedValue([currentEvent]);

            const eventData = {
                title: 'Updated Recurring',
                startTime: '09:00',
                endTime: '09:30',
                recurrence: { type: RECURRENCE_TYPES.WEEKLY, startDate: '2025-03-01', daysOfWeek: [1] }
            };

            await service.updateEvent(eventData, currentEvent, testDate);

            expect(saveRecurringEvents).toHaveBeenCalled();
            const savedEvents = saveRecurringEvents.mock.calls[0][0];
            expect(savedEvents[0].title).toBe('Updated Recurring');
            expect(savedEvents[0].recurrence.type).toBe(RECURRENCE_TYPES.WEEKLY);
        });

        test('converts recurring to date-specific', async () => {
            const currentEvent = {
                id: 'rec1',
                recurrence: { type: RECURRENCE_TYPES.DAILY, startDate: '2025-03-01' }
            };
            loadRecurringEvents.mockResolvedValue([currentEvent]);

            const eventData = {
                title: 'No Longer Recurring',
                startTime: '10:00',
                endTime: '11:00',
                recurrence: { type: RECURRENCE_TYPES.NONE }
            };

            await service.updateEvent(eventData, currentEvent, testDate);

            // Should save both: updated recurring list and new local event
            expect(saveRecurringEvents).toHaveBeenCalled();
            expect(saveLocalEventsForDate).toHaveBeenCalled();
        });
    });
});
