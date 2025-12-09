# SideTimeTable 有料プラン実装ロードマップ
# SideTimeTable Paid Plan Implementation Roadmap

## 概要 / Overview

このドキュメントは、SideTimeTable Chrome拡張機能に有料プランを導入するための包括的なロードマップです。

This document provides a comprehensive roadmap for implementing a paid plan for the SideTimeTable Chrome extension.

---

## フェーズ1: プラン設計と機能分類
## Phase 1: Plan Design and Feature Classification

### 1.1 無料版 vs プレミアム版の機能定義

#### 無料版（Free Tier）で提供する機能:
- ✅ 基本的なタイムライン表示（1日のみ）
- ✅ Googleカレンダー連携（1カレンダーのみ）
- ✅ ローカルイベント作成（1日3件まで）
- ✅ 基本的な時間表示設定
- ✅ 英語・日本語対応
- ✅ 現在時刻ラインの表示

#### プレミアム版（Premium Tier）で提供する機能:
- 🔒 **マルチカレンダー表示**（複数のGoogleカレンダー同時表示）
- 🔒 **無制限ローカルイベント**（制限なし）
- 🔒 **週間ビュー**（7日間のスケジュール一覧）
- 🔒 **カスタムテーマ**（ダークモード、カラーテーマ）
- 🔒 **高度な通知設定**（カスタムリマインダー）
- 🔒 **イベントテンプレート**（定型イベントの保存と再利用）
- 🔒 **エクスポート機能**（CSV/iCalエクスポート）
- 🔒 **統計とレポート**（時間利用分析、生産性レポート）
- 🔒 **カレンダー同期の高速化**（リアルタイム同期）
- 🔒 **プライオリティサポート**（優先的な技術サポート）

### 1.2 価格戦略

**推奨価格:**
- 月額プラン: $4.99/月
- 年額プラン: $39.99/年（約33%オフ）
- 生涯ライセンス: $99.99（一度の購入で永久利用）

**地域別価格調整:**
- USD: $4.99/月
- JPY: ¥500/月
- EUR: €4.49/月

---

## フェーズ2: 技術アーキテクチャ設計
## Phase 2: Technical Architecture Design

### 2.1 ライセンス管理システム

#### オプションA: 自社サーバーでのライセンス管理
**構成:**
```
Chrome Extension → REST API → License Server → Database
                              ↓
                         Payment Provider (Stripe/PayPal)
```

**利点:**
- 完全なコントロール
- 柔軟な価格設定
- 詳細な分析データ

**欠点:**
- サーバー運用コスト
- セキュリティ管理の責任
- PCI-DSS準拠が必要（カード情報を扱う場合）

#### オプションB: Chrome Web Store決済（Chrome Web Store Payments API）
**構成:**
```
Chrome Extension → Chrome Identity API → Google Payments → License Status
```

**利点:**
- Googleが決済を処理
- 既存のChrome Web Storeインフラ
- ユーザーは既存のGoogle決済を利用可能

**欠点:**
- Googleの手数料（5%）
- 機能が限定的
- 価格設定の柔軟性が低い

#### オプションC: ハイブリッドアプローチ（推奨）
**構成:**
```
Chrome Extension → License Validation Service (Cloudflare Workers/Firebase)
                              ↓
                         Stripe Checkout
                              ↓
                         License Database (Firebase/Supabase)
```

**利点:**
- サーバーレスでコスト効率が良い
- Stripeの強力な決済機能
- スケーラブル
- セキュリティと PCI-DSS準拠はStripeが担当

**推奨実装: オプションC（ハイブリッドアプローチ）**

### 2.2 技術スタック

#### バックエンド（ライセンスサーバー）:
- **プラットフォーム**: Firebase または Supabase
- **決済処理**: Stripe Checkout / Stripe Billing
- **認証**: Firebase Authentication
- **データベース**: Firestore または PostgreSQL (Supabase)
- **API**: Cloud Functions (Firebase) または Edge Functions (Supabase)

#### 拡張機能側の実装:
- **ライセンスストレージ**: Chrome Storage API (sync)
- **ライセンス検証**: 定期的なAPI呼び出し（1日1回 + 起動時）
- **機能ゲート**: Feature flag システム
- **UI更新**: プレミアム機能へのアップグレードプロンプト

### 2.3 データ構造設計

