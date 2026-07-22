# TODO

今すぐは対応しないが、将来対応すべき項目をメモしておく。

## Googleイベント作成（今後の拡張）

- [ ] ゲスト招待（attendees）対応: 招待メール送信の副作用があるため UX を含め慎重に設計する（`sendUpdates` パラメータの扱い、確認ダイアログ等）。
- [ ] Google ネイティブの繰り返し（RRULE）対応: 現状 v1 では繰り返しなしの単発イベントのみ作成可能。`recurrence: ['RRULE:...']` を組み立てる UI とロジックが必要。
- [ ] 終日イベント（`start.date`/`end.date`）の作成・編集・削除対応（現状は時刻ありイベントのみ）。
- [x] 作成した Google イベントの編集・削除 — 単発・書込可能カレンダーの時刻ありイベントに対応済み。編集可否は `isEditableGoogleEvent()`（`google-event-utils.js`）で判定: 主催者本人（`organizer.self`）または `guestsCanModify` のイベントのみ（招待コピーは403になるため非表示）、日跨ぎイベントは編集フォームが時刻のみのため除外。削除時の404/410（他クライアントで削除済み）は成功扱い。残: 繰り返しイベントの編集・削除（「この予定のみ/以降すべて/全体」の選択UI）、編集時の Meet 切替、カレンダー移動、ゲスト（attendees）編集と `sendUpdates`、日跨ぎイベントの編集対応。
- [ ] Google イベント編集の競合制御（ETag/If-Match）: 現状は last-write-wins。他クライアントでの変更を上書きし得る。
- [ ] 書き込みの冪等性: サービスワーカーが書き込みコミット後・応答前に死ぬと UI は失敗表示になり、再試行で重複作成し得る（at-least-once）。`requestId` は送信済みだが background 側で重複排除に未使用。
- [ ] 共有カレンダー（writer 権限）上の外部主催者イベント: API 上は編集可能だが、`isEditableGoogleEvent()` の主催者ゲートが保守的に編集/削除を非表示にする（誤って招待コピーに編集を出すよりも安全側に倒した意図的な仕様）。必要なら accessRole=writer の場合の緩和を検討。
- [ ] カレンダーリストの共有キャッシュ: 現状は作成モーダル（60秒TTL）のみキャッシュし、タイムラインフィルター・設定ページは都度取得。3箇所で共有するキャッシュ＋無効化契約を設計するリファクタ候補。
- [ ] `sendUpdates` は未指定（API既定 "none"）— 編集・削除してもゲストに通知メールは送られない。ゲスト付きイベントの編集を本格対応する際に通知可否の UX を設計すること。
- [ ] `.btn`/`.btn-success`/`.btn-danger`/`.btn-secondary` クラスは CSS 未定義（スタイルは `#id` セレクタ由来）。ローカルモーダルの既存パターン踏襲だが、ユーティリティクラスとして定義するか外すか整理する。
- [ ] `background.js` の `createEvent`/`updateEvent`/`deleteEvent` ハンドラ自体の単体テスト（現状はクライアント層のテストでカバー。ハンドラ専用テストの前例がないため未整備）。
- [ ] `SidePanelUIController._getWritableCalendars()` の単体テスト（`googleIntegrated=false` で空配列を返すガードの検証。`side_panel.js` はトップレベルでDOM初期化するため import 不可 — コントローラのテスト基盤整備が前提）。
- [ ] `GoogleEventModal` の編集・削除UI（`_isEditableEvent` ゲート、インライン削除確認、`GoogleEventEditFormBuilder`）のDOMテスト（jsdom + コンポーネント基盤が必要）。
- [ ] `_fetchEventsForCalendarIds()` の `isWritableCalendar` 刻印のテスト（fetch モックが複雑なため未整備 — `getCalendarEvents` 系テスト整備と合わせて対応）。

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

- [x] `build-zip.js` がリリースzipに `docs/` ディレクトリ全体を同梱していた問題 — 拡張機能は実行時に読み込まないため、リリースzipから除外済み

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

