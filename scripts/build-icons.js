/**
 * build-icons.js - Vendor the Font Awesome icons the extension uses.
 *
 * The extension pages load Font Awesome from src/vendor/fontawesome/ rather
 * than a CDN, so icons work offline and opening a page makes no external
 * request. This script scans src/ for `fa-*` classes and writes:
 *
 *   src/vendor/fontawesome/fontawesome.css   base rules + the icons in use
 *   src/vendor/fontawesome/webfonts/*.woff2  solid / regular / brands fonts
 *   src/vendor/fontawesome/LICENSE.txt       the package's license
 *
 * The fonts are copied unmodified. They are licensed under the SIL OFL with
 * the Reserved Font Name "Font Awesome", and a subset would be a Modified
 * Version that may not keep that name; the stylesheet is MIT, so trimming
 * it is fine.
 *
 * from the @fortawesome/fontawesome-free devDependency (pinned in
 * package.json). Run after adding or changing an icon:
 *   npm run build:icons
 *
 * tests/scripts/build-icons.test.js fails when the committed CSS no longer
 * matches what this script would generate (an icon was added without
 * regenerating, or an `fa-*` class does not exist).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const OUT_DIR = path.join(SRC_DIR, 'vendor', 'fontawesome');
const SCAN_EXTENSIONS = new Set(['.js', '.html', '.css']);

// Fonts the extension's style classes need: fas (solid), far (regular), fab (brands).
const FONTS = [
    { file: 'fa-solid-900', css: 'solid.css' },
    { file: 'fa-regular-400', css: 'regular.css' },
    { file: 'fa-brands-400', css: 'brands.css' },
];

function packageDir() {
    try {
        return path.dirname(require.resolve('@fortawesome/fontawesome-free/package.json', { paths: [ROOT] }));
    } catch {
        throw new Error('@fortawesome/fontawesome-free is not installed - run `npm install` first.');
    }
}

function readPackageCss(name) {
    return fs.readFileSync(path.join(packageDir(), 'css', name), 'utf8');
}

/** Every file under dir with a scanned extension, skipping vendored code. */
function listSourceFiles(dir) {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (full !== path.join(SRC_DIR, 'vendor')) files.push(...listSourceFiles(full));
        } else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) {
            files.push(full);
        }
    }
    return files.sort();
}

/**
 * The `fa-*` class names in src/. Icon names always appear whole in the
 * source (dynamic classes are built from full strings such as
 * 'far fa-circle'), so a token scan finds them all.
 */
function collectUsedClasses(srcDir = SRC_DIR) {
    const used = new Set();
    const re = /(?<![\w-])fa-[a-z0-9]+(?:-[a-z0-9]+)*/g;
    for (const file of listSourceFiles(srcDir)) {
        for (const match of fs.readFileSync(file, 'utf8').matchAll(re)) used.add(match[0]);
    }
    return [...used].sort();
}

/** Map of icon class -> its rule text, from the core and brands stylesheets. */
function parseIconRules(css) {
    const rules = new Map();
    const re = /^\.(fa-[a-z0-9-]+) \{\n {2}--fa: "[^"]+";(?:\n {2}--fa--fa: "[^"]+";)? \}$/gm;
    for (const match of css.matchAll(re)) rules.set(match[1], match[0]);
    return rules;
}

/**
 * Build the trimmed stylesheet. Throws on an `fa-*`
 * class that is neither an icon nor one of Font Awesome's own classes, so a
 * typo fails the build instead of shipping a blank icon.
 */
function buildIcons(usedClasses = collectUsedClasses()) {
    const core = readPackageCss('fontawesome.css');
    const iconsStart = core.indexOf('.fa-0 {');
    const srOnlyStart = core.indexOf('.sr-only,');
    if (iconsStart < 0 || srOnlyStart < iconsStart) {
        throw new Error('Unexpected fontawesome.css layout - update scripts/build-icons.js for this version.');
    }
    const base = core.slice(0, iconsStart).replace(/\/\* Font Awesome uses the Unicode[\s\S]*?\*\/\s*$/, '');
    const tail = core.slice(srOnlyStart);
    const icons = new Map([...parseIconRules(core.slice(iconsStart, srOnlyStart)), ...parseIconRules(readPackageCss('brands.css'))]);

    const fontCss = FONTS.map(({ file, css }) => readPackageCss(css)
        .match(/:root[\s\S]*?\{[^}]*font-weight: \d+; \}/)[0]
        .replace(/src: url\([^;]*;/, `src: url("webfonts/${file}.woff2") format("woff2");`)).join('\n\n');

    const selectors = new Set([...`${core}\n${fontCss}`.matchAll(/\.(fa-[a-z0-9-]+)(?![\w-])/g)].map((match) => match[1]));
    const unknown = usedClasses.filter((name) => !icons.has(name) && !selectors.has(name));
    if (unknown.length) {
        throw new Error(`Unknown Font Awesome classes in src/: ${unknown.join(', ')}`);
    }

    const usedIcons = usedClasses.filter((name) => icons.has(name));
    const css = [
        base.trimEnd(),
        fontCss,
        '/* Icons used by SideTimeTable - generated by scripts/build-icons.js (npm run build:icons) */',
        usedIcons.map((name) => icons.get(name)).join('\n\n'),
        tail.trimEnd(),
    ].join('\n\n') + '\n';
    return { css, usedIcons };
}

function main() {
    const { css, usedIcons } = buildIcons();
    const fontsDir = path.join(OUT_DIR, 'webfonts');
    fs.rmSync(OUT_DIR, { recursive: true, force: true });
    fs.mkdirSync(fontsDir, { recursive: true });

    fs.writeFileSync(path.join(OUT_DIR, 'fontawesome.css'), css);
    fs.copyFileSync(path.join(packageDir(), 'LICENSE.txt'), path.join(OUT_DIR, 'LICENSE.txt'));
    for (const { file } of FONTS) {
        fs.copyFileSync(path.join(packageDir(), 'webfonts', `${file}.woff2`), path.join(fontsDir, `${file}.woff2`));
        console.log(`  ✓ webfonts/${file}.woff2`);
    }
    console.log(`✅ ${usedIcons.length} icons written to ${path.relative(ROOT, OUT_DIR)}/`);
}

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error(`❌ ${error.message}`);
        process.exit(1);
    }
}

module.exports = { collectUsedClasses, buildIcons, packageDir, OUT_DIR };
