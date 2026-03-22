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

        // Override card metadata for Outlook
        this._cardOptions = {
            id: 'outlook-calendar-management-card',
            title: 'Outlook Calendar Management',
            titleLocalize: '__MSG_outlookCalendarSelection__',
            subtitle: 'Select Outlook Calendars to display.',
            subtitleLocalize: '__MSG_outlookCalendarSelectionDescription__',
            icon: 'fas fa-calendar-alt',
            iconColor: 'text-info',
            hidden: true
        };
        // Re-apply card options (CardComponent stores these in constructor)
        this.id = this._cardOptions.id;
    }

    /**
     * Override createElement to apply Outlook-specific card options
     */
    createElement() {
        // Temporarily override the title/subtitle before creating the element
        if (this.titleElement) {
            this.titleElement.textContent = this._cardOptions.title;
        }
        const card = super.createElement();

        // Update title and subtitle elements after creation
        if (this.element) {
            const titleEl = this.element.querySelector('.card-title, [data-localize]');
            if (titleEl && titleEl.getAttribute('data-localize') === '__MSG_calendarSelection__') {
                titleEl.setAttribute('data-localize', '__MSG_outlookCalendarSelection__');
                titleEl.textContent = window.getLocalizedMessage('outlookCalendarSelection') || this._cardOptions.title;
            }
            const subtitleEl = this.element.querySelector('.text-muted[data-localize="__MSG_calendarSelectionDescription__"]');
            if (subtitleEl) {
                subtitleEl.setAttribute('data-localize', '__MSG_outlookCalendarSelectionDescription__');
                subtitleEl.textContent = window.getLocalizedMessage('outlookCalendarSelectionDescription') || this._cardOptions.subtitle;
            }
            const iconEl = this.element.querySelector('.text-success');
            if (iconEl) {
                iconEl.classList.remove('text-success');
                iconEl.classList.add('text-info');
            }
        }

        return card;
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

                if (this.selectedCalendarIds.length === 0) {
                    const defaultCal = response.calendars.find(cal => cal.primary);
                    if (defaultCal) {
                        this.selectedCalendarIds = [defaultCal.id];
                    }
                }

                // Ensure default calendar is included
                const defaultCal = response.calendars.find(cal => cal.primary);
                if (defaultCal && !this.selectedCalendarIds.includes(defaultCal.id)) {
                    this.selectedCalendarIds.unshift(defaultCal.id);
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
