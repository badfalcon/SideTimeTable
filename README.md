# SideTimeTable

## English

### Overview
**SideTimeTable** is a Chrome extension that allows users to manage and view events for their day via a side panel. It seamlessly integrates with Google Calendar to fetch events and also provides an interface to add local events.

### Features
- **Side Panel Interface**: Access your daily events on a handy side panel with auto-width adjustment.
- **Google Calendar Integration**: Sync with multiple Google Calendars and manage calendar visibility with search functionality.
- **Local Event Management**: Add and configure local events directly from the side panel with automatic midnight reset.
- **Multi-language Support**: Full internationalization support (English/Japanese) with auto-detection.
- **Advanced Event Layout**: Sophisticated overlap resolution algorithm for overlapping events with lane-based positioning.
- **Demo Mode**: Developer mode with mock data for testing without API access.
- **Custom Time and Color Settings**: Set your work hours, break times, and adjust color schemes for different event types.
- **Keyboard Shortcuts**: Configurable keyboard shortcuts for quick side panel access.

### Installation
1. Clone the repository to your local machine.
2. Follow browser-specific steps to load an unpacked extension.
3. Ensure you've configured the necessary Google API credentials for OAuth2.

### Usage
- Click on the extension icon or use keyboard shortcuts to open the side panel.
- **Calendar Management**: In settings, automatically discover and select your Google Calendars with built-in search functionality.
- **Event Management**: Add local events through the interface, or sync multiple Google Calendars for automatic updates.
- **Customization**: Configure working hours, break times, colors, and language preferences in the settings panel.
- **Demo Mode**: For development, enable demo mode to test with sample data without API access.

### Development and Customization
- Clone this repository.
- **Main Architecture**: ES6 modules with specialized manager classes:
  - `src/background.js`: Service worker handling Google Calendar API and OAuth2
  - `src/side_panel/side_panel.js`: Main UI controller with `UIController` class
  - `src/side_panel/time-manager.js`: `TimeTableManager` and `EventLayoutManager` classes
  - `src/side_panel/event-handlers.js`: `GoogleEventManager` and `LocalEventManager` classes
  - `src/options/options.js`: Settings management with `CalendarManager` for calendar search functionality
- **Styling**: Modify styles in `side_panel.css` with Bootstrap 5.3.0 framework
- **Packaging**: Run `zip_project.bat` (Windows) or `zip_project.sh` (Unix/Linux/macOS) to create distribution package
- **No build process required**: Files are used directly by Chrome - just reload the extension to see changes

### License
This plugin is released under the [Apache License 2.0]. See the `LICENSE` file for details.

---

## 日本語

### 概要
**SideTimeTable** は、ユーザーが日々のイベントをサイドパネルから管理および閲覧できるChrome拡張機能です。Googleカレンダーとシームレスに統合し、イベントを取得するほか、ローカルイベントの追加インターフェースも提供します。

### 特徴
- **サイドパネルインターフェース**: デイリーイベントを便利なサイドパネルで確認（自動幅調整機能付き）。
- **Googleカレンダー連携**: 複数のGoogleカレンダーと同期し、検索機能でカレンダー管理が可能。
- **ローカルイベント管理**: サイドパネルから直接ローカルイベントを追加・設定（自動午前0時リセット）。
- **多言語対応**: 日本語/英語の完全国際化対応（自動言語検出）。
- **高度なイベントレイアウト**: 重複するイベントに対する高度な重複解決アルゴリズム（レーンベース配置）。
- **デモモード**: APIアクセスなしでモックデータを使用したテスト用開発者モード。
- **カスタム時間・カラー設定**: 作業時間、休憩時間を設定し、イベントタイプ別カラースキームを調整。
- **キーボードショートカット**: サイドパネル高速アクセス用の設定可能なキーボードショートカット。

### インストール
1. リポジトリをローカルマシンにクローンします。
2. ブラウザに特化した手順に従い、未パックの拡張機能をロードします。
3. 必要なGoogle APIのOAuth2クレデンシャルを設定していることを確認します。

### 使用方法
- 拡張機能のアイコンをクリックするか、キーボードショートカットでサイドパネルを開きます。
- **カレンダー管理**: 設定画面で自動的にGoogleカレンダーを検出・選択し、検索機能でカレンダー管理が可能です。
- **イベント管理**: インターフェースを通じて直接ローカルイベントを追加するか、複数のGoogleカレンダーを同期して自動で更新します。
- **カスタマイズ**: 設定パネルで作業時間、休憩時間、色、言語設定を構成できます。
- **デモモード**: 開発用として、APIアクセスなしでサンプルデータを使用してテストできるデモモードを有効にできます。

#### 幅の自動調整について
- サイドパネルの幅を変更すると、イベントの横幅が自動的に再計算されます。
- 仕組みの概要:
  - `src/side_panel/side_panel.js` の `UIController._setupResizeHandling()` が `#sideTimeTableBase` の幅変化を `ResizeObserver` で監視します。
  - 監視結果から、`side-time-table-base`（DOM: `#sideTimeTableBase`）の幅を基準にイベント表示に使える「利用可能幅」を算出し、`EventLayoutManager.maxWidth` に反映します。
  - その後 `EventLayoutManager.calculateLayout()` を呼び出して、各イベントの `left` と `width` を再配置します。
- 利用可能幅の計算式（簡略）:
  - `available = max(60, floor(baseWidth - paddingLeft - paddingRight - borderLeft - borderRight - reserved))`
  - `reserved` は CSS変数 `--side-ttb-extra-margin`（既定 10px）。`baseLeft` は時間ラベルの左余白（既定 65px、位置計算専用）であり、利用可能幅からは差し引きません。
- 複数イベントが重なる場合は、`maxWidth` の約90%をベースに均等割りし、レーン間ギャップ(5px)を差し引いてレーン幅を決定します。最小幅は 60px です。

### 開発とカスタマイズ
- このリポジトリをクローンしてください。
- **主要アーキテクチャ**: 特化したマネージャークラスを持つES6モジュール構成:
  - `src/background.js`: Google Calendar APIとOAuth2を処理するサービスワーカー
  - `src/side_panel/side_panel.js`: `UIController` クラスによるメインUI制御
  - `src/side_panel/time-manager.js`: `TimeTableManager` と `EventLayoutManager` クラス
  - `src/side_panel/event-handlers.js`: `GoogleEventManager` と `LocalEventManager` クラス  
  - `src/options/options.js`: カレンダー検索機能付き `CalendarManager` による設定管理
- **スタイリング**: Bootstrap 5.3.0フレームワークで `side_panel.css` のスタイルを変更
- **パッケージ化**: Windowsでは `zip_project.bat`、Unix/Linux/macOSでは `zip_project.sh` を実行して配布パッケージを作成
- **ビルドプロセス不要**: ファイルはChromeで直接使用されます - 拡張機能をリロードするだけで変更が反映されます

### ライセンス
このプラグインは[Apache License 2.0]の下で公開されています。詳細は`LICENSE`ファイルを参照してください。
