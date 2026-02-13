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
                'Added "What\'s New" notification to inform you about updates',
                'Recurring events support (daily, weekly, monthly, weekdays)',
                'Event reminders with Chrome notifications',
                'Sync reminders button for manual refresh'
            ],
            ja: [
                '更新通知（What\'s New）機能を追加',
                '繰り返しイベント対応（毎日・毎週・毎月・平日）',
                'Chrome通知によるイベントリマインダー',
                'リマインダー手動同期ボタンを追加'
            ]
        }
    },
    {
        version: '1.6.1',
        date: '2025-12-01',
        highlights: {
            en: [
                'Improved event layout algorithm for better overlap handling',
                'Current time line now only shows on today\'s date',
                'Bug fixes and performance improvements'
            ],
            ja: [
                'イベントレイアウトの重なり処理を改善',
                '現在時刻の線が今日の日付のみ表示されるように修正',
                'バグ修正とパフォーマンス改善'
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
