/**
 * WhatsNewModal - Modal to display release notes and update highlights
 *
 * Laid out like the event dialogs: a sticky header (title, close), the notes
 * scrolling between it and a sticky footer ("don't show again", OK).
 */
import { ModalComponent } from './modal-component.js';
import { createButton, createCloseButton, setLocalizedText } from './event-dialog-dom.js';
import { RELEASE_NOTES, getUnseenReleaseNotes } from '../../../lib/release-notes.js';
import { StorageHelper } from '../../../lib/storage-helper.js';
import { saveSettings } from '../../../lib/settings-storage.js';
import { logError } from '../../../lib/utils.js';

export class WhatsNewModal extends ModalComponent {
    constructor(options = {}) {
        super({
            id: 'whatsNewModal',
            closeOnBackdropClick: true,
            ...options
        });

        this.contentContainer = null;
        this.confirmButton = null;
        this.dontShowAgainCheckbox = null;
    }

    createContent() {
        const content = document.createElement('div');
        content.className = 'whats-new-content';

        const header = document.createElement('header');
        header.className = 'event-form-header';
        const title = document.createElement('h2');
        title.className = 'event-form-title';
        title.id = 'whatsNewTitle';
        header.appendChild(setLocalizedText(title, 'whatsNewTitle', "What's New"));
        header.appendChild(createCloseButton(this, () => this.hide()));
        content.appendChild(header);

        // Release notes (populated dynamically)
        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'whats-new-notes';
        content.appendChild(this.contentContainer);

        const footer = document.createElement('footer');
        footer.className = 'event-form-footer whats-new-footer';

        // "Don't show again" beside the button; the label may wrap in a
        // narrow panel, so the footer grows rather than clipping it
        const dontShow = document.createElement('label');
        dontShow.className = 'whats-new-dont-show-again';
        dontShow.htmlFor = 'whatsNewDontShowAgainToggle';

        this.dontShowAgainCheckbox = document.createElement('input');
        this.dontShowAgainCheckbox.type = 'checkbox';
        this.dontShowAgainCheckbox.className = 'event-form-check-input';
        this.dontShowAgainCheckbox.id = 'whatsNewDontShowAgainToggle';
        dontShow.appendChild(this.dontShowAgainCheckbox);
        dontShow.appendChild(setLocalizedText(
            document.createElement('span'), 'whatsNewDontShowAgain', "Don't show this again on updates"
        ));
        footer.appendChild(dontShow);

        this.confirmButton = createButton(this, {
            variant: 'primary',
            msgKey: 'whatsNewConfirm',
            fallback: 'Got it',
            onClick: () => this.hide()
        });
        this.confirmButton.classList.add('whats-new-confirm-btn');
        footer.appendChild(this.confirmButton);
        content.appendChild(footer);

        return content;
    }

    createElement() {
        const element = super.createElement();
        element.setAttribute('role', 'dialog');
        element.setAttribute('aria-modal', 'true');
        element.setAttribute('aria-labelledby', 'whatsNewTitle');
        return element;
    }

    /**
     * Focus the OK button rather than the checkbox, which is the base
     * modal's "first input" and would open with a focus ring on it.
     * @private
     */
    _focusFirstInput() {
        setTimeout(() => this.confirmButton?.focus(), 100);
    }

    /**
     * Show the modal with unseen release notes
     * @param {string|null} lastSeenVersion - The last version the user saw
     */
    async showForVersion(lastSeenVersion) {
        const currentVersion = chrome.runtime.getManifest().version;
        const unseenNotes = getUnseenReleaseNotes(lastSeenVersion, currentVersion);

        if (unseenNotes.length === 0) {
            // Nothing to show, just update the stored version
            this._markAsSeen();
            return;
        }

        if (this.dontShowAgainCheckbox) {
            this.dontShowAgainCheckbox.checked = false;
        }
        const lang = await this._resolveLanguage();
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
     * Show the modal with all release notes (for browsing history)
     */
    async showAll() {
        if (this.dontShowAgainCheckbox) {
            this.dontShowAgainCheckbox.checked = false;
        }
        const lang = await this._resolveLanguage();
        this._renderNotes(RELEASE_NOTES, lang);
        this.show();
    }

    /**
     * Resolve language using chrome.storage.sync via localize.js globals
     * @returns {Promise<string>} Language code ('en' or 'ja')
     * @private
     */
    async _resolveLanguage() {
        try {
            const setting = await window.getCurrentLanguageSetting?.() || 'auto';
            return window.resolveLanguageCode?.(setting) || 'en';
        } catch (error) {
            console.warn('Language detection error:', error);
            return 'en';
        }
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
     * Override hide to persist the "don't show again" choice (if any) and mark the
     * version as seen. Honors all dismiss paths (confirm button, backdrop, ESC).
     * Calls super.hide() synchronously first so the modal flips to hidden before
     * any async writes — this prevents repeated ESC/backdrop events from re-entering.
     */
    hide() {
        const shouldDisableAutoShow = this.dontShowAgainCheckbox?.checked === true;
        super.hide();
        if (shouldDisableAutoShow) {
            saveSettings({ whatsNewAutoShow: false }).catch(error => {
                logError("What's New auto-show save", error);
            });
        }
        this._markAsSeen();
    }
}
