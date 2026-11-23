# ストアの入口を直すリリース Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ストア検索に載る名前、流入元の計測（UTM）、アンインストール時のアンケートの仕組み、レビュー依頼の見直し（条件緩和・Google 条件撤廃・定着者への再依頼）、ストア説明文の書き直しを入れる。

**Architecture:** レビュー依頼の判断を `ReviewModal` から純関数のモジュール（`review-schedule.js`）に切り出してテストし、モーダルはそれを呼んで文面を出し分ける。アンケートは `src/lib/uninstall-survey.js` が URL を組み立て、service worker 起動時に `chrome.runtime.setUninstallURL()` へ渡す（フォーム URL が空なら何もしない）。UTM は静的なリンクの書き換えと、それを守る Jest テスト。

**Tech Stack:** Chrome Extension MV3, ES modules + webpack/babel, Jest（`testEnvironment: 'node'`、`tests/setup.js` の chrome モック）, Playwright（`npm run build:landing`）

**Spec:** `.claude/specs/2026-11-22-store-entrance-design.md`

## Global Constraints

- 拡張内で利用状況を計測しない。アンケートに渡すのはバージョンと表示言語だけ
- 拡張名: ja `SideTimeTable - サイドパネルでGoogleカレンダー` / en `SideTimeTable - Google Calendar in Side Panel`（75文字以内）。`short_name` は `SideTimeTable`。`manifest.dev.json` の名前は変えない
- ストアの URL は `https://chromewebstore.google.com/detail/sidetimetable/pnknjjpncnciijkpdfgfiikmhlmamaid`（旧 `chrome.google.com/webstore/...` は使わない）
- `utm_source` の値: `landing_ja` / `landing_en` / `github` / `release_announce` / `review_prompt` / `review_again`
- レビュー依頼: 初回は合計5日以上かつ2日連続、「あとで」から7日、再依頼は「レビューを書く」から60日以上かつその後20日以上開いた人に1回。Google カレンダー連携は条件にしない
- 説明文は検索語を自然に含めるが詰め込まない（ストア審査の keyword spam に当たらないこと）
- `src/` を触ったら `npm test` / `npm run lint` / `npm run build` を通す。デバッグログを残さない
- バージョン番号の更新（2.0.1）はこの計画に含めない（後で `/release` で行う）

## Review Focus

1. 2.0.1 より前に「レビューを書く」を押した人（`state: 'reviewed'` で `reviewedAt` なし）— 例外にならず、2.0.1 以降に開いた日数が20日に達したら1回だけ再依頼される → Task 1 のテスト `legacy reviewed users are re-asked after 20 open days`
2. 同じ日にパネルを何度も開く — 日数は1日分しか増えない（`openDaysSinceReviewed` も同様）→ Task 1 のテスト `opening twice on the same day counts once`
3. 再依頼で「あとで」を押した人 — 7日後に**再依頼の文面**で出る（初回の文面に戻らない）→ Task 1 のテスト `laterAgain shows the again prompt after 7 days`
4. フォーム URL が空のまま出荷 — `setUninstallURL` を呼ばない（空文字で既存の設定を消したりもしない）→ Task 3 のテスト `does nothing while the form URL is empty`
5. 英語のランディングページに `utm_source=landing_ja` が残る — `build:landing` が `landing_en` に書き換える → Task 4 のテスト `English pages use landing_en`
6. 2.0.1 に更新した日の最初の起動 — 「What's New」とレビュー依頼が同時に開かない（条件の緩和と Google 条件の撤廃で、更新直後に対象になる人が一気に増えるため）。その日の日数は数える → Task 2 のテスト `reports whether it showed something`

---

### Task 1: レビュー依頼の判断を純関数に切り出す

**Files:**
- Create: `src/side_panel/components/modals/review-schedule.js`
- Test: `tests/side_panel/review-schedule.test.js`

