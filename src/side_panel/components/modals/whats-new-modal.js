/**
 * WhatsNewModal - Modal to display release notes and update highlights
 */
import { ModalComponent } from './modal-component.js';
import { getUnseenReleaseNotes } from '../../../lib/release-notes.js';
import { StorageHelper } from '../../../lib/storage-helper.js';

export class WhatsNewModal extends ModalComponent {
    constructor(options = {}) {
        super({
            id: 'whatsNewModal',
            closeOnBackdropClick: true,
            ...options
        });

        this.contentContainer = null;
        this.confirmButton = null;
    }

    createContent() {
        const content = document.createElement('div');
        content.className = 'whats-new-content';

        // Title
        const title = document.createElement('h2');
        title.className = 'modal-title';
        title.setAttribute('data-localize', '__MSG_whatsNewTitle__');
        title.textContent = "What's New";
        content.appendChild(title);

        // Release notes container (populated dynamically)
        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'whats-new-notes';
        content.appendChild(this.contentContainer);

        // Confirm button
        this.confirmButton = document.createElement('button');
        this.confirmButton.className = 'btn btn-primary whats-new-confirm-btn';
        this.confirmButton.setAttribute('data-localize', '__MSG_whatsNewConfirm__');
        this.confirmButton.textContent = 'Got it';
        content.appendChild(this.confirmButton);

        // Event listeners
        this.addEventListener(this.confirmButton, 'click', () => {
            this._markAsSeen();
            this.hide();
        });

        return content;
    }

    /**
     * Show the modal with unseen release notes
     * @param {string|null} lastSeenVersion - The last version the user saw
     */
    showForVersion(lastSeenVersion) {
        const currentVersion = chrome.runtime.getManifest().version;
        const unseenNotes = getUnseenReleaseNotes(lastSeenVersion, currentVersion);

        if (unseenNotes.length === 0) {
            // Nothing to show, just update the stored version
            this._markAsSeen();
            return;
        }

        // Determine language
        const lang = this._getCurrentLanguage();

        // Build the release notes UI
        this._renderNotes(unseenNotes, lang);

        this.show();
    }

    /**
     * Render release notes into the content container
     * @param {Array} notes - Release note entries
     * @param {string} lang - Language code ('en' or 'ja')
     * @private
     */
    _renderNotes(notes, lang) {
        this.contentContainer.innerHTML = '';

        notes.forEach((entry, index) => {
            const section = document.createElement('div');
            section.className = 'whats-new-version-section';

            // Version header
            const header = document.createElement('div');
            header.className = 'whats-new-version-header';

            const versionLabel = document.createElement('span');
            versionLabel.className = 'whats-new-version-label';
            versionLabel.textContent = `v${entry.version}`;
            header.appendChild(versionLabel);

            const dateLabel = document.createElement('span');
            dateLabel.className = 'whats-new-version-date';
            dateLabel.textContent = entry.date;
            header.appendChild(dateLabel);

            section.appendChild(header);

            // Highlights list
            const highlights = entry.highlights[lang] || entry.highlights['en'] || [];
            if (highlights.length > 0) {
                const list = document.createElement('ul');
                list.className = 'whats-new-highlights';

                highlights.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = item;
                    list.appendChild(li);
                });

                section.appendChild(list);
            }

            // Add separator between versions (except last)
            if (index < notes.length - 1) {
                const separator = document.createElement('hr');
                separator.className = 'whats-new-separator';
                section.appendChild(separator);
            }

            this.contentContainer.appendChild(section);
        });
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

    /**
     * Mark the current version as seen
     * @private
     */
    async _markAsSeen() {
        try {
            const currentVersion = chrome.runtime.getManifest().version;
            await StorageHelper.set({ lastSeenVersion: currentVersion });
        } catch (error) {
            console.warn('Failed to save lastSeenVersion:', error);
        }
    }

    /**
     * Override hide to also mark as seen
     */
    hide() {
        this._markAsSeen();
        super.hide();
    }
}
