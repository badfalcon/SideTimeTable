# SideTimeTable

## English

### Overview
**SideTimeTable** is a Chrome extension that allows users to manage and view events for their day via a side panel. It seamlessly integrates with Google Calendar to fetch events and also provides an interface to add local events.

### Features
- **Side Panel Interface**: Access your daily events on a handy side panel.
- **Google Calendar Integration**: Sync with your Google Calendar and view events seamlessly.
- **Local Event Management**: Add and configure local events directly from the side panel.
- **Custom Time and Color Settings**: Set your work hours and adjust the color scheme for event visualization.

### Installation
1. Clone the repository to your local machine.
2. Create your own `manifest.json` file based on `manifest.sample.json`:
   - Copy `manifest.sample.json` to `manifest.json`
   - Replace `FILL_OUT_YOUR_CLIENT_ID` with your Google OAuth2 client ID
   - Replace `FILL_OUT_YOUR_KEY` with your Chrome extension key
3. Install dependencies with `npm install`.
4. Build the extension with `npm run build`.
5. Follow browser-specific steps to load the unpacked extension from the `dist` directory.

> **Note:** You must create your own `manifest.json` file before building the extension.

### Usage
- Click on the extension icon to open the side panel.
- Use the settings icon to configure working hours and appearance.
- Add events directly through the interface, or sync your calendar for automatic updates.

### Development and Customization
- Clone this repository.
- Install dependencies with `npm install`.
- Modify code mainly in `background.js`, `side_panel.js`, or styles in `side_panel.css`.
- Use webpack for building the extension:
  - `npm run dev` - Development build with watch mode
  - `npm run build` - Production build
  - `npm run package` - Production build and create a ZIP file for distribution

### Testing
- After migrating to webpack, the extension must be built before testing.
- Run `npm run dev` to build the extension with watch mode (automatically rebuilds when files change).
- Load the extension from the `dist` directory in Chrome's extension management page.
- **Note:** Unlike before, the extension can no longer be loaded directly from the source directory due to ES6 modules and webpack-specific features.

### License
This plugin is released under the [Apache License 2.0]. See the `LICENSE` file for details.

---

## 日本語

### 概要
**SideTimeTable** は、ユーザーが日々のイベントをサイドパネルから管理および閲覧できるChrome拡張機能です。Googleカレンダーとシームレスに統合し、イベントを取得するほか、ローカルイベントの追加インターフェースも提供します。

### 特徴
- **サイドパネルインターフェース**: デイリーイベントを便利なサイドパネルで確認。
- **Googleカレンダー連携**: Googleカレンダーと同期し、イベントをシームレスに表示。
- **ローカルイベント管理**: サイドパネルから直接ローカルイベントを追加・設定。
- **カスタム時間・カラー設定**: 作業時間を設定し、イベント表示のカラースキームを調整。

### インストール
1. リポジトリをローカルマシンにクローンします。
2. `manifest.sample.json`を基に独自の`manifest.json`ファイルを作成します：
   - `manifest.sample.json`を`manifest.json`にコピーします
   - `FILL_OUT_YOUR_CLIENT_ID`をあなたのGoogle OAuth2クライアントIDに置き換えます
   - `FILL_OUT_YOUR_KEY`をあなたのChrome拡張機能キーに置き換えます
3. `npm install`で依存関係をインストールします。
4. `npm run build`で拡張機能をビルドします。
5. ブラウザに特化した手順に従い、`dist`ディレクトリから未パックの拡張機能をロードします。

> **注意:** 拡張機能をビルドする前に、独自の`manifest.json`ファイルを作成する必要があります。

### 使用方法
- 拡張機能のアイコンをクリックしてサイドパネルを開きます。
- 設定アイコンから作業時間や見た目を設定できます。
- インターフェースを通じて直接イベントを追加するか、カレンダーを同期して自動で更新します。

### 開発とカスタマイズ
- このリポジトリをクローンしてください。
- `npm install` で依存関係をインストールします。
- 主に `background.js`、`side_panel.js`、または `side_panel.css` 内のスタイルを変更します。
- webpackを使用して拡張機能をビルドします：
  - `npm run dev` - 監視モード付きの開発ビルド
  - `npm run build` - 本番ビルド
  - `npm run package` - 本番ビルドと配布用ZIPファイルの作成

### テスト
- webpackへの移行後は、テストの前に拡張機能をビルドする必要があります。
- `npm run dev` を実行して監視モード付きで拡張機能をビルドします（ファイルが変更されると自動的に再ビルドされます）。
- Chromeの拡張機能管理ページから `dist` ディレクトリの拡張機能をロードします。
- **注意:** 以前とは異なり、ES6モジュールとwebpack固有の機能により、ソースディレクトリから直接拡張機能をロードすることはできなくなりました。

### ライセンス
このプラグインは[Apache License 2.0]の下で公開されています。詳細は`LICENSE`ファイルを参照してください。
