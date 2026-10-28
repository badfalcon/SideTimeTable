# Announcement Card Generator

リリース告知の投稿に添付するカード画像を生成するスクリプト群。
`.github/workflows/release-announce.yml` の `Render announcement card` ステップから
呼ばれ、告知文と同じ **announcement** アーティファクトに PNG が入る。

## 生成される画像 (1200x630 / X・LinkedIn がトリミングせずに表示するサイズ)

| ファイル | 内容 |
|---|---|
| `announce_card_ja.png` | 日本語カード。X 日本語の本文 / Reddit 日本語に添付 |
| `announce_card_en.png` | 英語カード。X English の本文 / Reddit English に添付 |

カードの中身は「アイコン＋製品名＋バージョン」「見出し」「更新の要点（最大3行）」
「ストア導線の一文」と、更新内容に近い製品スクリーンショット
（`docs/img/image_{1..3}.png`）。デザインはランディングページ (`docs/style.css`) の
配色に合わせている。

## 使い方（ローカル）

```bash
# 前提: Playwright (devDependency ではないため個別インストール)
npm i -D playwright && npx playwright install chromium

# 見出し1行 + 要点3行のテキストを言語ごとに用意して実行
npm run announce-card -- \
  --name "SideTimeTable 1.11.0" \
  --card-ja card_ja.txt --card-en card_en.txt \
  --screenshot image_1 --out-dir .

# ブラウザなしでレイアウトだけ確認したいとき（HTML を書き出す）
npm run announce-card -- --card-ja card_ja.txt --html-only --out-dir .
```

`card_ja.txt` / `card_en.txt` の書式（`-` や `・` は付けても外れる）:

```
終日予定とメモがもっと使いやすく
終日イベント専用エリアを追加
メモの高さを保存できるように
ダークテーマの配色を調整
```

主なオプション: `--lang ja|en`（片方だけ生成）、`--scale`（既定 2 = Retina 相当）、
`--screenshot image_1|image_2|image_3`。

## 文字数の目安

`card-template.js` の `LIMITS` が上限（日本語: 見出し22字・要点20字 / 英語: 42字・38字）。
超えても落ちはせず、行数を見積もってフォントサイズを自動で下げる。ワークフローの
プロンプトにも同じ数値を書いてあるので、変更するときは両方を合わせること。

## 構成

1. **card-template.js** — カードのHTMLを組み立てる純粋関数群（fs もブラウザも触らない）。
   原稿のパース、エスケープ、文字数からの行数見積もりとフォントサイズ決定。
   テストは `tests/scripts/announce-card.test.js`
2. **check-card.js** — 原稿の検証。見出しが空・要点が0行なら異常終了、
   文字数超過や未知のスクリーンショット名は警告（画像は生成する）
3. **render.js** — CLI。アイコンとスクリーンショットを data URI で埋め込み、
   Playwright の Chromium で PNG に焼く

## 注意

- 日本語カードには CJK フォントが要る。CI では `fonts-noto-cjk` を入れている
  （入っていないと豆腐になる）
- 画像は best-effort。CI ではこのステップが失敗しても告知文の下書きは残る
