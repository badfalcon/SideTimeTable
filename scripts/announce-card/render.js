#!/usr/bin/env node

/**
 * render.js - Render the release announcement card image(s).
 *
 * The release announcement workflow generates the post texts plus a short card
 * source per language (headline + up to 3 highlights). This script turns those
 * into 1200x630 PNGs to attach to the X / LinkedIn / Reddit posts, insetting the
 * committed product screenshot that best matches the release.
 *
 * Usage:
 *   node scripts/announce-card/render.js --name "SideTimeTable 1.11.0" \
 *     --card-ja card_ja.txt --card-en card_en.txt --screenshot image_2 --out-dir .
 *
 * Options:
 *   --name <text>          Release name; the version badge is extracted from it
 *   --card-ja <file>       Japanese card source (line 1 headline, then highlights)
 *   --card-en <file>       English card source
 *   --screenshot <base>    image_1 | image_2 | image_3 (default: image_1)
 *   --out-dir <dir>        Where the PNGs are written (default: cwd)
 *   --lang <ja|en>         Render one language only
 *   --html-only            Write the card HTML instead of PNGs (no Playwright needed)
 *
 * Output: <out-dir>/announce_card_ja.png, announce_card_en.png
 *
 * Requires Playwright unless --html-only (same setup as npm run screenshots):
 *   npm i -D playwright && npx playwright install chromium
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { loadPlaywright } = require('../screenshots/pw');
const {
    WIDTH,
    HEIGHT,
    parseCard,
    extractVersion,
    resolveScreenshot,
    buildCardHtml,
} = require('./card-template');

const ROOT = path.resolve(__dirname, '..', '..');
const ICON = path.join(ROOT, 'src', 'img', 'icon128.png');
const SHOT_DIR = path.join(ROOT, 'docs', 'img');

function parseArgs(argv) {
    const args = argv.slice(2);
    const result = {
        name: '',
        cards: {},
        screenshot: '',
        outDir: process.cwd(),
        langs: ['ja', 'en'],
        htmlOnly: false,
        scale: 2,
    };
    const next = (i, flag) => {
        const value = args[i];
        if (value === undefined) {
            console.error(`${flag} requires a value`);
            process.exit(1);
        }
        return value;
    };
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--name':
                result.name = next(++i, '--name');
                break;
            case '--card-ja':
                result.cards.ja = next(++i, '--card-ja');
                break;
            case '--card-en':
                result.cards.en = next(++i, '--card-en');
                break;
            case '--screenshot':
                result.screenshot = next(++i, '--screenshot');
                break;
            case '--out-dir':
                result.outDir = path.resolve(next(++i, '--out-dir'));
                break;
            case '--lang': {
                const lang = next(++i, '--lang');
                if (!['ja', 'en'].includes(lang)) {
                    console.error(`Invalid --lang: ${lang} (expected ja or en)`);
                    process.exit(1);
                }
                result.langs = [lang];
                break;
            }
            case '--scale': {
                const scale = Number(next(++i, '--scale'));
                if (!Number.isFinite(scale) || scale <= 0) {
                    console.error('--scale requires a positive number');
                    process.exit(1);
                }
                result.scale = scale;
                break;
            }
            case '--html-only':
                result.htmlOnly = true;
                break;
            default:
                console.error(`Unknown option: ${args[i]}`);
                process.exit(1);
        }
    }
    return result;
}

/** Inline an image so the rendered page needs no file access or network. */
function dataUri(file) {
    if (!file || !fs.existsSync(file)) return '';
    const ext = path.extname(file).toLowerCase() === '.jpg' ? 'jpeg' : path.extname(file).slice(1).toLowerCase();
    return `data:image/${ext};base64,${fs.readFileSync(file).toString('base64')}`;
}

/** docs/img screenshot for a language: image_1.png (ja) / image_1_en.png (en). */
function screenshotFor(base, lang) {
    const file = path.join(SHOT_DIR, lang === 'en' ? `${base}_en.png` : `${base}.png`);
    if (!fs.existsSync(file)) {
        console.warn(`Screenshot not found, rendering the card without it: ${file}`);
        return '';
    }
    return dataUri(file);
}

function htmlForLang(lang, options) {
    const { name, cards, screenshot } = options;
    const source = cards[lang];
    if (!source) return null;
    if (!fs.existsSync(source)) {
        throw new Error(`Card source not found: ${source}`);
    }
    const { headline, highlights } = parseCard(fs.readFileSync(source, 'utf8'));
    if (!headline) {
        throw new Error(`Card source has no headline: ${source}`);
    }
    return buildCardHtml({
        lang,
        version: extractVersion(name),
        headline,
        highlights,
        iconSrc: dataUri(ICON),
        shotSrc: screenshotFor(screenshot, lang),
    });
}

async function main() {
    const options = parseArgs(process.argv);
    options.screenshot = resolveScreenshot(options.screenshot);

    const pages = [];
    for (const lang of options.langs) {
        const html = htmlForLang(lang, options);
        if (html) pages.push({ lang, html });
    }
    if (pages.length === 0) {
        console.error('Nothing to render: pass --card-ja and/or --card-en');
        process.exit(1);
    }

    fs.mkdirSync(options.outDir, { recursive: true });

    if (options.htmlOnly) {
        for (const { lang, html } of pages) {
            const out = path.join(options.outDir, `announce_card_${lang}.html`);
            fs.writeFileSync(out, html);
            console.log(`Wrote ${out}`);
        }
        return;
    }

    const { chromium } = loadPlaywright();
    const browser = await chromium.launch();
    try {
        const context = await browser.newContext({
            viewport: { width: WIDTH, height: HEIGHT },
            deviceScaleFactor: options.scale,
        });
        const page = await context.newPage();
        for (const { lang, html } of pages) {
            await page.setContent(html, { waitUntil: 'load' });
            await page.evaluate(() => document.fonts.ready);
            const out = path.join(options.outDir, `announce_card_${lang}.png`);
            await page.screenshot({ path: out });
            console.log(`Wrote ${out} (${WIDTH}x${HEIGHT} @${options.scale}x, screenshot: ${options.screenshot})`);
        }
    } finally {
        await browser.close();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
