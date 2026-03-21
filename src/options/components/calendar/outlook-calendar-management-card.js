/**
 * OutlookCalendarManagementCard - Calendar selection for Outlook
 */
import { CardComponent } from '../base/card-component.js';
import { logError } from '../../../lib/utils.js';
import { StorageHelper } from '../../../lib/storage-helper.js';
import { sendMessage } from '../../../lib/chrome-messaging.js';

export class OutlookCalendarManagementCard extends CardComponent {
    constructor(onCalendarSelectionChange) {
        super({
            id: 'outlook-calendar-management-card',
            title: 'Outlook Calendar Management',
            titleLocalize: '__MSG_outlookCalendarSelection__',
            subtitle: 'Select Outlook Calendars to display.',
            subtitleLocalize: '__MSG_outlookCalendarSelectionDescription__',
            icon: 'fas fa-calendar-alt',
            iconColor: 'text-info',
            hidden: true
        });

        this.onCalendarSelectionChange = onCalendarSelectionChange;
        this.selectedCalendarIds = [];
        this.hasAutoFetched = false;
        this.allCalendars = [];
        this.refreshBtn = null;
        this.loadingIndicator = null;
        this.calendarList = null;
        this.noCalendarsMsg = null;
    }

    createElement() {
        const card = super.createElement();

        // Refresh button
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'd-flex align-items-center mb-3';

        this.refreshBtn = document.createElement('button');
        this.refreshBtn.className = 'btn btn-outline-primary btn-sm';
        this.refreshBtn.innerHTML = `
            <i class="fas fa-refresh me-1"></i>
            <span data-localize="__MSG_refreshCalendars__">Refresh</span>
        `;

        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.className = 'ms-2';
        this.loadingIndicator.style.display = 'none';
        this.loadingIndicator.innerHTML = `
            <div class="spinner-border spinner-border-sm text-primary" role="status">
                <span class="visually-hidden">${window.getLocalizedMessage('screenReaderLoading') || 'Loading...'}</span>
            </div>
        `;

        controlsDiv.appendChild(this.refreshBtn);
        controlsDiv.appendChild(this.loadingIndicator);
        this.addContent(controlsDiv);

        // Calendar list
        const listContainer = document.createElement('div');
        this.calendarList = document.createElement('div');
        this.calendarList.className = 'list-group';
        this.noCalendarsMsg = document.createElement('div');
        this.noCalendarsMsg.className = 'text-muted';
        this.noCalendarsMsg.style.display = 'none';
        this.noCalendarsMsg.setAttribute('data-localize', '__MSG_noCalendarsFound__');
        this.noCalendarsMsg.textContent = window.getLocalizedMessage('noCalendarsFound') || 'No calendars found.';
        listContainer.appendChild(this.calendarList);
        listContainer.appendChild(this.noCalendarsMsg);
        this.addContent(listContainer);

        this._setupEventListeners();
        return card;
    }

    _setupEventListeners() {
        this.refreshBtn?.addEventListener('click', () => this.refreshCalendars());
        this.calendarList?.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                this._handleCalendarToggle(e);
            }
        });
    }

    async loadData() {
        try {
            const data = await StorageHelper.get(['selectedOutlookCalendars'], { selectedOutlookCalendars: [] });
            this.selectedCalendarIds = Array.isArray(data.selectedOutlookCalendars) ? data.selectedOutlookCalendars : [];
            this.render();
        } catch (error) {
            logError('Outlook calendar data loading', error);
        }
    }

    show() {
        this.setVisible(true);
        if (!this.hasAutoFetched && (!this.allCalendars || this.allCalendars.length === 0)) {
            this.hasAutoFetched = true;
            this.refreshCalendars();
        }
    }

    hide() {
        this.setVisible(false);
    }

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

                await StorageHelper.set({ selectedOutlookCalendars: this.selectedCalendarIds });
                this.render();
            }
        } catch (error) {
            logError('Outlook calendar list update', error);
        } finally {
            this._setLoading(false);
        }
    }

    render() {
        if (!this.allCalendars || this.allCalendars.length === 0) {
            this.calendarList.innerHTML = '';
            this.noCalendarsMsg.style.display = 'block';
            return;
        }

        this.noCalendarsMsg.style.display = 'none';
        this.calendarList.innerHTML = '';

        const sorted = [...this.allCalendars].sort((a, b) => {
            if (a.primary && !b.primary) return -1;
            if (!a.primary && b.primary) return 1;
            return a.summary.localeCompare(b.summary);
        });

        sorted.forEach(calendar => {
            const isSelected = this.selectedCalendarIds.includes(calendar.id);
            const item = document.createElement('div');
            item.className = 'list-group-item d-flex align-items-center py-2';
            item.dataset.calendarId = calendar.id;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'form-check-input me-3';
            checkbox.checked = isSelected;
            if (calendar.primary) {
                checkbox.disabled = true;
                checkbox.checked = true;
            }

            const info = document.createElement('div');
            info.className = 'flex-grow-1';
            const name = document.createElement('div');
            name.className = 'fw-bold';
            name.textContent = calendar.summary;
            if (calendar.primary) name.classList.add('text-primary');
            info.appendChild(name);

            const colorIndicator = document.createElement('div');
            colorIndicator.className = 'me-2';
            colorIndicator.style.cssText = `width:12px;height:12px;background-color:${calendar.backgroundColor || '#0078d4'};border-radius:50%;border:1px solid #ddd;`;

            item.appendChild(checkbox);
            item.appendChild(info);
            item.appendChild(colorIndicator);
            this.calendarList.appendChild(item);
        });
    }

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
            await StorageHelper.set({ selectedOutlookCalendars: this.selectedCalendarIds });
            if (this.onCalendarSelectionChange) {
                this.onCalendarSelectionChange(this.selectedCalendarIds);
            }
        } catch (error) {
            logError('Outlook calendar selection save', error);
        }
    }

    _setLoading(loading) {
        if (this.loadingIndicator) this.loadingIndicator.style.display = loading ? 'block' : 'none';
        if (this.refreshBtn) this.refreshBtn.disabled = loading;
    }
}
