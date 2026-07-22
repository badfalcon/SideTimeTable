---
name: release
description: Prepare a new release — auto-detect version bump, generate bilingual release notes from git history, update all version files, validate, and optionally commit+tag.
user_invocable: true
arguments: "version — optional semver e.g. 1.10.0, omit to auto-detect"
---

# Release Preparation Skill

You are preparing a new release of the SideTimeTable Chrome extension. Follow the steps below carefully.

## Step 0: Parse Arguments

- If the user provided a version (e.g. `/release 1.10.0`), use it as `NEW_VERSION`.
- If no version was provided, you will auto-detect in Step 2.

## Step 1: Gather Current State & Safety Check

Run these in parallel:
1. Read `package.json` to get the current version (`CURRENT_VERSION`).
2. Check the current branch:
   ```bash
   git branch --show-current
   ```
3. Get the git log since the last release tag:
   ```bash
   git tag -l --sort=-v:refname | head -5
   ```
   Then use the latest tag to get commits:
   ```bash
   git log LATEST_TAG..HEAD --format="%s" --no-merges
   ```
   If no tags exist, fall back to `git log --format="%s" --no-merges -30`.
4. Read the first 2 entries of `src/lib/release-notes.js` to understand the existing style.

**Branch safety check:** If the current branch is NOT `main`, warn the user:
> 現在のブランチは `BRANCH_NAME` です。通常リリースは `main` から行います。続行しますか？

If the user says no, abort.

## Step 2: Determine Version

If `NEW_VERSION` was NOT specified by the user:
- Analyze the commit messages and actual code changes from Step 1.
- Judge by the **impact on end users**, not by commit prefixes (this project uses `feat:` broadly for small additions too).
- **major** bump: Breaking changes or fundamental UI overhauls that would surprise existing users. Examples: complete layout redesign, removal of existing features, data migration required.
- **minor** bump: Significant new capabilities that users would notice and seek out. Examples: a whole new panel, a new integration, a major new workflow.
- **patch** bump (default): Small additions, settings, tweaks, bug fixes, performance improvements. Most releases fall here. Examples: adding a font size option, optimizing an existing feature, fixing a race condition.
- Calculate `NEW_VERSION` from `CURRENT_VERSION` accordingly.

Do NOT ask for confirmation here — present the version together with highlights in Step 3.

## Step 3: Generate Release Highlights & Confirm

Analyze the git commits carefully and write user-facing release highlights in **both English and Japanese**.

### Rules for highlights:
- Write from the **end user's perspective**. Focus on what users can now DO.
- NEVER mention developer tools, scripts, CI/CD, refactoring, or internal infrastructure.
- NEVER use technical jargon (API, OAuth, scope, webpack, etc.).
- Describe the **benefit**, not the change. Example: "Customize memo font size from the settings page" not "Add font size dropdown to options"
- Generate 1–4 highlights.
- Always include "Bug fixes and stability improvements" / "バグ修正と安定性の向上" as the last item if there are any fix/refactor commits.
- If the ONLY changes are developer-facing, use only the bug fixes line.
- Match the tone of existing entries in `release-notes.js`.

### Japanese translation quality:
- Natural Japanese, not machine-translated. Match the style of existing ja highlights.
- Keep it concise — Japanese release notes tend to be shorter than English equivalents.

Present version AND highlights together for a single confirmation:

> **リリース: CURRENT_VERSION → NEW_VERSION**
>
> **Highlights (EN):**
> - highlight 1
> - highlight 2
>
> **Highlights (JA):**
> - ハイライト1
> - ハイライト2
>
> バージョンまたはハイライトに修正があればお知らせください。問題なければ「ok」で続行します。

Wait for user approval. If the user requests changes, adjust and re-present.

## Step 4: Update Files

After user approval, update files using `prepare-release.js`.

**Important:** If any highlight contains a comma, you must escape it or write the highlights directly to `release-notes.js` instead of using `--highlights-en`/`--highlights-ja` flags (which split on commas).

If highlights are comma-safe:
```bash
npm run prepare-release -- NEW_VERSION --skip-validation \
  --highlights-en "highlight 1,highlight 2" \
  --highlights-ja "ハイライト1,ハイライト2"
```

If highlights contain commas: run `prepare-release` with dummy highlights, then manually edit `src/lib/release-notes.js` to set the correct highlight text using the Edit tool.

This updates: `package.json`, `manifest.prod.json`, `manifest.dev.json`, `src/lib/release-notes.js`

## Step 5: Validate

Run these sequentially:
```bash
npm test
npm run lint
npm run build
```

If any step fails, fix the issue and retry. Do NOT revert automatically.

## Step 6: Review & Confirm

Show the user a summary of all changes:
```bash
git diff --stat
git diff src/lib/release-notes.js
```

Ask the user:
> バリデーション完了。コミットしてタグを作成しますか？

## Step 7: Commit & Tag (only after user confirmation)

```bash
git add package.json manifest.prod.json manifest.dev.json src/lib/release-notes.js
git commit -m "Release NEW_VERSION"
git tag NEW_VERSION
```

Then show:
> Release NEW_VERSION ready!
>
> 次のステップ:
> - `git push origin main --tags` でリモートにプッシュ
> - `npm run package` でZIPファイル作成
> - Chrome Web Storeにアップロード