**Interfaces:**
- Produces（Task 2 が使う）:
  - `REVIEW_RULES = { minTotalDays: 5, minConsecutiveDays: 2, laterWaitDays: 7, reaskAfterDays: 60, reaskMinOpenDays: 20 }`
  - `recordOpen(stats: object, todayStr: string, yesterdayStr: string) -> object` — 新しいオブジェクトを返す。日付が変わったときだけ `totalDays`・`consecutiveDays`（昨日なら+1、それ以外は1）・`lastOpenDateStr` を更新し、`state === 'reviewed'` なら `openDaysSinceReviewed` も+1。`state` が無ければ `'none'`
  - `decideReviewPrompt(stats: object, now: number) -> 'first' | 'again' | null`
    - `none`: 合計・連続の条件 → `'first'`
    - `later`: `lastLaterDate` から7日 → `'first'`
    - `reviewed`: (`reviewedAt` なし または 60日経過) かつ `openDaysSinceReviewed >= 20` → `'again'`
    - `laterAgain`: `lastLaterDate` から7日 → `'again'`
    - `done` / `never` / その他: `null`
  - `applyAnswer(stats: object, mode: 'first'|'again', answer: 'rate'|'later'|'never', now: number) -> object`
    - first+rate → `state: 'reviewed', reviewedAt: now, openDaysSinceReviewed: 0`
    - again+rate → `state: 'done'`
    - first+later → `state: 'later', lastLaterDate: now` / again+later → `state: 'laterAgain', lastLaterDate: now`
    - never（どちらでも）→ `state: 'never'`
  - 状態の一覧: `'none' | 'later' | 'reviewed' | 'laterAgain' | 'done' | 'never'`（既存の保存データの `none/later/reviewed/never` はそのまま有効）

- [ ] **Step 1: Write the failing tests**（`DAY = 86400000`、`now` は固定値）
  - `first prompt needs 5 total days and 2 in a row`: `{state:'none', totalDays:4, consecutiveDays:2}` → `null`、`totalDays:5, consecutiveDays:1` → `null`、`5/2` → `'first'`
  - `google integration is not required`: 上の `5/2` に `googleIntegrated` 関連のキーが無くても `'first'`（関数がそれを参照しないこと）
  - `later shows the first prompt again after 7 days`: `lastLaterDate: now - 6*DAY` → `null`、`now - 7*DAY` → `'first'`
  - `reviewed users are re-asked after 60 days and 20 open days`: `reviewedAt: now - 59*DAY, openDaysSinceReviewed: 30` → `null`、`now - 60*DAY, 19` → `null`、`now - 60*DAY, 20` → `'again'`
  - `legacy reviewed users are re-asked after 20 open days`: `{state:'reviewed'}`（`reviewedAt` なし）で `openDaysSinceReviewed` 未定義 → `null`、`20` → `'again'`
  - `laterAgain shows the again prompt after 7 days`: `{state:'laterAgain', lastLaterDate: now - 7*DAY}` → `'again'`
  - `done and never are final`: どちらも `null`
  - `opening twice on the same day counts once`: `recordOpen` を同じ `todayStr` で2回 → `totalDays` と `openDaysSinceReviewed`（`state:'reviewed'`）が1しか増えない
  - `recordOpen continues or resets the streak`: `lastOpenDateStr === yesterdayStr` → `consecutiveDays` +1、それ以外 → 1
  - `applyAnswer` の5通り（上の Interfaces の表どおりのフィールド）。入力オブジェクトを書き換えないこと

- [ ] **Step 2: Run to verify they fail**
  Run: `npx jest tests/side_panel/review-schedule.test.js`
  Expected: FAIL（モジュールが無い）

- [ ] **Step 3: Implement `review-schedule.js`**（DOM・chrome API に依存しない純関数のみ）

- [ ] **Step 4: Run to verify they pass**
  Run: `npx jest tests/side_panel/review-schedule.test.js`
  Expected: PASS

- [ ] **Step 5: Commit** `git commit -m "Move the review prompt rules into review-schedule.js"`

### Task 2: ReviewModal を新しいルールと再依頼の文面に切り替える

**Files:**
- Modify: `src/side_panel/components/modals/review-modal.js`（定数・`_updateConsecutiveDays`・`_isGoogleIntegrated`・`trackOpenAndMaybeShow`・各ボタンの処理）
- Modify: `src/services/onboarding-service.js`（`startOnboardingFlow` / `onTutorialComplete` / `_checkInitialSetup` / `checkForUpdateNotification` が「何かを出したか」を `Promise<boolean>` で返す）
- Modify: `src/side_panel/side_panel.js:478-486`（オンボーディングの戻り値を `trackOpenAndMaybeShow` に渡す）
- Test: `tests/services/onboarding-service.test.js`（新規。`chrome.runtime.getManifest` はテスト内で差す）
- Modify: `_locales/ja/messages.json`, `_locales/en/messages.json`（`reviewAgainTitle` / `reviewAgainMessage` を `review*` の並びに追加）
- Modify: `.claude/skills/architecture/SKILL.md`（modals の一覧に `review-schedule.js` を1行）

