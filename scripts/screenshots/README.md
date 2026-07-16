# Screenshot Generator

ランディングページ (docs/) と Chrome ウェブストア掲載用のスクリーンショットを自動生成するスクリプト群。

## 使い方

```bash
# 前提: Playwright (devDependency ではないため個別インストール)
npm i -D playwright && npx playwright install chromium

# 日英 6 枚を docs/img/ に生成
npm run screenshots

# オプション
npm run screenshots -- --lang ja      # 日本語 3 枚のみ
npm run screenshots -- --lang en      # 英語 3 枚のみ
npm run screenshots -- --skip-build   # dist/ の既存ビルドを再利用
npm run screenshots -- --out <dir>    # 出力先を変更
```

## 生成される画像 (1280x800, Chrome Web Store 標準サイズ)

| ファイル | 内容 |
|---|---|
| `image_1.png` / `image_1_en.png` | サイドパネルのタイムライン+メモ(ライト)。背景は ja=ランディングページ / en=変更履歴ページ |
| `image_2.png` / `image_2_en.png` | 設定ページ: Google連携+カレンダー管理(ライト) |
| `image_3.png` / `image_3_en.png` | 設定ページ(ダーク)+予定作成モーダルを開いたサイドパネル |

日本語版は `docs/index.html` が参照。英語版はウェブストアの英語リスティング用
(ダッシュボードから手動アップロード)。

## 仕組み

1. **generate.js** — オーケストレーター。デモデータ入り開発ビルド
   (`webpack --env demo`) を実行し、docs/ をローカル配信してから下記を呼ぶ
2. **capture.js** — ヘッドレス Chromium に拡張機能を読み込み、デモモード
   (`?demo=true` + `localStorage` フラグ) で各画面の素材を撮影。
   オンボーディング(チュートリアル/初期設定/What's New)は storage キーを
   シードしてスキップ。言語ごとにブラウザの UI ロケールを切替
   (en は 12h 表記・MM/DD/YYYY、ja は 24h 表記・YYYY/MM/DD になる)
3. **compose.js** — 素材を汎用的なブラウザ風フレーム(タブバー+ツールバー+
   サイドパネルヘッダー)に合成して 1280x800 で出力

## 注意

- Font Awesome は `@fortawesome/fontawesome-free` (devDependency) から
  ローカル配信されるため、オフライン環境でも撮影可能
- 実行後の `dist/` はデモデータ入りの開発ビルドになる。リリース作業前に
  `npm run build` で本番ビルドに戻すこと
- デモの日付は実行日になるため、再生成すると画像の日付表示が変わる
