/**
 * OutlookCalendarManagementCard - Calendar selection for Outlook
 *
 * Extends CalendarManagementCard to reuse shared UI logic (list rendering,
 * checkbox toggle, loading states) while overriding provider-specific behavior
 * (storage keys, message actions).
 */
import { CalendarManagementCard } from './calendar-management-card.js';
import { logError } from '../../../lib/utils.js';
import { StorageHelper } from '../../../lib/storage-helper.js';
import { sendMessage } from '../../../lib/chrome-messaging.js';

export class OutlookCalendarManagementCard extends CalendarManagementCard {
    constructor(onCalendarSelectionChange) {
        super(onCalendarSelectionChange);

        // Override card options that CardComponent uses during createElement()
        this.options.id = 'outlook-calendar-management-card';
        this.options.title = 'Outlook Calendar Management';
        this.options.titleLocalize = '__MSG_outlookCalendarSelection__';
        this.options.subtitle = 'Select Outlook Calendars to display.';
        this.options.subtitleLocalize = '__MSG_outlookCalendarSelectionDescription__';
        this.options.icon = 'fas fa-calendar-alt';
        this.options.iconColor = 'text-info';
        this.options.hidden = true;
        this.id = this.options.id;
    }

    /**
     * Override loadData to use Outlook storage keys
     */
    async loadData() {
        try {
            const data = await StorageHelper.getLocal(['selectedOutlookCalendars'], { selectedOutlookCalendars: [] });
            this.selectedCalendarIds = Array.isArray(data.selectedOutlookCalendars) ? data.selectedOutlookCalendars : [];
            this.render();
        } catch (error) {
            logError('Outlook calendar data loading', error);
        }
    }

    /**
     * Override refreshCalendars to use Outlook API
     */
    async refreshCalendars() {
        this._setLoading(true);
        try {
            const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
            const response = await sendMessage({ action: 'getOutlookCalendarList', requestId });

            if (response.error) {
                throw new Error(response.error);
            }

            if (response.calendars) {
                this.allCalendars = response.calendars;

                // Auto-select default calendar only on first use (no calendars selected yet)
                if (this.selectedCalendarIds.length === 0) {
                    const defaultCal = response.calendars.find(cal => cal.primary);
                    if (defaultCal) {
                        this.selectedCalendarIds = [defaultCal.id];
                    }
                }

                await StorageHelper.setLocal({ selectedOutlookCalendars: this.selectedCalendarIds });
                this.render();
            }
        } catch (error) {
            logError('Outlook calendar list update', error);
            this._showError(`Failed to update Outlook calendars: ${error.message || 'Unknown error'}`);
        } finally {
            this._setLoading(false);
        }
    }

    /**
     * Override _handleCalendarToggle to use Outlook storage keys
     * @private
     */
    async _handleCalendarToggle(event) {
        const calendarId = event.target.closest('[data-calendar-id]')?.dataset.calendarId;
        if (!calendarId) return;

        if (event.target.checked) {
            if (!this.selectedCalendarIds.includes(calendarId)) {
                this.selectedCalendarIds.push(calendarId);
            }
        } else {
            this.selectedCalendarIds = this.selectedCalendarIds.filter(id => id !== calendarId);
        }

        try {
            await StorageHelper.setLocal({ selectedOutlookCalendars: this.selectedCalendarIds });
            if (this.onCalendarSelectionChange) {
                this.onCalendarSelectionChange(this.selectedCalendarIds);
            }
        } catch (error) {
            logError('Outlook calendar selection save', error);
            this._showError('Failed to save settings');
        }
    }
}