#### ライセンスオブジェクト:
```javascript
{
  userId: "user@example.com",
  licenseKey: "STTM-XXXX-XXXX-XXXX",
  plan: "premium|free",
  status: "active|expired|cancelled",
  purchaseDate: "2025-01-15T00:00:00Z",
  expiryDate: "2026-01-15T00:00:00Z",
  features: {
    multiCalendar: true,
    unlimitedEvents: true,
    weekView: true,
    customThemes: true,
    // ...
  },
  lastValidated: "2025-12-09T12:00:00Z"
}
```

#### Chrome Storage:
```javascript
// chrome.storage.sync
{
  license: {
    key: "STTM-XXXX-XXXX-XXXX",
    plan: "premium",
    expiryDate: "2026-01-15T00:00:00Z",
    features: {...}
  },
  licenseValidatedAt: 1702128000000
}
```

---

## フェーズ3: 実装計画
## Phase 3: Implementation Plan

### 3.1 Phase 3.1: 基盤整備（2週間）

**タスク:**
1. ライセンス管理サービスのセットアップ
   - Firebase/Supabaseプロジェクト作成
   - Stripeアカウント設定とAPIキー取得
   - データベーススキーマ設計と作成

2. ライセンス検証APIの実装
   - `/api/validate-license`: ライセンスキー検証エンドポイント
   - `/api/create-checkout`: Stripe Checkout セッション作成
   - `/api/webhook`: Stripe webhook処理（支払い完了時）

3. 拡張機能側のライセンスマネージャー実装
   - `src/lib/license-manager.js`: ライセンス検証ロジック
   - Chrome Storageへのライセンス保存
   - 定期的な検証スケジューラー

**実装ファイル:**
- `src/lib/license-manager.js` (新規)
- `src/lib/feature-flags.js` (新規)
- `src/background.js` (更新: ライセンス検証処理追加)

### 3.2 Phase 3.2: 機能ゲートの実装（2週間）

**タスク:**
1. Feature Flagシステムの実装
   - 各機能へのアクセス制御ロジック
   - 無料版での機能制限表示

2. UI/UXの更新
   - プレミアム機能へのアップグレードプロンプト
   - ロックアイコンとバッジ表示
   - プレミアム機能の説明モーダル

3. 設定ページの更新
   - ライセンス管理セクション追加
   - アクティベーション/デアクティベーション機能
   - プラン情報の表示

**実装ファイル:**
- `src/options/options.html` (更新: ライセンスセクション追加)
- `src/options/options.js` (更新: ライセンス管理UI)
- `src/options/options.css` (更新: プレミアムバッジスタイル)
- `src/side_panel/components/modals/upgrade-modal.js` (新規)
- `src/side_panel/side_panel.css` (更新: ロックアイコンスタイル)

### 3.3 Phase 3.3: プレミアム機能の実装（4-6週間）

#### 優先度1: マルチカレンダー表示
**実装:**
- `src/side_panel/event-handlers.js`: 複数カレンダーのイベント統合
- `src/options/options.js`: カレンダー選択UI（無料版は1つまで制限）

#### 優先度2: 無制限ローカルイベント
**実装:**
- `src/lib/utils.js`: ローカルイベント制限の削除（プレミアムユーザーのみ）
- `src/side_panel/components/modals/local-event-modal.js`: 制限チェック追加

#### 優先度3: 週間ビュー
**実装:**
- `src/side_panel/components/week-view/week-view-component.js` (新規)
- `src/side_panel/side_panel.html`: 週間ビュータブ追加
- `src/side_panel/time-manager.js`: 週間レイアウトロジック

#### 優先度4: カスタムテーマ
**実装:**
- `src/side_panel/themes/` (新規ディレクトリ)
- `src/side_panel/themes/dark-theme.css` (新規)
- `src/side_panel/themes/theme-manager.js` (新規)
- `src/options/options.html`: テーマ選択UI

#### 優先度5: イベントテンプレート
**実装:**
- `src/lib/template-manager.js` (新規)
- `src/side_panel/components/modals/template-modal.js` (新規)
- Chrome Storage: テンプレート保存

### 3.4 Phase 3.4: 決済フローの実装（1週間）

**タスク:**
1. Stripe Checkout統合
   - アップグレードボタンからCheckoutへのリダイレクト
   - 成功/キャンセル後のリダイレクト処理

2. ライセンスアクティベーション
   - 決済完了後の自動アクティベーション
   - メールでのライセンスキー送信

3. サブスクリプション管理
   - 定期購入の自動更新
   - キャンセル処理
   - 期限切れ通知

**実装ファイル:**
- `src/payment/checkout-handler.js` (新規)
- `src/payment/success.html` (新規: 決済成功ページ)
- `src/payment/cancel.html` (新規: 決済キャンセルページ)

