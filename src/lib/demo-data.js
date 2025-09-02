/**
 * SideTimeTable - デモデータ
 * 
 * サンプル画像用のモックイベントデータ
 */

/**
 * デモ用のGoogleカレンダーイベントデータ
 * @returns {Array} デモイベントの配列
 */
export function getDemoEvents() {
    const today = new Date();
    
    // 今日の日付でイベントを生成
    const events = [
        {
            id: 'demo-1',
            summary: '朝の会議',
            description: 'チームの週次ミーティング\n今週の進捗を共有します',
            location: '会議室A',
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0).toISOString()
            },
            eventType: 'default',
            calendarId: 'primary',
            calendarName: 'メインカレンダー',
            calendarBackgroundColor: '#3F51B5',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-1',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo1'
        },
        {
            id: 'demo-2',
            summary: 'プロジェクト作業',
            description: 'SideTimeTableの機能開発\n・UI改善\n・バグ修正\n・テスト実行',
            location: '',
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 30).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0).toISOString()
            },
            eventType: 'default',
            calendarId: 'work@example.com',
            calendarName: '仕事',
            calendarBackgroundColor: '#4CAF50',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo2'
        },
        {
            id: 'demo-3',
            summary: 'ランチミーティング',
            description: 'クライアントとの商談\n新しいプロジェクトについて',
            location: 'レストラン XYZ',
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 30).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 30).toISOString()
            },
            eventType: 'default',
            calendarId: 'business@example.com',
            calendarName: 'ビジネス',
            calendarBackgroundColor: '#FF9800',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo3'
        },
        {
            id: 'demo-4',
            summary: '短時間通話',
            description: 'クイックチェックイン',
            location: '',
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 15).toISOString()
            },
            eventType: 'default',
            calendarId: 'primary',
            calendarName: 'メインカレンダー',
            calendarBackgroundColor: '#3F51B5',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-2',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo4'
        },
        {
            id: 'demo-5',
            summary: '設計レビュー',
            description: 'システム設計の最終確認\n・アーキテクチャ図の確認\n・パフォーマンス要件の検討',
            location: 'オンライン',
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 30).toISOString()
            },
            eventType: 'default',
            calendarId: 'work@example.com',
            calendarName: '仕事',
            calendarBackgroundColor: '#4CAF50',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-3',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo5'
        },
        {
            id: 'demo-6',
            summary: '重複イベント A',
            description: '4つ同時重複の1つ目',
            location: '会議室B',
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 30).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 30).toISOString()
            },
            eventType: 'default',
            calendarId: 'test@example.com',
            calendarName: 'テスト',
            calendarBackgroundColor: '#E91E63',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo6'
        },
        {
            id: 'demo-7',
            summary: '重複イベント B',
            description: '4つ同時重複の2つ目',
            location: 'オンライン',
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 45).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 45).toISOString()
            },
            eventType: 'default',
            calendarId: 'personal@example.com',
            calendarName: 'プライベート',
            calendarBackgroundColor: '#9C27B0',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-4',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo7'
        },
        {
            id: 'demo-9',
            summary: '重複イベント C',
            description: '4つ同時重複の3つ目',
            location: '',
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0).toISOString()
            },
            eventType: 'default',
            calendarId: 'overlap1@example.com',
            calendarName: '重複テスト1',
            calendarBackgroundColor: '#FF5722',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo9'
        },
        {
            id: 'demo-10',
            summary: '重複イベント D',
            description: '4つ同時重複の4つ目（最も長い）',
            location: 'カフェ',
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 15).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 15).toISOString()
            },
            eventType: 'default',
            calendarId: 'overlap2@example.com',
            calendarName: '重複テスト2',
            calendarBackgroundColor: '#607D8B',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo10'
        },
        {
            id: 'demo-11',
            summary: '午前重複 A',
            description: '午前中の3つ重複テスト - 1つ目',
            location: 'オンライン',
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 45).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 30).toISOString()
            },
            eventType: 'default',
            calendarId: 'morning1@example.com',
            calendarName: '午前テスト1',
            calendarBackgroundColor: '#00BCD4',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-5',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo11'
        },
        {
            id: 'demo-12',
            summary: '午前重複 B',
            description: '午前中の3つ重複テスト - 2つ目',
            location: '会議室C',
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 45).toISOString()
            },
            eventType: 'default',
            calendarId: 'morning2@example.com',
            calendarName: '午前テスト2',
            calendarBackgroundColor: '#8BC34A',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo12'
        },
        {
            id: 'demo-13',
            summary: '午前重複 C',
            description: '午前中の3つ重複テスト - 3つ目（短時間）',
            location: '',
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 15).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 30).toISOString()
            },
            eventType: 'default',
            calendarId: 'morning3@example.com',
            calendarName: '午前テスト3',
            calendarBackgroundColor: '#FFC107',
            calendarForegroundColor: '#000000',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo13'
        },
        {
            id: 'demo-8',
            summary: '夕方の振り返り',
            description: '今日の作業を振り返り、明日の計画を立てる',
            location: '',
            start: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 30).toISOString()
            },
            end: {
                dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 19, 0).toISOString()
            },
            eventType: 'default',
            calendarId: 'primary',
            calendarName: 'メインカレンダー',
            calendarBackgroundColor: '#3F51B5',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo8'
        }
    ];

    return events;
}

/**
 * デモ用のローカルイベントデータ
 * @returns {Array} デモローカルイベントの配列
 */
export function getDemoLocalEvents() {
    return [
        {
            title: 'モーニングルーチン',
            startTime: '08:00',
            endTime: '08:30'
        },
        {
            title: '集中作業時間',
            startTime: '13:45',
            endTime: '14:45'
        },
        {
            title: '運動・ストレッチ',
            startTime: '16:45',
            endTime: '17:15'
        },
        {
            title: '読書タイム',
            startTime: '20:00',
            endTime: '21:00'
        }
    ];
}

/**
 * デモモードかどうかを判定
 * @returns {boolean} デモモードの場合true
 */
export function isDemoMode() {
    // URLパラメータまたは設定でデモモードを判定
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('demo') === 'true' || localStorage.getItem('sideTimeTableDemo') === 'true';
}

/**
 * デモモードを有効/無効にする
 * @param {boolean} enabled - デモモードを有効にするかどうか
 */
export function setDemoMode(enabled) {
    if (enabled) {
        localStorage.setItem('sideTimeTableDemo', 'true');
    } else {
        localStorage.removeItem('sideTimeTableDemo');
    }
}