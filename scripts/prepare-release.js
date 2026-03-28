#!/usr/bin/env node

/**
 * prepare-release.js - Automated release preparation script
 *
 * Updates version numbers across all config files, generates release highlights
 * (via Claude API or keyword-based fallback), inserts a new release-notes entry,
 * and optionally runs tests/lint/build.
 *
 * Usage:
 *   npm run prepare-release -- 1.10.0
 *   npm run prepare-release -- 1.10.0 --no-ai --skip-validation
 *   npm run prepare-release -- 1.10.0 --highlights-en "Feature X,Feature Y" --highlights-ja "機能X,機能Y"
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

// ─── Argument Parsing ────────────────────────────────────────────────

function parseArgs(argv) {
    const args = argv.slice(2);
    const result = {
        version: null,
        skipValidation: false,
        noAi: false,
        highlightsEn: null,
        highlightsJa: null,
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--skip-validation') {
            result.skipValidation = true;
        } else if (arg === '--no-ai') {
            result.noAi = true;
        } else if (arg === '--highlights-en' && i + 1 < args.length) {
            result.highlightsEn = args[++i].split(',').map(s => s.trim()).filter(Boolean);
        } else if (arg === '--highlights-ja' && i + 1 < args.length) {
            result.highlightsJa = args[++i].split(',').map(s => s.trim()).filter(Boolean);
        } else if (!arg.startsWith('--') && !result.version) {
            result.version = arg;
        }
    }

    return result;
}

// ─── Version Utilities ───────────────────────────────────────────────

function validateVersion(version) {
    if (!version) {
        console.error('\x1b[31mError: Version number is required.\x1b[0m');
        console.error('Usage: npm run prepare-release -- <version> [options]');
        console.error('Example: npm run prepare-release -- 1.10.0');
        process.exit(1);
    }
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
        console.error(`\x1b[31mError: Invalid version format "${version}". Expected X.Y.Z\x1b[0m`);
        process.exit(1);
    }
}

function compareVersions(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if (pa[i] > pb[i]) return 1;
        if (pa[i] < pb[i]) return -1;
    }
    return 0;
}

function getCurrentVersion() {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    return pkg.version;
}

// ─── Git Log ─────────────────────────────────────────────────────────

function getCommitMessages(currentVersion) {
    try {
        const tags = execSync('git tag -l', { cwd: ROOT, encoding: 'utf8' }).trim();
        const tagName = currentVersion;

        let cmd;
        if (tags.split('\n').includes(tagName)) {
            cmd = `git log ${tagName}..HEAD --format="%s" --no-merges`;
        } else {
            cmd = 'git log --format="%s" --no-merges -30';
        }

        const output = execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim();
        return output ? output.split('\n').filter(Boolean) : [];
    } catch {
        console.warn('\x1b[33mWarning: Could not read git log. Using empty commit list.\x1b[0m');
        return [];
    }
}

// ─── Highlight Generation: Claude API ────────────────────────────────

function getExistingHighlightsForPrompt() {
    const filePath = path.join(ROOT, 'src/lib/release-notes.js');
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract first two entries as style examples
    const entries = [];
    const entryRegex = /\{\s*version:\s*'[^']+',\s*date:\s*'[^']+',\s*highlights:\s*\{[^}]*en:\s*\[[^\]]*\][^}]*ja:\s*\[[^\]]*\]\s*\}\s*\}/gs;
    let match;
    while ((match = entryRegex.exec(content)) !== null && entries.length < 2) {
        entries.push(match[0]);
    }
    return entries.join('\n\n');
}

async function generateHighlightsWithAI(commits) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return null;
    }

    try {
        const { default: Anthropic } = await import('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey });

        const existingExamples = getExistingHighlightsForPrompt();

        const response = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: `You are a release notes writer for a Chrome extension called "SideTimeTable" (a side panel calendar/schedule viewer).

IMPORTANT RULES:
- Write from the END USER's perspective. Focus on what users can now DO, not what was changed internally.
- NEVER mention developer tools, scripts, CI/CD, refactoring, code quality, or internal infrastructure.
- NEVER use technical terms like "automation", "workflow", "pipeline", "API", "OAuth", "scope".
- Instead of describing the change, describe the BENEFIT. Example: "RSVP is back: respond to Google Calendar invitations directly from the side panel"
- Output ONLY valid JSON in this exact format: {"en": ["highlight 1", "highlight 2"], "ja": ["ハイライト1", "ハイライト2"]}
- Generate 1-4 highlights. Always include "Bug fixes and stability improvements" / "バグ修正と安定性の向上" as the last item if there are any fix commits.
- If the only changes are developer-facing (scripts, CI, refactoring), return ONLY the bug fixes line.

Match the tone and style of these existing release notes:

${existingExamples}`,
            messages: [
                {
                    role: 'user',
                    content: `Generate release highlights from these git commits:\n\n${commits.join('\n')}`
                }
            ],
        });

        const text = response.content[0].text.trim();
        // Extract JSON from response (may be wrapped in markdown code blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in API response');
        }

        const parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed.en) || !Array.isArray(parsed.ja) || parsed.en.length === 0 || parsed.ja.length === 0) {
            throw new Error('Invalid or empty highlights from API');
        }

        return parsed;
    } catch (err) {
        console.warn(`\x1b[33mWarning: AI generation failed (${err.message}). Falling back to keyword-based generation.\x1b[0m`);
        return null;
    }
}

// ─── Highlight Generation: Keyword-based Fallback ────────────────────

function generateHighlightsFallback(commits) {
    if (commits.length === 0) {
        return {
            en: ['Bug fixes and stability improvements'],
            ja: ['バグ修正と安定性の向上'],
        };
    }

    const features = [];
    const fixes = [];
    const improvements = [];
    const others = [];

    for (const msg of commits) {
        if (/^(feat|add|new)[\s(:]/i.test(msg)) {
            // Strip conventional commit prefix
            const clean = msg.replace(/^(feat|add|new)[\s(:]+/i, '').replace(/^\)\s*:?\s*/, '');
            features.push(clean.charAt(0).toUpperCase() + clean.slice(1));
        } else if (/^(fix|bug)[\s(:]/i.test(msg)) {
            fixes.push(msg);
        } else if (/^(perf|improve|refactor|enhance)[\s(:]/i.test(msg)) {
            improvements.push(msg);
        } else {
            others.push(msg);
        }
    }

    const en = [];
    const ja = [];

    // Add individual feature highlights (up to 3)
    for (const feat of features.slice(0, 3)) {
        en.push(feat);
        ja.push(feat); // Keep original for fallback; user should edit
    }

    // Summarize improvements
    if (improvements.length > 0) {
        en.push('Performance and usability improvements');
        ja.push('パフォーマンスと使い勝手の改善');
    }

    // Always add bug fix line if there are any fixes or others
    if (fixes.length > 0 || others.length > 0) {
        en.push('Bug fixes and stability improvements');
        ja.push('バグ修正と安定性の向上');
    }

    // Ensure at least one highlight
    if (en.length === 0) {
        en.push('Bug fixes and stability improvements');
        ja.push('バグ修正と安定性の向上');
    }

    return { en, ja };
}

