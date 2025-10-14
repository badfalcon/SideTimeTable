/**
 * ColorSettingsCard - Color settings card component
 */
import { CardComponent } from '../base/card-component.js';

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
        this.workTimeColorInput = null;
        this.localEventColorInput = null;
        this.currentTimeLineColorInput = null;

        // The current setting values
        this.settings = {
            workTimeColor: '#d4d4d4',
            localEventColor: '#bbf2b1',
            currentTimeLineColor: '#ff0000'
        };
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

        // The grid layout
        const row = document.createElement('div');
        row.className = 'row';

        // The work time color
        const workTimeCol = this._createColorInputColumn(
            'work-time-color',
            '__MSG_workTimeColor__',
            'Work Time:',
            this.settings.workTimeColor,
            (input) => this.workTimeColorInput = input
        );
        row.appendChild(workTimeCol);

        // The local event color
        const localEventCol = this._createColorInputColumn(
            'local-event-color',
            '__MSG_localEventColor__',
            'Local Event:',
            this.settings.localEventColor,
            (input) => this.localEventColorInput = input
        );
        row.appendChild(localEventCol);

        form.appendChild(row);

        // Second row for current time line color
        const row2 = document.createElement('div');
        row2.className = 'row';

        // The current time line color
        const currentTimeLineCol = this._createColorInputColumn(
            'current-time-line-color',
            '__MSG_currentTimeLineColor__',
            'Current Time Line:',
            this.settings.currentTimeLineColor,
            (input) => this.currentTimeLineColorInput = input
        );
        row2.appendChild(currentTimeLineCol);

        form.appendChild(row2);

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
        col.className = 'col-md-4 mb-3';

        // The label
        const label = document.createElement('label');
        label.htmlFor = `color-settings-${id}`;
        label.className = 'form-label';
        label.setAttribute('data-localize', localizeKey);
        label.textContent = labelText;

        // The color picker
        const input = document.createElement('input');
        input.type = 'color';
        input.className = 'form-control form-control-color';
        input.id = `color-settings-${id}`;
        input.value = defaultValue;

        // The preview display
        const preview = document.createElement('div');
        preview.className = 'mt-2 p-2 rounded border';
        preview.style.backgroundColor = defaultValue;
        preview.style.color = this._getContrastColor(defaultValue);
        preview.style.fontSize = '0.875rem';
        preview.textContent = chrome.i18n.getMessage('preview');

        // Set up the input element
        inputSetter(input);

        // Save the function to update preview
        input._preview = preview;

        col.appendChild(label);
        col.appendChild(input);
        col.appendChild(preview);

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
        title.textContent = chrome.i18n.getMessage('colorPresets');

        // The preset button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'd-flex flex-wrap gap-2';

        // The preset data
        const presets = [
            {
                nameKey: 'presetDefault',
                colors: {
                    workTimeColor: '#d4d4d4',
                    localEventColor: '#bbf2b1',
                    currentTimeLineColor: '#ff0000'
                }
            },
            {
                nameKey: 'presetMonochrome',
                colors: {
                    workTimeColor: '#f0f0f0',
                    localEventColor: '#e0e0e0',
                    currentTimeLineColor: '#808080'
                }
            },
            {
                nameKey: 'presetPastel',
                colors: {
                    workTimeColor: '#fdf2e9',
                    localEventColor: '#e8f5e8',
                    currentTimeLineColor: '#ff9999'
                }
            },
            {
                nameKey: 'presetVivid',
                colors: {
                    workTimeColor: '#ffecb3',
                    localEventColor: '#c8e6c9',
                    currentTimeLineColor: '#ff0000'
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
        button.textContent = chrome.i18n.getMessage(preset.nameKey);

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
            input._preview.style.backgroundColor = color;
            input._preview.style.color = this._getContrastColor(color);
        }
    }

    /**
     * Set up event listeners
     * @private
     */
    _setupEventListeners() {
        // The change events for each color picker
        this.workTimeColorInput?.addEventListener('input', (e) => {
            this._updatePreview(e.target, e.target.value);
        });

        this.workTimeColorInput?.addEventListener('change', () => this._handleColorChange());

        this.localEventColorInput?.addEventListener('input', (e) => {
            this._updatePreview(e.target, e.target.value);
        });

        this.localEventColorInput?.addEventListener('change', () => this._handleColorChange());

        this.currentTimeLineColorInput?.addEventListener('input', (e) => {
            this._updatePreview(e.target, e.target.value);
        });

        this.currentTimeLineColorInput?.addEventListener('change', () => this._handleColorChange());
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
        return {
            workTimeColor: this.workTimeColorInput?.value || this.settings.workTimeColor,
            localEventColor: this.localEventColorInput?.value || this.settings.localEventColor,
            currentTimeLineColor: this.currentTimeLineColorInput?.value || this.settings.currentTimeLineColor
        };
    }

    /**
     * Update settings
     */
    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };

        if (this.workTimeColorInput) {
            this.workTimeColorInput.value = this.settings.workTimeColor;
            this._updatePreview(this.workTimeColorInput, this.settings.workTimeColor);
        }

        if (this.localEventColorInput) {
            this.localEventColorInput.value = this.settings.localEventColor;
            this._updatePreview(this.localEventColorInput, this.settings.localEventColor);
        }

        if (this.currentTimeLineColorInput) {
            this.currentTimeLineColorInput.value = this.settings.currentTimeLineColor;
            this._updatePreview(this.currentTimeLineColorInput, this.settings.currentTimeLineColor);
        }
    }

    /**
     * Reset to default settings
     */
    resetToDefaults() {
        const defaultSettings = {
            workTimeColor: '#d4d4d4',
            localEventColor: '#bbf2b1',
            currentTimeLineColor: '#ff0000'
        };

        this.updateSettings(defaultSettings);
        this._handleColorChange();
    }

    /**
     * Toggle enable/disable live preview
     */
    setLivePreview(enabled) {
        const eventType = enabled ? 'input' : 'change';

        // Remove the existing listeners and reset
        [this.workTimeColorInput, this.localEventColorInput, this.currentTimeLineColorInput]
            .filter(input => input)
            .forEach(input => {
                const newInput = input.cloneNode(true);
                input.parentNode.replaceChild(newInput, input);

                newInput.addEventListener(eventType, () => this._handleColorChange());
                newInput.addEventListener('input', (e) => {
                    this._updatePreview(e.target, e.target.value);
                });
            });
    }
}