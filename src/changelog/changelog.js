/**
 * Changelog - Standalone release notes page
 */
import { RELEASE_NOTES, formatReleaseDate } from '../lib/release-notes.js';
import { loadSettings } from '../lib/settings-storage.js';
import { getThemeById, resolveThemeColors } from '../lib/color-themes.js';

function message(key, fallback) {
    const text = window.getLocalizedMessage?.(key);
    return text && text !== key ? text : fallback;
}

function renderReleaseNotes(lang) {
    const container = document.getElementById('release-notes-container');
    if (!container) return;

    RELEASE_NOTES.forEach((entry, index) => {
        const section = document.createElement('article');
        section.className = 'changelog-entry';

        // Version (the newest marked) and date
        const meta = document.createElement('div');
        meta.className = 'changelog-entry-meta';

        const versionLine = document.createElement('div');
        versionLine.className = 'changelog-entry-version';

        const version = document.createElement('h2');
        version.className = 'changelog-version-chip';
        version.textContent = `v${entry.version}`;
        versionLine.appendChild(version);

        if (index === 0) {
            const latest = document.createElement('span');
            latest.className = 'changelog-latest';
            latest.textContent = message('changelogLatest', 'Latest');
            versionLine.appendChild(latest);
        }
        meta.appendChild(versionLine);

        const date = document.createElement('time');
        date.className = 'changelog-date';
        date.dateTime = entry.date;
        date.textContent = formatReleaseDate(entry.date, lang);
        meta.appendChild(date);

        section.appendChild(meta);

        // What changed
        const highlights = entry.highlights[lang] || entry.highlights['en'] || [];
        const list = document.createElement('ul');
        list.className = 'changelog-entry-list';
        highlights.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            list.appendChild(li);
        });
        section.appendChild(list);

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

    // Apply color theme
    try {
        const settings = await loadSettings();
        const themeId = settings.colorTheme || (settings.darkMode ? 'dark' : 'default');
        const theme = getThemeById(themeId);
        const { cssVars } = resolveThemeColors(theme);

        for (const [varName, value] of Object.entries(cssVars)) {
            document.documentElement.style.setProperty(varName, value);
        }

        if (theme.isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    } catch (error) {
        console.warn('Failed to apply color theme:', error);
    }

    renderReleaseNotes(lang);

    // Show page
    document.body.style.opacity = '1';
    document.body.style.transition = 'opacity 0.1s';
});
