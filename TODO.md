# TODO

今すぐは対応しないが、将来対応すべき項目をメモしておく。

## Googleイベント作成（今後の拡張）

- [ ] ゲスト招待（attendees）対応: 招待メール送信の副作用があるため UX を含め慎重に設計する（`sendUpdates` パラメータの扱い、確認ダイアログ等）。
- [ ] Google ネイティブの繰り返し（RRULE）対応: 現状 v1 では繰り返しなしの単発イベントのみ作成可能。`recurrence: ['RRULE:...']` を組み立てる UI とロジックが必要。
- [ ] 終日イベント（`start.date`/`end.date`）の作成・編集・削除対応（現状は時刻ありイベントのみ）。
- [x] 作成した Google イベントの編集・削除 — 単発・書込可能カレンダーの時刻ありイベントに対応済み。編集可否は `isEditableGoogleEvent()`（`google-event-utils.js`）で判定: 主催者本人（`organizer.self`）または `guestsCanModify` のイベントのみ（招待コピーは403になるため非表示）、日跨ぎイベントは編集フォームが時刻のみのため除外。削除時の404/410（他クライアントで削除済み）は成功扱い。残: 繰り返しイベントの編集・削除（「この予定のみ/以降すべて/全体」の選択UI）、編集時の Meet 切替、カレンダー移動、ゲスト（attendees）編集と `sendUpdates`、日跨ぎイベントの編集対応。
- [ ] Google イベント編集の競合制御（ETag/If-Match）: 現状は last-write-wins。他クライアントでの変更を上書きし得る。
- [x] 書き込みの冪等性: `runDeduped`（`src/lib/request-dedupe.js`）で対応済み — モーダルがリトライ間で安定な `requestId` を保持し、background が `chrome.storage.session` の台帳（SW再起動を跨いで有効）＋in-flight共有で重複実行を防ぐ。`requestId` はペイロードのハッシュを含む（`buildRequestId()`）ため、失敗後にフォームを修正して再送した場合は別リクエストとして実行される。台帳の read-modify-write はモジュール内で直列化済み。残る既知の穴: APIコミット直後〜台帳書き込み前に SW が死んだ場合のみ重複し得る（極小ウィンドウ）。
- [ ] 共有カレンダー（writer 権限）上の外部主催者イベント: API 上は編集可能だが、`isEditableGoogleEvent()` の主催者ゲートが保守的に編集/削除を非表示にする（誤って招待コピーに編集を出すよりも安全側に倒した意図的な仕様）。必要なら accessRole=writer の場合の緩和を検討。
- [ ] カレンダーリストの共有キャッシュ: 現状は作成モーダル（60秒TTL）のみキャッシュし、タイムラインフィルター・設定ページは都度取得。3箇所で共有するキャッシュ＋無効化契約を設計するリファクタ候補。
- [ ] `sendUpdates` は未指定（API既定 "none"）— 編集・削除してもゲストに通知メールは送られない。ゲスト付きイベントの編集を本格対応する際に通知可否の UX を設計すること。
- [x] `.btn`/`.btn-success`/`.btn-danger`/`.btn-secondary` クラスは CSS 未定義だった問題 — 予定の詳細・編集・削除確認を `event-dialog-dom.js` の共通部品（`.event-form-btn-*`）に置き換え、サイドパネルのモーダルからは使われなくなった（設定ページは Bootstrap を読み込むので対象外）。
- [ ] `background.js` の `createEvent`/`updateEvent`/`deleteEvent` ハンドラ自体の単体テスト（現状はクライアント層のテストでカバー。ハンドラ専用テストの前例がないため未整備）。
- [ ] `SidePanelUIController._getWritableCalendars()` の単体テスト（`googleIntegrated=false` で空配列を返すガードの検証。`side_panel.js` はトップレベルでDOM初期化するため import 不可 — コントローラのテスト基盤整備が前提）。
- [ ] `GoogleEventModal` の編集・削除UI（`_isEditableEvent` ゲート、フッターの出し分け `_setFooters`（操作 / 削除確認 / 出欠）、出欠の本文・フッター配置と送信結果の表示、`GoogleEventEditFormBuilder`）、`LocalEventModal` のインライン削除確認（表示・編集の両モード）、`DeleteRecurringDialog` のフォーカス・Escape・Tab 循環のDOMテスト（jsdom + コンポーネント基盤が必要）。実拡張での確認は Playwright の手元スクリプトで実施済み（2026-09、ja/en × ライト/ダーク × 384/320px）。
- [ ] 不在（OOO）イベントの**編集**: `eventType` は作成後に変更できないため、patch できるのは summary / start / end / `outOfOfficeProperties` のみ。既存の Google 編集フォームは時刻＋場所＋通知が前提なので、不在専用の編集フォームが要る。現状は削除のみ対応（`isDeletableGoogleEvent()`）。
- [ ] 不在の辞退設定の3値化: 現状は `declineNone` / `declineAllConflictingInvitations` のオン・オフのみ。Google 本体と揃えるなら `declineOnlyNewConflictingInvitations` と辞退メッセージ（`outOfOfficeProperties.declineMessage`）の入力欄が必要。
- [ ] 複数日にまたがる不在: 現状の「終日」は1日単位（`00:00` → 翌 `00:00`）。日付範囲の指定 UI と、`createAllDayEventElement()` の Day X/Y バッジ（`start.date`/`end.date` 前提）の対応が必要。
- [ ] 保存先トグル・種別行（`_buildSourceToggle` / `_buildEventTypeRow`）、OOO フィールド（`_buildOooFields`）、`_applyFieldVisibility`、所要時間ピッカー（`_applyDurationPreset` / `_syncDurationFromTimes`）の DOM テスト: `jest.config.js` が `testEnvironment: 'node'` のため jsdom 基盤の整備が前提（既存のモーダル系 DOM テストと同じ理由）。時刻計算の純関数部分（`timeStringToMinutes` / `minutesToTimeString`）は `tests/lib/time-utils.test.js` でカバー済み。
- [ ] `isAllDayLikeEvent()` の DST 分岐のテスト: 「翌日以降の現地 0:00 で終わる」判定は DST 移行日（23時間の日）でしか `>= 24h` 判定と挙動が分かれないが、Jest のワーカーはテストファイル実行前にタイムゾーンを UTC で確定させるため、ファイル内で `process.env.TZ` を設定しても効かない。スイート全体の TZ を変えると既存の時刻テストに影響するため保留。
- [ ] `_fetchEventsForCalendarIds()` の `isWritableCalendar` 刻印のテスト（fetch モックが複雑なため未整備 — `getCalendarEvents` 系テスト整備と合わせて対応）。

