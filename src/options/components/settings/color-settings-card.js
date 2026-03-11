/**
 * ColorSettingsCard - Color settings card component
 */
import { CardComponent } from '../base/card-component.js';
import { DEFAULT_SETTINGS, COLOR_CSS_VARS } from '../../../lib/utils.js';

// Derived from COLOR_CSS_VARS to stay in sync with the single source of truth
const COLOR_KEYS = Object.keys(COLOR_CSS_VARS);

// Default color values, computed once at module load
const DEFAULT_COLOR_SETTINGS = Object.fromEntries(COLOR_KEYS.map(key => [key, DEFAULT_SETTINGS[key]]));

export class ColorSettingsCard extends CardComponent {
    constructor(onSettingsChange) {
        super({
            title: 'Color Settings',
            titleLocalize: '__MSG_colorSettings__',
            icon: 'fas fa-palette',
            iconColor: 'text-warning'
        });

        this.onSettingsChange = onSettingsChange;

        // The color picker elements
        this.panelBackgroundColorInput = null;
        this.googleEventDefaultColorInput = null;
        this.timelineBackgroundColorInput = null;
        this.workTimeColorInput = null;
        this.breakTimeColorInput = null;
        this.localEventColorInput = null;
        this.currentTimeLineColorInput = null;

        // The current setting values (fallback before loaded from storage)
        this.settings = { ...DEFAULT_COLOR_SETTINGS };
    }

    createElement() {
        const card = super.createElement();

        // Create the form elements
        const form = this._createForm();
        this.addContent(form);

        // Set up the event listeners
        this._setupEventListeners();

        return card;
    }

    /**
     * Create form
     * @private
     */
    _createForm() {
        const form = document.createElement('form');

        // The grid layout - all 7 color settings
        const row = document.createElement('div');
        row.className = 'row';

        // --- Timeline area ---
        const timelineBgCol = this._createColorInputColumn(
            'timeline-background-color',
            '__MSG_timelineBackgroundColor__',
            'Timeline Background Color',
            this.settings.timelineBackgroundColor,
            (input) => this.timelineBackgroundColorInput = input
        );
        row.appendChild(timelineBgCol);

        const workTimeCol = this._createColorInputColumn(
            'work-time-color',
            '__MSG_workTimeColor__',
            'Work Time Color',
            this.settings.workTimeColor,
            (input) => this.workTimeColorInput = input
        );
        row.appendChild(workTimeCol);

        const breakTimeCol = this._createColorInputColumn(
            'break-time-color',
            '__MSG_breakTimeColor__',
            'Break Time Color',
            this.settings.breakTimeColor,
            (input) => this.breakTimeColorInput = input
        );
        row.appendChild(breakTimeCol);

        // --- Header / memo area ---
        const panelBgCol = this._createColorInputColumn(
            'panel-background-color',
            '__MSG_panelBackgroundColor__',
            'Header/Memo Background Color',
            this.settings.panelBackgroundColor,
            (input) => this.panelBackgroundColorInput = input
        );
        row.appendChild(panelBgCol);

        // --- Event colors ---
        const googleEventDefaultCol = this._createColorInputColumn(
            'google-event-default-color',
            '__MSG_googleEventDefaultColor__',
            'Google Event Default Color',
            this.settings.googleEventDefaultColor,
            (input) => this.googleEventDefaultColorInput = input
        );
        row.appendChild(googleEventDefaultCol);

        const localEventCol = this._createColorInputColumn(
            'local-event-color',
            '__MSG_localEventColor__',
            'Local Event Color',
            this.settings.localEventColor,
            (input) => this.localEventColorInput = input
        );
        row.appendChild(localEventCol);

        // --- Indicator ---
        const currentTimeLineCol = this._createColorInputColumn(
            'current-time-line-color',
            '__MSG_currentTimeLineColor__',
            'Current Time Line Color',
            this.settings.currentTimeLineColor,
            (input) => this.currentTimeLineColorInput = input
        );
        row.appendChild(currentTimeLineCol);

        form.appendChild(row);

        // The preset button area
        const presetArea = this._createPresetArea();
        form.appendChild(presetArea);

        return form;
    }

