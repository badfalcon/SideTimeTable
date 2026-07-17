# TODO

今すぐは対応しないが、将来対応すべき項目をメモしておく。

## テスト

- [ ] `_showAuthExpiredBanner()` のDOMテスト（jsdom環境が必要）
- [ ] `checkGoogleAuthStatus()` の設定ページ分岐テスト（コンポーネントモックが必要）
- [ ] `buildCalendarErrorResponse()` のテスト（background.js からの export が必要）
- [ ] `utils.js` カバレッジ向上（現在40%）— `generateTimeList`、`reloadSidePanel` のテスト追加
- [ ] `google-calendar-client.js` カバレッジ向上（現在30%）— `getCalendarList`、`getCalendarEvents`、`getPrimaryCalendarEvents` のテスト追加（fetch モックが複雑）
- [ ] `current-time-line-manager.js` のテスト（DOM操作が多く jsdom 環境が必要）
- [ ] `demo-data.js`（実体）のテスト（スタブ版はカバー済み、実体はDOM依存あり）
- [ ] UIコンポーネント（options/、side_panel/components/）のテスト（DOM・コンポーネントライフサイクルのモックが必要）
- [ ] `OnboardingService.checkForUpdateNotification()` のテスト（`whatsNewAutoShow=false` 時に `lastSeenVersion` だけ進める分岐の検証含む。`StorageHelper`/`chrome.runtime.getManifest` のモックが必要）

## ビルド・パッケージング

- [ ] `build-zip.js` がリリースzipに `docs/` ディレクトリ全体（ランディングページ+スクリーンショットPNG 約770KB）を同梱している — 拡張機能は実行時に読み込まないため、除外するか同梱理由を明記する

## リファクタリング（既存コード）

- [x] `_fetchEventsForCalendarIds()` が `_fetchWithAuth()` を迂回して直接 `fetch()` している — calendarList取得部分は `_fetchWithAuth()` に統一済み
- [x] `respondToEvent()` のGET/PATCHレスポンスが `_checkResponse()` を使っていない — `_checkResponse()` に統一済み
- [ ] `localize.js` が `window` グローバルに関数を export している — ES6 module の `export` に移行して明示的な `import` に統一（34ファイルが `window.getLocalizedMessage()` を使用中）
- [x] `background.js` の21箇所の `console.error/warn` 直接呼出を `logError()`/`logWarn()` に統一
- [x] `StorageHelper` 直接利用とラッパー関数 (`settings-storage.js`, `event-storage.js`) の使い分け基準を storage-helper.js の JSDoc に明記

## リファクタリング（設計改善）

- [x] `CalendarListRenderer` の getter コールバックパターンをメソッドパラメータ直接渡しに変更済み
- [x] `EventLoadingService` の DI を `setDeps()` によるコンストラクタ注入に変更済み
- [x] `GoogleEventRenderer` の返り値を `{ element }` に統一済み
- [x] `CalendarManagementCard.render()` から `_prepareRenderData()` を抽出済み
- [x] `CalendarGroupManager` / `CalendarFilterRenderer` の getter コールバックパターンも同様にメソッドパラメータ直接渡しに変更済み

## ランディングページ

- [x] 英語版のSEO対応: `npm run build:landing`（`scripts/build-landing-en.js`）で静的な英語ページ（`docs/en/`）を生成し、`hreflang` 相互リンク・canonical・OGP・JSON-LD・`sitemap.xml`・`robots.txt` を追加済み。**文言や `docs/i18n.js` を変更したら `npm run build:landing` で `docs/en/` を再生成すること**。

## 仕様検討（Q7）

- [ ] `saveLocalEventsForDate()` の保存方式を上書き→マージベースに変更するか検討（現状は上書き方式。呼び出し元がload→edit→saveする必要あり）

## 既知の不具合（要設計）

- [ ] 日跨ぎイベントのレイアウト崩れ: `EventLayoutManager._getCachedTimeValue()`（`time-manager.js`）が `getHours()*60+getMinutes()` で日付を捨てるため、end の時刻が start より小さい（日をまたぐ）イベントで重なり判定が壊れ、レーン割当が誤る。現状は実タイムスタンプを持つGoogle予定（例 23:00→翌01:00）が深夜帯で他予定と重なるケースで横並びにならず重なって描画される（要素の位置・高さ自体は正しい）。ローカル予定は同一日付固定のため現状は非該当。**複数日ローカル予定を実装するなら前提として必須**。修正には (1) 重なり判定の日付対応（end<start時に+1440等）、(2) 閲覧中の日への表示クランプ／継続表示、(3) テスト追加 が必要。
- [ ] 毎日繰り返しの DST 日数ずれ（潜在）: `event-storage.js` DAILY 分岐の `Math.floor((targetDateObj - eventStartDate) / 86400000)` がサマータイム境界で1日ずれる。現状 `interval` はUIで `1` 固定（`local-event-modal.js` / `local-event-form-builder.js`）のため `daysDiff % 1 === 0` で観測影響なし。`interval > 1` 機能を追加する場合は `Math.floor`→`Math.round`（WEEKLYと整合）に修正すること。
