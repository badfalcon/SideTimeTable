# お知らせ通知システム（What's New）実装計画

## 概要
サイドパネルを開いたとき、拡張機能のバージョンが更新されていた場合に「What's New」モーダルを表示し、ユーザーに新機能や更新内容を知らせる仕組みを実装する。

## アーキテクチャ方針
- 既存の `ModalComponent` を継承した `WhatsNewModal` を新規作成
- バージョン比較には `chrome.runtime.getManifest().version` を使用
- 最後に確認したバージョンは `StorageHelper`（sync storage）で永続化
- リリースノートデータはJSモジュールとして管理し、バージョンごとに構造化
- 日英両対応（既存のi18nシステムを活用）

## 実装ステップ

### Step 1: リリースノートデータモジュールの作成
**新規ファイル**: `src/lib/release-notes.js`
- バージョンごとのリリースノートを配列で管理
- 各エントリに `version`、`date`、`highlights`（en/jaの多言語対応）を持たせる
- 例:
```js
export const RELEASE_NOTES = [
  {
    version: '1.7.0',
    date: '2026-02-13',
    highlights: {
      en: [
        'Added "What\'s New" notification for update announcements',
        'New feature X',
      ],
      ja: [
        '更新通知（What\'s New）機能を追加',
        '新機能Xを追加',
      ]
    }
  },
  // 過去バージョンも追加可能
];
```

### Step 2: WhatsNewModal コンポーネントの作成
**新規ファイル**: `src/side_panel/components/modals/whats-new-modal.js`
- `ModalComponent` を継承
- `createContent()` をオーバーライドしてリリースノートUIを構築
- 現在の言語設定に応じて en/ja のリリースノートを表示
- 未読バージョン（lastSeenVersion以降）のノートのみ表示
- 「OK」ボタンで閉じると `lastSeenVersion` を更新
- UIデザイン:
  - タイトル: "What's New" / "最新情報"
  - バージョンごとにセクション分け（バージョン番号 + 日付 + ハイライトリスト）
  - 確認ボタン（閉じると既読になる）

### Step 3: コンポーネントの登録と統合
**変更ファイル**: `src/side_panel/components/index.js`
- `WhatsNewModal` の export を追加

**変更ファイル**: `src/side_panel/side_panel.js`
- `WhatsNewModal` を import
- `_createComponents()` 内でインスタンス生成、登録、DOM追加
- `_removeExistingElements()` に WhatsNew モーダルのIDを追加
- `_loadInitialData()` の最後にバージョンチェックロジックを追加:
  ```js
  const currentVersion = chrome.runtime.getManifest().version;
  const settings = await StorageHelper.get(['lastSeenVersion'], {});
  if (settings.lastSeenVersion !== currentVersion) {
    this.whatsNewModal.showForVersion(settings.lastSeenVersion);
  }
  ```
- モーダルを閉じたときに `StorageHelper.set({ lastSeenVersion: currentVersion })` を実行

### Step 4: ストレージキーの追加
**変更ファイル**: `src/lib/utils.js`
- `STORAGE_KEYS` に `LAST_SEEN_VERSION: 'lastSeenVersion'` を追加（任意、直接文字列でも可）

### Step 5: ローカライゼーション文字列の追加
**変更ファイル**: `_locales/en/messages.json`
- `whatsNew`: "What's New"
- `whatsNewTitle`: "What's New"
- `whatsNewConfirm`: "Got it"

**変更ファイル**: `_locales/ja/messages.json`
- `whatsNew`: "最新情報"
- `whatsNewTitle`: "最新情報"
- `whatsNewConfirm`: "OK"

### Step 6: スタイリング
**変更ファイル**: `src/side_panel/side_panel.css`
- WhatsNew モーダル用の追加スタイル
  - リリースノートリスト用スタイル
  - バージョンセクションの区切り
  - 必要に応じてスクロール対応（ノートが長い場合）

### Step 7: Webpack設定の確認
- `release-notes.js` は `side_panel.js` から import されるため、自動的にバンドルに含まれる
- 追加のentry point設定は不要

### Step 8: ビルドと動作確認
- `npm run build` でビルドが通ることを確認

## ファイル変更サマリー

| ファイル | 変更種別 |
|---------|---------|
| `src/lib/release-notes.js` | **新規作成** |
| `src/side_panel/components/modals/whats-new-modal.js` | **新規作成** |
| `src/side_panel/components/index.js` | 変更（export追加） |
| `src/side_panel/side_panel.js` | 変更（モーダル統合） |
| `src/side_panel/side_panel.css` | 変更（スタイル追加） |
| `_locales/en/messages.json` | 変更（文字列追加） |
| `_locales/ja/messages.json` | 変更（文字列追加） |

## 設計上の判断ポイント

1. **リリースノートをJSモジュールで管理**: messages.json だと構造が複雑になるため、ハイライト内容はJSモジュールに直接記述し、UI固定文言のみi18nを使う
2. **sync storage で lastSeenVersion を保存**: デバイス間で同期されるため、別デバイスで既に確認済みなら再表示されない
3. **初回インストール時の扱い**: `lastSeenVersion` が未設定の場合は現在バージョンをセットしてモーダルを表示しない（新規ユーザーには不要）
4. **複数バージョン分の表示**: ユーザーがいくつかのバージョンを飛ばした場合、未読分すべてを一覧表示する
