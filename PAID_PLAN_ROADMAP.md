# SideTimeTable 有料プラン ロードマップ（v2）
# Paid Plan Roadmap — Revised based on actual codebase

> **前回のロードマップからの変更点**: コードベースを精査した結果、マルチカレンダー・ダークモード・繰り返しイベント・カラーテーマ等は**既に無料で提供済み**。既存ユーザーから機能を取り上げるのは悪手のため、「既存機能はすべて無料維持＋新機能でプレミアム」方針に転換。

---

## 1. 現状分析

### 1.1 既に無料で提供している機能（v1.9.3）

| カテゴリ | 機能 | 実装バージョン |
|---------|------|---------------|
| カレンダー | Googleカレンダー連携（複数カレンダー） | v1.4.1 |
| カレンダー | カレンダーグループ（仕事/プライベート切替） | v1.9.0 |
| カレンダー | カレンダー色の保持 | v1.4.1 |
| イベント | ローカルイベント作成・編集（無制限） | v1.4.1 |
| イベント | ドラッグでイベント作成 | v1.7.3 |
| イベント | 繰り返しイベント（日/週/月/平日） | v1.7.0 |
| イベント | イベント重複レイアウト解決 | v1.4.1 |
| 通知 | リマインダー（3/5/10/15/30分前） | v1.6.0 |
| 通知 | RSVP（出欠回答） | v1.9.1 |
| UI | ダークモード | v1.8.0 |
| UI | 8種カラーテーマ（色覚対応3種含む） | v1.7.2/v1.8.0 |
| UI | 7色カスタマイズ | v1.8.0 |
| UI | メモパネル（Markdown対応） | v1.7.3/v1.8.0 |
| UI | 薄型スクロールバー | v1.8.1 |
| 連携 | Google Meet/Mapsリンク | v1.4.3/v1.4.4 |
| その他 | キーボードショートカット | v1.4.2 |
| その他 | チュートリアル・セットアップウィザード | v1.7.1 |
| その他 | i18n（英語/日本語） | v1.4.1 |

### 1.2 技術的な現状

- **コードベース**: JS 19,000行、CSS 2,000行
- **テスト**: 19ファイル（カバレッジ改善中）
- **アーキテクチャ**: コンポーネントベース、サービス層分離済み
- **ライセンス**: Apache-2.0
- **決済/ライセンス管理コード**: 未実装
- **ユーザー規模**: 不明（Chrome Web Storeのレビュー依頼機能あり）

### 1.3 前回プランの問題点

前回のロードマップでは以下をプレミアム候補にしていたが、**すべて既に無料提供済み**:

- ~~マルチカレンダー表示~~ → v1.4.1から無料
- ~~無制限ローカルイベント~~ → 最初から無制限
- ~~カスタムテーマ/ダークモード~~ → v1.8.0から無料
- ~~高度な通知設定~~ → v1.6.0から無料

**これらを有料化するとユーザー離反を招く。**

---

## 2. 収益化戦略の選択肢

### オプションA: フリーミアム（新機能追加型）★推奨

**方針**: 既存機能は無料のまま維持。新たに開発する高度な機能をプレミアムとして提供。

**メリット**:
- 既存ユーザーの反発なし
- 新機能の価値で課金を正当化
- Chrome Web Storeでの評価維持

**デメリット**:
- 新機能開発コストが先行
- プレミアム機能の魅力が十分でないと転換率が低い

### オプションB: 寄付/サポーターモデル

**方針**: 全機能無料のまま、「開発者を支援」として任意課金。

**メリット**:
- 実装が最もシンプル
- ユーザーとの良好な関係維持

**デメリット**:
- 収益が安定しない（一般的に転換率0.5〜1%）
- 開発モチベーションの維持が難しい

### オプションC: ハイブリッド（推奨構成）

**方針**: オプションA + B の組み合わせ。基本は新機能でプレミアム化しつつ、寄付オプションも提供。

---

## 3. プレミアム機能候補（すべて新規開発）

