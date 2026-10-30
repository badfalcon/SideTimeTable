# TODO

今すぐは対応しないが、将来対応すべき項目をメモしておく。

## Googleイベント作成（今後の拡張）

- [ ] ゲスト候補を連絡先（People API）からも出す — 現状は読み込み済みの予定の参加者のみ。追加スコープが要るため見送り中。
- [ ] Google ネイティブの繰り返し（RRULE）対応: 現状 v1 では繰り返しなしの単発イベントのみ作成可能。`recurrence: ['RRULE:...']` を組み立てる UI とロジックが必要。
- [ ] 終日イベント（`start.date`/`end.date`）の作成・編集・削除対応（現状は時刻ありイベントのみ）。
- [ ] Google 予定の編集の残り: 繰り返し予定の編集・削除（「この予定のみ/以降すべて/全体」の選択UI）、編集時の Meet 切替、カレンダー移動、既存予定のゲスト（attendees）編集（下記 `sendUpdates` 項目と合わせて設計）、日跨ぎ予定の編集（現状は `isEditableGoogleEvent()` で除外）。
- [ ] Google イベント編集の競合制御（ETag/If-Match）: 現状は last-write-wins。他クライアントでの変更を上書きし得る。
- [ ] 書き込みの冪等性（`runDeduped`）の既知の穴: API コミット直後〜台帳書き込み前に SW が死んだ場合のみ重複し得る（極小ウィンドウ）。
- [ ] 共有カレンダー（writer 権限）上の外部主催者イベント: API 上は編集可能だが、`isEditableGoogleEvent()` の主催者ゲートが保守的に編集/削除を非表示にする（誤って招待コピーに編集を出すよりも安全側に倒した意図的な仕様）。必要なら accessRole=writer の場合の緩和を検討。
- [ ] カレンダーリストの共有キャッシュ: 現状は作成モーダル（60秒TTL）のみキャッシュし、タイムラインフィルター・設定ページは都度取得。3箇所で共有するキャッシュ＋無効化契約を設計するリファクタ候補。
- [ ] `sendUpdates` は未指定（API既定 "none"）— 編集・削除してもゲストに通知メールは送られない。ゲスト付きイベントの編集を本格対応する際に通知可否の UX を設計すること。
- [ ] `background.js` の `createEvent`/`updateEvent`/`deleteEvent` ハンドラ自体の単体テスト（現状はクライアント層のテストでカバー。ハンドラ専用テストの前例がないため未整備）。
- [ ] `SidePanelUIController._getWritableCalendars()` の単体テスト（`googleIntegrated=false` で空配列を返すガードの検証。`side_panel.js` はトップレベルでDOM初期化するため import 不可 — コントローラのテスト基盤整備が前提）。
- [ ] `SidePanelUIController` が `LocalEventModal` の `onDelete(event, deleteType)` を `_handleDeleteLocalEvent` へ `deleteType` ごと転送することの単体テスト（「すべての予定を削除」が単一回の削除扱いになる不具合の回帰防止。`side_panel.js` はトップレベルでDOM初期化するため import 不可 — コントローラのテスト基盤整備が前提）。
- [ ] `GoogleEventModal` の編集・削除UI（`_isEditableEvent` ゲート、フッターの出し分け `_setFooters`（操作 / 削除確認 / 出欠）、出欠の本文・フッター配置と送信結果の表示、`GoogleEventEditFormBuilder`）、`LocalEventModal` のインライン削除確認（表示・編集の両モード）、`DeleteRecurringDialog` のフォーカス・Escape・Tab 循環のDOMテスト（jsdom + コンポーネント基盤が必要）。実拡張での確認は Playwright の手元スクリプトで実施済み（2026-09、ja/en × ライト/ダーク × 384/320px）。
- [ ] 不在（OOO）イベントの**編集**: `eventType` は作成後に変更できないため、patch できるのは summary / start / end / `outOfOfficeProperties` のみ。既存の Google 編集フォームは時刻＋場所＋通知が前提なので、不在専用の編集フォームが要る。現状は削除のみ対応（`isDeletableGoogleEvent()`）。
- [ ] 不在の辞退設定の3値化: 現状は `declineNone` / `declineAllConflictingInvitations` のオン・オフのみ。Google 本体と揃えるなら `declineOnlyNewConflictingInvitations` と辞退メッセージ（`outOfOfficeProperties.declineMessage`）の入力欄が必要。
- [ ] 複数日にまたがる不在: 現状の「終日」は1日単位（`00:00` → 翌 `00:00`）。日付範囲の指定 UI と、`createAllDayEventElement()` の Day X/Y バッジ（`start.date`/`end.date` 前提）の対応が必要。
- [ ] ゲスト欄（`GuestField`）の DOM テスト: 候補の矢印キー選択・Enter/区切り文字での確定・貼り付けの分割・Backspace での削除・Escape が候補だけを閉じること・不正アドレスでの保存拒否とその解除。純関数部分（`guest-utils.js`）は `tests/lib/guest-utils.test.js` でカバー済み、実拡張では Playwright の手元スクリプトで確認済み（2026-09、ja/en-320/ダーク）。jsdom 基盤が前提。
- [ ] 保存先トグル・種別行（`_buildSourceToggle` / `_buildEventTypeRow`）、OOO フィールド（`_buildOooFields`）、`_applyFieldVisibility`、所要時間ピッカー（`_applyDurationPreset` / `_syncDurationFromTimes`）の DOM テスト: `jest.config.js` が `testEnvironment: 'node'` のため jsdom 基盤の整備が前提（既存のモーダル系 DOM テストと同じ理由）。時刻計算の純関数部分（`timeStringToMinutes` / `minutesToTimeString`）は `tests/lib/time-utils.test.js` でカバー済み。
- [ ] `isAllDayLikeEvent()` の DST 分岐のテスト: 「翌日以降の現地 0:00 で終わる」判定は DST 移行日（23時間の日）でしか `>= 24h` 判定と挙動が分かれないが、Jest のワーカーはテストファイル実行前にタイムゾーンを UTC で確定させるため、ファイル内で `process.env.TZ` を設定しても効かない。スイート全体の TZ を変えると既存の時刻テストに影響するため保留。
- [ ] `_fetchEventsForCalendarIds()` の `isWritableCalendar` 刻印のテスト（fetch モックが複雑なため未整備 — `getCalendarEvents` 系テスト整備と合わせて対応）。