## テスト

- [ ] 予定モーダルの多言語レイアウト監査の自動化: 実拡張を Playwright で開き、各ステート（ローカル / 毎週 / Google＋詳細 / 不在 / メインなし / エラー / 編集）ではみ出し・折り返し・select の切れを検出する検査を ja / en / 疑似翻訳（+40%）× パネル幅 384 / 320px で回した（2026-09 実施、手元スクリプト）。詳細・Google 編集・削除確認・出欠・繰り返し削除も同様にライト/ダーク込みで確認済み。`scripts/` に取り込んで `npm run` 化するか、jsdom では再現できないため Playwright 前提の別枠テストとして整備する。
- [ ] `_showAuthExpiredBanner()` のDOMテスト（jsdom環境が必要）
- [ ] `checkGoogleAuthStatus()` の設定ページ分岐テスト（コンポーネントモックが必要）
- [ ] `buildCalendarErrorResponse()` のテスト（background.js からの export が必要）
- [ ] `utils.js` カバレッジ向上（現在40%）— `generateTimeList`、`reloadSidePanel` のテスト追加
- [ ] `google-calendar-client.js` カバレッジ向上（現在30%）— `getCalendarList`、`getCalendarEvents`、`getPrimaryCalendarEvents` のテスト追加（fetch モックが複雑）
- [ ] `current-time-line-manager.js` のテスト（DOM操作が多く jsdom 環境が必要）
- [ ] `demo-data.js`（実体）のテスト（スタブ版はカバー済み、実体はDOM依存あり）
- [ ] UIコンポーネント（options/、side_panel/components/）のテスト（DOM・コンポーネントライフサイクルのモックが必要）
- [ ] `SidePanelUIController.focusPendingEvent()` / `focusEvent()` のテスト（通知クリックから日付移動→スクロール→ハイライトまでの結線部分。`side_panel.js` はトップレベルでDOM初期化するため import 不可 — コントローラのテスト基盤整備が前提。`EventFocusService` 単体と `event-focus.js` の受け渡しはテスト済み）
- [ ] `OnboardingService.checkForUpdateNotification()` のテスト（`whatsNewAutoShow=false` 時に `lastSeenVersion` だけ進める分岐の検証含む。`StorageHelper`/`chrome.runtime.getManifest` のモックが必要）

## ビルド・パッケージング

- [ ] `prepare-release.js` が `package-lock.json` のバージョンを更新しないため、`npm install` するたびに lockfile が差分として出る（現在 lockfile は 1.10.2、`package.json` は 1.11.0）。`validate-version.js` のチェック対象にも含まれていない。
- [x] `build-zip.js` がリリースzipに `docs/` ディレクトリ全体を同梱していた問題 — 拡張機能は実行時に読み込まないため、リリースzipから除外済み

## リファクタリング（既存コード）

- [x] `_fetchEventsForCalendarIds()` が `_fetchWithAuth()` を迂回して直接 `fetch()` している — calendarList取得部分は `_fetchWithAuth()` に統一済み
- [x] `respondToEvent()` のGET/PATCHレスポンスが `_checkResponse()` を使っていない — `_checkResponse()` に統一済み
- [ ] `localize.js` が `window` グローバルに関数を export している — ES6 module の `export` に移行して明示的な `import` に統一（34ファイルが `window.getLocalizedMessage()` を使用中）
- [ ] 通知チェックボックスの文言に実際のリード時間を出す — 現状は `remindMeBefore`（「開始前に通知する」）固定。設定のリマインダー分数（既定5分）を差し込むには、プレースホルダ付きメッセージの新設と、設定値をフォームビルダーまで渡す配線が要る。
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

