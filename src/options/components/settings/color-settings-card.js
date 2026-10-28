/**
 * ColorSettingsCard — Theme (colour-set) selection card.
 *
 * Replaces the former individual colour-picker UI with a complete preset
 * selection approach based on Material Design 3 palette roles.
 */
import { CardComponent } from '../base/card-component.js';
import { COLOR_THEMES, getThemeById, resolveThemeColors } from '../../../lib/color-themes.js';
import { createIcon, createSettingRow, createSwitch, msg } from '../base/settings-dom.js';

export class ColorSettingsCard extends CardComponent {
    constructor(onSettingsChange) {
        super({
            title: 'Color Theme',
            titleLocalize: '__MSG_colorThemeSettings__',
            subtitle: 'Choose the colours of the side panel.',
            subtitleLocalize: '__MSG_colorThemeDescription__',
            icon: 'fas fa-palette'
        });

        this.onSettingsChange = onSettingsChange;
        this.selectedThemeId = 'default';
        this.useGoogleCalendarColors = true;
        this._themeCards = new Map();   // id → HTMLElement
        this._googleColorsToggle = null;
    }

    createElement() {
        const card = super.createElement();
        const grid = this._createThemeGrid();
        this.addContent(grid);

        const googleColorsToggle = this._createGoogleCalendarColorsToggle();
        this.addContent(googleColorsToggle);

        return card;
    }

    // ------------------------------------------------------------------
    // Theme grid
    // ------------------------------------------------------------------

    _createThemeGrid() {
        const container = document.createElement('div');
        container.className = 'theme-grid';

        for (const theme of COLOR_THEMES) {
            const themeCard = this._createThemeCard(theme);
            container.appendChild(themeCard);
            this._themeCards.set(theme.id, themeCard);
        }

        return container;
    }

    /**
     * A tile with a miniature side panel in the theme's colours: header
     * strip, a Google and a local event block (tinted as the timeline draws
     * them) and the current-time line.
     * @private
     */
    _createThemeCard(theme) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'theme-card';
        card.dataset.themeId = theme.id;
        card.setAttribute('aria-pressed', 'false');

        // The theme's own colours are data, so they go in as custom properties
        const preview = document.createElement('span');
        preview.className = `theme-preview${theme.isDark ? ' is-dark' : ''}`;
        preview.setAttribute('aria-hidden', 'true');
        const { palette } = theme;
        preview.style.setProperty('--preview-bg', palette.background);
        preview.style.setProperty('--preview-surface', palette.surface || palette.background);
        preview.style.setProperty('--preview-google', palette.primary);
        preview.style.setProperty('--preview-local', palette.secondary);
        preview.style.setProperty('--preview-now', palette.indicator);

        const header = document.createElement('span');
        header.className = 'theme-preview-header';
        preview.appendChild(header);
        for (const kind of ['google', 'local']) {
            const block = document.createElement('span');
            block.className = `theme-preview-block is-${kind}`;
            const line = document.createElement('span');
            line.className = 'theme-preview-line';
            block.appendChild(line);
            preview.appendChild(block);
        }
        const now = document.createElement('span');
        now.className = 'theme-preview-now';
        preview.appendChild(now);

        // Theme name, with a check while selected
        const name = document.createElement('span');
        name.className = 'theme-card-name';
        name.appendChild(createIcon('fas fa-check theme-card-check'));
        const label = document.createElement('span');
        label.setAttribute('data-localize', `__MSG_${theme.nameKey}__`);
        label.textContent = msg(theme.nameKey, theme.id);
        name.appendChild(label);

        card.appendChild(preview);
        card.appendChild(name);

        // Click handler
        card.addEventListener('click', () => {
            this._selectTheme(theme.id);
        });

        return card;
    }

    // ------------------------------------------------------------------
    // Google Calendar colors toggle
    // ------------------------------------------------------------------

    _createGoogleCalendarColorsToggle() {
        this._googleColorsToggle = createSwitch('use-google-calendar-colors-toggle', this.useGoogleCalendarColors);
        const { row } = createSettingRow({
            labelKey: 'useGoogleCalendarColorsLabel',
            labelFallback: 'Use Google Calendar colors',
            labelFor: 'use-google-calendar-colors-toggle',
            hintKey: 'useGoogleCalendarColorsHelp',
            hintFallback: 'When off, every Google event uses the theme colour.',
            control: this._googleColorsToggle
        });
        // Only meaningful with Google connected
        row.style.display = 'none';
        this._googleColorsContainer = row;

        this._googleColorsToggle.addEventListener('change', () => {
            this.useGoogleCalendarColors = this._googleColorsToggle.checked;
            this._notifyChange();
        });

        return row;
    }

    _notifyChange() {
        if (this.onSettingsChange) {
            const theme = getThemeById(this.selectedThemeId);
            const { colorSettings } = resolveThemeColors(theme);
            this.onSettingsChange({
                colorTheme: this.selectedThemeId,
                isDark: theme.isDark,
                useGoogleCalendarColors: this.useGoogleCalendarColors,
                ...colorSettings
            });
        }
    }

    // ------------------------------------------------------------------
    // Selection logic
    // ------------------------------------------------------------------

    _selectTheme(themeId) {
        this.selectedThemeId = themeId;
        this._updateHighlight();
        this._notifyChange();
    }

    _updateHighlight() {
        for (const [id, el] of this._themeCards) {
            const selected = id === this.selectedThemeId;
            el.classList.toggle('is-selected', selected);
            el.setAttribute('aria-pressed', String(selected));
        }
    }

    // ------------------------------------------------------------------
    // Public API (used by OptionsPageManager)
    // ------------------------------------------------------------------

    /**
     * Restore state from stored settings.
     * Accepts { colorTheme: 'dark' } or legacy colour keys.
     */
    updateSettings(settings) {
        if (settings.colorTheme) {
            this.selectedThemeId = settings.colorTheme;
        }
        if (settings.useGoogleCalendarColors !== undefined) {
            this.useGoogleCalendarColors = settings.useGoogleCalendarColors;
            if (this._googleColorsToggle) {
                this._googleColorsToggle.checked = this.useGoogleCalendarColors;
            }
        }
        this._updateHighlight();
    }

    getSettings() {
        const theme = getThemeById(this.selectedThemeId);
        const { colorSettings } = resolveThemeColors(theme);
        return {
            colorTheme: this.selectedThemeId,
            isDark: theme.isDark,
            useGoogleCalendarColors: this.useGoogleCalendarColors,
            ...colorSettings
        };
    }

    setGoogleCalendarColorsToggleVisible(visible) {
        if (this._googleColorsContainer) {
            this._googleColorsContainer.style.display = visible ? '' : 'none';
        }
    }

    resetToDefaults() {
        this.useGoogleCalendarColors = true;
        if (this._googleColorsToggle) {
            this._googleColorsToggle.checked = true;
        }
        this._selectTheme('default');
    }
}