**Interfaces:**
- Consumes: Task 1 の `recordOpen` / `decideReviewPrompt` / `applyAnswer`
- Produces: `trackOpenAndMaybeShow({ allowPrompt = true } = {})` — 日数は常に記録し、`allowPrompt` が false なら表示だけしない。`OnboardingService.startOnboardingFlow(...) -> Promise<boolean>`（チュートリアル・初期設定を始めた、または What's New を出したら true）

- [ ] **Step 0: オンボーディングの戻り値（テスト先行）**
  - `tests/services/onboarding-service.test.js` の `reports whether it showed something`: チュートリアル対象 → true、初期設定対象 → true、`lastSeenVersion` が古い既存ユーザー → true（`showForVersion` が呼ばれる）、同じバージョン → false、`whatsNewAutoShow: false` → false、新規インストール（`initialSetupCompleted` なし）→ false。コンポーネントは `shouldShow` / `start` / `showForVersion` を持つ `jest.fn` のスタブ
  - `npx jest tests/services/onboarding-service.test.js` で FAIL を確認 → 実装 → PASS
  - `side_panel.js`: `const onboardingShown = await this.onboardingService.startOnboardingFlow(...); await this.reviewModal.trackOpenAndMaybeShow({ allowPrompt: !onboardingShown });`
  - `TODO.md` の「`OnboardingService.checkForUpdateNotification()` のテスト」項目は、この新規テストで満たした部分を反映して更新する

- [ ] **Step 1: 文言を追加**
  - ja `reviewAgainTitle`: `使い続けてくださってありがとうございます` / `reviewAgainMessage`: `最近のアップデートを踏まえて、レビューを書いたり更新したりしませんか？\nストアのレビューは後から書き直せます。`
  - en `reviewAgainTitle`: `Thanks for sticking with SideTimeTable` / `reviewAgainMessage`: `With the recent updates, would you write or update your review?\nStore reviews can be edited anytime.`
- [ ] **Step 2: モーダルを書き換える**
  - `trackOpenAndMaybeShow()`: 読み込み → `recordOpen` → 保存 → `decideReviewPrompt(stats, Date.now())`。結果が `null` でなければ `this._mode` に入れ、タイトル・本文を `first`（既存の `reviewTitle`/`reviewMessage`）か `again`（新しいキー）に差し替えてから `show()`。Google 連携の確認は削除（`_isGoogleIntegrated` も削除）
  - 3つのボタンは `applyAnswer(stats, this._mode, answer, Date.now())` を保存してから閉じる。× ボタンは今までどおり保存せず閉じるだけ
  - 「レビューを書く」で開く URL はレビュー欄に直接入る `https://chromewebstore.google.com/detail/sidetimetable/${chrome.runtime.id}/reviews` にし、`?utm_source=review_prompt`（first）/ `?utm_source=review_again`（again）を付ける。`/reviews` がレビュー欄を開くことをブラウザで確認できなければ、今の詳細ページの URL のままにして利用者に伝える
  - ファイル先頭のコメントを新しい条件に書き直す
- [ ] **Step 3: Run**
  Run: `npm test && npm run lint && npm run build`
  Expected: すべて成功
- [ ] **Step 4: 実拡張で確認**（`scripts/screenshots/` の Playwright の起動方法を流用した手元スクリプト。コミットしない）: `reviewStats` を `{state:'reviewed', openDaysSinceReviewed:20, lastOpenDateStr:'<昨日>'}` にしてパネルを開くと再依頼の文面が ja / en で出ること、`{state:'none', totalDays:4, consecutiveDays:1, lastOpenDateStr:'<昨日>'}`（Google 未連携）で初回の文面が出ること
- [ ] **Step 5: Commit** `git commit -m "Ask for reviews after 5 days without Google, and re-ask long-time reviewers once"`

