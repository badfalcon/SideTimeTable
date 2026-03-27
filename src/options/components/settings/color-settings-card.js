/**
 * ColorSettingsCard — Theme (colour-set) selection card.
 *
 * Replaces the former individual colour-picker UI with a complete preset
 * selection approach based on Material Design 3 palette roles.
 */
import { CardComponent } from '../base/card-component.js';
import { COLOR_THEMES, getThemeById, resolveThemeColors } from '../../../lib/color-themes.js';

export class ColorSettingsCard extends CardComponent {
    constructor(onSettingsChange) {
        super({
            title: 'Color Theme',
            titleLocalize: '__MSG_colorThemeSettings__',
            subtitle: 'Choose a colour set for the extension.',
            subtitleLocalize: '__MSG_colorThemeDescription__',
            icon: 'fas fa-palette',
            iconColor: 'text-warning'
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
        container.className = 'row g-3';

        for (const theme of COLOR_THEMES) {
            const col = document.createElement('div');
            col.className = 'col-6 col-md-4 col-lg-3';

            const themeCard = this._createThemeCard(theme);
            col.appendChild(themeCard);
            container.appendChild(col);

            this._themeCards.set(theme.id, themeCard);
        }

        return container;
    }

    _createThemeCard(theme) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'theme-card w-100 p-2 border rounded text-center';
        card.style.cssText = `
            cursor: pointer;
            transition: box-shadow 0.15s, border-color 0.15s;
            background: var(--side-calendar-subtle-bg, #f8f9fa);
        `;

        // Palette swatch row
        const swatchRow = document.createElement('div');
        swatchRow.className = 'd-flex justify-content-center gap-1 mb-2';

        const roles = ['background', 'surface', 'primary', 'secondary', 'surfaceVariant', 'outline', 'indicator'];
        for (const role of roles) {
            const dot = document.createElement('span');
            dot.style.cssText = `
                display: inline-block;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background-color: ${theme.palette[role]};
                border: 1px solid var(--side-calendar-border-color-light, #ddd);
            `;
            dot.title = role;
            swatchRow.appendChild(dot);
        }

        // Theme name
        const name = document.createElement('div');
        name.className = 'small fw-bold';
        name.setAttribute('data-localize', `__MSG_${theme.nameKey}__`);
        name.textContent = window.getLocalizedMessage(theme.nameKey) || theme.id;

        // Dark badge
        if (theme.isDark) {
            const badge = document.createElement('span');
            badge.className = 'badge bg-dark ms-1';
            badge.style.fontSize = '0.65rem';
            badge.textContent = window.getLocalizedMessage('darkBadge') || 'Dark';
            name.appendChild(badge);
        }

        card.appendChild(swatchRow);
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
        const container = document.createElement('div');
        container.className = 'mt-3 pt-3 border-top';
        container.style.display = 'none';
        this._googleColorsContainer = container;

        const formCheck = document.createElement('div');
        formCheck.className = 'form-check form-switch';

        this._googleColorsToggle = document.createElement('input');
        this._googleColorsToggle.type = 'checkbox';
        this._googleColorsToggle.className = 'form-check-input';
        this._googleColorsToggle.id = 'use-google-calendar-colors-toggle';
        this._googleColorsToggle.checked = this.useGoogleCalendarColors;

        const label = document.createElement('label');
        label.className = 'form-check-label fw-semibold';
        label.htmlFor = 'use-google-calendar-colors-toggle';
        label.setAttribute('data-localize', '__MSG_useGoogleCalendarColorsLabel__');
        label.textContent = window.getLocalizedMessage('useGoogleCalendarColorsLabel') || 'Use Google Calendar colors';

        const helpText = document.createElement('small');
        helpText.className = 'form-text text-muted d-block mt-1';
        helpText.setAttribute('data-localize', '__MSG_useGoogleCalendarColorsHelp__');
        helpText.textContent = window.getLocalizedMessage('useGoogleCalendarColorsHelp') || 'When disabled, all Google events use the theme\'s default color.';

        this._googleColorsToggle.addEventListener('change', () => {
            this.useGoogleCalendarColors = this._googleColorsToggle.checked;
            this._notifyChange();
        });

        formCheck.appendChild(this._googleColorsToggle);
        formCheck.appendChild(label);
        container.appendChild(formCheck);
        container.appendChild(helpText);

        return container;
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
            if (id === this.selectedThemeId) {
                el.style.borderColor = 'var(--side-calendar-accent-color, #007bff)';
                el.style.boxShadow = '0 0 0 2px var(--side-calendar-accent-shadow, rgba(0,123,255,0.25))';
                el.style.outline = 'none';
            } else {
                el.style.borderColor = '';
                el.style.boxShadow = '';
            }
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
