/**
 * capture.js - Capture raw screenshots of the extension in demo mode.
 *
 * Loads the built extension (demo build required: `webpack --env demo`) into
 * headless Chromium, seeds demo-mode flags and onboarding storage keys, and
 * captures the raw page images that compose.js later frames:
 *
 *   panel-light[-en].png       side panel timeline (light theme)
 *   panel-dark-modal[-en].png  side panel with the local event modal (dark)
 *   options-light[-en].png     options page, integration section (light)
 *   options-dark[-en].png      options page, display section (dark)
 *   landing.png / changelog-en.png   backdrop page for shot 1
 *
 * The page clock is fixed (Playwright Clock API) so the demo date/time in the
 * output is stable across runs - re-running with no UI change reproduces the
 * same content instead of churning the committed PNGs with today's date.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadPlaywright } = require('./pw');
const { PANEL_W, CONTENT_H, PANEL_H, PAGE_W } = require('./geometry');

const ROOT = path.resolve(__dirname, '..', '..');

// Demo-mode configuration. FIXED_* pin what the screenshots display; the date
// is a Wednesday so both locales show a plain weekday.
const FIXED_DATE = '2026-07-15';
const FIXED_TIME = '10:25';
const DEMO_SCENARIO = 'dev_team';

const LOCALES = {
    ja: {
        env: { LANGUAGE: 'ja_JP', LANG: 'ja_JP.UTF-8', LC_ALL: 'ja_JP.UTF-8' },
        chromeLang: 'ja', locale: 'ja-JP', tz: 'Asia/Tokyo',
        fixedTime: `${FIXED_DATE}T${FIXED_TIME}:00+09:00`,
        eventTitle: 'デザインレビュー',
        suffix: '',
    },
    en: {
        env: { LANGUAGE: 'en_US', LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' },
        chromeLang: 'en-US', locale: 'en-US', tz: 'America/New_York',
        fixedTime: `${FIXED_DATE}T${FIXED_TIME}:00-04:00`,
        eventTitle: 'Design review',
        suffix: '-en',
    },
};

const FONT_MIME = {
    '.css': 'text/css',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
};

/**
 * Serve Font Awesome from the @fortawesome/fontawesome-free devDependency so
 * captures are deterministic and work offline. Fails loudly when the package
 * is missing - a silent CDN fallback could commit icon-less screenshots.
 */
async function routeFontAwesome(ctx) {
    let faDir;
    try {
        faDir = path.dirname(require.resolve('@fortawesome/fontawesome-free/package.json', { paths: [ROOT] }));
    } catch {
        throw new Error('@fortawesome/fontawesome-free is not installed - run `npm install` first.');
    }

    await ctx.route('https://use.fontawesome.com/**', async (route) => {
        const url = new URL(route.request().url());
        const m = url.pathname.match(/\/(css|webfonts)\/([^/]+)$/);
        const file = m ? path.join(faDir, m[1], m[2]) : null;
        if (!file || !fs.existsSync(file)) return route.abort();
        await route.fulfill({
            body: fs.readFileSync(file),
            contentType: FONT_MIME[path.extname(file)] || 'application/octet-stream',
        });
    });
}

/** Wait until the side panel has rendered demo events and layout has settled. */
async function waitForTimeline(page) {
    try {
        await page.waitForSelector('.google-event, .local-event', { timeout: 15000 });
    } catch {
        throw new Error('No demo events rendered within 15s - was the extension built with `npx webpack --mode development --env demo`?');
    }
    await page.waitForTimeout(500); // smart-scroll positioning settles
}

/** Wait until the stored theme has been applied to the document. */
function waitForTheme(page, dark) {
    return page.waitForFunction(
        (isDark) => (document.documentElement.dataset.theme === 'dark') === isDark,
        dark,
        { timeout: 5000 }
    );
}

/**
 * Capture all raw screenshots for one language.
 * @param {'ja'|'en'} lang - Target language
 * @param {Object} opts
 * @param {string} opts.rawDir - Directory for the raw PNGs
 * @param {string} [opts.landingUrl] - Local URL of the landing page (ja shot 1)
 */