- [ ] 日本語の「イベント」と「予定」の混在: 予定の作成・詳細・削除まわり（ダイアログ見出し、削除確認、繰り返し削除、出欠の結果表示、作成・更新・削除の失敗メッセージ）は「予定」に揃えたが、`_locales/ja/messages.json` には他に「イベント」表記が100件ほど残る（設定ページ、エラーメッセージ等）。どこまで「予定」に寄せるかを決めてまとめて置き換える。
- [ ] 繰り返し予定の回への出欠: 「今回のみ」の補足は不参加にだけ付く（既存仕様）が、API にはインスタンス ID で送るため参加・未定も実際はその回だけに効く。補足を3択すべてに出すか、グループのラベル側（「今回の出欠」）で示すかを検討。
- [x] リマインダー表現の統一: `remindMeBefore` を「開始前に通知する」/"Notify me before the event" に変更し、設定ページ・Google 用の「通知」表記と統一済み。通知タイミングは設定（`reminderMinutes`）で変わるため、ラベルに分数は書かない。

## 既知の不具合（要設計）

- [ ] サイドパネル幅 320px（Chrome の最小幅）でヘッダーの更新アイコンと「前の日」ボタンが重なる（英語表示で確認。予定モーダルとは別件の既存レイアウト）。
- [ ] 拡張機能の言語設定と Chrome の言語が違うと、日付・時刻の表記が混在する（2026-09 に実拡張で確認）。例: Chrome が米国英語・拡張機能が日本語だと、日本語の画面に「04:30 PM」（時刻欄）・「09/25/2026」（ヘッダーの日付）・「午前9:00」（タイムライン）が並ぶ。表記を決めている箇所が3系統に分かれているのが原因:
  - 時刻欄・ヘッダーの日付（`<input type="time">` / `<input type="date">`）は Chrome の UI 言語に従う。ページの `lang` 属性では変わらない（実拡張で確認済み）ため、拡張機能からは制御できない。
  - タイムライン・予定ブロックの時刻は、12h/24h を `determineDefaultTimeFormat()`（`locale-utils.js`: Chrome の UI 言語が en-US なら 12h）で、「午前/AM」などの言葉を拡張機能の言語で決めている。
  - 詳細表示の日時（`formatEventTime()` / `_formatViewTime()`）と繰り返し削除ダイアログの日付は `navigator.language` で決めている。
  言語設定が「自動」なら拡張機能の言語も Chrome に揃うため、混在するのは言語を手動で変えたときだけ。どれを基準にするか（Chrome の言語に全部揃える／拡張機能の言語に揃え、時刻欄は独自の入力部品に置き換える、等）を決めてから直す。`CLAUDE.md` の「12h for English, 24h for Japanese」の記述も実態（Chrome の言語で決まる）と合わせて見直す。
- [x] 高速な日付ナビゲーションでの表示レース: `fetchEvents()` と `fetchEventsForCalendars()` に `_fetchVersion` ガードを追加し、古いレスポンスの描画・DOMクリア・`currentFetchPromise` の誤クリアを防止（`tests/side_panel/event-handlers-race.test.js`）。残る極小レース: 古いフェッチの `_processEvents` 実行中に新しいフェッチが完了した場合の混在描画（発生条件が非常に狭いため保留）。
- [x] 日跨ぎイベントのレイアウト崩れ（レーン割当）: `_areEventsOverlapping()` とグループ内ソートを、DOM が実際に描画する区間（開始の分単位 + 実所要時間 = `_getRenderInterval()`）で比較するよう変更。23:00→翌01:00 の重なり判定が正しくなり、かつ前日開始のイベント（23:00 の位置に描かれる）が深夜帯のイベントとグループ化されてレーンを奪う問題も回避（`tests/side_panel/time-manager.test.js` に日跨ぎスペック）。残: 前日開始イベントを閲覧中の日の先頭へクランプする／翌日にも継続表示する表示仕様（複数日ローカル予定を実装する際に設計）。レイアウトは描画位置に追随しているため、その時は `_getRenderInterval()` も合わせて更新すること。
- [ ] 毎日繰り返しの DST 日数ずれ（潜在）: `event-storage.js` DAILY 分岐の `Math.floor((targetDateObj - eventStartDate) / 86400000)` がサマータイム境界で1日ずれる。現状 `interval` はUIで `1` 固定（`local-event-modal.js` / `local-event-form-builder.js`）のため `daysDiff % 1 === 0` で観測影響なし。`interval > 1` 機能を追加する場合は `Math.floor`→`Math.round`（WEEKLYと整合）に修正すること。