### 3.5 Phase 3.5: テストとQA（2週間）

**テスト項目:**
1. ライセンス検証の正確性
   - 有効なライセンスで全機能アクセス可能
   - 無効なライセンスで機能制限
   - 期限切れライセンスの処理

2. 決済フローのテスト
   - Stripe Test Modeでの決済テスト
   - 各決済方法（カード、Google Pay、Apple Pay）
   - エラーケース（カード拒否、ネットワークエラー）

3. セキュリティテスト
   - ライセンスキーの偽造防止
   - API認証の確認
   - データ暗号化の確認

4. ユーザビリティテスト
   - アップグレードフローの直感性
   - エラーメッセージの明確さ
   - パフォーマンス影響の確認

---

## フェーズ4: リリースとマーケティング
## Phase 4: Launch and Marketing

### 4.1 ソフトローンチ（2週間）

**戦略:**
1. ベータテスター募集（50-100名）
2. 限定割引（50% off）提供
3. フィードバック収集と改善

### 4.2 正式リリース

**準備:**
1. Chrome Web Store説明文の更新
   - プレミアム機能の明確な説明
   - 価格情報の追加
   - スクリーンショット更新

2. プロモーション資料
   - ランディングページ更新（docs/index.html）
   - 機能比較表の作成
   - FAQセクション追加

3. ローンチキャンペーン
   - 既存ユーザーへのメール通知
   - SNSでの告知
   - 早期購入特典（lifetime license割引など）

### 4.3 マーケティング戦略

**チャネル:**
1. Chrome Web Store（オーガニック検索）
2. ProductHunt ローンチ
3. Reddit（r/productivity、r/chrome_extensions）
4. Twitter/X での告知
5. ブログ記事（Medium、dev.to）

**メッセージング:**
- "Your time, beautifully organized" （時間を美しく整理）
- "Premium features for power users" （パワーユーザー向けプレミアム機能）
- "Support independent development" （独立開発者をサポート）

---

## フェーズ5: 継続的改善
## Phase 5: Continuous Improvement

### 5.1 メトリクスとアナリティクス

**追跡指標:**
- 無料版ユーザー数
- プレミアム版コンバージョン率
- 月次経常収益（MRR）
- チャーンレート（解約率）
- 機能別利用率

**ツール:**
- Google Analytics 4
- Stripe Dashboard
- カスタムダッシュボード（Firebase/Supabase）

### 5.2 継続的な機能追加

**ロードマップ（6ヶ月後）:**
- 📅 月間ビュー
- 🎯 目標設定と追跡機能
- 🤖 AI powered スケジュール提案
- 📱 モバイルアプリ（PWA）
- 🔗 他のカレンダーサービス統合（Outlook、Apple Calendar）

---

## 技術的実装の詳細
## Technical Implementation Details

### コードサンプル: License Manager

```javascript
// src/lib/license-manager.js
export class LicenseManager {
  constructor() {
    this.apiEndpoint = 'https://your-api.com/api';
    this.license = null;
    this.validationInterval = 24 * 60 * 60 * 1000; // 24 hours
  }

  async initialize() {
    // Load license from storage
    const data = await chrome.storage.sync.get(['license', 'licenseValidatedAt']);
    this.license = data.license || null;

    // Validate if needed
    const lastValidated = data.licenseValidatedAt || 0;
    const now = Date.now();

    if (now - lastValidated > this.validationInterval) {
      await this.validateLicense();
    }

    // Schedule next validation
    this.scheduleValidation();
  }

  async validateLicense() {
    if (!this.license || !this.license.key) {
      this.license = { plan: 'free', features: this.getFreeFeatures() };
      return;
    }

    try {
      const response = await fetch(`${this.apiEndpoint}/validate-license`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: this.license.key })
      });

      if (response.ok) {
        const data = await response.json();
        this.license = data.license;
        await chrome.storage.sync.set({
          license: this.license,
          licenseValidatedAt: Date.now()
        });
      } else {
        // License invalid, revert to free
        this.license = { plan: 'free', features: this.getFreeFeatures() };
      }
    } catch (error) {
      console.error('License validation failed:', error);
      // Keep existing license on network error
    }
  }

  hasFeature(featureName) {
    return this.license?.features?.[featureName] === true;
  }

  isPremium() {
    return this.license?.plan === 'premium';
  }

  getFreeFeatures() {
    return {
      basicTimeline: true,
      singleCalendar: true,
      limitedLocalEvents: true,
      multiCalendar: false,
      unlimitedEvents: false,
      weekView: false,
      customThemes: false
    };
  }

  getPremiumFeatures() {
    return {
      basicTimeline: true,
      singleCalendar: true,
      limitedLocalEvents: true,
      multiCalendar: true,
      unlimitedEvents: true,
      weekView: true,
      customThemes: true,
      exportFeatures: true,
      analytics: true,
      templates: true
    };
  }

  scheduleValidation() {
    setInterval(() => this.validateLicense(), this.validationInterval);
  }

  async activateLicense(licenseKey) {
    try {
      const response = await fetch(`${this.apiEndpoint}/activate-license`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey })
      });

      if (response.ok) {
        const data = await response.json();
        this.license = data.license;
        await chrome.storage.sync.set({
          license: this.license,
          licenseValidatedAt: Date.now()
        });
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.message };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async deactivateLicense() {
    if (this.license?.key) {
      try {
        await fetch(`${this.apiEndpoint}/deactivate-license`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey: this.license.key })
        });
      } catch (error) {
        console.error('Deactivation failed:', error);
      }
    }

    this.license = { plan: 'free', features: this.getFreeFeatures() };
    await chrome.storage.sync.set({
      license: this.license,
      licenseValidatedAt: Date.now()
    });
  }
}

// Singleton instance
export const licenseManager = new LicenseManager();
```