// ─── File Updates ────────────────────────────────────────────────────

function detectLineEnding(content) {
    return content.includes('\r\n') ? '\r\n' : '\n';
}

function updateJsonFile(filePath, newVersion) {
    const fullPath = path.join(ROOT, filePath);
    const raw = fs.readFileSync(fullPath, 'utf8');
    const lineEnding = detectLineEnding(raw);
    const data = JSON.parse(raw);
    data.version = newVersion;
    let output = JSON.stringify(data, null, 2) + '\n';
    if (lineEnding === '\r\n') {
        output = output.replace(/\n/g, '\r\n');
    }
    fs.writeFileSync(fullPath, output, 'utf8');
}

function formatHighlightArray(items, indent) {
    if (items.length === 1) {
        return `${indent}    [\n${indent}        '${escapeQuotes(items[0])}'\n${indent}    ]`;
    }
    const lines = items.map((item, i) => {
        const comma = i < items.length - 1 ? ',' : '';
        return `${indent}        '${escapeQuotes(item)}'${comma}`;
    });
    return `${indent}    [\n${lines.join('\n')}\n${indent}    ]`;
}

function escapeQuotes(str) {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function insertReleaseNote(newVersion, highlights) {
    const filePath = path.join(ROOT, 'src/lib/release-notes.js');
    const content = fs.readFileSync(filePath, 'utf8');
    const lineEnding = detectLineEnding(content);

    // Idempotency: check if version already exists
    if (content.includes(`version: '${newVersion}'`)) {
        console.log(`\x1b[33mNote: Version ${newVersion} already exists in release-notes.js. Skipping insertion.\x1b[0m`);
        return;
    }

    const anchor = 'export const RELEASE_NOTES = [';
    const anchorIndex = content.indexOf(anchor);
    if (anchorIndex === -1) {
        console.error('\x1b[31mError: Could not find RELEASE_NOTES anchor in release-notes.js\x1b[0m');
        process.exit(1);
    }

    const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD in local timezone
    const indent = '        ';

    const enArray = formatHighlightArray(highlights.en, indent);
    const jaArray = formatHighlightArray(highlights.ja, indent);

    const newEntry = `    {
        version: '${newVersion}',
        date: '${today}',
        highlights: {
            en: ${enArray.trimStart()},
            ja: ${jaArray.trimStart()}
        }
    },`;

    const insertPos = anchorIndex + anchor.length;
    let updated = content.slice(0, insertPos) + '\n' + newEntry + content.slice(insertPos);

    if (lineEnding === '\r\n') {
        // Normalize to \r\n only for the newly inserted portion
        const before = content.slice(0, insertPos);
        const after = content.slice(insertPos);
        const insertedPart = ('\n' + newEntry).replace(/\n/g, '\r\n');
        updated = before + insertedPart + after;
    }

    fs.writeFileSync(filePath, updated, 'utf8');
}

// ─── Validation ──────────────────────────────────────────────────────

function runValidation() {
    console.log('\n\x1b[36mRunning tests...\x1b[0m');
    try {
        execSync('npm test', { cwd: ROOT, stdio: 'inherit' });
    } catch {
        printRecoveryCommand();
        process.exit(1);
    }

    console.log('\n\x1b[36mRunning lint...\x1b[0m');
    try {
        execSync('npm run lint', { cwd: ROOT, stdio: 'inherit' });
    } catch {
        printRecoveryCommand();
        process.exit(1);
    }

    console.log('\n\x1b[36mRunning build...\x1b[0m');
    try {
        execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
    } catch {
        printRecoveryCommand();
        process.exit(1);
    }
}

function printRecoveryCommand() {
    console.error('\n\x1b[31mValidation failed. To revert file changes:\x1b[0m');
    console.error('\x1b[33m  git checkout -- manifest.prod.json manifest.dev.json package.json src/lib/release-notes.js\x1b[0m');
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
    const args = parseArgs(process.argv);

    // Step 1: Validate arguments
    validateVersion(args.version);

    if ((args.highlightsEn && !args.highlightsJa) || (!args.highlightsEn && args.highlightsJa)) {
        console.error('\x1b[31mError: --highlights-en and --highlights-ja must be specified together.\x1b[0m');
        process.exit(1);
    }

    const currentVersion = getCurrentVersion();
    if (compareVersions(args.version, currentVersion) <= 0) {
        console.error(`\x1b[31mError: New version (${args.version}) must be greater than current version (${currentVersion}).\x1b[0m`);
        process.exit(1);
    }

    console.log(`\x1b[36mPreparing release: ${currentVersion} → ${args.version}\x1b[0m\n`);

    // Step 2: Get commit messages
    const commits = getCommitMessages(currentVersion);
    if (commits.length > 0) {
        console.log(`Found ${commits.length} commit(s) since ${currentVersion}`);
    } else {
        console.log('No commits found (this is OK - default highlights will be used)');
    }

    // Step 3: Generate highlights
    let highlights;
    if (args.highlightsEn && args.highlightsJa) {
        console.log('\nUsing manually specified highlights.');
        highlights = { en: args.highlightsEn, ja: args.highlightsJa };
    } else if (!args.noAi && process.env.ANTHROPIC_API_KEY) {
        console.log('\nGenerating highlights with Claude API...');
        highlights = await generateHighlightsWithAI(commits);
        if (!highlights) {
            console.log('Falling back to keyword-based generation.');
            highlights = generateHighlightsFallback(commits);
        } else {
            console.log('AI-generated highlights received.');
        }
    } else {
        if (!args.noAi && !process.env.ANTHROPIC_API_KEY) {
            console.log('\nNo ANTHROPIC_API_KEY set. Using keyword-based highlight generation.');
        } else {
            console.log('\nUsing keyword-based highlight generation (--no-ai).');
        }
        highlights = generateHighlightsFallback(commits);
    }

    // Step 4: Update files
    console.log('\nUpdating version files...');
    const jsonFiles = ['package.json', 'manifest.prod.json', 'manifest.dev.json'];
    for (const file of jsonFiles) {
        updateJsonFile(file, args.version);
        console.log(`  ✓ ${file}`);
    }

    console.log('\nUpdating release-notes.js...');
    insertReleaseNote(args.version, highlights);
    console.log('  ✓ src/lib/release-notes.js');

    // Step 5: Run validation
    if (!args.skipValidation) {
        runValidation();
    } else {
        console.log('\n\x1b[33mSkipping validation (--skip-validation)\x1b[0m');
    }

    // Step 6: Summary
    console.log('\n' + '═'.repeat(60));
    console.log(`\x1b[32m✓ Release ${args.version} prepared successfully!\x1b[0m`);
    console.log('═'.repeat(60));
    console.log(`\nVersion: ${currentVersion} → ${args.version}`);
    console.log(`Date: ${new Date().toLocaleDateString('sv-SE')}`);
    console.log('\nHighlights (EN):');
    for (const h of highlights.en) {
        console.log(`  • ${h}`);
    }
    console.log('\nHighlights (JA):');
    for (const h of highlights.ja) {
        console.log(`  • ${h}`);
    }
    console.log('\n\x1b[36mNext steps:\x1b[0m');
    console.log('  1. Review changes: git diff');
    console.log('  2. Edit release-notes.js highlights if needed');
    console.log(`  3. Commit: git add -A && git commit -m "Release ${args.version}"`);
    console.log(`  4. Tag: git tag ${args.version}`);
    console.log(`  5. Push: git push origin main --tags`);
}

main().catch(err => {
    console.error(`\x1b[31mUnexpected error: ${err.message}\x1b[0m`);
    process.exit(1);
});
