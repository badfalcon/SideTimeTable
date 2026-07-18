/**
 * build-landing-en.js - Generate the static English landing pages (docs/en/).
 *
 * The root pages (docs/index.html, docs/privacy.html) ship in Japanese, carry
 * data-i18n* annotations, and redirect non-Japanese visitors to /en/. This
 * script renders each root page in a browser (with a ja-JP locale so the
 * redirect no-ops), applies the English dictionary from landing-en-data.js
 * via DOM APIs, rewrites SEO tags and relative paths, and writes fully static
 * English pages to docs/en/ plus docs/sitemap.xml.
 *
 * Run after editing landing copy (root pages) or scripts/landing-en-data.js:
 *   npm run build:landing
 *
 * Requires Playwright (same setup as npm run screenshots).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { loadPlaywright } = require('./screenshots/pw');
const { SITE, HTML_KEYS, EN, PAGES } = require('./landing-en-data');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const OUT_DIR = path.join(DOCS_DIR, 'en');

/**
 * Runs IN THE BROWSER. Turns the Japanese root DOM into the English page:
 * applies the dictionary, strips i18n bookkeeping, rewrites SEO tags and
 * relative paths, converts the switcher to cross-language links, and makes
 * all content visible (no reliance on the entrance-animation observer).
 */
function applyEnglish(cfg) {
    var EN = cfg.EN, enUrl = cfg.enUrl, ogImage = cfg.ogImage, jaBackHref = cfg.jaBackHref;
    var htmlKeys = {};
    cfg.HTML_KEYS.forEach(function (k) { htmlKeys[k] = true; });
    var has = function (k) { return Object.prototype.hasOwnProperty.call(EN, k); };

    // 1. Apply English text / attributes for every annotated element.
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
        var key = el.getAttribute('data-i18n');
        if (!has(key)) return; // leave Japanese; the staleness test guards this
        if (htmlKeys[key]) { el.innerHTML = EN[key]; } else { el.textContent = EN[key]; }
    });
    document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
        var key = el.getAttribute('data-i18n-alt');
        if (has(key)) el.setAttribute('alt', EN[key]);
    });
    document.querySelectorAll('[data-i18n-content]').forEach(function (el) {
        var key = el.getAttribute('data-i18n-content');
        if (has(key)) el.setAttribute('content', EN[key]);
    });
    document.querySelectorAll('[data-i18n-src]').forEach(function (el) {
        var src = el.getAttribute('src');
        if (src) el.setAttribute('src', src.replace(/\.(png|jpe?g|webp)(\?.*)?$/i, '_en.$1$2'));
    });

    // 2. Strip all data-i18n* bookkeeping attributes.
    Array.prototype.forEach.call(document.querySelectorAll('*'), function (el) {
        Array.prototype.slice.call(el.attributes).forEach(function (a) {
            if (a.name.indexOf('data-i18n') === 0) el.removeAttribute(a.name);
        });
    });

    // 3. Remove the root redirect snippet (identified by the storage key).
    Array.prototype.forEach.call(document.querySelectorAll('head script:not([src])'), function (s) {
        if (s.textContent.indexOf('sideTimeTableLang') !== -1) s.remove();
    });

    // 4. Make every animated section visible without JavaScript.
    document.querySelectorAll('.anim-up').forEach(function (el) { el.classList.add('in-view'); });

    // 5. Language switcher → links between the ja/en versions.
    document.querySelectorAll('.lang-switch').forEach(function (sw) {
        sw.innerHTML = '<a href="' + jaBackHref + '">日本語</a>'
            + '<a href="index.html" class="active" aria-current="page">EN</a>';
    });

    // 6. Fix relative asset paths for the /en/ subdirectory.
    document.querySelectorAll('link[rel="stylesheet"], link[rel="icon"]').forEach(function (l) {
        var href = l.getAttribute('href');
        if (href && href.indexOf('//') === -1) l.setAttribute('href', '../' + href);
    });
    document.querySelectorAll('img').forEach(function (img) {
        var src = img.getAttribute('src');
        if (src && src.indexOf('img/') === 0) img.setAttribute('src', '../' + src);
    });

    // 7. Rewrite SEO tags via DOM APIs (immune to markup serialization drift).
    var set = function (sel, attr, val) {
        var el = document.querySelector(sel);
        if (el) el.setAttribute(attr, val);
    };
    set('link[rel="canonical"]', 'href', enUrl);
    set('meta[property="og:url"]', 'content', enUrl);
    set('meta[property="og:image"]', 'content', ogImage);
    set('meta[property="og:locale"]', 'content', 'en_US');
    set('meta[property="og:locale:alternate"]', 'content', 'ja_JP');
    var ld = document.querySelector('script[type="application/ld+json"]');
    if (ld) {
        try {
            var data = JSON.parse(ld.textContent);
            data.url = enUrl;
            data.inLanguage = 'en';
            ld.textContent = '\n        ' + JSON.stringify(data, null, 8).replace(/\n/g, '\n        ') + '\n    ';
        } catch (e) { /* leave as-is if unparseable */ }
    }

    // 8. Persist the English choice so the root redirect keeps sending the
    //    visitor here on subsequent visits.
    var save = document.createElement('script');
    save.textContent = "try{localStorage.setItem('sideTimeTableLang','en')}catch(e){}";
    document.head.insertBefore(save, document.head.firstChild);

    document.documentElement.setAttribute('lang', 'en');
    document.documentElement.removeAttribute('class');
}

