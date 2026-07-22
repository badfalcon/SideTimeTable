/**
 * ThemeService - Applies visual settings (color theme, dark mode, scrollbar).
 *
 * Reads settings from storage and writes CSS variables to document root.
 * Only touches document.documentElement.style — no component dependencies.
 */

import { loadSettings } from '../../lib/settings-storage.js';
import { getThemeById, resolveThemeColors } from '../../lib/color-themes.js';

export class ThemeService {

    /**
     * Apply the full theme (color theme + dark mode) based on stored settings.
     * @param {Object} [settings] - Pre-loaded settings, or null to load from storage
     * @returns {Promise<void>}
     */
    async applyTheme(settings) {
        if (!settings) {
            settings = await loadSettings();
        }

        const themeId = settings.colorTheme || (settings.darkMode ? 'dark' : 'default');
        const theme = getThemeById(themeId);
        const { cssVars } = resolveThemeColors(theme);

        for (const [varName, value] of Object.entries(cssVars)) {
            document.documentElement.style.setProperty(varName, value);
        }

        // Apply dark mode attribute for CSS overrides
        if (theme.isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    /**
     * Apply the thin scrollbar setting.
     * @param {Object} [settings] - Pre-loaded settings, or null to load from storage
     * @returns {Promise<void>}
     */
    async applyScrollbarSetting(settings) {
        if (!settings) {
            settings = await loadSettings();
        }
        document.body.classList.toggle('thin-scrollbar', !!settings.thinScrollbar);
    }
}
