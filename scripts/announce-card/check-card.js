#!/usr/bin/env node

/**
 * check-card.js - Sanity-check the card sources before rendering.
 *
 * The sources are written by the LLM step of the release announcement
 * workflow, so they can be empty, over-long, or name a screenshot that does not
 * exist. Anything the card cannot recover from is an error (exit 1); anything it
 * degrades through - over-long lines, an unknown screenshot - is a warning, so a
 * slightly long draft still produces an image worth looking at.
 *
 * Usage:
 *   node scripts/announce-card/check-card.js [--dir <dir>]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const {
    MAX_HIGHLIGHTS,
    SCREENSHOTS,
    DEFAULT_SCREENSHOT,
    LIMITS,
    parseCard,
} = require('./card-template');

const errors = [];
const warnings = [];

function warn(message) {
    warnings.push(message);
    console.log(process.env.GITHUB_ACTIONS ? `::warning::${message}` : `警告: ${message}`);
}

function checkCardFile(file, lang) {
    if (!fs.existsSync(file)) {
        errors.push(`${path.basename(file)} が生成されていません`);
        return;
    }
    const { headline, highlights } = parseCard(fs.readFileSync(file, 'utf8'));
    const name = path.basename(file);
    const limit = LIMITS[lang];

    if (!headline) {
        errors.push(`${name}: 見出し（1行目）が空です`);
        return;
    }
    if (highlights.length === 0) {
        errors.push(`${name}: ハイライト（2行目以降）がありません`);
        return;
    }
    if (headline.length > limit.headline) {
        warn(`${name}: 見出しが ${headline.length} 字（上限 ${limit.headline} 字）— カードの文字が小さくなります`);
    }
    highlights.forEach((item, i) => {
        if (item.length > limit.highlight) {
            warn(`${name}: ハイライト${i + 1} が ${item.length} 字（上限 ${limit.highlight} 字）— カードの文字が小さくなります`);
        }
    });
    console.log(`  ${name}: 見出し ${headline.length}/${limit.headline} 字, ハイライト ${highlights.length}/${MAX_HIGHLIGHTS} 行`);
}

function checkScreenshotFile(file) {
    if (!fs.existsSync(file)) {
        warn(`${path.basename(file)} がないため ${DEFAULT_SCREENSHOT} を使います`);
        return;
    }
    const base = fs.readFileSync(file, 'utf8').trim();
    if (!SCREENSHOTS.includes(base)) {
        warn(`${path.basename(file)}: "${base}" は未知のスクリーンショットです（${SCREENSHOTS.join(' / ')}）。${DEFAULT_SCREENSHOT} を使います`);
        return;
    }
    console.log(`  ${path.basename(file)}: ${base}`);
}

function main() {
    const args = process.argv.slice(2);
    let dir = process.cwd();
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--dir') {
            dir = path.resolve(args[++i] || '.');
        } else {
            console.error(`Unknown option: ${args[i]}`);
            process.exit(1);
        }
    }

    checkCardFile(path.join(dir, 'card_ja.txt'), 'ja');
    checkCardFile(path.join(dir, 'card_en.txt'), 'en');
    checkScreenshotFile(path.join(dir, 'card_image.txt'));

    if (errors.length > 0) {
        for (const message of errors) console.error(`検証NG: ${message}`);
        process.exit(1);
    }
    console.log(warnings.length > 0 ? `検証OK（警告 ${warnings.length} 件）` : '検証OK');
}

main();
