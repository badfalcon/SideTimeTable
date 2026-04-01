/**
 * Release Notes - Version history and update highlights
 *
 * Each entry contains version, date, and localized highlights.
 * Entries should be ordered from newest to oldest.
 */
export const RELEASE_NOTES = [
    {
        version: '1.9.2',
        date: '2026-04-02',
        highlights: {
            en: [
                'Customize memo font size from the settings page (10px–20px)',
                'Faster calendar switching: toggling a calendar no longer reloads all events',
                'Bug fixes and stability improvements'
            ],
            ja: [
                'メモのフォントサイズを設定画面で変更可能に（10px〜20px）',
                'カレンダー切替を高速化：個別のカレンダーだけを更新',
                'バグ修正と安定性の向上'
            ]
        }
    },
    {
        version: '1.9.1',
        date: '2026-03-29',
        highlights: {
            en: [
                'RSVP is back: respond to Google Calendar invitations directly from the side panel',
                'Bug fixes and stability improvements'
            ],
            ja: [
                '出欠回答が復活：サイドパネルからGoogleカレンダーの招待に直接回答',
                'バグ修正と安定性の向上'
            ]
        }
    },
    {
        version: '1.9.0',
        date: '2026-03-28',
        highlights: {
            en: [
                'Group your calendars: quickly switch between "Work" and "Personal" views with one click',
                'Scrollbar now matches your theme for a cleaner look',
                'Bug fixes and stability improvements'
            ],
            ja: [
                'カレンダーをグループ化：「仕事」「プライベート」などワンクリックで表示切替',
                'スクロールバーがテーマに合わせた色に対応',
                'バグ修正と安定性の向上'
            ]
        }
    },
    {
        version: '1.8.1',
        date: '2026-03-22',
        highlights: {
            en: [
                'Added thin scrollbar option for a cleaner side panel appearance',
                'RSVP feature temporarily removed due to pending store review for additional permissions',
                'Bug fixes and stability improvements'
            ],
            ja: [
                'サイドパネルの細いスクロールバーオプションを追加',
                'ストア審査に時間がかかっているため、出欠回答（RSVP）機能を一時的に無効化',
                'バグ修正と安定性の向上'
            ]
        }
    },
    {
        version: '1.8.0',
        date: '2026-03-19',
        highlights: {
            en: [
                'Dark mode and color theme presets',
                'Local event enhancements: description, view/edit mode',
                'Event details shown on timeline blocks',
                'Markdown support for memo panel',
                'RSVP buttons for Google Calendar events',
                'Complete localization of all UI strings',
                'Bug fixes and stability improvements'
            ],
            ja: [
                'ダークモード・カラーテーマプリセット',
                'ローカルイベント強化：説明フィールド、表示/編集モード',
                'タイムラインにイベント詳細を表示',
                'メモパネルのMarkdown対応',
                'Googleカレンダーの出欠回答ボタン',
                'すべてのUI文字列のローカライズ完了',
                'バグ修正と安定性の向上'
            ]
        }
    },
    {
        version: '1.7.3',
        date: '2026-03-11',
        highlights: {
            en: [
                'Drag on the timeline to create local events instantly',
                'Collapsible memo panel at the bottom of the side panel',
                'Renew the options page layout',
                'Added 30-minute margins before and after the daily timeline'
            ],
            ja: [
                'タイムラインをドラッグしてローカルイベントを即座に作成',
                'サイドパネル下部に折りたたみ可能なメモパネルを追加',
                'オプションページのレイアウトをリニューアル',
                'タイムラインの1日の前後に30分の余白を追加'
            ]
        }
    },
    {
        version: '1.7.2',
        date: '2026-03-08',
        highlights: {
            en: [
                'App rating prompt after extended use',
                'Color blindness color presets (Protanopia, Deuteranopia, Tritanopia)',
                'Improved event layout',
                'Improved Google event modal',
                'Bug fixes and performance improvements'
            ],
            ja: [
                '一定期間ご利用後にアプリの評価をお願いする機能を追加',
                '色覚対応カラープリセットを追加（第1色覚、第2色覚、第3色覚）',
                'イベントレイアウトの改善',
                'Googleイベントモーダルの改善',
                'バグ修正とパフォーマンス改善'
            ]
        }
    },
    {
        version: '1.7.1',
        date: '2026-02-18',
        highlights: {
            en: [
                'Added tutorial to learn how to use the app',
                'Added setup wizard for new users'
            ],
            ja: [
                '使い方を学べるチュートリアルを追加',
                '初めての方向けのセットアップ案内を追加'
            ]
        }
    },
    {
        version: '1.7.0',
        date: '2026-02-15',
        highlights: {
            en: [
                'Recurring events support (daily, weekly, monthly, weekdays)',
                'Improved reminder sync with comprehensive support',
                'Update notification system with "What\'s New" modal',
                'Standalone changelog page with version history',
                'Changelog link in options page and context menu'
            ],
            ja: [
                '繰り返しイベント対応（毎日・毎週・毎月・平日）',
                'リマインダー同期の改善と包括的サポート',
                '更新通知システム（「更新情報」モーダル）',
                'バージョン履歴付きスタンドアロン変更履歴ページ',
                'オプションページとコンテキストメニューに変更履歴リンク'
            ]
        }
    },
    {
        version: '1.6.1',
        date: '2025-12-05',
        highlights: {
            en: [
                'Dynamic language-aware localization support',
                'Locale and time format customization (12h/24h)'
            ],
            ja: [
                '言語設定に応じた動的ローカライゼーション対応',
                'ロケールと時刻表示形式のカスタマイズ（12h/24h）'
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
                'Configurable current time line color'
            ],
            ja: [
                'Googleカレンダーのイベントリマインダー（Chrome通知）',
                'リマインダー時間の設定（3/5/10/15/30分）',
                '手動同期ボタンとサイドパネル表示時の自動同期',
                '通知でのMeetリンク対応',
                '現在時刻線の色設定'
            ]
        }
    },
    {
        version: '1.5.0',
        date: '2025-09-02',
        highlights: {
            en: [
                'Language preference setting (Auto / English / Japanese)',
                'Calendar search functionality in options',
                'Auto-fetch calendars on first Google account connection'
            ],
            ja: [
                '言語設定（自動 / 英語 / 日本語）',
                'オプション画面でのカレンダー検索機能',
                'Googleアカウント初回接続時のカレンダー自動取得'
            ]
        }
    },
    {
        version: '1.4.6',
        date: '2025-09-02',
        highlights: {
            en: [
                'Improved event layout with dynamic width',
                'Event title display in timeline'
            ],
            ja: [
                'イベントレイアウトの改善（動的幅対応）',
                'タイムラインでのイベントタイトル表示'
            ]
        }
    },
    {
        version: '1.4.5',
        date: '2025-09-01',
        highlights: {
            en: [
                'Date picker for date navigation'
            ],
            ja: [
                '日付ナビゲーション用のデートピッカー'
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
                'Handle events with identical start and end times',
                'Keyboard shortcut support for opening side panel (Ctrl+Shift+Y)',
                'Skip declined and cancelled events in calendar view'
            ],
            ja: [
                '開始・終了時刻が同じイベントの表示対応',
                'サイドパネルを開くキーボードショートカット（Ctrl+Shift+Y）',
                '辞退済み・キャンセル済みイベントの非表示化'
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
                'Google Calendar integration',
                'Multi-calendar support with color preservation',
                'Local event creation and management',
                'Event layout with overlap resolution',
                'Business hours highlighting with break time support',
                'Current time line indicator',
                'Date navigation (previous/next day)',
                'Internationalization support (English / Japanese)',
                'Google Meet link integration'
            ],
            ja: [
                '初回リリース',
                'サイドパネルによるデイリーイベント管理',
                'Googleカレンダー連携',
                '複数カレンダー対応（カラー保持）',
                'ローカルイベントの作成・管理',
                'イベントレイアウト（重複解決）',
                '勤務時間のハイライト表示（休憩時間対応）',
                '現在時刻インジケーター',
                '日付ナビゲーション（前日/翌日）',
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
