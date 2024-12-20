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
2. Follow browser-specific steps to load an unpacked extension.
3. Ensure you've configured the necessary Google API credentials for OAuth2.

### Usage
- Click on the extension icon to open the side panel.
- Use the settings icon to configure working hours and appearance.
- Add events directly through the interface, or sync your calendar for automatic updates.

### Development and Customization
- Clone this repository.
- Modify code mainly in `background.js`, `side_panel.js`, or styles in `side_panel.css`.
- Run `zip_project.bat` (Windows) or `zip_project.sh` (Unix/Linux/macOS) to package your project.

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
2. ブラウザに特化した手順に従い、未パックの拡張機能をロードします。
3. 必要なGoogle APIのOAuth2クレデンシャルを設定していることを確認します。

### 使用方法
- 拡張機能のアイコンをクリックしてサイドパネルを開きます。
- 設定アイコンから作業時間や見た目を設定できます。
- インターフェースを通じて直接イベントを追加するか、カレンダーを同期して自動で更新します。

### 開発とカスタマイズ
- このリポジトリをクローンしてください。
- 主に `background.js`、`side_panel.js`、または `side_panel.css` 内のスタイルを変更します。
- Windowsでは `zip_project.bat`、Unix/Linux/macOSでは `zip_project.sh` を実行してプロジェクトをパッケージ化します。

### ライセンス
このプラグインは[Apache License 2.0]の下で公開されています。詳細は`LICENSE`ファイルを参照してください。
