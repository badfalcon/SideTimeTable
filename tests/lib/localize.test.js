/**
 * Tests for localize.js
 *
 * localize.js attaches functions to `window`, so we need to import it for
 * side effects. We must be careful about import order since locale-utils
 * also writes to window.
 */

// Must import before localize.js to set up window functions
import '../../src/lib/localize.js';

describe('localize', () => {
    beforeEach(() => {
        resetChromeStorage();
        chrome.i18n.getUILanguage.mockReturnValue('en');
        chrome.i18n.getMessage.mockImplementation((key) => key);
    });

    describe('resolveLanguageCode', () => {
        test('returns ja when browser language is Japanese and setting is auto', () => {
            chrome.i18n.getUILanguage.mockReturnValue('ja');
            expect(window.resolveLanguageCode('auto')).toBe('ja');
        });

        test('returns en when browser language is English and setting is auto', () => {
            chrome.i18n.getUILanguage.mockReturnValue('en-US');
            expect(window.resolveLanguageCode('auto')).toBe('en');
        });

        test('returns the explicit language when not auto', () => {
            expect(window.resolveLanguageCode('ja')).toBe('ja');
            expect(window.resolveLanguageCode('en')).toBe('en');
        });
    });

    describe('getCurrentLanguageSetting', () => {
        test('returns language from storage', async () => {
            chrome.storage.sync.set({ language: 'ja' }, () => {});
            const result = await window.getCurrentLanguageSetting();
            expect(result).toBe('ja');
        });

        test('returns auto when no language stored', async () => {
            const result = await window.getCurrentLanguageSetting();
            expect(result).toBe('auto');
        });
    });

    describe('getLocalizedMessage', () => {
        test('falls back to chrome.i18n.getMessage when no cache', () => {
            chrome.i18n.getMessage.mockReturnValue('Hello');
            expect(window.getLocalizedMessage('greeting')).toBe('Hello');
        });

        test('returns key when chrome.i18n returns empty string', () => {
            chrome.i18n.getMessage.mockReturnValue('');
            expect(window.getLocalizedMessage('unknownKey')).toBe('unknownKey');
        });

        test('returns key when chrome.i18n.getMessage throws', () => {
            chrome.i18n.getMessage.mockImplementation(() => { throw new Error('no'); });
            expect(window.getLocalizedMessage('badKey')).toBe('badKey');
        });
    });

    describe('loadLocalizedMessages', () => {
        test('loads messages from fetched JSON', async () => {
            const messages = { greeting: { message: 'Hello' } };
            global.fetch = jest.fn().mockResolvedValue({
                json: () => Promise.resolve(messages)
            });

            await window.loadLocalizedMessages();
            expect(window.getLocalizedMessage('greeting')).toBe('Hello');

            delete global.fetch;
        });

        test('sets cache to null on fetch failure', async () => {
            global.fetch = jest.fn().mockRejectedValue(new Error('network'));

            await window.loadLocalizedMessages();
            // Should fall back to chrome.i18n
            chrome.i18n.getMessage.mockReturnValue('fallback');
            expect(window.getLocalizedMessage('anyKey')).toBe('fallback');

            delete global.fetch;
        });
    });

    describe('localizeHtmlPageWithLang', () => {
        test('does not throw when fetch fails', async () => {
            global.fetch = jest.fn().mockRejectedValue(new Error('fail'));
            await expect(window.localizeHtmlPageWithLang()).resolves.toBeUndefined();
            delete global.fetch;
        });
    });

    describe('localizeWithLanguage', () => {
        beforeEach(() => {
            // Set up minimal DOM
            global.document = {
                querySelectorAll: jest.fn().mockReturnValue([])
            };
        });

        afterEach(() => {
            delete global.document;
        });

        test('localizes elements with data-localize attribute', async () => {
            const element = {
                getAttribute: jest.fn().mockReturnValue('__MSG_greeting__'),
                innerHTML: ''
            };
            global.document.querySelectorAll = jest.fn().mockImplementation((selector) => {
                if (selector === '[data-localize]') return [element];
                return [];
            });
            global.fetch = jest.fn().mockResolvedValue({
                json: () => Promise.resolve({ greeting: { message: 'Hello World' } })
            });

            await window.localizeWithLanguage('en');
            expect(element.innerHTML).toBe('Hello World');

            delete global.fetch;
        });

        test('localizes placeholder attributes', async () => {
            const element = {
                getAttribute: jest.fn().mockReturnValue('__MSG_searchPlaceholder__'),
                setAttribute: jest.fn()
            };
            global.document.querySelectorAll = jest.fn().mockImplementation((selector) => {
                if (selector === '[data-localize-placeholder]') return [element];
                return [];
            });
            global.fetch = jest.fn().mockResolvedValue({
                json: () => Promise.resolve({ searchPlaceholder: { message: 'Search...' } })
            });

            await window.localizeWithLanguage('en');
            expect(element.setAttribute).toHaveBeenCalledWith('placeholder', 'Search...');

            delete global.fetch;
        });

        test('localizes title attributes', async () => {
            const element = {
                getAttribute: jest.fn().mockReturnValue('__MSG_tooltipText__'),
                setAttribute: jest.fn()
            };
            global.document.querySelectorAll = jest.fn().mockImplementation((selector) => {
                if (selector === '[data-localize-title]') return [element];
                return [];
            });
            global.fetch = jest.fn().mockResolvedValue({
                json: () => Promise.resolve({ tooltipText: { message: 'Tip' } })
            });

            await window.localizeWithLanguage('en');
            expect(element.setAttribute).toHaveBeenCalledWith('title', 'Tip');

            delete global.fetch;
        });

        test('localizes aria-label attributes', async () => {
            const element = {
                getAttribute: jest.fn().mockReturnValue('__MSG_ariaClose__'),
                setAttribute: jest.fn()
            };
            global.document.querySelectorAll = jest.fn().mockImplementation((selector) => {
                if (selector === '[data-localize-aria-label]') return [element];
                return [];
            });
            global.fetch = jest.fn().mockResolvedValue({
                json: () => Promise.resolve({ ariaClose: { message: 'Close' } })
            });

            await window.localizeWithLanguage('en');
            expect(element.setAttribute).toHaveBeenCalledWith('aria-label', 'Close');

            delete global.fetch;
        });

        test('uses en fallback for unknown language', async () => {
            global.document.querySelectorAll = jest.fn().mockReturnValue([]);
            global.fetch = jest.fn().mockResolvedValue({
                json: () => Promise.resolve({})
            });

            await expect(window.localizeWithLanguage('fr')).resolves.toBeUndefined();
            // Should have used English fallback path
            expect(global.fetch).toHaveBeenCalled();
            const fetchUrl = global.fetch.mock.calls[0][0];
            expect(fetchUrl).toContain('/_locales/en/messages.json');

            delete global.fetch;
        });
    });
});