    /**
     * Create color input column
     * @private
     */
    _createColorInputColumn(id, localizeKey, labelText, defaultValue, inputSetter) {
        const col = document.createElement('div');
        col.className = 'col-md-3 mb-3';

        // Container that combines all elements
        const container = document.createElement('div');
        container.className = 'd-flex align-items-center gap-2 p-3 border rounded';
        container.style.backgroundColor = '#f8f9fa';

        // The color picker (smaller, inline)
        const input = document.createElement('input');
        input.type = 'color';
        input.className = 'form-control form-control-color';
        input.id = `color-settings-${id}`;
        input.value = defaultValue;
        input.style.width = '50px';
        input.style.height = '50px';
        input.style.flexShrink = '0';
        input.style.cursor = 'pointer';

        // Text container (label + preview color name)
        const textContainer = document.createElement('div');
        textContainer.className = 'flex-grow-1';

        // The label
        const label = document.createElement('label');
        label.htmlFor = `color-settings-${id}`;
        label.className = 'form-label mb-1 fw-bold d-block';
        label.setAttribute('data-localize', localizeKey);
        label.textContent = labelText;
        label.style.cursor = 'pointer';

        // The preview (color value display)
        const preview = document.createElement('div');
        preview.className = 'text-muted small';
        preview.textContent = defaultValue;
        preview.style.fontSize = '0.85rem';

        textContainer.appendChild(label);
        textContainer.appendChild(preview);

        // Set up the input element
        inputSetter(input);

        // Save the preview element reference
        input._preview = preview;

        container.appendChild(input);
        container.appendChild(textContainer);
        col.appendChild(container);

        return col;
    }

    /**
     * Create preset area
     * @private
     */
    _createPresetArea() {
        const area = document.createElement('div');
        area.className = 'mt-4 pt-3 border-top';

        // The preset title
        const title = document.createElement('h6');
        title.className = 'mb-3';
        title.setAttribute('data-localize', '__MSG_colorPresets__');
        title.textContent = chrome.i18n.getMessage('colorPresets');

        // The preset button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'd-flex flex-wrap gap-2';

        // The preset data
        const presets = [
            {
                nameKey: 'presetDefault',
                colors: {
                    timelineBackgroundColor: '#f0f0f0',
                    panelBackgroundColor: '#f0f0f0',
                    googleEventDefaultColor: '#d3d3d3',
                    workTimeColor: '#d4d4d4',
                    breakTimeColor: '#fda9ca',
                    localEventColor: '#bbf2b1',
                    currentTimeLineColor: '#ff0000'
                }
            },
            {
                nameKey: 'presetMonochrome',
                colors: {
                    timelineBackgroundColor: '#f5f5f5',
                    panelBackgroundColor: '#ebebeb',
                    googleEventDefaultColor: '#c0c0c0',
                    workTimeColor: '#f0f0f0',
                    breakTimeColor: '#c8c8c8',
                    localEventColor: '#e0e0e0',
                    currentTimeLineColor: '#808080'
                }
            },
            {
                nameKey: 'presetPastel',
                colors: {
                    timelineBackgroundColor: '#faf8f5',
                    panelBackgroundColor: '#f5f0ea',
                    googleEventDefaultColor: '#e8e0d8',
                    workTimeColor: '#fdf2e9',
                    breakTimeColor: '#fde8f0',
                    localEventColor: '#e8f5e8',
                    currentTimeLineColor: '#ff9999'
                }
            },
            {
                nameKey: 'presetVivid',
                colors: {
                    timelineBackgroundColor: '#f5f5f0',
                    panelBackgroundColor: '#eeeeea',
                    googleEventDefaultColor: '#b8d4f0',
                    workTimeColor: '#ffecb3',
                    breakTimeColor: '#ffb3d9',
                    localEventColor: '#c8e6c9',
                    currentTimeLineColor: '#ff0000'
                }
            },
            {
                nameKey: 'presetProtanopia',
                colors: {
                    timelineBackgroundColor: '#f0f4f8',
                    panelBackgroundColor: '#e8eef4',
                    googleEventDefaultColor: '#b8d4f0',
                    workTimeColor: '#cce5ff',
                    breakTimeColor: '#ffe0b2',
                    localEventColor: '#fff3cd',
                    currentTimeLineColor: '#0072b2'
                }
            },
            {
                nameKey: 'presetDeuteranopia',
                colors: {
                    timelineBackgroundColor: '#f8f6f0',
                    panelBackgroundColor: '#f0ede5',
                    googleEventDefaultColor: '#d0c8b0',
                    workTimeColor: '#fff3cd',
                    breakTimeColor: '#f8d7e3',
                    localEventColor: '#cce5ff',
                    currentTimeLineColor: '#d55e00'
                }
            },
            {
                nameKey: 'presetTritanopia',
                colors: {
                    timelineBackgroundColor: '#f8f0f8',
                    panelBackgroundColor: '#f0e8f0',
                    googleEventDefaultColor: '#d8c8d8',
                    workTimeColor: '#f8e8f8',
                    breakTimeColor: '#ffe8e8',
                    localEventColor: '#d4f0d4',
                    currentTimeLineColor: '#cc0000'
                }
            }
        ];

        presets.forEach(preset => {
            const button = this._createPresetButton(preset);
            buttonContainer.appendChild(button);
        });

        area.appendChild(title);
        area.appendChild(buttonContainer);

        return area;
    }