### Task 3: アンインストール時のアンケート

**Files:**
- Create: `src/lib/uninstall-survey.js`
- Modify: `src/background.js`（トップレベルで登録、`chrome.storage.onChanged` で `sync` の `language` が変わったら再登録）
- Modify: `docs/privacy.html`（「情報の共有」の後に節を追加）, `scripts/landing-en-data.js`（英語訳）
- Modify: `TODO.md`（「将来対応（機能）」に「アンケートの Google フォームを作り、`UNINSTALL_SURVEY` に URL と事前入力の entry ID を入れる」）
- Modify: `.claude/skills/architecture/SKILL.md`（Utilities に `uninstall-survey.js` を1行）
- Test: `tests/lib/uninstall-survey.test.js`

**Interfaces:**
- Produces:
  - `UNINSTALL_SURVEY = { formUrl: '', versionEntry: '', languageEntry: '' }`（`formUrl` は Google フォームの `.../viewform`、entry は `entry.123456` 形式）
  - `buildUninstallSurveyUrl(config, { version: string, language: 'ja'|'en' }) -> string` — `formUrl` が空なら `''`。entry が両方あれば `usp=pp_url` と各 entry を付ける（`URL` / `URLSearchParams` で組み立てる）。片方だけなら、ある方だけ付ける
  - `resolveSurveyLanguage() -> Promise<'ja'|'en'>` — `chrome.storage.sync` の `language`（`'ja'`/`'en'`）、`'auto'`・未設定なら `chrome.i18n.getUILanguage()` が `ja` で始まれば `'ja'`
  - `registerUninstallSurvey(config = UNINSTALL_SURVEY) -> Promise<void>` — URL が空なら何もしない。そうでなければ `chrome.runtime.setUninstallURL(url)`。失敗は `logError` に渡して握りつぶす

- [ ] **Step 1: Write the failing tests**（`chrome.runtime.setUninstallURL` / `getManifest` / `i18n.getUILanguage` はテスト内で `jest.fn` を差す）
  - `does nothing while the form URL is empty`: `registerUninstallSurvey({formUrl:'', ...})` → `setUninstallURL` が呼ばれない
  - `prefills version and language`: `formUrl: 'https://docs.google.com/forms/d/e/X/viewform', versionEntry: 'entry.1', languageEntry: 'entry.2'`, `{version:'2.0.1', language:'ja'}` → クエリが `usp=pp_url`, `entry.1=2.0.1`, `entry.2=ja` を含む
  - `sends nothing else`: 上の URL のクエリのキーが `usp`, `entry.1`, `entry.2` だけ
  - `language follows the setting, then Chrome`: sync `language:'en'` + UI `ja` → `'en'`、`'auto'` + UI `ja-JP` → `'ja'`、未設定 + UI `en-US` → `'en'`
  - `registers the built URL`: 有効な config で `setUninstallURL` が組み立てた URL で1回呼ばれる
- [ ] **Step 2: Run to verify they fail**
  Run: `npx jest tests/lib/uninstall-survey.test.js` → FAIL
- [ ] **Step 3: Implement** `uninstall-survey.js` と `background.js` の結線
- [ ] **Step 4: プライバシーポリシーに節を追加**（`data-i18n="privacy.uninstallTitle"` / `privacy.uninstallDesc`、既存の節と同じマークアップ）
  - ja: `アンインストール時のアンケート` / `拡張機能をアンインストールすると、改善のための任意のアンケート（Google フォーム）が開きます。フォームには拡張機能のバージョンと表示言語だけが入力された状態で渡され、それ以外の情報は送られません。回答するかどうかは自由です。`
  - en: `Uninstall survey` / `When you uninstall the extension, an optional survey (Google Forms) opens to help us improve it. Only the extension's version and display language are filled in on the form; nothing else is sent. Answering is up to you.`
- [ ] **Step 5: 英語ページを再生成して Run**（`tests/docs/landing-en.test.js` は辞書の英文が `docs/en/` に出ていることを確かめるので、`landing-en-data.js` を変えたらこのタスクの中で作り直す）
  Run: `npm run build:landing && npm test && npm run lint && npm run build`
  Expected: PASS
