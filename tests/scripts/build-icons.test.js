/**
 * Staleness guard for the vendored Font Awesome subset (src/vendor/fontawesome/).
 *
 * The stylesheet is produced by `npm run build:icons` from the `fa-*` classes
 * used in src/, next to the package's fonts. Because they are committed artifacts, this test
 * fails if an icon was added or changed without regenerating them (the icon
 * would render blank), or if src/ uses a class Font Awesome does not have.
 */

const fs = require('fs');
const path = require('path');
const { buildIcons, packageDir, OUT_DIR } = require('../../scripts/build-icons');

const SRC = path.join(__dirname, '..', '..', 'src');

describe('vendored Font Awesome (src/vendor/fontawesome/)', () => {
    test('fontawesome.css matches the icons used in src/ (run `npm run build:icons`)', () => {
        const committed = fs.readFileSync(path.join(OUT_DIR, 'fontawesome.css'), 'utf8');
        expect(committed).toBe(buildIcons().css);
    });

    // The fonts are SIL OFL with the Reserved Font Name "Font Awesome": a
    // modified (e.g. subset) font may not keep that name, so ship them as is.
    test('the fonts the stylesheet references are the unmodified package fonts', () => {
        const css = fs.readFileSync(path.join(OUT_DIR, 'fontawesome.css'), 'utf8');
        const urls = [...css.matchAll(/url\("([^"]+)"\)/g)].map((match) => match[1]);
        expect(urls).toHaveLength(3);
        for (const url of urls) {
            const shipped = fs.readFileSync(path.join(OUT_DIR, url));
            expect(shipped.equals(fs.readFileSync(path.join(packageDir(), url)))).toBe(true);
        }
    });

    test('every extension page loads the vendored stylesheet, not a CDN', () => {
        for (const page of ['side_panel/side_panel.html', 'options/options.html', 'changelog/changelog.html']) {
            const html = fs.readFileSync(path.join(SRC, page), 'utf8');
            expect(html).toContain('href="../vendor/fontawesome/fontawesome.css"');
            expect(html).not.toMatch(/fontawesome\.com/);
        }
    });

    test('the release ZIP packages the fonts and license', () => {
        const buildZip = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'build-zip.js'), 'utf8');
        expect(buildZip).toContain("cwd: 'src/vendor/fontawesome'");
    });

    test('an unknown fa-* class fails the build', () => {
        expect(() => buildIcons(['fa-xmark', 'fa-not-a-real-icon'])).toThrow('fa-not-a-real-icon');
    });
});
