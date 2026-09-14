/**
 * Tests for CalendarGroupManager — group creation / editing flow
 *
 * Behavioral contracts tested:
 * 1. Creating a group from the "Add group" button persists a new group
 * 2. Editing an existing group persists the edited name / calendar list
 * 3. A failed save rolls back and leaves the modal usable for a retry
 *
 * The modal DOM is stubbed out (`_buildGroupModal`) so these tests exercise
 * the state wiring — which array the submit handler mutates — without needing
 * a full DOM environment.
 */

import { CalendarGroupManager } from '../../src/options/components/calendar/calendar-group-manager.js';
import { loadCalendarGroups } from '../../src/lib/settings-storage.js';

const ALL_CALENDARS = [
    { id: 'primary@example.com', summary: 'Primary', primary: true },
    { id: 'work@example.com', summary: 'Work' },
    { id: 'private@example.com', summary: 'Private' }
];

function makeCheckbox(value, checked) {
    return { value, checked };
}

describe('CalendarGroupManager', () => {
    let manager;
    let callbacks;
    let submitHandler;

    beforeEach(() => {
        resetChromeStorage();
        jest.clearAllMocks();

        global.getLocalizedMessage = jest.fn(() => null);
        global.document = {
            activeElement: null,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            body: { appendChild: jest.fn() }
        };

        callbacks = {
            setCalendarGroups: jest.fn(),
            setSelectedCalendarIds: jest.fn(),
            onGroupsChanged: jest.fn(),
            onSelectionChanged: jest.fn()
        };
        manager = new CalendarGroupManager(callbacks);

        // Stub the modal DOM; capture the submit handler the manager wires up
        submitHandler = null;
        manager._buildGroupModal = jest.fn((editingGroup, allCalendars, onClose, onSubmit) => {
            submitHandler = (name, checkboxes) => onSubmit(name, checkboxes, editingGroup);
            return {
                overlay: { remove: jest.fn() },
                nameInput: { focus: jest.fn() },
                keyHandler: jest.fn()
            };
        });
    });

    afterEach(() => {
        manager.destroy();
        delete global.document;
        delete global.getLocalizedMessage;
    });

    // ---------------------------------------------------------------
    // SPEC: "Add group" creates and persists a new group
    // Regression: the create path used to receive no group array and threw
    // ---------------------------------------------------------------
    describe('handleAddGroup', () => {
        it('creates a new group and persists it', async () => {
            const calendarGroups = [];

            manager.handleAddGroup(ALL_CALENDARS, calendarGroups);
            await submitHandler('Team', [makeCheckbox('work@example.com', true)]);

            expect(calendarGroups).toHaveLength(1);
            expect(calendarGroups[0]).toMatchObject({
                name: 'Team',
                calendarIds: ['work@example.com'],
                collapsed: false
            });

            const stored = await loadCalendarGroups();
            expect(stored).toHaveLength(1);
            expect(stored[0].name).toBe('Team');
            expect(callbacks.onGroupsChanged).toHaveBeenCalled();
        });

        it('appends to existing groups instead of replacing them', async () => {
            const calendarGroups = [
                { id: 'group_existing', name: 'Existing', calendarIds: [], collapsed: false }
            ];

            manager.handleAddGroup(ALL_CALENDARS, calendarGroups);
            await submitHandler('Second', []);

            expect(calendarGroups.map(g => g.name)).toEqual(['Existing', 'Second']);
        });

        it('falls back to a default name when the name is empty', async () => {
            const calendarGroups = [];

            manager.handleAddGroup(ALL_CALENDARS, calendarGroups);
            await submitHandler('', []);

            expect(calendarGroups).toHaveLength(1);
            expect(calendarGroups[0].name).toBe('New Group');
        });

        it('allows a retry after a failed save', async () => {
            const calendarGroups = [];
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();
            const setSpy = jest.spyOn(chrome.storage.sync, 'set');
            setSpy.mockImplementationOnce(() => { throw new Error('quota'); });

            manager.handleAddGroup(ALL_CALENDARS, calendarGroups);
            await submitHandler('First try', []);

            // Rolled back — the failed group is not kept
            expect(calendarGroups).toHaveLength(0);

            await submitHandler('Second try', []);

            expect(calendarGroups.map(g => g.name)).toEqual(['Second try']);
            const stored = await loadCalendarGroups();
            expect(stored.map(g => g.name)).toEqual(['Second try']);
            setSpy.mockRestore();
            errorSpy.mockRestore();
        });
    });

    // ---------------------------------------------------------------
    // SPEC: editing an existing group persists the change
    // ---------------------------------------------------------------
    describe('handleStartRenameGroup', () => {
        it('updates the existing group in place', async () => {
            const calendarGroups = [
                { id: 'group_1', name: 'Old', calendarIds: ['work@example.com'], collapsed: false }
            ];

            manager.handleStartRenameGroup('group_1', calendarGroups, ALL_CALENDARS);
            await submitHandler('New name', [
                makeCheckbox('work@example.com', false),
                makeCheckbox('private@example.com', true)
            ]);

            expect(calendarGroups).toHaveLength(1);
            expect(calendarGroups[0]).toMatchObject({
                id: 'group_1',
                name: 'New name',
                calendarIds: ['private@example.com']
            });

            const stored = await loadCalendarGroups();
            expect(stored[0].name).toBe('New name');
        });

        it('does nothing for an unknown group id', () => {
            manager.handleStartRenameGroup('missing', [], ALL_CALENDARS);
            expect(manager._buildGroupModal).not.toHaveBeenCalled();
        });
    });
});