- [x] 英語版のSEO対応: `npm run build:landing`（`scripts/build-landing-en.js`）で静的な英語ページ（`docs/en/`）を生成し、`hreflang` 相互リンク・canonical・OGP・JSON-LD・`sitemap.xml`・`robots.txt` を追加済み。ルートは日本語専用で非日本語ブラウザは `/en/` へリダイレクトする方式（ランタイム言語切替は廃止）。**文言（ルートの日本語）や `scripts/landing-en-data.js`（英語辞書）を変更したら `npm run build:landing` で `docs/en/` を再生成すること**（`tests/docs/landing-en.test.js` が再生成忘れを検知する）。

## 将来対応（機能）

- [ ] Outlook カレンダー統合（PKCE OAuth2）: 実装済みの作業を `archive/pkce-outlook-support` タグに保存してブランチはクローズ（旧ブランチ `claude/pkce-outlook-support-83qZL`、最終コミット `7e35449`）。実装内容: `src/lib/pkce.js`（PKCE ヘルパー）、`src/services/outlook-calendar-client.js`（Microsoft Graph クライアント約670行）、設定画面の Outlook 連携カード2種、`OutlookEventManager`、i18n 英日約40キー、テスト320行。main 追従済み（テスト637件・lint・ビルド確認済み）。**再開時の残作業**: (1) Outlook イベント描画が旧方式（`EventElementFactory` 直呼び）のままなので `GoogleEventRenderer` と同様の renderer パターンへ揃える、(2) Azure アプリ登録と実機での OAuth フロー確認、(3) 終日イベント対応（現状スキップ）。

## 仕様検討（Q7）

- [ ] `saveLocalEventsForDate()` の保存方式を上書き→マージベースに変更するか検討（現状は上書き方式。呼び出し元がload→edit→saveする必要あり）

## 用語統一

- [ ] リマインダー表現の統一: ローカル作成フォームの `remindMeBefore`（「5分前にリマインドする」/"Remind me 5 minutes before"）だけが「リマインド/Remind」を使い、設定ページ（`reminderTimeLabel`「次の時間前に通知:」）と Google 用の新しい `notification`（「通知」）は「通知」で統一されている。同じ作成モーダル内に両方が存在するため、旧文字列を「通知」系に揃える。

## 既知の不具合（要設計）

- [ ] 高速な日付ナビゲーションでの表示レース（既存）: `GoogleEventManager.fetchEvents()`（`event-handlers.js`）には日付の鮮度ガードがなく、遅いレスポンスが後勝ちして別日の時刻付きイベントが描画され得る（`fetchEventsForCalendars` は `_toggleVersion` でガード済み — 同様のガードを追加する）。作成/編集/削除フローはモーダルの背面幕がリロード完了まで操作を遮断するため非該当。
- [ ] 日跨ぎイベントのレイアウト崩れ: `EventLayoutManager._getCachedTimeValue()`（`time-manager.js`）が `getHours()*60+getMinutes()` で日付を捨てるため、end の時刻が start より小さい（日をまたぐ）イベントで重なり判定が壊れ、レーン割当が誤る。現状は実タイムスタンプを持つGoogle予定（例 23:00→翌01:00）が深夜帯で他予定と重なるケースで横並びにならず重なって描画される（要素の位置・高さ自体は正しい）。ローカル予定は同一日付固定のため現状は非該当。**複数日ローカル予定を実装するなら前提として必須**。修正には (1) 重なり判定の日付対応（end<start時に+1440等）、(2) 閲覧中の日への表示クランプ／継続表示、(3) テスト追加 が必要。
- [ ] 毎日繰り返しの DST 日数ずれ（潜在）: `event-storage.js` DAILY 分岐の `Math.floor((targetDateObj - eventStartDate) / 86400000)` がサマータイム境界で1日ずれる。現状 `interval` はUIで `1` 固定（`local-event-modal.js` / `local-event-form-builder.js`）のため `daysDiff % 1 === 0` で観測影響なし。`interval > 1` 機能を追加する場合は `Math.floor`→`Math.round`（WEEKLYと整合）に修正すること。