async function capture(lang, { rawDir, landingUrl }) {
    const L = LOCALES[lang];
    if (!L) throw new Error(`Unknown language: ${lang}`);
    const { chromium } = loadPlaywright();
    const version = require(path.join(ROOT, 'package.json')).version;

    fs.mkdirSync(rawDir, { recursive: true });
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'stt-screenshot-'));

    const ctx = await chromium.launchPersistentContext(profile, {
        headless: true,
        channel: 'chromium',
        args: [
            `--disable-extensions-except=${ROOT}`,
            `--load-extension=${ROOT}`,
            `--lang=${L.chromeLang}`,
        ],
        locale: L.locale,
        timezoneId: L.tz,
        // Chromium on Linux takes its UI locale (date/time input rendering)
        // from the environment, not from --lang.
        env: { ...process.env, ...L.env },
        viewport: { width: PANEL_W, height: PANEL_H },
        deviceScaleFactor: 1,
    });

    try {
        await routeFontAwesome(ctx);

        let [sw] = ctx.serviceWorkers();
        if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 15000 });
        const extId = new URL(sw.url()).host;

        const panelUrl = `chrome-extension://${extId}/src/side_panel/side_panel.html?demo=true`;
        const optionsUrl = `chrome-extension://${extId}/src/options/options.html?demo=true`;
        const changelogUrl = `chrome-extension://${extId}/src/changelog/changelog.html`;
        const out = (name) => path.join(rawDir, `${name}${L.suffix}.png`);
        const fixedTime = new Date(L.fixedTime);

        // Seed demo flags and skip onboarding, then reload so they take effect
        const page = await ctx.newPage();
        await page.clock.setFixedTime(fixedTime);
        await page.goto(panelUrl, { waitUntil: 'domcontentloaded' });
        await page.evaluate(async ({ version, lang, time, scenario }) => {
            localStorage.setItem('sideTimeTableDemo', 'true');
            localStorage.setItem('sideTimeTableDemoLang', lang);
            localStorage.setItem('sideTimeTableDemoTime', time);
            localStorage.setItem('sideTimeTableDemoScenario', scenario);
            await chrome.storage.sync.set({
                tutorialCompleted: true,
                initialSetupCompleted: true,
                lastSeenVersion: version,
                language: lang,
                whatsNewAutoShow: false,
            });
        }, { version, lang, time: FIXED_TIME, scenario: DEMO_SCENARIO });

        // Side panel timeline (light)
        await page.reload({ waitUntil: 'load' });
        await waitForTimeline(page);
        await page.screenshot({ path: out('panel-light'), animations: 'disabled' });

        // Side panel with local-event modal (dark)
        await page.evaluate(async () => {
            await chrome.storage.sync.set({ colorTheme: 'dark' });
        });
        await page.reload({ waitUntil: 'load' });
        await waitForTimeline(page);
        await waitForTheme(page, true);
        await page.locator('#addLocalEventButton').click({ force: true });
        await page.locator('#eventTitle').waitFor({ state: 'visible', timeout: 5000 });
        // pre-fill the form so the modal looks lived-in
        await page.evaluate((title) => {
            const set = (sel, v) => {
                const el = document.querySelector(sel);
                if (!el) throw new Error(`missing ${sel}`);
                el.value = v;
                el.dispatchEvent(new Event('input', { bubbles: true }));
            };
            set('#eventTitle', title);
            set('#eventStartTime', '16:30');
            set('#eventEndTime', '17:00');
        }, L.eventTitle);
        await page.screenshot({ path: out('panel-dark-modal'), animations: 'disabled' });
        // restore light theme before the options captures
        await page.evaluate(async () => {
            await chrome.storage.sync.set({ colorTheme: 'default' });
        });

        // Options page (light, full width, integration section)
        const opt = await ctx.newPage();
        await opt.clock.setFixedTime(fixedTime);
        await opt.setViewportSize({ width: PAGE_W + PANEL_W, height: CONTENT_H });
        await opt.goto(optionsUrl, { waitUntil: 'load' });
        await opt.waitForSelector('#tab-display-btn', { timeout: 10000 });
        await waitForTheme(opt, false);
        await opt.screenshot({ path: out('options-light'), animations: 'disabled' });

        // Options page (dark, display section) at side-panel-companion width
        await opt.setViewportSize({ width: PAGE_W, height: CONTENT_H });
        await opt.reload({ waitUntil: 'load' });
        await opt.locator('#tab-display-btn').click();
        // demo mode pins stored settings on the options page, so switch the
        // theme through the UI card instead
        await opt.locator('.theme-card[data-theme-id="dark"]').click();
        await waitForTheme(opt, true);
        await opt.waitForTimeout(300); // theme transition (0.15s) finishes
        await opt.screenshot({ path: out('options-dark'), animations: 'disabled' });
        // restore light theme so later captures (changelog) render light
        await opt.evaluate(async () => {
            await chrome.storage.sync.set({ colorTheme: 'default' });
        });

        // Backdrop page for shot 1: landing page (ja) / changelog page (en)
        const backdrop = await ctx.newPage();
        await backdrop.clock.setFixedTime(fixedTime);
        await backdrop.setViewportSize({ width: PAGE_W, height: CONTENT_H });
        if (lang === 'ja') {
            if (!landingUrl) throw new Error('landingUrl is required for the ja capture');
            await backdrop.goto(landingUrl, { waitUntil: 'load' });
            await backdrop.waitForTimeout(1500); // hero entrance animations finish
            await backdrop.screenshot({ path: path.join(rawDir, 'landing.png'), animations: 'disabled' });
        } else {
            await backdrop.goto(changelogUrl, { waitUntil: 'load' });
            await backdrop.waitForSelector('h1', { timeout: 10000 });
            await waitForTheme(backdrop, false);
            await backdrop.screenshot({ path: path.join(rawDir, 'changelog-en.png'), animations: 'disabled' });
        }
    } finally {
        await ctx.close();
        try {
            // lingering Chromium file locks (Windows) can make the first
            // attempt fail; retry briefly and never mask the original error
            fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
        } catch (e) {
            console.warn(`Could not remove temp profile ${profile}: ${e.message}`);
        }
    }
}

module.exports = { capture };
