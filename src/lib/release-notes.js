/**
 * Release Notes - Version history and update highlights
 *
 * Each entry contains version, date, and localized highlights.
 * Entries should be ordered from newest to oldest.
 */
export const RELEASE_NOTES = [
    {
        version: '1.7.0',
        date: '2026-02-13',
        highlights: {
            en: [
                'Added "What\'s New" notification for update announcements',
                'Recurring events support (daily, weekly, monthly, weekdays)',
                'Improved reminder sync with comprehensive support'
            ],
            ja: [
                '更新通知（What\'s New）機能を追加',
                '繰り返しイベント対応（毎日・毎週・毎月・平日）',
                'リマインダー同期の改善と包括的サポート'
            ]
        }
    },
    {
        version: '1.6.1',
        date: '2025-12-05',
        highlights: {
            en: [
                'Dynamic language-aware localization support',
                'Locale and time format customization (12h/24h)',
                'Layout constants and style alignment adjustments'
            ],
            ja: [
                '言語設定に応じた動的ローカライゼーション対応',
                'ロケールと時刻表示形式のカスタマイズ（12h/24h）',
                'レイアウト定数とスタイルの整合性調整'
            ]
        }
    },
    {
        version: '1.6.0',
        date: '2025-11-28',
        highlights: {
            en: [
                'Google Calendar event reminders with Chrome notifications',
                'Configurable reminder time setting (3/5/10/15/30 min)',
                'Manual sync button and auto-sync on side panel open',
                'Meet link support in notifications',
                'Configurable current time line color',
                'Webpack + Babel build system for ES6 module bundling',
                'Component-based UI architecture with lifecycle management',
                'Current time line management with date-aware visibility'
            ],
            ja: [
                'Googleカレンダーのイベントリマインダー（Chrome通知）',
                'リマインダー時間の設定（3/5/10/15/30分）',
                '手動同期ボタンとサイドパネル表示時の自動同期',
                '通知でのMeetリンク対応',
                '現在時刻線の色設定',
                'Webpack + Babel によるES6モジュールバンドル対応',
                'ライフサイクル管理付きコンポーネントベースUI',
                '日付認識付き現在時刻線の管理'
            ]
        }
    },
    {
        version: '1.5.0',
        date: '2025-09-02',
        highlights: {
            en: [
                'Demo mode with mock data for development',
                'Language preference setting (Auto / English / Japanese)',
                'Localized demo and local event data',
                'Calendar search functionality in options',
                'Auto-fetch calendars on first Google account connection'
            ],
            ja: [
                '開発用デモモード（モックデータ対応）',
                '言語設定（自動 / 英語 / 日本語）',
                'デモデータとローカルイベントのローカライズ',
                'オプション画面でのカレンダー検索機能',
                'Googleアカウント初回接続時のカレンダー自動取得'
            ]
        }
    },
    {
        version: '1.4.7',
        date: '2025-09-02',
        highlights: {
            en: [
                'Fetch rate limiting to prevent duplicate Google Calendar requests'
            ],
            ja: [
                'Googleカレンダーの重複リクエスト防止（レート制限）'
            ]
        }
    },
    {
        version: '1.4.6',
        date: '2025-09-02',
        highlights: {
            en: [
                'Responsive flexbox event layout with dynamic width',
                'Event title display in timeline',
                'Improved side panel height calculation'
            ],
            ja: [
                'レスポンシブFlexboxイベントレイアウト（動的幅対応）',
                'タイムラインでのイベントタイトル表示',
                'サイドパネル高さ計算の改善'
            ]
        }
    },
    {
        version: '1.4.5',
        date: '2025-09-01',
        highlights: {
            en: [
                'Date picker for date navigation',
                'Debounce for event loading performance',
                'Advanced error handling with timeout for Google Calendar API'
            ],
            ja: [
                '日付ナビゲーション用のデートピッカー',
                'イベント読み込みのデバウンス処理',
                'Googleカレンダー API のタイムアウト付きエラーハンドリング'
            ]
        }
    },
    {
        version: '1.4.4',
        date: '2025-08-30',
        highlights: {
            en: [
                'Google Maps button for location-based events',
                'Clickable Google Calendar event titles',
                'Improved Google Meet button layout'
            ],
            ja: [
                '場所付きイベント用のGoogleマップボタン',
                'Googleカレンダーのイベントタイトルをリンク化',
                'Google Meetボタンのレイアウト改善'
            ]
        }
    },
    {
        version: '1.4.3',
        date: '2025-08-29',
        highlights: {
            en: [
                'Updated Google Meet integration with button-based UI'
            ],
            ja: [
                'Google Meet連携をボタンベースUIに更新'
            ]
        }
    },
    {
        version: '1.4.2',
        date: '2025-08-28',
        highlights: {
            en: [
                'Handle events with identical start and end times (extend to 15 min)',
                'Keyboard shortcut support for opening side panel (Ctrl+Shift+Y)',
                'Skip declined and cancelled events in calendar view',
                'Styled links in Google event details'
            ],
            ja: [
                '開始・終了時刻が同じイベントの表示対応（15分に拡張）',
                'サイドパネルを開くキーボードショートカット（Ctrl+Shift+Y）',
                '辞退済み・キャンセル済みイベントの非表示化',
                'Googleイベント詳細のリンクスタイル改善'
            ]
        }
    },
    {
        version: '1.4.1',
        date: '2025-08-18',
        highlights: {
            en: [
                'Initial release',
                'Side panel interface for daily event management',
                'Google Calendar integration with OAuth2 authentication',
                'Multi-calendar support with color preservation',
                'Local event creation and management',
                'Time-based event layout with overlap resolution',
                'Business hours highlighting with break time support',
                'Current time line indicator',
                'Date navigation (previous/next day)',
                'Options page for settings management',
                'Internationalization support (English / Japanese)',
                'Google Meet link integration'
            ],
            ja: [
                '初回リリース',
                'サイドパネルによるデイリーイベント管理',
                'OAuth2認証によるGoogleカレンダー連携',
                '複数カレンダー対応（カラー保持）',
                'ローカルイベントの作成・管理',
                '時間ベースのイベントレイアウト（重複解決）',
                '勤務時間のハイライト表示（休憩時間対応）',
                '現在時刻インジケーター',
                '日付ナビゲーション（前日/翌日）',
                '設定管理用オプションページ',
                '多言語対応（英語/日本語）',
                'Google Meetリンク連携'
            ]
        }
    }
];

/**
 * Get release notes newer than the specified version.
 * @param {string|null} lastSeenVersion - The last version the user has seen (null = first install)
 * @param {string} currentVersion - The current extension version
 * @returns {Array} Release notes entries newer than lastSeenVersion
 */
export function getUnseenReleaseNotes(lastSeenVersion, currentVersion) {
    if (!lastSeenVersion) {
        // First install or no record - don't show any notes
        return [];
    }

    if (lastSeenVersion === currentVersion) {
        return [];
    }

    return RELEASE_NOTES.filter(entry => {
        return compareVersions(entry.version, lastSeenVersion) > 0 &&
               compareVersions(entry.version, currentVersion) <= 0;
    });
}

/**
 * Compare two semver version strings.
 * @param {string} a - Version string (e.g. '1.7.0')
 * @param {string} b - Version string (e.g. '1.6.1')
 * @returns {number} Positive if a > b, negative if a < b, 0 if equal
 */
export function compareVersions(a, b) {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    const len = Math.max(partsA.length, partsB.length);

    for (let i = 0; i < len; i++) {
        const numA = partsA[i] || 0;
        const numB = partsB[i] || 0;
        if (numA !== numB) {
            return numA - numB;
        }
    }
    return 0;
}