### Tier 1: 高価値・実装可能（v2.0リリース目標）

#### 3.1.1 週間ビュー / Week View
**価値**: 1日だけでなく1週間を俯瞰できる。生産性ツールとして大きな差別化。
**実装規模**: 大（新コンポーネント、レイアウトエンジン拡張）
**ファイル**:
- `src/side_panel/components/week-view/week-view-component.js` (新規)
- `src/side_panel/time-manager.js` (拡張: 週間レイアウト)
- `src/side_panel/components/header/header-component.js` (更新: ビュー切替)

#### 3.1.2 Googleカレンダーへの書き込み / Write to Google Calendar
**価値**: サイドパネルからGoogleカレンダーにイベントを直接作成。現在は読み取り専用。
**実装規模**: 中（API連携、OAuth scope追加）
**変更点**:
- `manifest.json`: scope を `calendar.readonly` → `calendar.events` に拡張
- `src/services/google-calendar-client.js` (拡張: createEvent, updateEvent)
- `src/side_panel/components/modals/local-event-modal.js` (更新: Google同期オプション)

#### 3.1.3 イベントエクスポート / Event Export
**価値**: ローカルイベントをCSV/iCal形式でエクスポート。バックアップやチーム共有に。
**実装規模**: 小
**ファイル**:
- `src/lib/event-export.js` (新規)
- `src/side_panel/components/header/header-component.js` (更新: エクスポートボタン)

### Tier 2: 中価値・差別化（v2.1目標）

#### 3.2.1 イベントテンプレート / Event Templates
**価値**: よく作るイベントをテンプレート化して即座に作成。
**実装規模**: 中
**ファイル**:
- `src/lib/template-storage.js` (新規)
- `src/side_panel/components/modals/template-modal.js` (新規)

#### 3.2.2 時間分析 / Time Analytics
**価値**: 1週間/1ヶ月のカレンダーデータを分析し、会議時間・空き時間・カテゴリ別の時間配分を可視化。
**実装規模**: 大
**ファイル**:
- `src/side_panel/components/analytics/analytics-component.js` (新規)
- `src/lib/analytics-engine.js` (新規)

#### 3.2.3 カスタムテーマ作成 / Custom Theme Creator
**価値**: 既存の8プリセットに加え、自分だけのテーマを作成・保存。
**実装規模**: 中（`color-themes.js` のアーキテクチャが既に7パレットロール設計で拡張しやすい）
**ファイル**:
- `src/options/components/settings/custom-theme-card.js` (新規)
- `src/lib/color-themes.js` (拡張: ユーザーテーマ保存)

### Tier 3: 追加価値（v2.2以降）

#### 3.3.1 複数日イベント表示 / Multi-day Event Display
**価値**: 終日イベントや複数日にまたがるイベントの表示。

#### 3.3.2 タイムゾーン対応 / Multiple Time Zones
**価値**: 海外チームとの会議調整時に複数タイムゾーン表示。

#### 3.3.3 ローカルイベントのクラウド同期 / Cloud Sync for Local Events
**価値**: 複数デバイス間でローカルイベントを同期。現在はChrome Storage Syncだが容量制限あり。

#### 3.3.4 ウィジェット/ポップアップモード
**価値**: サイドパネル以外にフローティングウィジェットとして表示。

---

## 4. 推奨プラン構成

### 無料プラン（Free）— 既存機能すべて

現在の全機能をそのまま維持:
- Googleカレンダー連携（複数カレンダー、グループ）
- ローカルイベント（無制限、繰り返し、ドラッグ作成）
- ダークモード、8種カラーテーマ
- リマインダー、RSVP、Meet/Maps連携
- メモパネル（Markdown）
- キーボードショートカット
- i18n（英語/日本語）

### プレミアムプラン（Pro）— 新機能

