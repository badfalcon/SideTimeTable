import { COLOR_THEMES, getThemeById, resolveThemeColors } from '../../src/lib/color-themes.js';
import { COLOR_CSS_VARS, TEXT_COLOR_CSS_VARS } from '../../src/lib/constants.js';

describe('color-themes', () => {
    describe('COLOR_THEMES', () => {
        test('contains at least the default and dark themes', () => {
            const ids = COLOR_THEMES.map(t => t.id);
            expect(ids).toContain('default');
            expect(ids).toContain('dark');
        });

        test('every theme has required properties', () => {
            for (const theme of COLOR_THEMES) {
                expect(typeof theme.id).toBe('string');
                expect(typeof theme.nameKey).toBe('string');
                expect(typeof theme.isDark).toBe('boolean');
                expect(theme.palette).toBeDefined();
                expect(typeof theme.palette.background).toBe('string');
                expect(typeof theme.palette.surface).toBe('string');
                expect(typeof theme.palette.primary).toBe('string');
                expect(typeof theme.palette.secondary).toBe('string');
                expect(typeof theme.palette.surfaceVariant).toBe('string');
                expect(typeof theme.palette.outline).toBe('string');
                expect(typeof theme.palette.indicator).toBe('string');
            }
        });

        test('all palette colors are valid hex', () => {
            const hexRegex = /^#[0-9a-fA-F]{6}$/;
            for (const theme of COLOR_THEMES) {
                for (const [key, value] of Object.entries(theme.palette)) {
                    expect(value).toMatch(hexRegex);
                }
            }
        });

        test('each theme id is unique', () => {
            const ids = COLOR_THEMES.map(t => t.id);
            expect(new Set(ids).size).toBe(ids.length);
        });
    });

    describe('getThemeById', () => {
        test('returns the matching theme', () => {
            expect(getThemeById('dark').id).toBe('dark');
            expect(getThemeById('pastel').id).toBe('pastel');
        });

        test('returns default theme for unknown id', () => {
            const result = getThemeById('nonexistent');
            expect(result.id).toBe('default');
        });

        test('returns default theme for empty string', () => {
            expect(getThemeById('').id).toBe('default');
        });

        test('returns default theme for undefined', () => {
            expect(getThemeById(undefined).id).toBe('default');
        });
    });

    describe('resolveThemeColors', () => {
        test('returns colorSettings and cssVars for default theme', () => {
            const theme = getThemeById('default');
            const result = resolveThemeColors(theme);
            expect(result).toHaveProperty('colorSettings');
            expect(result).toHaveProperty('cssVars');
        });

        test('colorSettings maps palette roles to setting keys', () => {
            const theme = getThemeById('default');
            const { colorSettings } = resolveThemeColors(theme);
            expect(colorSettings.timelineBackgroundColor).toBe(theme.palette.background);
            expect(colorSettings.panelBackgroundColor).toBe(theme.palette.surface);
            expect(colorSettings.googleEventDefaultColor).toBe(theme.palette.primary);
            expect(colorSettings.localEventColor).toBe(theme.palette.secondary);
            expect(colorSettings.workTimeColor).toBe(theme.palette.surfaceVariant);
            expect(colorSettings.breakTimeColor).toBe(theme.palette.outline);
            expect(colorSettings.currentTimeLineColor).toBe(theme.palette.indicator);
        });

        test('cssVars includes direct color CSS variables', () => {
            const theme = getThemeById('default');
            const { cssVars } = resolveThemeColors(theme);
            for (const cssVar of Object.values(COLOR_CSS_VARS)) {
                expect(cssVars).toHaveProperty(cssVar);
            }
        });

        test('cssVars includes text contrast CSS variables', () => {
            const theme = getThemeById('default');
            const { cssVars } = resolveThemeColors(theme);
            for (const cssVar of Object.values(TEXT_COLOR_CSS_VARS)) {
                expect(cssVars).toHaveProperty(cssVar);
                // Text contrast should be either black or white
                expect(['#000000', '#ffffff']).toContain(cssVars[cssVar]);
            }
        });

        test('cssVars includes UI chrome variables', () => {
            const theme = getThemeById('default');
            const { cssVars } = resolveThemeColors(theme);
            expect(cssVars).toHaveProperty('--side-calendar-border-color');
            expect(cssVars).toHaveProperty('--side-calendar-secondary-text-color');
            expect(cssVars).toHaveProperty('--side-calendar-modal-bg');
            expect(cssVars).toHaveProperty('--side-calendar-input-bg');
        });

        test('dark theme produces different UI chrome variables', () => {
            const lightResult = resolveThemeColors(getThemeById('default'));
            const darkResult = resolveThemeColors(getThemeById('dark'));
            // Shadow color differs between light and dark
            expect(lightResult.cssVars['--side-calendar-shadow-color']).toBe('rgba(0, 0, 0, 0.2)');
            expect(darkResult.cssVars['--side-calendar-shadow-color']).toBe('rgba(0, 0, 0, 0.5)');
        });

        test('works for all themes without errors', () => {
            for (const theme of COLOR_THEMES) {
                expect(() => resolveThemeColors(theme)).not.toThrow();
                const { colorSettings, cssVars } = resolveThemeColors(theme);
                expect(Object.keys(colorSettings).length).toBe(7);
                expect(Object.keys(cssVars).length).toBeGreaterThan(7);
            }
        });

        test('light theme extended zone uses dark overlay', () => {
            const { cssVars } = resolveThemeColors(getThemeById('default'));
            expect(cssVars['--side-calendar-extended-zone-bg']).toBe('rgba(0, 0, 0, 0.04)');
        });

        test('dark theme extended zone uses light overlay', () => {
            const { cssVars } = resolveThemeColors(getThemeById('dark'));
            expect(cssVars['--side-calendar-extended-zone-bg']).toBe('rgba(255, 255, 255, 0.04)');
        });
    });
});
