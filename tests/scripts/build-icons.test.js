/**
 * Staleness guard for the vendored Font Awesome subset (src/vendor/fontawesome/).
 *
 * The stylesheet and fonts are produced by `npm run build:icons` from the
 * `fa-*` classes used in src/. Because they are committed artifacts, this test
 * fails if an icon was added or changed without regenerating them (the icon
 * would render blank), or if src/ uses a class Font Awesome does not have.
 */

const fs = require('fs');
const path = require('path');
const { buildIcons, OUT_DIR } = require('../../scripts/build-icons');

const SRC = path.join(__dirname, '..', '..', 'src');

describe('vendored Font Awesome (src/vendor/fontawesome/)', () => {
    test('fontawesome.css matches the icons used in src/ (run `npm run build:icons`)', () => {
        const committed = fs.readFileSync(path.join(OUT_DIR, 'fontawesome.css'), 'utf8');
        expect(committed).toBe(buildIcons().css);
    });

    test('the fonts the stylesheet references exist', () => {
        const css = fs.readFileSync(path.join(OUT_DIR, 'fontawesome.css'), 'utf8');
        const urls = [...css.matchAll(/url\("([^"]+)"\)/g)].map((match) => match[1]);
        expect(urls).toHaveLength(3);
        for (const url of urls) {
            expect(fs.statSync(path.join(OUT_DIR, url)).size).toBeGreaterThan(0);
        }
    });

    test('every extension page loads the vendored stylesheet, not a CDN', () => {
        for (const page of ['side_panel/side_panel.html', 'options/options.html', 'changelog/changelog.html']) {
            const html = fs.readFileSync(path.join(SRC, page), 'utf8');
            expect(html).toContain('href="../vendor/fontawesome/fontawesome.css"');
            expect(html).not.toMatch(/fontawesome\.com/);
        }
    });

    test('an unknown fa-* class fails the build', () => {
        expect(() => buildIcons(['fa-xmark', 'fa-not-a-real-icon'])).toThrow('fa-not-a-real-icon');
    });
});