    /**
     * Create preset button
     * @private
     */
    _createPresetButton(preset) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-outline-secondary btn-sm';

        // Create text node for localization
        const textSpan = document.createElement('span');
        textSpan.setAttribute('data-localize', `__MSG_${preset.nameKey}__`);
        textSpan.textContent = chrome.i18n.getMessage(preset.nameKey);
        button.appendChild(textSpan);

        // Add the color preview
        const colorPreview = document.createElement('span');
        colorPreview.className = 'd-inline-block ms-1';
        colorPreview.style.cssText = `
            width: 12px;
            height: 12px;
            border-radius: 2px;
            background: linear-gradient(45deg,
                ${preset.colors.workTimeColor} 0%,
                ${preset.colors.localEventColor} 100%);
            border: 1px solid #ddd;
        `;

        button.appendChild(colorPreview);

        // The click event
        button.addEventListener('click', () => {
            this.updateSettings(preset.colors);
            this._handleColorChange();
        });

        return button;
    }

    /**
     * Get contrast color (for text display)
     * @private
     */
    _getContrastColor(hexColor) {
        // Convert HEX to RGB
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);

        // Calculate the luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    /**
     * Update preview
     * @private
     */
    _updatePreview(input, color) {
        if (input._preview) {
            input._preview.textContent = color.toUpperCase();
        }
    }

    /**
     * Get the stored input element for a color key
     * @private
     */
    _inputForKey(key) {
        return this[`${key}Input`];
    }

    /**
     * Set up event listeners
     * @private
     */
    _setupEventListeners() {
        for (const key of COLOR_KEYS) {
            const input = this._inputForKey(key);
            if (!input) continue;
            input.addEventListener('input', (e) => this._updatePreview(e.target, e.target.value));
            input.addEventListener('change', () => this._handleColorChange());
        }
    }

    /**
     * Handle color settings change
     * @private
     */
    _handleColorChange() {
        const newSettings = this.getSettings();
        this.settings = newSettings;

        // Callback the changes
        if (this.onSettingsChange) {
            this.onSettingsChange(newSettings);
        }
    }

    /**
     * Get current settings
     */
    getSettings() {
        return Object.fromEntries(
            COLOR_KEYS.map(key => [key, this._inputForKey(key)?.value || this.settings[key]])
        );
    }

    /**
     * Update settings
     */
    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };

        for (const key of COLOR_KEYS) {
            const input = this._inputForKey(key);
            if (input) {
                input.value = this.settings[key];
                this._updatePreview(input, this.settings[key]);
            }
        }
    }

    /**
     * Reset to default settings
     */
    resetToDefaults() {
        this.updateSettings(DEFAULT_COLOR_SETTINGS);
        this._handleColorChange();
    }

}

