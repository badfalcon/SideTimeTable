#!/usr/bin/env node

/**
 * validate-version.js - Version consistency checker
 *
 * Verifies that version numbers are consistent across:
 * - manifest.prod.json
 * - manifest.dev.json
 * - package.json
 * - src/lib/release-notes.js (first entry)
 *
 * Usage: node scripts/validate-version.js
 * Exit code 0 = consistent, 1 = inconsistent
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readJsonVersion(filePath) {
    const fullPath = path.join(ROOT, filePath);
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    return data.version;
}

function readReleaseNotesVersion() {
    const fullPath = path.join(ROOT, 'src/lib/release-notes.js');
    const content = fs.readFileSync(fullPath, 'utf8');

    const versionMatch = content.match(/version:\s*'(\d+\.\d+\.\d+)'/);
    if (!versionMatch) {
        console.error('\x1b[31m✗ Could not extract version from release-notes.js\x1b[0m');
        process.exit(1);
    }

    const dateMatch = content.match(/date:\s*'([^']+)'/);
    const date = dateMatch ? dateMatch[1] : null;

    return { version: versionMatch[1], date };
}

function main() {
    const files = [
        'package.json',
        'manifest.prod.json',
        'manifest.dev.json',
    ];

    const versions = {};
    for (const file of files) {
        versions[file] = readJsonVersion(file);
    }

    const releaseNotes = readReleaseNotesVersion();
    versions['release-notes.js'] = releaseNotes.version;

    const allVersions = Object.values(versions);
    const allMatch = allVersions.every(v => v === allVersions[0]);

    let hasError = false;

    if (!allMatch) {
        console.error('\x1b[31m✗ Version mismatch detected:\x1b[0m');
        for (const [file, version] of Object.entries(versions)) {
            console.error(`  ${file}: ${version}`);
        }
        hasError = true;
    }

    if (releaseNotes.date && !/^\d{4}-\d{2}-\d{2}$/.test(releaseNotes.date)) {
        console.error(`\x1b[31m✗ Invalid date format in release-notes.js: "${releaseNotes.date}" (expected YYYY-MM-DD)\x1b[0m`);
        hasError = true;
    }

    if (hasError) {
        process.exit(1);
    }

    console.log(`\x1b[32m✓ All versions consistent: ${allVersions[0]}\x1b[0m`);
    if (releaseNotes.date) {
        console.log(`\x1b[32m✓ Release date: ${releaseNotes.date}\x1b[0m`);
    }
}

main();