- [ ] **Step 6: Commit** `git commit -m "Open an optional survey on uninstall once the form exists"`

### Task 4: 拡張名とストアへのリンク（UTM）

**Files:**
- Modify: `manifest.prod.json`（`name: "__MSG_appName__"`, `short_name: "SideTimeTable"` を追加）
- Modify: `_locales/en/messages.json`, `_locales/ja/messages.json`（`appName` を追加。`en_US` は `en` にフォールバックするので不要）
- Modify: `docs/index.html`（ストアへのリンク3か所）, `docs/privacy.html`（ナビのストアへのリンク）
- Modify: `scripts/build-landing-en.js`（`applyEnglish` で `a[href*="utm_source=landing_ja"]` を `landing_en` に書き換える）→ `npm run build:landing` で `docs/en/` と `sitemap.xml` を再生成
- Modify: `README.md`（ストアへのリンクすべてに `?utm_source=github`。バッジのリンク先も含む）
- Modify: `.github/workflows/release-announce.yml`（`link.txt` 等の3行に `utm_source=release_announce` を付ける。`hl` と併用するときは `?hl=ja&utm_source=release_announce`）
- Test: `tests/scripts/store-links.test.js`

**Interfaces:** なし（静的ファイルのみ）

- [ ] **Step 1: Write the failing tests**
  - `manifest name is localized`: `manifest.prod.json` の `name === '__MSG_appName__'`、`short_name === 'SideTimeTable'`
  - `appName per language`: ja / en の `appName.message` が Global Constraints の文字列と一致し、75文字以内
  - `store links carry utm_source`: `docs/**/*.html` と `README.md` の中の `chromewebstore.google.com/detail/` を含むリンクすべてに `utm_source=` がある
  - `no old store URLs`: 同じファイルに `chrome.google.com/webstore` が無い
  - `English pages use landing_en`: `docs/en/*.html` のストアへのリンクは `utm_source=landing_en`、`docs/*.html`（ルート）は `landing_ja`
- [ ] **Step 2: Run to verify they fail**
  Run: `npx jest tests/scripts/store-links.test.js` → FAIL
- [ ] **Step 3: 上の Files のとおりに書き換え、`npm run build:landing` を実行**
- [ ] **Step 4: Run**
  Run: `npm test && npm run lint && npm run build`
  Expected: PASS。`dist/` を使った実拡張で、Chrome の言語が日本語なら拡張の一覧・サイドパネルの選択欄に日本語の名前が出ること（Playwright の手元スクリプト、`--lang=ja` / `--lang=en`）。サイドパネル上部の名前が 320px 幅で極端に切れていないかも見る（切れ方が悪ければスクリーンショットを添えて利用者に相談する）
- [ ] **Step 5: Commit** `git commit -m "Name the extension per language and tag store links with utm_source"`

### Task 5: ストア説明文の書き直し

**Files:**
- Modify: `store/descriptions.md`（日英の詳細説明文。短い説明 `appDesc` は今のままでよい）

- [ ] **Step 1: 書き直す**: 冒頭2文で「何ができるか」を言い切る（ストアの検索結果と冒頭の表示に効く）。日英とも、Googleカレンダー / Google Calendar、サイドパネル / side panel、タイムライン / timeline、リマインダー / reminders、Google Meet、アカウントなしでも使える、を自然な文の中で1回ずつ含める。機能の箇条書きとプライバシーの節は残し、2.0 でできるようになったこと（予定の作成・編集・削除、ゲスト、不在、出欠）が分かるようにする。「データは外部サーバーに送信されません」は残し、アンインストール時の任意アンケートに一文触れる
- [ ] **Step 2: 確認**: 同じ検索語を3回以上繰り返していないこと、全角・半角の表記が既存の README と揃っていること
- [ ] **Step 3: Commit** `git commit -m "Rewrite the store descriptions around what people search for"`

---

## 最後に

- `npm test && npm run lint && npm run build` を通し、ブランチ `claude/funny-volta-v0p0kn` にプッシュする
- 利用者の作業として伝えること: Google フォームの作成と URL・entry ID の共有、`/release` で 2.0.1 を作ってストアへ提出、ダッシュボードへの説明文の貼り付け、1〜2週間後に `utm_source` 別の閲覧を確認
