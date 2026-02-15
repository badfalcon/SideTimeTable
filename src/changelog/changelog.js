/**
 * Changelog - Standalone release notes page
 */
import { RELEASE_NOTES } from '../lib/release-notes.js';

function renderReleaseNotes(lang) {
    const container = document.getElementById('release-notes-container');
    if (!container) return;

    RELEASE_NOTES.forEach(entry => {
        const section = document.createElement('div');
        section.className = 'version-section';

        // Version + date header
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

        // Highlights list
        const highlights = entry.highlights[lang] || entry.highlights['en'] || [];
        if (highlights.length > 0) {
            const list = document.createElement('ul');
            highlights.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                list.appendChild(li);
            });
            section.appendChild(list);
        }

        container.appendChild(section);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    // Resolve language from chrome.storage.sync (same source as localize.js)
    let lang = 'en';
    if (window.getCurrentLanguageSetting && window.resolveLanguageCode) {
        try {
            const setting = await window.getCurrentLanguageSetting();
            lang = window.resolveLanguageCode(setting);
        } catch (error) {
            console.warn('Language detection error:', error);
        }
    }

    // Localize HTML elements (title, heading, description)
    if (window.localizeHtmlPageWithLang) {
        try {
            await window.localizeHtmlPageWithLang();
        } catch (error) {
            console.warn('Localization error:', error);
        }
    }

    renderReleaseNotes(lang);

    // Show page
    document.body.style.opacity = '1';
    document.body.style.transition = 'opacity 0.1s';
});