| 機能 | 優先度 |
|------|--------|
| 週間ビュー | ★★★ |
| Googleカレンダー書き込み | ★★★ |
| イベントエクスポート（CSV/iCal） | ★★☆ |
| イベントテンプレート | ★★☆ |
| 時間分析ダッシュボード | ★★☆ |
| カスタムテーマ作成 | ★☆☆ |
| 複数タイムゾーン | ★☆☆ |
| ローカルイベントのクラウド同期 | ★☆☆ |

### 価格設定

前回の提案から調整。Chrome拡張の市場相場を考慮:

| プラン | 価格 | 備考 |
|--------|------|------|
| 月額 | $2.99/月 | エントリー価格を下げて転換率向上 |
| 年額 | $24.99/年 | 約30%オフ（$2.08/月相当） |
| 生涯 | $59.99 | 買い切り。早期購入特典として$39.99も検討 |

**価格根拠**:
- Chrome拡張の有料相場: $1.99〜$4.99/月が主流
- 生産性ツールとしての価値: カレンダーアプリは日常使い
- 競合（Fantastical等）: $4.99/月だが機能が桁違い
- 個人開発者として現実的な価格帯

---

## 5. 技術実装計画

### Phase 1: ライセンス基盤（2週間）

#### 5.1.1 バックエンド選定

**推奨: Firebase + Stripe**

理由:
- Firebase無料枠で初期コスト$0
- Cloud Functionsでライセンス検証API
- Stripe Checkoutで決済（PCI-DSS不要）
- Firestore でライセンスデータ管理

```
Chrome Extension
  ├── chrome.storage.sync (ライセンスキャッシュ)
  └── fetch() → Cloud Functions
                  ├── /validate-license
                  ├── /create-checkout → Stripe Checkout
                  └── /webhook ← Stripe Webhook
                        └── Firestore (licenses collection)
```

#### 5.1.2 拡張機能側の実装

**新規ファイル:**
```
src/lib/license-manager.js      — ライセンス検証・キャッシュ
src/lib/feature-flags.js        — 機能ゲート（新機能のみ対象）
```

**LicenseManager の設計方針:**
- 検証は24時間に1回 + 起動時
- オフライン時は7日間のグレースピリオド
- ネットワークエラー時は既存ライセンスを維持
- `chrome.storage.sync` に保存（デバイス間共有）

**FeatureFlags の設計方針:**
- 既存機能には一切ゲートをかけない
- 新機能（weekView, googleWrite, export等）のみ対象
- `hasFeature('weekView')` のようなシンプルなAPI

```javascript
// 使用例: 週間ビューボタンのクリック時
import { hasFeature, showUpgradePrompt } from '../lib/feature-flags.js';

handleWeekViewClick() {
    if (!hasFeature('weekView')) {
        showUpgradePrompt('weekView');
        return;
    }
    this.switchToWeekView();
}
```

#### 5.1.3 constants.js への追加

```javascript
// 新規追加（既存のDEFAULT_SETTINGSは変更しない）
export const PREMIUM_FEATURES = {
    WEEK_VIEW: 'weekView',
    GOOGLE_WRITE: 'googleWrite',
    EVENT_EXPORT: 'eventExport',
    EVENT_TEMPLATES: 'eventTemplates',
    TIME_ANALYTICS: 'timeAnalytics',
    CUSTOM_THEMES: 'customThemes',
    MULTI_TIMEZONE: 'multiTimezone',
    CLOUD_SYNC: 'cloudSync'
};
```

#### 5.1.4 manifest.json の更新

```json
{
  "host_permissions": [
    "https://www.googleapis.com/*",
    "https://us-central1-YOUR_PROJECT.cloudfunctions.net/*"
  ]
}
```

**注意**: Googleカレンダー書き込み機能を追加する場合のみ、OAuth scopeを変更:
```json
{
  "oauth2": {
    "scopes": [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events"
    ]
  }
}
```
→ Chrome Web Storeの再審査が必要。scope変更は慎重に。

### Phase 2: 最初のプレミアム機能（4週間）

#### 5.2.1 週間ビュー（最優先）

**理由**: 最も視覚的インパクトが大きく、「日次→週次」は自然なアップグレードパス。