## 通常画面（2026-09 のデザイン刷新の残り）

- [ ] 英語で予定が4列以上重なる 320px 幅では、1列が約60pxになり長い単語が途中で折り返る。`hyphens: auto` を指定済みだが、効くかは Chrome のハイフネーション辞書しだい（ヘッドレスの Linux Chromium では効かないことを確認）。重なりが多いときの表示方式（重ねて表示・「+2」表示など）の検討。
- [ ] 日本語の文節折り返し（`word-break: auto-phrase`）はヘッドレスの Chromium では効かず、検証環境では「割り込/み禁止」のように切れる。通常の Chrome での見え方を実機で確認すること。
- [ ] ヘッダー（日付ラベルとそのカレンダー）、「今日に戻る」ボタンの表示と位置追従、`markPastEvents()`、予定ブロックの行数計算（`--event-lines`）、メモの畳んだバー（高さ・スペーサー・`aria-expanded`）の DOM テスト: jsdom 基盤が前提。実拡張では Playwright の手元スクリプトで確認済み（2026-09、ja/en-320/ダーク）。
- [ ] デモデータのカレンダーグループ名（`Team Members` / `Shared Calendars` など、`_DEMO_CALENDAR_GROUPS`）が日本語表示でも英語のまま。カレンダー名と同じく `L(locale, en, ja)` で訳す。

## テスト

- [ ] 時刻欄（`createTimeField()`）の DOM テスト: 一覧の開閉（クリック・↓・Escape はダイアログを閉じない・Tab・スクロールで閉じる）、↑↓・PageUp/Down・Enter での選択、入力の確定（Enter / フォーカスが外れたとき）と不正な入力で元の時刻に戻ること、変更の通知が1回だけなこと。読み取り・書式は `tests/lib/time-field.test.js` でカバー済み、操作は実拡張で確認済み。jsdom 基盤が前提（popover と `:popover-open` も要る）。
- [ ] 日付欄・カレンダー（`createDateField()` / `createDateCalendar()`）の DOM テスト: 開閉（クリック・↓・Escape はダイアログを閉じない・Tab・外側クリック・スクロール）、矢印・PageUp/Down（Shift で1年）・Enter での選択、`min` より前の日が選べないこと、入力の確定と不正な入力で元の日付に戻ること、変更の通知が1回だけなこと、ヘッダーでの Escape 後のフォーカス戻り。読み取り・書式・月の並びは `tests/lib/date-field.test.js` でカバー済み、操作は実拡張で確認済み（2026-10、Chrome 米国英語/日本語 × 拡張 ja/en × ライト/ダーク × 384/320px）。jsdom 基盤が前提。
- [ ] 初期設定・チュートリアルの document レベルの Escape ハンドラの DOM テスト（表示していないときの Escape で `_finish()` が走らないこと）。`_isActive()` 単体は `tests/side_panel/onboarding-overlays.test.js` でカバー済み。jsdom 基盤が前提。
- [ ] 予定モーダルの多言語レイアウト監査の自動化: 実拡張を Playwright で開き、各ステート（ローカル / 毎週 / Google＋詳細 / 不在 / メインなし / エラー / 編集）ではみ出し・折り返し・select の切れを検出する検査を ja / en / 疑似翻訳（+40%）× パネル幅 384 / 320px で回した（2026-09 実施、手元スクリプト）。詳細・Google 編集・削除確認・出欠・繰り返し削除も同様にライト/ダーク込みで確認済み。`scripts/` に取り込んで `npm run` 化するか、jsdom では再現できないため Playwright 前提の別枠テストとして整備する。
- [ ] `_showAuthExpiredBanner()` のDOMテスト（jsdom環境が必要）
- [ ] `checkGoogleAuthStatus()` の設定ページ分岐テスト（コンポーネントモックが必要）
- [ ] `buildCalendarErrorResponse()` のテスト（background.js からの export が必要）
- [ ] `utils.js` カバレッジ向上（現在40%）— `generateTimeList`、`reloadSidePanel` のテスト追加
- [ ] `google-calendar-client.js` カバレッジ向上（現在30%）— `getCalendarList`、`getCalendarEvents`、`getPrimaryCalendarEvents` のテスト追加（fetch モックが複雑）
- [ ] `side_panel/current-time-line-manager.js` のテスト（DOM操作が多く jsdom 環境が必要）
- [ ] `demo-data.js`（実体）のテスト（スタブ版はカバー済み、実体はDOM依存あり）
- [ ] UIコンポーネント（options/、side_panel/components/）のテスト（DOM・コンポーネントライフサイクルのモックが必要）
- [ ] `SidePanelUIController.focusPendingEvent()` / `focusEvent()` のテスト（通知クリックから日付移動→スクロール→ハイライトまでの結線部分。`side_panel.js` はトップレベルでDOM初期化するため import 不可 — コントローラのテスト基盤整備が前提。`EventFocusService` 単体と `event-focus.js` の受け渡しはテスト済み）
- [ ] `OnboardingService.checkForUpdateNotification()` のテスト（`whatsNewAutoShow=false` 時に `lastSeenVersion` だけ進める分岐の検証含む。`StorageHelper`/`chrome.runtime.getManifest` のモックが必要）

