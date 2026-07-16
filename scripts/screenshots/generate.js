#!/usr/bin/env node

/**
 * generate.js - Regenerate the landing page / Chrome Web Store screenshots.
 *
 * Pipeline:
 *   1. Build the extension with demo data (`webpack --mode development --env demo`)
 *   2. Serve docs/ locally (backdrop for the Japanese shot 1)
 *   3. Capture raw demo-mode screenshots per language (capture.js)
 *   4. Compose them into 1280x800 browser-framed images (compose.js)
 *
 * Output: docs/img/image_{1..3}.png (ja) and image_{1..3}_en.png (en)
 *
 * Usage:
 *   npm run screenshots                 # both languages
 *   npm run screenshots -- --lang ja    # Japanese set only
 *   npm run screenshots -- --skip-build # reuse the existing dist/ build
 *   npm run screenshots -- --out <dir>  # write final images elsewhere
 *
 * Requires Playwright (not a devDependency - see pw.js):
 *   npm i -D playwright && npx playwright install chromium
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');
const { loadPlaywright } = require('./pw');
const { capture } = require('./capture');
const { compose } = require('./compose');

const ROOT = path.resolve(__dirname, '..', '..');
const DOCS = path.join(ROOT, 'docs');

function parseArgs(argv) {
    const args = argv.slice(2);
    const result = { langs: ['ja', 'en'], skipBuild: false, outDir: path.join(DOCS, 'img') };
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--lang': {
                const lang = args[++i];
                if (!['ja', 'en'].includes(lang)) {
                    console.error(`Invalid --lang: ${lang} (expected ja or en)`);
                    process.exit(1);
                }
                result.langs = [lang];
                break;
            }
            case '--skip-build':
                result.skipBuild = true;
                break;
            case '--out': {
                const out = args[++i];
                if (!out) {
                    console.error('--out requires a directory argument');
                    process.exit(1);
                }
                result.outDir = path.resolve(out);
                break;
            }
            default:
                console.error(`Unknown option: ${args[i]}`);
                process.exit(1);
        }
    }
    return result;
}

/** Serve docs/ on an ephemeral port; returns { url, close } */
function serveDocs() {
    const mime = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
    };
    const server = http.createServer((req, res) => {
        // a throw here would be an uncaughtException and kill the whole run
        try {
            const rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
            const file = path.join(DOCS, rel === '/' ? 'index.html' : rel);
            // keep requests inside docs/
            if (!file.startsWith(DOCS + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
                res.writeHead(404).end('not found');
                return;
            }
            res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
            res.end(fs.readFileSync(file));
        } catch {
            res.writeHead(400).end('bad request');
        }
    });
    return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            resolve({ url: `http://127.0.0.1:${port}/index.html`, close: () => server.close() });
        });
    });
}

async function main() {
    const { langs, skipBuild, outDir } = parseArgs(process.argv);

    // fail fast on a missing Playwright before spending time on the build
    loadPlaywright();

    if (!skipBuild) {
        console.log('Building extension with demo data...');
        execSync('npx webpack --mode development --env demo', { cwd: ROOT, stdio: 'inherit' });
    } else if (!fs.existsSync(path.join(ROOT, 'manifest.json')) || !fs.existsSync(path.join(ROOT, 'dist', 'side_panel.bundle.js'))) {
        console.error('--skip-build requires an existing build (manifest.json + dist/). Run `npm run screenshots` without --skip-build first.');
        process.exit(1);
    }

    const rawDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stt-screenshot-raw-'));
    const docsServer = langs.includes('ja') ? await serveDocs() : null;

    try {
        for (const lang of langs) {
            console.log(`Capturing ${lang} screenshots...`);
            await capture(lang, { rawDir, landingUrl: docsServer?.url });
            console.log(`Composing ${lang} screenshots...`);
            await compose(lang, { rawDir, outDir });
        }
        console.log(`Done. Screenshots written to ${outDir}`);
        console.log('Note: dist/ now contains a demo development build - run `npm run build` before packaging a release.');
    } finally {
        docsServer?.close();
        fs.rmSync(rawDir, { recursive: true, force: true });
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
