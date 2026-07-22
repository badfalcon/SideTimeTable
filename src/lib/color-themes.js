/**
 * Color Theme System — Material Design 3–inspired palette approach.
 *
 * Each theme defines 7 palette roles.  All CSS custom-properties used by the
 * extension are derived from these 7 colours plus the `isDark` flag.
 */

import { COLOR_CSS_VARS, TEXT_COLOR_CSS_VARS } from './constants.js';
import { getContrastColor } from './utils.js';

// ---------------------------------------------------------------------------
// Palette role → CSS variable mapping (the 7 user-facing colours)
// ---------------------------------------------------------------------------
const PALETTE_TO_CSS = {
    background:     'timelineBackgroundColor',
    surface:        'panelBackgroundColor',
    primary:        'googleEventDefaultColor',
    secondary:      'localEventColor',
    surfaceVariant: 'workTimeColor',
    outline:        'breakTimeColor',   // outline role doubles as break-time base
    indicator:      'currentTimeLineColor'
};

// ---------------------------------------------------------------------------
// Theme definitions
// ---------------------------------------------------------------------------
export const COLOR_THEMES = [
    {
        id: 'default',
        nameKey: 'presetDefault',
        isDark: false,
        palette: {
            background:     '#ffffff',
            surface:        '#ffffff',
            primary:        '#fff0b8',
            secondary:      '#bbf2b1',
            surfaceVariant: '#e3e3e3',
            outline:        '#bcdcfb',
            indicator:      '#ff0000'
        }
    },
    {
        id: 'dark',
        nameKey: 'presetDark',
        isDark: true,
        palette: {
            background:     '#1e1e2e',
            surface:        '#2a2a3c',
            primary:        '#4a4a5e',
            secondary:      '#3a5a3a',
            surfaceVariant: '#2e2e42',
            outline:        '#3a3a52',
            indicator:      '#ff4444'
        }
    },
    {
        id: 'monochrome',
        nameKey: 'presetMonochrome',
        isDark: false,
        palette: {
            background:     '#f5f5f5',
            surface:        '#ebebeb',
            primary:        '#c0c0c0',
            secondary:      '#e0e0e0',
            surfaceVariant: '#f0f0f0',
            outline:        '#c8c8c8',
            indicator:      '#808080'
        }
    },
    {
        id: 'pastel',
        nameKey: 'presetPastel',
        isDark: false,
        palette: {
            background:     '#faf8f5',
            surface:        '#f5f0ea',
            primary:        '#e8e0d8',
            secondary:      '#e8f5e8',
            surfaceVariant: '#fdf2e9',
            outline:        '#fde8f0',
            indicator:      '#ff9999'
        }
    },
    {
        id: 'vivid',
        nameKey: 'presetVivid',
        isDark: false,
        palette: {
            background:     '#f5f5f0',
            surface:        '#eeeeea',
            primary:        '#b8d4f0',
            secondary:      '#c8e6c9',
            surfaceVariant: '#ffecb3',
            outline:        '#ffb3d9',
            indicator:      '#ff0000'
        }
    },
    {
        id: 'protanopia',
        nameKey: 'presetProtanopia',
        isDark: false,
        palette: {
            background:     '#f0f4f8',
            surface:        '#e8eef4',
            primary:        '#b8d4f0',
            secondary:      '#fff3cd',
            surfaceVariant: '#cce5ff',
            outline:        '#ffe0b2',
            indicator:      '#0072b2'
        }
    },
    {
        id: 'deuteranopia',
        nameKey: 'presetDeuteranopia',
        isDark: false,
        palette: {
            background:     '#f8f6f0',
            surface:        '#f0ede5',
            primary:        '#d0c8b0',
            secondary:      '#cce5ff',
            surfaceVariant: '#fff3cd',
            outline:        '#f8d7e3',
            indicator:      '#d55e00'
        }
    },
    {
        id: 'tritanopia',
        nameKey: 'presetTritanopia',
        isDark: false,
        palette: {
            background:     '#f8f0f8',
            surface:        '#f0e8f0',
            primary:        '#d8c8d8',
            secondary:      '#d4f0d4',
            surfaceVariant: '#f8e8f8',
            outline:        '#ffe8e8',
            indicator:      '#cc0000'
        }
    }
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Look up a theme by its ID.  Falls back to the default theme.
 * @param {string} id
 * @returns {object}
 */
export function getThemeById(id) {
    return COLOR_THEMES.find(t => t.id === id) || COLOR_THEMES[0];
}

/**
 * Resolve a theme into the full set of CSS variable assignments.
 *
 * Returns an object with two keys:
 *  - `colorSettings`: the 7 storage-compatible colour values (keyed by setting names)
 *  - `cssVars`:        a flat {cssVarName: value} map ready for setProperty()
 *
 * @param {object} theme – one of the COLOR_THEMES entries
 * @returns {{ colorSettings: object, cssVars: object }}
 */
export function resolveThemeColors(theme) {
    const { palette, isDark } = theme;

    // 1. Map palette roles → setting keys → values
    const colorSettings = {};
    for (const [role, settingKey] of Object.entries(PALETTE_TO_CSS)) {
        colorSettings[settingKey] = palette[role];
    }

    // 2. Build the CSS variable map from the 7 user colours
    const cssVars = {};

    // 2a. Direct colour variables
    for (const [settingKey, cssVar] of Object.entries(COLOR_CSS_VARS)) {
        cssVars[cssVar] = colorSettings[settingKey];
    }

    // 2b. Auto-computed text contrast variables
    for (const [settingKey, cssVar] of Object.entries(TEXT_COLOR_CSS_VARS)) {
        cssVars[cssVar] = getContrastColor(colorSettings[settingKey]);
    }

    // 2c. UI chrome variables derived from palette + isDark flag
    Object.assign(cssVars, _deriveUiChromeVars(palette, isDark));

    return { colorSettings, cssVars };
}

// ---------------------------------------------------------------------------
// Internal: derive UI chrome variables
// ---------------------------------------------------------------------------

/**
 * Produce the ~30 UI-chrome CSS variables from the palette.
 * For dark themes we use lightened/adjusted values; for light themes we darken.
 * @private
 */
function _deriveUiChromeVars(palette, isDark) {
    if (isDark) {
        return _darkChromeVars(palette);
    }
    return _lightChromeVars(palette);
}

function _lightChromeVars(palette) {
    const bg = palette.background;
    const textColor = getContrastColor(bg);
    const secondaryText = _adjustBrightness(textColor, textColor === '#000000' ? 0.4 : -0.4);
    const mutedText = _adjustBrightness(textColor, textColor === '#000000' ? 0.53 : -0.53);

    return {
        '--side-calendar-border-color': _adjustBrightness(bg, -0.2),
        '--side-calendar-border-color-light': _adjustBrightness(bg, -0.13),
        '--side-calendar-border-color-lighter': _adjustBrightness(bg, -0.07),
        '--side-calendar-shadow-color': 'rgba(0, 0, 0, 0.2)',
        '--side-calendar-secondary-text-color': secondaryText,
        '--side-calendar-muted-text-color': mutedText,
        '--side-calendar-hover-color': '#007bff',
        '--side-calendar-icon-color': _adjustBrightness(textColor, textColor === '#000000' ? 0.2 : -0.2),
        '--side-calendar-modal-bg': palette.surface || bg,
        '--side-calendar-input-bg': bg,
        '--side-calendar-input-border': _adjustBrightness(bg, -0.13),
        '--side-calendar-extended-zone-bg': 'rgba(0, 0, 0, 0.04)',
        '--side-calendar-hour-line-color': _adjustBrightness(bg, -0.2),
        '--side-calendar-memo-toggle-hover-bg': _adjustBrightness(bg, -0.07),
        '--side-calendar-textarea-bg': bg,
        '--side-calendar-textarea-border': _adjustBrightness(bg, -0.2),
        '--side-calendar-link-color': '#4285f4',
        '--side-calendar-link-hover-color': '#0056b3',
        '--side-calendar-subtle-bg': _adjustBrightness(bg, -0.03),
        '--side-calendar-subtle-bg-hover': _adjustBrightness(bg, -0.09),
        '--side-calendar-btn-secondary-bg': _adjustBrightness(bg, -0.09),
        '--side-calendar-btn-secondary-text': _adjustBrightness(textColor, textColor === '#000000' ? 0.2 : -0.2),
        '--side-calendar-btn-secondary-hover-bg': _adjustBrightness(bg, -0.13),
        '--side-calendar-close-hover-color': textColor,
        '--side-calendar-review-message-color': secondaryText,
        '--side-calendar-review-later-text': secondaryText,
        '--side-calendar-review-later-border': _adjustBrightness(bg, -0.13),
        '--side-calendar-review-never-text': mutedText,
        '--side-calendar-accent-color': '#007bff',
        '--side-calendar-accent-hover-color': '#0056b3',
        '--side-calendar-accent-shadow': 'rgba(0, 123, 255, 0.15)',
        '--side-calendar-toggle-bg': _adjustBrightness(bg, -0.2),
        '--side-calendar-toggle-knob': bg,
        '--side-calendar-progress-dot-bg': _adjustBrightness(bg, -0.13),
        '--side-calendar-success-badge-bg': '#e8f5e9',
        '--side-calendar-success-badge-border': '#a5d6a7',
        '--side-calendar-success-badge-text': '#2e7d32',
        '--side-calendar-scrollbar-thumb': _adjustBrightness(bg, -0.2),
        '--side-calendar-scrollbar-track': 'transparent',
        '--side-calendar-modal-btn-bg': palette.surface || bg,
        '--side-calendar-modal-btn-border': _adjustBrightness(bg, -0.13),
        '--side-calendar-modal-btn-text': _adjustBrightness(textColor, textColor === '#000000' ? 0.27 : -0.27),
        '--side-calendar-modal-btn-hover-bg': _adjustBrightness(bg, -0.09),
        '--side-calendar-modal-btn-hover-border': _adjustBrightness(bg, -0.32),
        '--side-calendar-warning-bg': '#fff3cd',
        '--side-calendar-warning-border': '#ffc107',
        '--side-calendar-warning-text': '#664d03',
        '--side-calendar-warning-icon': '#e65100',
        '--side-calendar-warning-btn-bg': '#e65100',
        '--side-calendar-warning-btn-hover-bg': '#bf360c'
    };
}

function _darkChromeVars(palette) {
    const bg = palette.background;
    const surface = palette.surface || bg;

    return {
        '--side-calendar-border-color': _adjustBrightness(bg, 0.15),
        '--side-calendar-border-color-light': _adjustBrightness(bg, 0.22),
        '--side-calendar-border-color-lighter': _adjustBrightness(bg, 0.1),
        '--side-calendar-shadow-color': 'rgba(0, 0, 0, 0.5)',
        '--side-calendar-secondary-text-color': _adjustBrightness('#ffffff', -0.33),
        '--side-calendar-muted-text-color': '#888888',
        '--side-calendar-hover-color': '#5b9dff',
        '--side-calendar-icon-color': _adjustBrightness('#ffffff', -0.2),
        '--side-calendar-modal-bg': surface,
        '--side-calendar-input-bg': bg,
        '--side-calendar-input-border': _adjustBrightness(bg, 0.22),
        '--side-calendar-extended-zone-bg': 'rgba(255, 255, 255, 0.04)',
        '--side-calendar-hour-line-color': _adjustBrightness(bg, 0.15),
        '--side-calendar-memo-toggle-hover-bg': _adjustBrightness(surface, 0.08),
        '--side-calendar-textarea-bg': bg,
        '--side-calendar-textarea-border': _adjustBrightness(bg, 0.22),
        '--side-calendar-link-color': '#7aabff',
        '--side-calendar-link-hover-color': '#5b9dff',
        '--side-calendar-subtle-bg': _adjustBrightness(surface, 0.05),
        '--side-calendar-subtle-bg-hover': _adjustBrightness(surface, 0.1),
        '--side-calendar-btn-secondary-bg': _adjustBrightness(surface, 0.08),
        '--side-calendar-btn-secondary-text': _adjustBrightness('#ffffff', -0.2),
        '--side-calendar-btn-secondary-hover-bg': _adjustBrightness(surface, 0.14),
        '--side-calendar-close-hover-color': '#ffffff',
        '--side-calendar-review-message-color': _adjustBrightness('#ffffff', -0.33),
        '--side-calendar-review-later-text': _adjustBrightness('#ffffff', -0.33),
        '--side-calendar-review-later-border': _adjustBrightness(bg, 0.22),
        '--side-calendar-review-never-text': '#777777',
        '--side-calendar-accent-color': '#5b9dff',
        '--side-calendar-accent-hover-color': '#4a8af0',
        '--side-calendar-accent-shadow': 'rgba(91, 157, 255, 0.2)',
        '--side-calendar-toggle-bg': _adjustBrightness(bg, 0.22),
        '--side-calendar-toggle-knob': _adjustBrightness('#ffffff', -0.13),
        '--side-calendar-progress-dot-bg': _adjustBrightness(bg, 0.22),
        '--side-calendar-success-badge-bg': '#1b3a2a',
        '--side-calendar-success-badge-border': '#2e7d32',
        '--side-calendar-success-badge-text': '#81c784',
        '--side-calendar-scrollbar-thumb': _adjustBrightness(bg, 0.2),
        '--side-calendar-scrollbar-track': 'transparent',
        '--side-calendar-modal-btn-bg': surface,
        '--side-calendar-modal-btn-border': _adjustBrightness(bg, 0.22),
        '--side-calendar-modal-btn-text': _adjustBrightness('#ffffff', -0.2),
        '--side-calendar-modal-btn-hover-bg': _adjustBrightness(surface, 0.1),
        '--side-calendar-modal-btn-hover-border': _adjustBrightness(bg, 0.35),
        '--side-calendar-warning-bg': '#3e2723',
        '--side-calendar-warning-border': '#6d4c41',
        '--side-calendar-warning-text': '#ffcc80',
        '--side-calendar-warning-icon': '#ff8a65',
        '--side-calendar-warning-btn-bg': '#ff6d00',
        '--side-calendar-warning-btn-hover-bg': '#ff8f00'
    };
}

// ---------------------------------------------------------------------------
// Colour math helpers
// ---------------------------------------------------------------------------

/**
 * Adjust brightness of a hex colour by `amount` (−1 … +1).
 * Positive = lighter, negative = darker.
 * @param {string} hex – e.g. '#1e1e2e'
 * @param {number} amount
 * @returns {string} adjusted hex colour
 */
function _adjustBrightness(hex, amount) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const clamp = v => Math.max(0, Math.min(255, Math.round(v)));

    const nr = clamp(r + amount * 255);
    const ng = clamp(g + amount * 255);
    const nb = clamp(b + amount * 255);

    return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}