## ビルド・パッケージング

- [ ] `prepare-release.js` が `package-lock.json` のバージョンを更新しないため、`npm install` するたびに lockfile が差分として出る（現在 lockfile は 1.10.2、`package.json` は 1.11.0）。`validate-version.js` のチェック対象にも含まれていない。
- [ ] `npm run lint` の対象が `src/` のみで `scripts/` が未チェック — ビルド/告知系スクリプトが増えたので lint 対象に含めるか検討（Node 向けの globals 設定が必要）

## リファクタリング（既存コード）

- [ ] `localize.js` が `window` グローバルに関数を export している — ES6 module の `export` に移行して明示的な `import` に統一（34ファイルが `window.getLocalizedMessage()` を使用中）

## 将来対応（機能）

- [ ] Outlook カレンダー統合（PKCE OAuth2）: 実装済みの作業を `archive/pkce-outlook-support` タグに保存してブランチはクローズ（旧ブランチ `claude/pkce-outlook-support-83qZL`、最終コミット `7e35449`）。実装内容: `src/lib/pkce.js`（PKCE ヘルパー）、`src/services/outlook-calendar-client.js`（Microsoft Graph クライアント約670行）、設定画面の Outlook 連携カード2種、`OutlookEventManager`、i18n 英日約40キー、テスト320行。main 追従済み（テスト637件・lint・ビルド確認済み）。**再開時の残作業**: (1) Outlook イベント描画が旧方式（`EventElementFactory` 直呼び）のままなので `GoogleEventRenderer` と同様の renderer パターンへ揃える、(2) Azure アプリ登録と実機での OAuth フロー確認、(3) 終日イベント対応（現状スキップ）。

## 仕様検討（Q7）

- [ ] `saveLocalEventsForDate()` の保存方式を上書き→マージベースに変更するか検討（現状は上書き方式。呼び出し元がload→edit→saveする必要あり）

## 既知の不具合（要設計）

- [ ] 日付ナビゲーションの残る極小レース: 古いフェッチの `_processEvents` 実行中に新しいフェッチが完了した場合の混在描画（`_fetchVersion` ガードでは防げない。発生条件が非常に狭いため保留）。
- [ ] 前日開始の日跨ぎ予定を閲覧中の日の先頭へクランプする／翌日にも継続表示する表示仕様（複数日ローカル予定を実装する際に設計）。その時は `EventLayoutManager._getRenderInterval()` も合わせて更新すること。
- [ ] 毎日繰り返しの DST 日数ずれ（潜在）: `event-storage.js` DAILY 分岐の `Math.floor((targetDateObj - eventStartDate) / 86400000)` がサマータイム境界で1日ずれる。現状 `interval` はUIで `1` 固定（`local-event-modal.js` / `local-event-form-builder.js`）のため `daysDiff % 1 === 0` で観測影響なし。`interval > 1` 機能を追加する場合は `Math.floor`→`Math.round`（WEEKLYと整合）に修正すること。