### コードサンプル: Feature Gate Component

```javascript
// src/side_panel/components/modals/upgrade-modal.js
import { Component } from '../base/component.js';
import { licenseManager } from '../../../lib/license-manager.js';

export class UpgradeModal extends Component {
  constructor(featureName, featureDescription) {
    super();
    this.featureName = featureName;
    this.featureDescription = featureDescription;
  }

  createElement() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'upgradeModal';
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">
              <i class="fas fa-crown me-2"></i>
              ${chrome.i18n.getMessage('premiumFeature')}
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="text-center mb-4">
              <i class="fas fa-lock fa-3x text-primary mb-3"></i>
              <h4>${this.featureName}</h4>
              <p class="text-muted">${this.featureDescription}</p>
            </div>

            <div class="pricing-card border rounded p-3 mb-3">
              <h6 class="text-primary">Premium Plan</h6>
              <div class="d-flex align-items-end mb-2">
                <span class="h3 mb-0">$4.99</span>
                <span class="text-muted ms-2">/month</span>
              </div>
              <ul class="list-unstyled small">
                <li><i class="fas fa-check text-success me-2"></i>Multi-calendar display</li>
                <li><i class="fas fa-check text-success me-2"></i>Unlimited local events</li>
                <li><i class="fas fa-check text-success me-2"></i>Week view</li>
                <li><i class="fas fa-check text-success me-2"></i>Custom themes</li>
                <li><i class="fas fa-check text-success me-2"></i>Export features</li>
                <li><i class="fas fa-check text-success me-2"></i>Priority support</li>
              </ul>
            </div>

            <div class="alert alert-info small mb-0">
              <i class="fas fa-info-circle me-2"></i>
              7-day money-back guarantee. Cancel anytime.
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
              ${chrome.i18n.getMessage('notNow')}
            </button>
            <button type="button" class="btn btn-primary" id="upgradeButton">
              <i class="fas fa-crown me-2"></i>
              ${chrome.i18n.getMessage('upgradeToPremium')}
            </button>
          </div>
        </div>
      </div>
    `;

    this.element = modal;
    this.attachEventListeners();
    return modal;
  }

  attachEventListeners() {
    const upgradeButton = this.element.querySelector('#upgradeButton');
    upgradeButton.addEventListener('click', () => this.handleUpgrade());
  }

  async handleUpgrade() {
    // Open checkout page
    const checkoutUrl = await this.createCheckoutSession();
    if (checkoutUrl) {
      chrome.tabs.create({ url: checkoutUrl });
    }
  }

  async createCheckoutSession() {
    try {
      const response = await fetch('https://your-api.com/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'monthly',
          successUrl: chrome.runtime.getURL('src/payment/success.html'),
          cancelUrl: chrome.runtime.getURL('src/payment/cancel.html')
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.checkoutUrl;
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
    }
    return null;
  }

  show() {
    const modalInstance = new bootstrap.Modal(this.element);
    modalInstance.show();
  }

  destroy() {
    const modalInstance = bootstrap.Modal.getInstance(this.element);
    if (modalInstance) {
      modalInstance.hide();
    }
    super.destroy();
  }
}

