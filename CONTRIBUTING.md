# Development / 開発

## Build / ビルド

```bash
npm install
npm run build      # production build → dist/
npm run dev        # rebuild on save
npm run package    # release zip
npm test           # Jest
npm run lint       # ESLint
```

Load the project root as an unpacked extension (`chrome://extensions/` → Developer mode → Load unpacked) and reload it after each build. Google sign-in needs your own OAuth2 client ID in `manifest.json`. VS Code tasks for these commands are in `.vscode/tasks.json`.

プロジェクトのルートを「パッケージ化されていない拡張機能」として読み込み、ビルドのたびに再読み込みしてください。Google連携には `manifest.json` に自分の OAuth2 クライアントIDが必要です。

The code layout is described in [CLAUDE.md](./CLAUDE.md) and [`.claude/skills/architecture/SKILL.md`](./.claude/skills/architecture/SKILL.md).

コード構成は上記の CLAUDE.md とアーキテクチャのドキュメントにまとめています。

## Developer features / 開発者向け機能

Demo mode (mock data, no API calls) and the reminder debug tools are hidden behind a storage flag. Run this in the options page's DevTools console, then reload the page:

デモモード（モックデータ、APIを呼ばない）とリマインダーのデバッグ機能はストレージのフラグで表示します。設定ページの DevTools コンソールで実行し、ページを再読み込みしてください。

```js
chrome.storage.local.set({ enableDeveloperFeatures: true })   // enable / 有効化
chrome.storage.local.set({ enableDeveloperFeatures: false })  // disable / 無効化
```

When enabled, the settings page gets a Developer tab (demo mode, reminder test notification and alarm list, storage viewer). `enableReminderDebug: true` is still accepted for backward compatibility.

有効にすると設定ページに「開発者」タブ（デモモード、テスト通知とアラーム一覧、ストレージビューア）が表示されます。互換のため `enableReminderDebug: true` も使えます。
