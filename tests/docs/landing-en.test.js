/**
 * Staleness guard for the generated static English landing pages (docs/en/).
 *
 * These pages are produced by `npm run build:landing` from the Japanese root
 * pages + scripts/landing-en-data.js. Because they are committed artifacts,
 * this test fails loudly (in CI, no browser needed) if the English dictionary
 * or the root markup was changed without regenerating docs/en/.
 */

const fs = require('fs');
const path = require('path');
const { EN, HTML_KEYS, PAGES } = require('../../scripts/landing-en-data');

const DOCS = path.join(__dirname, '..', '..', 'docs');
const read = (p) => fs.readFileSync(path.join(DOCS, p), 'utf8');

// Extract data-i18n* keys actually used in a source root page.
function keysUsedIn(srcHtml) {
    const keys = new Set();
    const re = /data-i18n(?:-alt|-content)?="([^"]+)"/g;
    let m;
    while ((m = re.exec(srcHtml)) !== null) keys.add(m[1]);
    return keys;
}

// Break an English value into plain-text fragments (strip any trusted markup)
// long enough to be a meaningful staleness signal.
function textFragments(value) {
    return value
        .replace(/<[^>]+>/g, '|')
        .split('|')
        .map((s) => s.trim())
        .filter((s) => s.length >= 5);
}

describe('generated English landing pages (docs/en/)', () => {
    for (const page of PAGES) {
        describe(`en/${page.src}`, () => {
            const src = read(page.src);
            const out = read(path.join('en', page.src));
            const usedKeys = keysUsedIn(src);

            test('has keys to translate', () => {
                expect(usedKeys.size).toBeGreaterThan(0);
            });

            test('every used key resolves in the English dictionary', () => {
                const missing = [...usedKeys].filter((k) => !(k in EN));
                expect(missing).toEqual([]);
            });

            test('English copy is present (regenerate with `npm run build:landing` if this fails)', () => {
                for (const key of usedKeys) {
                    for (const frag of textFragments(EN[key])) {
                        expect(out).toContain(frag);
                    }
                }
            });

            test('no i18n bookkeeping or runtime redirect leaks into the static page', () => {
                expect(out).not.toMatch(/\sdata-i18n/);
                expect(out).not.toMatch(/location\.replace/);
                expect(out).not.toMatch(/i18n-pending/);
                expect(out).not.toMatch(/src="i18n\.js"/);
            });

            test('declares itself English with the /en/ canonical', () => {
                expect(out).toMatch(/<html lang="en"/);
                expect(out).toContain(`<link rel="canonical" href="${page.enUrl}">`);
                expect(out).toContain(`content="${page.enUrl}"`); // og:url
                expect(out).toContain('content="en_US"'); // og:locale
            });

            test('localizes the social-share image and keeps a twitter card', () => {
                expect(out).toContain(`content="${page.ogImage}"`);
                expect(out).toContain('name="twitter:card"');
            });
        });
    }

    test('HTML_KEYS are all real dictionary entries', () => {
        expect(HTML_KEYS.every((k) => k in EN)).toBe(true);
    });

    test('sitemap.xml lists both languages with x-default → English', () => {
        const sitemap = read('sitemap.xml');
        for (const page of PAGES) {
            expect(sitemap).toContain(`<loc>${page.jaUrl}</loc>`);
            expect(sitemap).toContain(`<loc>${page.enUrl}</loc>`);
            expect(sitemap).toContain(`hreflang="x-default" href="${page.enUrl}"`);
        }
    });
});
