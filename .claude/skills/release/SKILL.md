---
name: release
description: Prepare a new release — auto-detect version bump, generate bilingual release notes from git history, update all version files, validate, and optionally commit+tag.
user_invocable: true
arguments: "[version] — optional semver (e.g. 1.10.0). Omit to auto-detect."
---

# Release Preparation Skill

You are preparing a new release of the SideTimeTable Chrome extension. Follow the steps below carefully.

## Step 0: Parse Arguments

- If the user provided a version (e.g. `/release 1.10.0`), use it as `NEW_VERSION`.
- If no version was provided, you will auto-detect in Step 2.

## Step 1: Gather Current State

Run these in parallel:
1. Read `package.json` to get the current version (`CURRENT_VERSION`).
2. Get the git log since the last tag (or last 30 commits if no tag):
   ```bash
   git tag -l | tail -5
   git log --format="%s" --no-merges -30
   ```
3. Read the first 2 entries of `src/lib/release-notes.js` to understand the existing style.

## Step 2: Determine Version

If `NEW_VERSION` was NOT specified by the user:
- Analyze the commit messages from Step 1.
- **major** bump: Breaking changes, fundamental UI overhauls (look for `BREAKING`, `breaking change`, major rewrites)
- **minor** bump: New features (commits starting with `feat:`, `add:`, `new:`)
- **patch** bump: Bug fixes, improvements, refactoring only (commits starting with `fix:`, `perf:`, `refactor:`, `chore:`, `style:`, `docs:`)
- Default to **patch** if unclear.
- Calculate `NEW_VERSION` from `CURRENT_VERSION` accordingly.

Present the determined version to the user and ask for confirmation before proceeding:
> リリースバージョン: CURRENT_VERSION → NEW_VERSION
> 続行しますか？

## Step 3: Generate Release Highlights

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

Present the highlights to the user for review before proceeding:
> **Highlights (EN):**
> - highlight 1
> - highlight 2
>
> **Highlights (JA):**
> - ハイライト1
> - ハイライト2
>
> これでよろしいですか？修正があればお知らせください。

## Step 4: Update Files

After user approval, run the existing `prepare-release.js` script with manual highlights and skip-validation:

```bash
npm run prepare-release -- NEW_VERSION --skip-validation \
  --highlights-en "highlight 1,highlight 2" \
  --highlights-ja "ハイライト1,ハイライト2"
```

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
> ✓ Release NEW_VERSION ready!
>
> 次のステップ:
> - `git push origin main --tags` でリモートにプッシュ
> - `npm run package` でZIPファイル作成
> - Chrome Web Storeにアップロード