async function buildPage(browser, pageDef) {
    // ja-JP locale so the root redirect snippet no-ops and the page stays put.
    const context = await browser.newContext({ locale: 'ja-JP' });
    const page = await context.newPage();
    await page.goto('file://' + path.join(DOCS_DIR, pageDef.src), { waitUntil: 'load' });
    await page.evaluate(applyEnglish, {
        EN,
        HTML_KEYS,
        enUrl: pageDef.enUrl,
        ogImage: pageDef.ogImage,
        jaBackHref: pageDef.jaBackHref
    });
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    await context.close();

    const banner = '<!-- Generated by scripts/build-landing-en.js from ../'
        + pageDef.src + ' — do not edit directly. Run: npm run build:landing -->\n';
    fs.writeFileSync(path.join(OUT_DIR, pageDef.src), '<!DOCTYPE html>\n' + banner + html + '\n');
    console.log(`Generated ${path.relative(process.cwd(), path.join(OUT_DIR, pageDef.src))}`);
}

/** sitemap.xml with hreflang alternates (x-default → English) and lastmod. */
function buildSitemap() {
    const isoDate = (file) => fs.statSync(file).mtime.toISOString().slice(0, 10);
    const entries = PAGES.flatMap((p) => {
        const lastmod = isoDate(path.join(DOCS_DIR, p.src));
        return [p.jaUrl, p.enUrl].map((loc) => ({ loc, ja: p.jaUrl, en: p.enUrl, lastmod }));
    });
    const urls = entries.map((e) => [
        '    <url>',
        `        <loc>${e.loc}</loc>`,
        `        <lastmod>${e.lastmod}</lastmod>`,
        `        <xhtml:link rel="alternate" hreflang="ja" href="${e.ja}"/>`,
        `        <xhtml:link rel="alternate" hreflang="en" href="${e.en}"/>`,
        `        <xhtml:link rel="alternate" hreflang="x-default" href="${e.en}"/>`,
        '    </url>'
    ].join('\n')).join('\n');
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
        + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
        + '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + urls + '\n</urlset>\n';
    fs.writeFileSync(path.join(DOCS_DIR, 'sitemap.xml'), xml);
    console.log(`Generated ${path.relative(process.cwd(), path.join(DOCS_DIR, 'sitemap.xml'))}`);
}

(async () => {
    const { chromium } = loadPlaywright();
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const browser = await chromium.launch();
    try {
        for (const pageDef of PAGES) {
            await buildPage(browser, pageDef);
        }
    } finally {
        await browser.close();
    }
    buildSitemap();
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
