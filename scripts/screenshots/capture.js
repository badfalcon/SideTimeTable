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
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadPlaywright } = require('./pw');

const ROOT = path.resolve(__dirname, '..', '..');

// Composition geometry (see compose.js): 1280x800 canvas, 84px browser chrome,
// 36px side-panel header bar.
const PANEL_W = 384;
const CONTENT_H = 716;
const PANEL_H = CONTENT_H - 36;
const PAGE_W = 1280 - PANEL_W;

// Demo-mode configuration
const DEMO_TIME = '10:25';
const DEMO_SCENARIO = 'dev_team';

const LOCALES = {
    ja: {
        env: { LANGUAGE: 'ja_JP', LANG: 'ja_JP.UTF-8', LC_ALL: 'ja_JP.UTF-8' },
        chromeLang: 'ja', locale: 'ja-JP', tz: 'Asia/Tokyo',
        displayNav: '表示設定', darkCard: 'ダーク',
        eventTitle: 'デザインレビュー',
        suffix: '',
    },
    en: {
        env: { LANGUAGE: 'en_US', LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' },
        chromeLang: 'en-US', locale: 'en-US', tz: 'America/New_York',
        displayNav: 'Display', darkCard: 'Dark',
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
 * Serve Font Awesome from node_modules when available so captures work
 * offline; otherwise let the request go through to the CDN.
 */
async function routeFontAwesome(ctx) {
    let faDir = null;
    try {
        faDir = path.dirname(require.resolve('@fortawesome/fontawesome-free/package.json', { paths: [ROOT] }));
    } catch { /* package not installed - fall back to the CDN */ }

    await ctx.route('https://use.fontawesome.com/**', async (route) => {
        const url = new URL(route.request().url());
        const m = url.pathname.match(/\/(css|webfonts)\/([^/]+)$/);
        const file = faDir && m ? path.join(faDir, m[1], m[2]) : null;
        if (!file || !fs.existsSync(file)) return route.continue();
        await route.fulfill({
            body: fs.readFileSync(file),
            contentType: FONT_MIME[path.extname(file)] || 'application/octet-stream',
        });
    });
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

        // Seed demo flags and skip onboarding, then reload so they take effect
        const page = await ctx.newPage();
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
        }, { version, lang, time: DEMO_TIME, scenario: DEMO_SCENARIO });

        // Side panel timeline (light)
        await page.reload({ waitUntil: 'load' });
        await page.waitForTimeout(2500); // events render + smart scroll settle
        const demoLoaded = await page.evaluate(() => document.querySelectorAll('.google-event, .local-event').length);
        if (!demoLoaded) {
            throw new Error('No demo events rendered - was the extension built with `npx webpack --mode development --env demo`?');
        }
        await page.screenshot({ path: out('panel-light') });

        // Side panel with local-event modal (dark)
        await page.evaluate(async () => {
            await chrome.storage.sync.set({ colorTheme: 'dark' });
        });
        await page.reload({ waitUntil: 'load' });
        await page.waitForTimeout(2500);
        await page.locator('#addLocalEventButton').click({ force: true });
        await page.waitForTimeout(800);
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
        await page.waitForTimeout(300);
        await page.screenshot({ path: out('panel-dark-modal') });

        // Options page (light, full width, integration section)
        const opt = await ctx.newPage();
        await opt.setViewportSize({ width: PAGE_W + PANEL_W, height: CONTENT_H });
        await opt.goto(optionsUrl, { waitUntil: 'load' });
        await opt.evaluate(async () => {
            await chrome.storage.sync.set({ colorTheme: 'default' });
        });
        await opt.reload({ waitUntil: 'load' });
        await opt.waitForTimeout(2000);
        await opt.screenshot({ path: out('options-light') });

        // Options page (dark, display section) at side-panel-companion width
        await opt.setViewportSize({ width: PAGE_W, height: CONTENT_H });
        await opt.reload({ waitUntil: 'load' });
        await opt.waitForTimeout(2000);
        await opt.locator(`.nav-link:has-text("${L.displayNav}"), a:has-text("${L.displayNav}"), button:has-text("${L.displayNav}")`)
            .first().click();
        await opt.waitForTimeout(500);
        // demo mode pins stored settings on the options page, so switch the
        // theme through the UI card instead
        await opt.locator(`text=${L.darkCard}`).first().click();
        await opt.waitForTimeout(800);
        await opt.screenshot({ path: out('options-dark') });
        // restore light theme so later captures render light
        await opt.evaluate(async () => {
            await chrome.storage.sync.set({ colorTheme: 'default' });
        });

        // Backdrop page for shot 1: landing page (ja) / changelog page (en)
        const backdrop = await ctx.newPage();
        await backdrop.setViewportSize({ width: PAGE_W, height: CONTENT_H });
        if (lang === 'ja') {
            if (!landingUrl) throw new Error('landingUrl is required for the ja capture');
            await backdrop.goto(landingUrl, { waitUntil: 'load' });
            await backdrop.waitForTimeout(1500);
            await backdrop.screenshot({ path: path.join(rawDir, 'landing.png') });
        } else {
            await backdrop.goto(changelogUrl, { waitUntil: 'load' });
            await backdrop.waitForTimeout(1500);
            await backdrop.screenshot({ path: path.join(rawDir, 'changelog-en.png') });
        }
    } finally {
        await ctx.close();
        fs.rmSync(profile, { recursive: true, force: true });
    }
}

module.exports = { capture, PANEL_W, PANEL_H, CONTENT_H, PAGE_W };
