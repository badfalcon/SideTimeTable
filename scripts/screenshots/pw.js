/**
 * pw.js - Resolve the Playwright module for the screenshot scripts.
 *
 * Playwright is intentionally NOT a devDependency (its browser downloads are
 * heavy). This resolver tries, in order:
 *   1. A locally installed `playwright` (npm i -D playwright)
 *   2. A globally installed `playwright` (npm i -g playwright)
 * and exits with setup instructions if neither is available.
 */

const path = require('path');
const { execSync } = require('child_process');

function loadPlaywright() {
    try {
        return require('playwright');
    } catch { /* not installed locally */ }

    try {
        const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
        return require(path.join(globalRoot, 'playwright'));
    } catch { /* not installed globally either */ }

    console.error(
        'Playwright is required to generate screenshots.\n' +
        'Install it with:\n' +
        '  npm install -D playwright\n' +
        '  npx playwright install chromium\n'
    );
    process.exit(1);
}

module.exports = { loadPlaywright };
