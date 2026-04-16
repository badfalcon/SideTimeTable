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

## リファクタリング（既存コード）

- [x] `_fetchEventsForCalendarIds()` が `_fetchWithAuth()` を迂回して直接 `fetch()` している — calendarList取得部分は `_fetchWithAuth()` に統一済み
- [x] `respondToEvent()` のGET/PATCHレスポンスが `_checkResponse()` を使っていない — `_checkResponse()` に統一済み
- [ ] `localize.js` が `window` グローバルに関数を export している — ES6 module の `export` に移行して明示的な `import` に統一（34ファイルが `window.getLocalizedMessage()` を使用中）
- [ ] `background.js` の21箇所の `console.error/warn` 直接呼出を `logError()` に統一
- [ ] `StorageHelper` 直接利用とラッパー関数 (`settings-storage.js`, `event-storage.js`) の使い分け基準をドキュメント化、または統一

## 仕様検討（Q7）

- [ ] `saveLocalEventsForDate()` の保存方式を上書き→マージベースに変更するか検討（現状は上書き方式。呼び出し元がload→edit→saveする必要あり）
