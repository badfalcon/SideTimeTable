# リリース告知ワークフロー 運用ガイド

`.github/workflows/release-announce.yml` の使い方・セットアップ手順。
GitHub リリース公開をトリガーに、Claude が告知文を生成し、**手動承認後**に
X / LinkedIn / Reddit へ自動投稿する。

## 全体の流れ

```
タグ push
  └─ ci.yml がビルド → GitHub リリースを作成（release: published 発火）
       └─ release-announce.yml
            ├─ generate : Claude が媒体別の告知文を生成し Step Summary に下書き表示
            └─ post     : 「announce」環境の承認ゲートで待機
                            └─ Approve 後に X / LinkedIn / Reddit へ投稿
```

承認ゲートが「**Chrome ウェブストア公開後に告知する**」タイミング制御を兼ねる。
ストアの掲載がライブになったのを確認してから Approve する。

## 一度だけ行うセットアップ

### 1. `announce` 環境を作成
Settings → Environments → New environment → 名前 `announce`。
**Required reviewers** に自分を追加（これで投稿前に承認待ちになる）。

### 2. シークレットを登録

**リポジトリ**（Settings → Secrets and variables → Actions）:

| シークレット | 用途 |
|---|---|
| `ANTHROPIC_API_KEY` | generate ジョブの告知文生成（environment 不可・リポジトリ必須） |

**`announce` 環境**（使う媒体のぶんだけ。未設定の媒体は自動でスキップされる）:

| 媒体 | シークレット |
|---|---|
| X | `X_CONSUMER_KEY`, `X_CONSUMER_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET` |
| LinkedIn | `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_PERSON_ID` |
| Reddit | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USERNAME`, `REDDIT_PASSWORD` |

### 3. 各プラットフォームの開発者設定

- **X**: [developer.x.com](https://developer.x.com) でアプリ作成 →
  「User authentication settings」を **Read and write** に →
  Consumer Keys と Access Token/Secret を発行（無料枠で投稿可・月次/24h上限あり）。
- **LinkedIn**: [developer.linkedin.com](https://developer.linkedin.com) でアプリ作成 →
  製品「**Share on LinkedIn**」を追加して `w_member_social` を取得 → 3-legged OAuth で
  アクセストークン発行（**約60日で失効**）。`LINKEDIN_PERSON_ID` は `GET /v2/userinfo` の `sub`。
- **Reddit**: [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps) で **script** タイプの
  アプリを作成 → client_id / secret を取得（API 利用申請の承認が要る場合あり）。

## リリースのたびの操作

1. タグ（`*.*.*`）を push → CI が GitHub リリースを作成
2. 告知ワークフローが起動。**Actions の generate の Step Summary** で3媒体の下書きを確認
3. Chrome ウェブストアへ手動アップロード＆公開。掲載がライブになったのを確認
4. `post` ジョブを **Approve**（または Reject）→ 投稿後、Summary に ✅/⏭️/❌ が出る

> 各媒体の結果: **✅ posted** / **⏭️ skipped（secret 未設定）** / **❌ failed（設定済みだが失敗）**。
> ❌ が1つでもあると run は赤くなる（未設定スキップでは赤くならない）。

## ⏰ 推奨投稿時間（JST・目安）

告知文は日本語なので主対象は日本のユーザー。承認＝投稿のため、下記の時間帯に Approve する。
（出典の数値は「対象オーディエンスのローカル時間」基準。詳細は下部リンク参照）

| 媒体 | 推奨曜日 | 推奨時間（JST） | 補足 |
|---|---|---|---|
| **X** | 火〜木 | 昼 12時前後 / 夜 20〜23時 | 土曜は最も反応が低い |
| **LinkedIn** | 火〜木 | 午後 15〜18時 | 近年は午後〜夕方が朝より強い。月曜は弱い |
| **Reddit** | 平日朝〜週末 | JST 21〜23時頃（US東部の朝） | 米国/英語圏中心。日本語の自プロフィール投稿は反応薄め |

横断的な無難ライン: **平日（火〜木）の昼または夕方**。

## 注意点（コードで吸収できない仕様上の制約）

- **LinkedIn トークンは約60日で失効** → 失効後は LinkedIn だけ ❌ になる（他は投稿継続）。
  定期的に `LINKEDIN_ACCESS_TOKEN` を再発行・更新する。
- **`LinkedIn-Version`（YYYYMM）は約1年で sunset** → ワークフロー内の値（現在 `202605`）を
  ときどき新しい月次へ更新する。
- **Reddit**: アカウントが 2FA 有効だと password は `password:TOTP` 形式が必要。
  新規アカウントはスパムフィルタに留まる場合あり。
- **再実行＝二重投稿**: `post` を再実行すると同じ内容を再投稿する。1リリース＝1回 Approve で運用。

## 参考リンク（投稿時間の出典）
- Sprout Social「Best Times to Post on Social Media 2026」
- Buffer「Best Time to Post on LinkedIn / Twitter-X in 2026」
