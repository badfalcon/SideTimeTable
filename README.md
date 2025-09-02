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
- 主に `background.js`、`side_panel.js`、または `side_panel.css` 内のスタイルを変更します。
- Windowsでは `zip_project.bat`、Unix/Linux/macOSでは `zip_project.sh` を実行してプロジェクトをパッケージ化します。

### ライセンス
このプラグインは[Apache License 2.0]の下で公開されています。詳細は`LICENSE`ファイルを参照してください。
