# TODO

今すぐは対応しないが、将来対応すべき項目をメモしておく。

## テスト

- [ ] `_showAuthExpiredBanner()` のDOMテスト（jsdom環境が必要）
- [ ] `checkGoogleAuthStatus()` の設定ページ分岐テスト（コンポーネントモックが必要）
- [ ] `buildCalendarErrorResponse()` のテスト（background.js からの export が必要）

## リファクタリング（既存コード）

- [ ] `_fetchEventsForCalendarIds()` が `_fetchWithAuth()` を迂回して直接 `fetch()` している — calendarList取得部分は `_fetchWithAuth()` に統一可能
- [ ] `respondToEvent()` のGET/PATCHレスポンスが `_checkResponse()` を使っていない — 401/403時に `AuthenticationError` にならない