**実装方針:**
- `TimelineComponent` と並行する `WeekViewComponent` を新規作成
- `HeaderComponent` にビュー切替ボタンを追加
- `EventLayoutManager` を拡張して週間レイアウトに対応
- サイドパネルの幅制約を考慮した縦型週間ビュー

**新規ファイル:**
```
src/side_panel/components/week-view/
  ├── week-view-component.js     — 週間ビューのメインコンポーネント
  └── week-day-column.js         — 1日分のカラムコンポーネント
```

#### 5.2.2 イベントエクスポート

**実装方針:**
- CSV形式: タイトル、開始時間、終了時間、説明、種類
- iCal形式: RFC 5545準拠のVEVENTエクスポート
- ヘッダーにエクスポートボタン追加

**新規ファイル:**
```
src/lib/event-export.js          — エクスポートロジック
```

### Phase 3: アップグレードUI（1週間）

#### 5.3.1 アップグレードプロンプト

プレミアム機能にアクセスした時に表示するモーダル:

**新規ファイル:**
```
src/side_panel/components/modals/upgrade-modal.js
```

**設計方針:**
- 既存の `ModalComponent` ベースクラスを継承
- Stripe Checkoutへのリダイレクト
- 機能ごとの説明と価格表示
- i18n対応（en/ja）

#### 5.3.2 設定ページのライセンスセクション

**更新ファイル:**
```
src/options/components/settings/license-card.js  (新規)
src/options/options.html                          (更新)
```

**内容:**
- 現在のプラン表示（Free / Pro）
- ライセンスキー入力・アクティベーション
- サブスクリプション管理リンク
- プレミアム機能一覧

### Phase 4: 追加プレミアム機能（継続的）

以降は優先度順に:
1. イベントテンプレート
2. Googleカレンダー書き込み（scope変更を伴うため慎重に）
3. 時間分析ダッシュボード
4. カスタムテーマ作成

---

## 6. i18n対応

プレミアム関連の新規ローカライズキー:

```json
// _locales/en/messages.json に追加
{
  "premiumFeature": { "message": "Premium Feature" },
  "upgradeToPro": { "message": "Upgrade to Pro" },
  "upgradeDescription": { "message": "Unlock powerful features to boost your productivity" },
  "weekView": { "message": "Week View" },
  "weekViewDesc": { "message": "See your entire week at a glance" },
  "eventExport": { "message": "Export Events" },
  "eventExportDesc": { "message": "Export your events to CSV or iCal format" },
  "currentPlan": { "message": "Current Plan" },
  "freePlan": { "message": "Free" },
  "proPlan": { "message": "Pro" },
  "manageLicense": { "message": "Manage License" },
  "activateLicense": { "message": "Activate License" },
  "licenseKey": { "message": "License Key" },
  "trialDays": { "message": "Try Pro free for 7 days" },
  "moneyBack": { "message": "7-day money-back guarantee" }
}
```

```json
// _locales/ja/messages.json に追加
{
  "premiumFeature": { "message": "プレミアム機能" },
  "upgradeToPro": { "message": "Proにアップグレード" },
  "upgradeDescription": { "message": "強力な機能で生産性を向上させましょう" },
  "weekView": { "message": "週間ビュー" },
  "weekViewDesc": { "message": "1週間のスケジュールを一覧表示" },
  "eventExport": { "message": "イベントエクスポート" },
  "eventExportDesc": { "message": "イベントをCSVまたはiCal形式でエクスポート" },
  "currentPlan": { "message": "現在のプラン" },
  "freePlan": { "message": "無料" },
  "proPlan": { "message": "Pro" },
  "manageLicense": { "message": "ライセンス管理" },
  "activateLicense": { "message": "ライセンスを有効化" },
  "licenseKey": { "message": "ライセンスキー" },
  "trialDays": { "message": "Proを7日間無料でお試し" },
  "moneyBack": { "message": "7日間の返金保証" }
}
```

---

## 7. リスクと対策

