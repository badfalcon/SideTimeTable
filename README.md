# SideTimeTable

[![CI](https://github.com/badfalcon/SideTimeTable/actions/workflows/ci.yml/badge.svg)](https://github.com/badfalcon/SideTimeTable/actions/workflows/ci.yml)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/pnknjjpncnciijkpdfgfiikmhlmamaid?logo=googlechrome&logoColor=white&label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/sidetimetable/pnknjjpncnciijkpdfgfiikmhlmamaid)
[![Users](https://img.shields.io/chrome-web-store/users/pnknjjpncnciijkpdfgfiikmhlmamaid?label=users)](https://chromewebstore.google.com/detail/sidetimetable/pnknjjpncnciijkpdfgfiikmhlmamaid)
[![License](https://img.shields.io/github/license/badfalcon/SideTimeTable)](./LICENSE)
[![Sponsor](https://img.shields.io/github/sponsors/badfalcon?logo=githubsponsors&logoColor=white&label=Sponsor&color=ea4aaa)](https://github.com/sponsors/badfalcon)

## English

### Overview
**SideTimeTable** is a Chrome extension that allows users to manage and view events for their day via a side panel. It integrates with Google Calendar to show, create, and edit events, and also lets you add local events that live only in the extension.

### Features
- **Side Panel Interface**: See your day as a timeline in Chrome's side panel, and jump to any date from the header's month calendar.
- **Google Calendar Integration**: Sync multiple Google Calendars and choose which ones to show from the side panel's calendar filter or the settings page (search by name or email address).
- **Create and Edit Google Events**: Create, edit, and delete Google Calendar events from the side panel — invite guests, add a Google Meet link, create out-of-office events, and respond to invitations.
- **All-day and Out-of-office Events**: All-day and multi-day events appear at the top of the timeline; out-of-office events have their own style.
- **Calendar Grouping**: Organize calendars into custom groups (e.g., "Work", "Personal") and switch views with one click.
- **Local Event Management**: Add and edit events that live only in the extension, or drag on the timeline to create one instantly.
- **Recurring Events**: Create daily, weekly, monthly, or weekday recurring events with ease.
- **Reminder Notifications**: Get desktop alerts minutes before events (1/3/5/10/15/30/60 minutes); click a notification to jump to the event, or open its Meet, Zoom, Teams, or Webex link directly.
- **Auto-reminders for Google Events**: Automatically create reminders from your connected Google Calendars (toggle on/off).
- **Memo Panel**: Collapsible memo area at the bottom of the side panel with adjustable height; when collapsed it shows the memo's first line.
- **Themes and Dark Mode**: Color themes (including presets for Protanopia, Deuteranopia, and Tritanopia) and full dark mode support.
- **Custom Time Settings**: Set your work hours and break times, and choose 12- or 24-hour time.
- **Multi-language Support**: English and Japanese, with dates and times written in the extension's language.
- **First-time Setup and Tutorial**: A setup wizard and an interactive tutorial help new users get started.
- **Keyboard Shortcuts**: Configurable keyboard shortcut for quick side panel access.
- **Advanced Event Layout**: Overlapping events are placed side by side in lanes.
- **Demo Mode**: Developer mode with mock data for testing without API access.

### Installation
1. Clone the repository to your local machine.
2. Install dependencies: `npm install`
3. Build the extension: `npm run build`
4. Follow browser-specific steps to load an unpacked extension.
5. Ensure you've configured the necessary Google API credentials for OAuth2.

### Usage
- Click on the extension icon or use keyboard shortcuts to open the side panel.
- **Calendar Management**: In settings, automatically discover and select your Google Calendars with built-in search functionality.
- **Event Management**: Use the add button in the header to create a local event or a Google Calendar event; click an event to see its details, edit it, or respond.
- **Customization**: Configure working hours, break times, colors, and language preferences in the settings panel.
- **Demo Mode**: For development, enable demo mode to test with sample data without API access.

### Development and Customization
- Clone this repository and run `npm install`
- **Build System**: Webpack + Babel for ES6 → CommonJS transformation
  - `npm run dev`: Development mode with file watching (auto-rebuild on save)
  - `npm run build`: Production build
  - `npm run package`: Create release zip file (builds and packages automatically)
- **Main Architecture**: ES6 modules bundled with webpack:
  - `src/background.js`: Service worker handling Google Calendar API and OAuth2
  - `src/side_panel/side_panel.js`: Main UI controller with `SidePanelUIController` class
  - `src/side_panel/time-manager.js`: `EventLayoutManager` class (overlap detection and lane layout)
  - `src/side_panel/event-handlers.js`: `GoogleEventManager` and `LocalEventManager` classes
  - `src/options/options.js`: Settings page with `OptionsPageManager`; calendar management lives in `src/options/components/calendar/`
- **Styling**: Plain CSS with CSS variables — `side_panel.css` for the side panel, `options.css` / `settings-tokens.css` for the settings page (light and dark themes)
- **Quality checks**: `npm test` (Jest) and `npm run lint` (ESLint)
- **VS Code**: Pre-configured tasks in `.vscode/tasks.json` (Build, Dev (Watch), Package (Release), Test, Lint)
- **Development Workflow**:
  1. Run `npm run dev` to start file watching
  2. Edit source files in `src/`
  3. Reload extension in Chrome to see changes
  4. Use `npm run package` to create distribution zip

#### Enabling Developer Features (Demo/Reminder Debug)
SideTimeTable uses runtime storage flags to show developer-only features such as Demo Mode and Reminder debug tools. No build flags are required.

Enable:
```
chrome.storage.local.set({ enableDeveloperFeatures: true })
// Legacy (still supported):
// chrome.storage.local.set({ enableReminderDebug: true })
```

Disable:
```
chrome.storage.local.set({ enableDeveloperFeatures: false, enableReminderDebug: false })
```

Apply changes:
- Reload the Options page (and the side panel if necessary).

What becomes available when enabled:
- Options shows a `Developer Settings` card with a Demo Mode toggle (uses mock data, no API calls).
- Options `Reminder Settings` card shows a `Debug & Test` section (send test notification, list alarms).
- Background message actions (for development only):
  - `chrome.runtime.sendMessage({ action: 'testReminder' })`
  - `chrome.runtime.sendMessage({ action: 'debugAlarms' })`
  - These only work when Developer Features are enabled.

Notes:
- `enableReminderDebug` remains for backward compatibility but may be deprecated later.
- No extra Chrome permissions are required for these toggles.

### Sponsor
If SideTimeTable is useful to you, you can support its development through [GitHub Sponsors](https://github.com/sponsors/badfalcon). Sponsorships help cover maintenance and new features — the extension stays free either way.

### License
This plugin is released under the [Apache License 2.0]. See the `LICENSE` file for details.

### Third-Party Software
SideTimeTable bundles or references third-party libraries (Bootstrap, Popper.js, Font Awesome, marked, DOMPurify). See [`THIRD_PARTY_LICENSES.md`](./THIRD_PARTY_LICENSES.md) for copyright notices and license terms.

---

## 日本語

### 概要
**SideTimeTable** は、日々の予定をサイドパネルで確認・管理できるChrome拡張機能です。Googleカレンダーと連携して予定の表示・作成・編集ができるほか、拡張機能内だけのローカル予定も追加できます。

### 特徴
- **サイドパネル表示**: その日の予定を Chrome のサイドパネルにタイムラインで表示。ヘッダーの月カレンダーから好きな日へ移動可能。
- **Googleカレンダー連携**: 複数のGoogleカレンダーと同期し、表示するカレンダーをサイドパネルのフィルターや設定ページで選択（名前・メールアドレスで検索可能）。
- **Google予定の作成・編集**: サイドパネルからGoogleカレンダーの予定を作成・編集・削除。ゲストの招待、Google Meetリンクの追加、不在予定の作成、出欠の回答にも対応。
- **終日予定・不在予定**: 終日・複数日の予定はタイムライン上部に表示し、不在予定は専用のスタイルで表示。
- **カレンダーグループ**: カレンダーを「仕事」「プライベート」などにグループ化し、ワンクリックで表示切替。
- **ローカル予定の管理**: 拡張機能内だけの予定を追加・編集。タイムライン上のドラッグで即座に作成も可能。
- **繰り返し予定**: 毎日・毎週・毎月・平日の繰り返し予定を簡単作成。
- **リマインダー通知**: 予定の◯分前にデスクトップ通知でお知らせ（1/3/5/10/15/30/60分から選択可能）。通知をクリックするとその予定へ移動し、Meet・Zoom・Teams・Webex のリンクも直接開ける。
- **Google予定の自動リマインド**: 連携中のGoogle予定からリマインダーを自動作成（オン/オフ切り替え可）。
- **メモパネル**: サイドパネル下部に折りたたみ可能なメモ欄（高さ調整対応）。畳むと1行目を表示。
- **テーマとダークモード**: カラーテーマ（第1色覚・第2色覚・第3色覚向けプリセットを含む）とダークモードに対応。
- **時間の設定**: 作業時間・休憩時間の設定と、12時間/24時間表記の切り替え。
- **多言語対応**: 日本語/英語に対応し、日付や時刻も拡張機能の言語で表示。
- **初回セットアップとチュートリアル**: セットアップウィザードと対話型チュートリアルですぐに使い始められる。
- **キーボードショートカット**: サイドパネルを素早く開くショートカットを設定可能。
- **予定の重なりレイアウト**: 重なった予定をレーンに分けて横に並べて表示。
- **デモモード**: APIアクセスなしでモックデータを使用したテスト用開発者モード。

### インストール
1. リポジトリをローカルマシンにクローンします。
2. 依存関係をインストール: `npm install`
3. 拡張機能をビルド: `npm run build`
4. ブラウザに特化した手順に従い、未パックの拡張機能をロードします。
5. 必要なGoogle APIのOAuth2クレデンシャルを設定していることを確認します。

### 使用方法
- 拡張機能のアイコンをクリックするか、キーボードショートカットでサイドパネルを開きます。
- **カレンダー管理**: 設定画面で自動的にGoogleカレンダーを検出・選択し、検索機能でカレンダー管理が可能です。
- **予定の管理**: ヘッダーの追加ボタンからローカル予定やGoogle予定を作成できます。予定をクリックすると詳細の確認・編集・出欠の回答ができます。
- **カスタマイズ**: 設定パネルで作業時間、休憩時間、色、言語設定を構成できます。
- **デモモード**: 開発用として、APIアクセスなしでサンプルデータを使用してテストできるデモモードを有効にできます。

#### 開発者機能（デモ／リマインダーデバッグ）の有効化
ビルドフラグは不要で、ランタイムのストレージフラグでデベロッパー向け機能（デモ切替、リマインダーデバッグUI/機能）を表示・利用できます。

有効化:
```
chrome.storage.local.set({ enableDeveloperFeatures: true })
// 互換（レガシー）:
// chrome.storage.local.set({ enableReminderDebug: true })
```

無効化:
```
chrome.storage.local.set({ enableDeveloperFeatures: false, enableReminderDebug: false })
```

反映方法:
- Options ページを再読み込み（必要に応じてサイドパネルも再読み込み）。

有効化するとできること:
- Options に「Developer Settings」カードが表示され、Demo Mode のトグルが利用可能。
- Options の「Reminder Settings」カードに「Debug & Test」セクションが表示され、テスト通知の発火やアラーム一覧の確認が可能。
- 背景メッセージの開発用途アクション:
  - `chrome.runtime.sendMessage({ action: 'testReminder' })`
  - `chrome.runtime.sendMessage({ action: 'debugAlarms' })`
  - いずれも Developer Features 有効時のみ有効。

備考:
- `enableReminderDebug` は後方互換としてサポートされます（将来的に非推奨予定）。
- 追加の権限は不要です。

### 開発とカスタマイズ
- このリポジトリをクローンして `npm install` を実行してください
- **ビルドシステム**: Webpack + BabelでES6 → CommonJS変換
  - `npm run dev`: 開発モード（ファイル監視、保存時自動リビルド）
  - `npm run build`: 本番ビルド
  - `npm run package`: リリース用zipファイル作成（ビルドとパッケージを自動実行）
- **主要アーキテクチャ**: webpackでバンドルされたES6モジュール構成:
  - `src/background.js`: Google Calendar APIとOAuth2を処理するサービスワーカー
  - `src/side_panel/side_panel.js`: `SidePanelUIController` クラスによるメインUI制御
  - `src/side_panel/time-manager.js`: `EventLayoutManager` クラス（重なり検出とレーン配置）
  - `src/side_panel/event-handlers.js`: `GoogleEventManager` と `LocalEventManager` クラス
  - `src/options/options.js`: `OptionsPageManager` による設定ページ。カレンダー管理は `src/options/components/calendar/`
- **スタイリング**: CSS変数を使ったプレーンなCSS。サイドパネルは `side_panel.css`、設定ページは `options.css` / `settings-tokens.css`（ライト・ダーク両テーマ）
- **品質チェック**: `npm test`（Jest）と `npm run lint`（ESLint）
- **VS Code**: `.vscode/tasks.json` にタスクを用意（Build、Dev (Watch)、Package (Release)、Test、Lint）
- **開発ワークフロー**:
  1. `npm run dev` でファイル監視を開始
  2. `src/` 内のソースファイルを編集
  3. Chromeで拡張機能をリロードして変更を確認
  4. `npm run package` で配布用zipを作成

### スポンサー
SideTimeTable が役に立ったら、[GitHub Sponsors](https://github.com/sponsors/badfalcon) から開発を支援できます。いただいた支援はメンテナンスや新機能の開発に充てられます（拡張機能は今後も無料でご利用いただけます）。

### ライセンス
このプラグインは[Apache License 2.0]の下で公開されています。詳細は`LICENSE`ファイルを参照してください。

### サードパーティソフトウェア
SideTimeTable は Bootstrap、Popper.js、Font Awesome、marked、DOMPurify などの第三者ライブラリを同梱・参照しています。著作権表示および各ライセンス条項は [`THIRD_PARTY_LICENSES.md`](./THIRD_PARTY_LICENSES.md) を参照してください。