// Usage example
export function requirePremiumFeature(featureName, featureDescription) {
  if (!licenseManager.isPremium()) {
    const modal = new UpgradeModal(featureName, featureDescription);
    document.body.appendChild(modal.createElement());
    modal.show();
    return false;
  }
  return true;
}
```

### manifest.json の更新

```json
{
  "manifest_version": 3,
  "name": "SideTimeTable",
  "version": "2.0.0",
  "permissions": [
    "storage",
    "identity",
    "sidePanel"
  ],
  "host_permissions": [
    "https://www.googleapis.com/*",
    "https://your-license-api.com/*"
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src 'self' https://www.googleapis.com https://your-license-api.com https://api.stripe.com;"
  }
}
```

---

## セキュリティ考慮事項
## Security Considerations

### 1. ライセンスキーの保護
- ライセンスキーはChrome Storage Sync APIで暗号化保存
- API通信は全てHTTPS
- ライセンスキーにはHMAC署名を付与

### 2. API認証
- JWT (JSON Web Token) によるAPI認証
- Rate limiting による不正利用防止
- CORS設定の適切な構成

### 3. 決済情報の取り扱い
- 拡張機能内ではカード情報を一切保持しない
- Stripe Checkoutを使用し、PCI-DSS準拠
- 決済完了後のWebhook検証

### 4. ユーザーデータ保護
- プライバシーポリシーの更新
- データ収集の最小化
- GDPR/CCPA準拠

---

## リスクと緩和策
## Risks and Mitigation

### リスク1: コンバージョン率が低い
**緩和策:**
- 無料トライアル（14日間）の提供
- 段階的な機能制限（ハードブロックではなくソフトリミット）
- 明確な価値提案とデモ

### リスク2: 既存ユーザーの反発
**緩和策:**
- 既存ユーザーへの特別割引（lifetime 50% off）
- 無料版でも基本機能は維持
- 透明性のあるコミュニケーション

### リスク3: 技術的な問題（ライセンス検証の失敗）
**緩和策:**
- オフラインでも一定期間（7日間）は動作
- グレースピリオドの設定
- 詳細なエラーログとモニタリング

### リスク4: 競合の出現
**緩和策:**
- 継続的な機能改善
- コミュニティとの関係構築
- ユニークな機能の追加（AI統合など）

---

## 予算見積もり
## Budget Estimation

### 初期費用:
- Firebase/Supabaseセットアップ: $0（無料枠内）
- Stripe アカウント: $0（手数料は取引毎）
- ドメイン取得: $10-15/年
- SSL証明書: $0（Let's Encrypt）
- **合計: 約$15**

### 月次運用費用（初月）:
- Firebase/Supabase: $0-25（無料枠～小規模）
- Stripe手数料: 2.9% + $0.30 / 取引
- **合計: 約$0-50**

### 月次運用費用（100ユーザー想定）:
- Firebase/Supabase: $25-50
- Stripe手数料: 約$14.50（100 × $4.99 × 2.9%）
- **合計: 約$40-65**

### 収益見込み:
- 100ユーザー × $4.99 = $499/月
- Stripe手数料控除後: 約$470/月
- インフラコスト控除後: 約$420-430/月

---

## 成功指標（KPI）
## Key Performance Indicators

### 短期（3ヶ月）:
- プレミアムユーザー: 50名
- コンバージョン率: 3-5%
- MRR: $250
- チャーン率: <10%

### 中期（6ヶ月）:
- プレミアムユーザー: 200名
- コンバージョン率: 5-7%
- MRR: $1,000
- チャーン率: <8%

### 長期（12ヶ月）:
- プレミアムユーザー: 500名
- コンバージョン率: 7-10%
- MRR: $2,500
- チャーン率: <5%

---

## 次のステップ
## Next Steps

### 即座に実行すべきこと:
1. ✅ このロードマップをチームでレビュー
2. ✅ 技術スタックの最終決定（Firebase vs Supabase）
3. ✅ Stripeアカウントの作成
4. ✅ プレミアム機能の優先順位確定
5. ✅ 開発スケジュールの確定

### 今週中に:
1. Firebase/Supabaseプロジェクトセットアップ
2. ライセンスマネージャーの基本実装
3. Stripe APIの統合テスト

### 今月中に:
1. Phase 3.1の完了（基盤整備）
2. Phase 3.2の着手（機能ゲート）
3. ベータテスター募集開始

---

## 質問と連絡先
## Questions and Contact

このロードマップについて質問や提案がある場合は、以下で議論してください:
- GitHub Issues
- 開発者Discord/Slack
- メール: [your-email]

---

**Document Version:** 1.0
**Last Updated:** 2025-12-09
**Author:** Claude (AI Assistant)
**Status:** Draft - Awaiting Review