### リスク1: 「無料だったのに課金？」という反発
**対策**: 既存機能は100%無料維持。プレミアムは完全に新機能のみ。リリースノートで明確に説明。

### リスク2: Chrome Web Storeの審査
**対策**:
- scope変更（calendar.events）は段階的に。まずreadonly維持のプレミアム機能から。
- host_permissions追加はライセンスAPIドメインのみ。最小限の変更。

### リスク3: ライセンス検証のオフライン問題
**対策**:
- 7日間のグレースピリオド
- ネットワークエラー時は既存ライセンスを維持
- Chrome Storage Syncによるデバイス間キャッシュ

### リスク4: 低い転換率
**対策**:
- 7日間の無料トライアル
- 年額プランの大幅割引
- 早期購入者向け生涯ライセンス特別価格

### リスク5: Apache-2.0ライセンスとの整合性
**対策**:
- ソースコードはオープンのまま（Apache-2.0準拠）
- プレミアム機能のコードもリポジトリに含む
- ライセンス検証はサーバー側で行い、バイパスは技術的に可能だが利用規約で制限
- 代替案: プレミアム機能を別リポジトリ（プライベート）で管理し、ビルド時に統合

---

## 8. 収益予測

### 前提条件
- Chrome Web Store のDAU（推定）: 未知のため控えめに見積もり
- 転換率: Chrome拡張の平均 2〜5%

### シナリオ: アクティブユーザー1,000人の場合

| 指標 | 3ヶ月後 | 6ヶ月後 | 12ヶ月後 |
|------|---------|---------|----------|
| 転換率 | 2% | 3% | 5% |
| 有料ユーザー | 20 | 30 | 50 |
| MRR（月額$2.99） | $60 | $90 | $150 |
| 年額ユーザー比率 | 30% | 40% | 50% |
| 実質MRR | $52 | $81 | $140 |

### シナリオ: アクティブユーザー5,000人の場合

| 指標 | 3ヶ月後 | 6ヶ月後 | 12ヶ月後 |
|------|---------|---------|----------|
| 有料ユーザー | 100 | 200 | 350 |
| 実質MRR | $260 | $540 | $950 |

**インフラコスト**: Firebase無料枠 → 月$0〜25（小規模時）

---

## 9. 実装スケジュール

```
Phase 1: ライセンス基盤      [2週間]  ← まずここから
  ├── Firebase プロジェクトセットアップ
  ├── Stripe アカウント作成
  ├── license-manager.js 実装
  ├── feature-flags.js 実装
  └── Cloud Functions (validate/checkout/webhook)

Phase 2: 最初のプレミアム機能  [4週間]
  ├── 週間ビュー (week-view-component.js)
  ├── イベントエクスポート (event-export.js)
  └── テスト追加

Phase 3: アップグレードUI     [1週間]
  ├── upgrade-modal.js
  ├── license-card.js (設定ページ)
  ├── i18n キー追加
  └── テスト追加

Phase 4: ベータリリース       [1週間]
  ├── v2.0.0-beta リリース
  ├── ベータテスター募集（50名）
  └── フィードバック収集

Phase 5: 正式リリース         [1週間]
  ├── v2.0.0 リリース
  ├── Chrome Web Store 説明文更新
  ├── リリースノート作成
  └── プロモーション開始

合計: 約9週間（2ヶ月強）
```

---

## 10. 次のアクション

### 今すぐ決めること:
1. **バックエンド選定の最終決定**: Firebase vs Supabase vs 自前サーバー
2. **最初のプレミアム機能の確定**: 週間ビュー？エクスポート？両方？
3. **価格の確定**: $2.99/月で良いか？
4. **Apache-2.0との整合性方針**: オープンのまま or プレミアムコード分離

### 今すぐ始められること:
1. Firebase プロジェクト作成
2. Stripe アカウント作成（テストモード）
3. `license-manager.js` の基本実装

---

**Document Version:** 2.0
**Last Updated:** 2026-04-15
**Based on:** SideTimeTable v1.9.3 codebase analysis
