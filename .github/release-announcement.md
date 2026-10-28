# リリース告知ワークフロー 運用ガイド

`.github/workflows/release-announce.yml` の使い方・セットアップ手順。
Claude が X / LinkedIn / Reddit 向けの告知文と添付用のカード画像を生成する。
**投稿は手動**（自動投稿は削除済み。理由はワークフロー冒頭のコメント参照）。

## 全体の流れ

```
タグ push
  └─ ci.yml がビルド → GitHub リリースを作成
       ↓（※ここは自動で繋がらない。下記「発火のしかた」参照）
Actions → Release Announcement → Run workflow（tag 入力・空なら最新リリース）
  └─ release-announce.yml / generate
       ├─ 対象リリースを解決
       ├─ Claude が媒体別の告知文＋カード画像用の文言を生成
       ├─ カード画像を描画（announce_card_ja.png / _en.png）
       └─ Step Summary に下書きを表示し、announcement アーティファクトに一式を保存
```

Chrome ウェブストアの掲載がライブになったのを確認してから投稿する
（run するタイミングは自由。下書きはアーティファクトに残る）。

## 発火のしかた

トリガーは2つ（`release-announce.yml` の `on:`）。

| トリガー | 発火する条件 |
|---|---|
| `workflow_dispatch` | **通常はこちら。** Actions → Release Announcement → Run workflow。`tag` 入力で対象リリースを指定（空なら最新リリース） |
| `release: published` | リリースを **人間のアカウント** が公開したとき（GitHub UI の Publish など） |

> **ci.yml のタグ push では `release` イベントは発火しない。**
> GitHub の仕様上、`GITHUB_TOKEN` が起こしたイベントは（`workflow_dispatch` /
> `repository_dispatch` を除き）新しいワークフロー実行を作らない（再帰防止）。
> ci.yml の `softprops/action-gh-release` はデフォルトの `GITHUB_TOKEN` でリリースを
> 作るため、告知ワークフローは自動では起動しない。だから手動発火を用意している。
> どのみち「ストア公開を確認してから告知」の運用なので、手動発火のほうが素直。

## 一度だけ行うセットアップ

リポジトリのシークレット（Settings → Secrets and variables → Actions）に
`CLAUDE_CODE_OAUTH_TOKEN` を登録する（`claude setup-token` で発行）。生成に使うのはこれだけ。

> 各SNSのAPIキーや `announce` 環境（承認ゲート）は自動投稿を削除した際に不要になった。
> 復活させる場合は git 履歴の `post` ジョブと、そのときの本ガイドを参照。

## リリースのたびの操作

1. タグ（`*.*.*`）を push → CI が GitHub リリースを作成
2. Chrome ウェブストアへ手動アップロード＆公開。掲載がライブになったのを確認
3. Actions → **Release Announcement** → **Run workflow**
   （`tag` は空でよい＝最新リリースが対象。古いリリースを告知し直すときだけタグを入れる）
4. **generate の Step Summary** で3媒体の下書きを確認
5. **announcement** アーティファクトからカード画像をダウンロード
6. 下書きをコピーし、画像を添付して各SNSへ手動投稿（投稿の自動化は削除済み）

## 🖼 添付画像（告知カード）

告知文と一緒に、**今回の更新内容から作ったカード画像**（1200x630）も生成される。

| ファイル | 添付先 |
|---|---|
| `announce_card_ja.png` | X 日本語の**本文**（リプライではなく本文側）／Reddit 日本語 |
| `announce_card_en.png` | X English の**本文**／Reddit English |

- 中身は「見出し＋更新の要点（最大3行）＋バージョン＋更新内容に近い製品スクショ」。
  スクショは Claude が `image_1`（タイムライン+メモ）/ `image_2`（設定・Google連携）/
  `image_3`（設定ダーク+予定作成）から選ぶ
- **announcement** アーティファクト（run のページ下部）からダウンロードして、
  投稿画面にドラッグ&ドロップする
- **LinkedIn**: 画像を付けるとURLのリンクプレビューが出なくなる。どちらか一方を選ぶ
- **Reddit**: リンク投稿には画像を添付できない。画像投稿にするなら本文にストアURLを書く
- 画像生成に失敗しても run は落とさない（告知文の下書きは残る）。サマリーに ⚠️ が出る
- 生成の仕組みとローカルでの試し方: [`scripts/announce-card/README.md`](../scripts/announce-card/README.md)

## ⏰ 推奨投稿時間（JST・目安）

手動投稿なので、下書きができたら下記の時間帯に貼る。
（出典の数値は「対象オーディエンスのローカル時間」基準。詳細は下部リンク参照）

| 媒体 | 推奨曜日 | 推奨時間（JST） | 補足 |
|---|---|---|---|
| **X** | 火〜木 | 昼 12時前後 / 夜 20〜23時 | 土曜は最も反応が低い |
| **LinkedIn** | 火〜木 | 午後 15〜18時 | 近年は午後〜夕方が朝より強い。月曜は弱い |
| **Reddit** | 平日朝〜週末 | JST 21〜23時頃（US東部の朝） | 米国/英語圏中心。日本語の自プロフィール投稿は反応薄め |

横断的な無難ライン: **平日（火〜木）の昼または夕方**。

## 注意点

- **下書きの作り直しは自由**: 投稿は手動なので、同じタグで何度 Run workflow しても
  二重投稿にはならない。文言や画像が気に入らなければ再実行すればよい。
- **X の画像は本文側に付ける**: リンクはリプライへ回す運用なので、画像はリプライではなく
  本文の投稿に添付する。
- **アーティファクトの保持期間**: `announcement` はリポジトリの既定期間で消える。
  必要なら手元にダウンロードしておく。

## 参考リンク（投稿時間の出典）
- Sprout Social「Best Times to Post on Social Media 2026」
- Buffer「Best Time to Post on LinkedIn / Twitter-X in 2026」
