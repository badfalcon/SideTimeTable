/**
 * WhatsNewCard - Release notes display card for options page
 */
import { CardComponent } from '../base/card-component.js';
import { RELEASE_NOTES } from '../../../lib/release-notes.js';

export class WhatsNewCard extends CardComponent {
    constructor() {
        super({
            title: "What's New",
            titleLocalize: '__MSG_whatsNewTitle__',
            subtitle: 'Recent updates and new features.',
            subtitleLocalize: '__MSG_whatsNewDescription__',
            icon: 'fas fa-bullhorn',
            iconColor: 'text-info'
        });
    }

    createElement() {
        const card = super.createElement();

        const container = document.createElement('div');
        container.className = 'whats-new-options-list';

        const lang = this._getCurrentLanguage();

        RELEASE_NOTES.forEach((entry, index) => {
            const section = document.createElement('div');
            section.className = 'whats-new-options-section';

            // Version header
            const header = document.createElement('div');
            header.className = 'd-flex align-items-center gap-2 mb-2';

            const badge = document.createElement('span');
            badge.className = 'badge bg-primary';
            badge.textContent = `v${entry.version}`;
            header.appendChild(badge);

            const dateLabel = document.createElement('small');
            dateLabel.className = 'text-muted';
            dateLabel.textContent = entry.date;
            header.appendChild(dateLabel);

            section.appendChild(header);

            // Highlights
            const highlights = entry.highlights[lang] || entry.highlights['en'] || [];
            if (highlights.length > 0) {
                const list = document.createElement('ul');
                list.className = 'mb-0 ps-3';
                list.style.fontSize = '0.9em';

                highlights.forEach(item => {
                    const li = document.createElement('li');
                    li.className = 'text-secondary';
                    li.textContent = item;
                    list.appendChild(li);
                });

                section.appendChild(list);
            }

            // Separator between versions (except last)
            if (index < RELEASE_NOTES.length - 1) {
                const hr = document.createElement('hr');
                hr.className = 'my-3';
                section.appendChild(hr);
            }

            container.appendChild(section);
        });

        this.addContent(container);

        return card;
    }

    /**
     * Get the current UI language
     * @returns {string} Language code ('en' or 'ja')
     * @private
     */
    _getCurrentLanguage() {
        const storedLang = localStorage.getItem('sideTimeTableLang');
        if (storedLang) {
            return storedLang;
        }
        if (chrome.i18n && chrome.i18n.getUILanguage) {
            const uiLang = chrome.i18n.getUILanguage().toLowerCase();
            return uiLang.startsWith('ja') ? 'ja' : 'en';
        }
        return 'en';
    }
}
