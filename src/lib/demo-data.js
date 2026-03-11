/**
 * SideTimeTable - Demo Data
 *
 * Mock event data for sample images.
 * Three scenarios, each representing a different role viewing their team's calendars
 * (one calendar per team member).
 */
import { parseTimeString } from './time-utils.js';

// ---------------------------------------------------------------------------
// Locale helper
// ---------------------------------------------------------------------------

function L(locale, en, ja) {
    return locale === 'ja' ? ja : en;
}

async function getLocale() {
    // Demo language override takes priority when in demo mode.
    const demoLang = getDemoLang();
    if (demoLang !== 'auto') return demoLang;

    // window.getCurrentLocale() is only available in the side panel context
    // (locale-utils.js is not loaded in the options page).
    // Fall back to chrome.storage + chrome.i18n for the options page.
    try {
        if (typeof window.getCurrentLocale === 'function') {
            return await window.getCurrentLocale();
        }
        const result = await chrome.storage.sync.get(['language']);
        const lang = result.language || 'auto';
        if (lang !== 'auto') return lang;
        const uiLang = chrome.i18n.getUILanguage?.() || 'en';
        return uiLang.startsWith('ja') ? 'ja' : 'en';
    } catch (_) {
        const uiLang = chrome.i18n.getUILanguage?.() || 'en';
        return uiLang.startsWith('ja') ? 'ja' : 'en';
    }
}

function _d(today, h, m) {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m).toISOString();
}

// ---------------------------------------------------------------------------
// Scenario registry
// ---------------------------------------------------------------------------

const SCENARIO_INFO = [
    {
        id: 'dev_team',
        name: { en: 'Dev Team', ja: '開発チーム' },
        desc: { en: 'Engineer/PM viewing team calendars', ja: 'エンジニア・PMがチームを把握する1日' }
    },
    {
        id: 'sales_team',
        name: { en: 'Sales Team', ja: '営業チーム' },
        desc: { en: 'Account executive with client meetings', ja: '営業が商談・クライアント管理をする1日' }
    },
    {
        id: 'manager',
        name: { en: 'Manager', ja: 'マネージャー' },
        desc: { en: 'Engineering manager with 1:1s and planning', ja: '1on1・採用・評価が重なるマネージャーの1日' }
    }
];

const DEMO_SCENARIO_KEY = 'sideTimeTableDemoScenario';
const DEMO_SCENARIO_DEFAULT = 'dev_team';
const DEMO_LANG_KEY = 'sideTimeTableDemoLang';

export function getDemoLang() {
    return localStorage.getItem(DEMO_LANG_KEY) || 'auto';
}

export function setDemoLang(lang) {
    if (lang && lang !== 'auto') {
        localStorage.setItem(DEMO_LANG_KEY, lang);
    } else {
        localStorage.removeItem(DEMO_LANG_KEY);
    }
}

export function getDemoScenario() {
    return localStorage.getItem(DEMO_SCENARIO_KEY) || DEMO_SCENARIO_DEFAULT;
}

export function setDemoScenario(id) {
    if (id && id !== DEMO_SCENARIO_DEFAULT) {
        localStorage.setItem(DEMO_SCENARIO_KEY, id);
    } else {
        localStorage.removeItem(DEMO_SCENARIO_KEY);
    }
}

export async function getDemoScenarioList() {
    const locale = await getLocale();
    return SCENARIO_INFO.map(s => ({
        id: s.id,
        name: L(locale, s.name.en, s.name.ja),
        desc: L(locale, s.desc.en, s.desc.ja)
    }));
}

// ---------------------------------------------------------------------------
// SCENARIO 1: dev_team
// Alex Rivera (PM) / 田中 健太 (Engineer) — viewing team calendars
// ---------------------------------------------------------------------------

function _devTeamEvents(today, locale) {
    const T = (en, ja) => L(locale, en, ja);
    return [
        // 9:00–10:00  Weekly team kickoff
        {
            id: 'demo-1',
            summary:  T('Weekly Team Meeting', 'チーム定例MTG'),
            description: T('Roadmap updates, sprint goals, and blockers.', '進捗確認・今週の優先度・懸案事項の共有。'),
            location: T('Conf Room A', '第1会議室'),
            start: { dateTime: _d(today, 9, 0) },
            end:   { dateTime: _d(today, 10, 0) },
            eventType: 'default',
            calendarId: 'primary',
            calendarName: T('My Calendar', 'マイカレンダー'),
            calendarBackgroundColor: '#3F51B5',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-1',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo1'
        },
        // 10:30–12:00  Deep work
        {
            id: 'demo-2',
            summary:  T('Roadmap Planning', '機能実装'),
            description: T('Deep work: Q3 feature prioritization.', '通知機能のバックエンド実装に集中。'),
            location: '',
            start: { dateTime: _d(today, 10, 30) },
            end:   { dateTime: _d(today, 12, 0) },
            eventType: 'default',
            calendarId: 'jordan@team.com',
            calendarName: T('Jordan Lee', '山田 翔'),
            calendarBackgroundColor: '#4CAF50',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo2'
        },
        // 12:30–13:30  Client lunch
        {
            id: 'demo-3',
            summary:  T('Client Lunch', '取引先ランチ商談'),
            description: T('Lunch with Acme Corp — discuss renewal.', 'A社と来期の保守契約更新について。'),
            location: T('The Trident', '丸の内 ビストロ'),
            start: { dateTime: _d(today, 12, 30) },
            end:   { dateTime: _d(today, 13, 30) },
            eventType: 'default',
            calendarId: 'sam@team.com',
            calendarName: T('Sam Chen', '佐藤 誠'),
            calendarBackgroundColor: '#FF9800',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo3'
        },
        // 14:00–14:15  Quick check-in
        {
            id: 'demo-4',
            summary:  T('Design Check-in', '上長への進捗報告'),
            description: T('Quick sync with Jamie on landing page copy.', '午後タスクの確認と差し戻し対応の承認依頼。'),
            location: '',
            start: { dateTime: _d(today, 14, 0) },
            end:   { dateTime: _d(today, 14, 15) },
            eventType: 'default',
            calendarId: 'primary',
            calendarName: T('My Calendar', 'マイカレンダー'),
            calendarBackgroundColor: '#3F51B5',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-2',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo4'
        },
        // 15:00–16:30  Design review (overlap group)
        {
            id: 'demo-5',
            summary:  T('Design Review', 'UI仕様レビュー'),
            description: T('Sprint 14 — review onboarding flow Figma.', 'v2.4 リリース向けの画面仕様を確認。'),
            location: T('Zoom', 'オンライン'),
            start: { dateTime: _d(today, 15, 0) },
            end:   { dateTime: _d(today, 16, 30) },
            eventType: 'default',
            calendarId: 'jamie@team.com',
            calendarName: T('Jamie Kim', '鈴木 花'),
            calendarBackgroundColor: '#4CAF50',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-3',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo5'
        },
        // 14:30–15:30  overlap A
        {
            id: 'demo-6',
            summary:  T('1:1 with Jordan', 'マーケとの企画すり合わせ'),
            description: T('Biweekly 1:1 with lead engineer.', '来期キャンペーンの機能要件を調整。'),
            location: T('Conf Room B', '第2会議室'),
            start: { dateTime: _d(today, 14, 30) },
            end:   { dateTime: _d(today, 15, 30) },
            eventType: 'default',
            calendarId: 'jordan@team.com',
            calendarName: T('Jordan Lee', '山田 翔'),
            calendarBackgroundColor: '#E91E63',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo6'
        },
        // 14:45–15:45  overlap B
        {
            id: 'demo-7',
            summary:  T('Vendor Demo', 'ベンダーMTG'),
            description: T('Amplitude analytics platform demo.', 'クラウドサービスの年間契約更新について。'),
            location: T('Zoom', 'オンライン'),
            start: { dateTime: _d(today, 14, 45) },
            end:   { dateTime: _d(today, 15, 45) },
            eventType: 'default',
            calendarId: 'primary',
            calendarName: T('My Calendar', 'マイカレンダー'),
            calendarBackgroundColor: '#9C27B0',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-4',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo7'
        },
        // 18:30–19:00  Evening
        {
            id: 'demo-8',
            summary:  T('Sprint Wrap-up Drinks', '夕会'),
            description: T('End-of-sprint celebration at the bar!', '本日の成果報告・明日の作業確認・残業調整。'),
            location: '',
            start: { dateTime: _d(today, 18, 30) },
            end:   { dateTime: _d(today, 19, 0) },
            eventType: 'default',
            calendarId: 'primary',
            calendarName: T('My Calendar', 'マイカレンダー'),
            calendarBackgroundColor: '#3F51B5',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo8'
        },
        // 15:00–16:00  overlap C
        {
            id: 'demo-9',
            summary:  T('Sprint Retrospective', 'コードレビュー'),
            description: T('What went well? What to improve?', '認証モジュールのPR #247 をレビュー。'),
            location: '',
            start: { dateTime: _d(today, 15, 0) },
            end:   { dateTime: _d(today, 16, 0) },
            eventType: 'default',
            calendarId: 'eng-team@team.com',
            calendarName: T('Engineering', '開発チーム'),
            calendarBackgroundColor: '#FF5722',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo9'
        },
        // 14:15–16:15  overlap D (wide)
        {
            id: 'demo-10',
            summary:  T('Customer Interview', '社外研修'),
            description: T('User research: onboarding flow feedback.', 'アジャイル開発実践講座（渋谷研修センター）。'),
            location: T('Blue Bottle Coffee', 'スタバ 渋谷店'),
            start: { dateTime: _d(today, 14, 15) },
            end:   { dateTime: _d(today, 16, 15) },
            eventType: 'default',
            calendarId: 'research@team.com',
            calendarName: T('Research', '研修'),
            calendarBackgroundColor: '#607D8B',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo10'
        },
        // 10:45–11:30  morning overlap A
        {
            id: 'demo-11',
            summary:  T('Candidate Screen', '採用面接'),
            description: T('30-min phone screen — senior iOS role.', 'バックエンドエンジニア 中途採用 一次面接。'),
            location: T('Zoom', 'オンライン'),
            start: { dateTime: _d(today, 10, 45) },
            end:   { dateTime: _d(today, 11, 30) },
            eventType: 'default',
            calendarId: 'casey@team.com',
            calendarName: T('Casey Morgan', '中村 真由美'),
            calendarBackgroundColor: '#00BCD4',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-5',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo11'
        },
        // 11:00–11:45  morning overlap B
        {
            id: 'demo-12',
            summary:  T('Backlog Grooming', 'PJ進捗MTG'),
            description: T('Refine and estimate upcoming sprint tickets.', 'リリースまでのタスク整理とリスク確認。'),
            location: T('Conf Room C', '第3会議室'),
            start: { dateTime: _d(today, 11, 0) },
            end:   { dateTime: _d(today, 11, 45) },
            eventType: 'default',
            calendarId: 'product@team.com',
            calendarName: T('Product', 'プロジェクト'),
            calendarBackgroundColor: '#8BC34A',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo12'
        },
        // 11:15–11:30  morning overlap C (very short)
        {
            id: 'demo-13',
            summary:  T('Incident Check', '障害対応 緊急確認'),
            description: T('Urgent: production outage status update.', '本番APIの504エラー 対応状況を確認。'),
            location: '',
            start: { dateTime: _d(today, 11, 15) },
            end:   { dateTime: _d(today, 11, 30) },
            eventType: 'default',
            calendarId: 'eng-team@team.com',
            calendarName: T('Engineering', '開発チーム'),
            calendarBackgroundColor: '#FFC107',
            calendarForegroundColor: '#000000',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo13'
        }
    ];
}

function _devTeamLocalEvents(locale) {
    const T = (en, ja) => L(locale, en, ja);
    return [
        { id: 'demo_local_1', title: T('Morning Run', '朝のルーティン'),        startTime: '08:00', endTime: '08:30', reminder: true },
        { id: 'demo_local_2', title: T('No-Meeting Block', '割り込み禁止タイム'), startTime: '13:45', endTime: '14:45', reminder: false },
        { id: 'demo_local_3', title: T('Gym', 'ジム'),                           startTime: '16:45', endTime: '17:15', reminder: true },
        { id: 'demo_local_4', title: T('Evening Reading', '技術書を読む'),        startTime: '20:00', endTime: '21:00', reminder: false }
    ];
}

function _devTeamMemo(locale) {
    return L(locale,
        '📋 Today\'s TODO\n· Finish customer discovery notes\n· Update roadmap doc before design review\n· Follow up with Acme Corp after lunch\n\n💡 Notes\n· Figma comments need response by EOD\n· Check sprint capacity with Jordan',
        '📋 本日のTODO\n・UI仕様レビューの資料を準備\n・A社との契約書を確認してから商談へ\n・コードレビューのフィードバックをまとめる\n\n💡 メモ\n・504エラーの再発防止策をwikiにまとめる\n・来週の採用面接スケジュールを確認'
    );
}

function _devTeamCalendars(locale) {
    const T = (en, ja) => L(locale, en, ja);
    return [
        { id: 'primary',           summary: T('My Calendar', 'マイカレンダー'),  primary: true,  backgroundColor: '#3F51B5' },
        { id: 'jordan@team.com',   summary: T('Jordan Lee', '山田 翔'),           primary: false, backgroundColor: '#4CAF50' },
        { id: 'sam@team.com',      summary: T('Sam Chen', '佐藤 誠'),             primary: false, backgroundColor: '#FF9800' },
        { id: 'jamie@team.com',    summary: T('Jamie Kim', '鈴木 花'),            primary: false, backgroundColor: '#E91E63' },
        { id: 'casey@team.com',    summary: T('Casey Morgan', '中村 真由美'),     primary: false, backgroundColor: '#9C27B0' },
        { id: 'eng-team@team.com', summary: T('Engineering', '開発チーム'),       primary: false, backgroundColor: '#FF5722' },
        { id: 'product@team.com',  summary: T('Product', 'プロジェクト'),         primary: false, backgroundColor: '#8BC34A' },
        { id: 'research@team.com', summary: T('Research', '研修'),               primary: false, backgroundColor: '#607D8B' }
    ];
}

// ---------------------------------------------------------------------------
// SCENARIO 2: sales_team
// Sarah Mitchell (AE) / 高橋 彩 (フィールドセールス) — sales & client day
// ---------------------------------------------------------------------------

function _salesTeamEvents(today, locale) {
    const T = (en, ja) => L(locale, en, ja);
    return [
        // 9:00–10:00
        {
            id: 'demo-1',
            summary:  T('Sales Morning Standup', '朝の営業MTG'),
            description: T('Pipeline review, wins, and blockers.', 'パイプライン確認・本日の商談準備。'),
            location: T('Conf Room A', '第1会議室'),
            start: { dateTime: _d(today, 9, 0) },
            end:   { dateTime: _d(today, 10, 0) },
            eventType: 'default',
            calendarId: 'primary',
            calendarName: T('My Calendar', 'マイカレンダー'),
            calendarBackgroundColor: '#3F51B5',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo1'
        },
        // 10:30–12:00
        {
            id: 'demo-2',
            summary:  T('Client Proposal Prep', '提案書作成'),
            description: T('Craft renewal proposal for ProCo.', 'B社向け更新提案書の仕上げ。'),
            location: '',
            start: { dateTime: _d(today, 10, 30) },
            end:   { dateTime: _d(today, 12, 0) },
            eventType: 'default',
            calendarId: 'primary',
            calendarName: T('My Calendar', 'マイカレンダー'),
            calendarBackgroundColor: '#3F51B5',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo2'
        },
        // 12:30–13:30
        {
            id: 'demo-3',
            summary:  T('Product Demo with Prospect', '製品デモ（見込み客）'),
            description: T('ProCo decision-makers — live demo.', 'B社のキーマンへのプレゼン・デモ。'),
            location: T('The Trident', '丸の内 ビストロ'),
            start: { dateTime: _d(today, 12, 30) },
            end:   { dateTime: _d(today, 13, 30) },
            eventType: 'default',
            calendarId: 'tom@sales.com',
            calendarName: T('Tom Chen', '前田 誠'),
            calendarBackgroundColor: '#FF9800',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo3'
        },
        // 14:00–14:15
        {
            id: 'demo-4',
            summary:  T('Follow-up: Acme Corp', 'A社フォローアップコール'),
            description: T('Check renewal status with Acme Corp.', 'A社の更新意向を確認。'),
            location: T('Zoom', 'オンライン'),
            start: { dateTime: _d(today, 14, 0) },
            end:   { dateTime: _d(today, 14, 15) },
            eventType: 'default',
            calendarId: 'primary',
            calendarName: T('My Calendar', 'マイカレンダー'),
            calendarBackgroundColor: '#3F51B5',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-2',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo4'
        },
        // 15:00–16:30
        {
            id: 'demo-5',
            summary:  T('Product Demo Training', '新機能デモ研修'),
            description: T('New feature release prep with SE team.', '新機能リリースに向けたSEチームとのデモ練習。'),
            location: T('Zoom', 'オンライン'),
            start: { dateTime: _d(today, 15, 0) },
            end:   { dateTime: _d(today, 16, 30) },
            eventType: 'default',
            calendarId: 'tom@sales.com',
            calendarName: T('Tom Chen', '前田 誠'),
            calendarBackgroundColor: '#4CAF50',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-3',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo5'
        },
        // 14:30–15:30  overlap A
        {
            id: 'demo-6',
            summary:  T('Onboarding Call', 'オンボーディングコール'),
            description: T('Handoff newly closed deal to CS team.', '新規受注のカスタマーサクセスへの引継ぎ。'),
            location: T('Zoom', 'オンライン'),
            start: { dateTime: _d(today, 14, 30) },
            end:   { dateTime: _d(today, 15, 30) },
            eventType: 'default',
            calendarId: 'emma@sales.com',
            calendarName: T('Emma Davis', '大島 由香'),
            calendarBackgroundColor: '#E91E63',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-4',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo6'
        },
        // 14:45–15:45  overlap B
        {
            id: 'demo-7',
            summary:  T('Pipeline Review', 'パイプラインレビュー'),
            description: T('Weekly pipeline review with sales manager.', '週次パイプラインの確認と優先度調整。'),
            location: T('Conf Room B', '第2会議室'),
            start: { dateTime: _d(today, 14, 45) },
            end:   { dateTime: _d(today, 15, 45) },
            eventType: 'default',
            calendarId: 'mike@sales.com',
            calendarName: T('Mike Torres', '木村 部長'),
            calendarBackgroundColor: '#9C27B0',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo7'
        },
        // 18:30–19:00
        {
            id: 'demo-8',
            summary:  T('Team Dinner', 'チーム夕食'),
            description: T('Celebrate Q2 quota attainment!', 'Q2クォータ達成を祝うチーム夕食。'),
            location: '',
            start: { dateTime: _d(today, 18, 30) },
            end:   { dateTime: _d(today, 19, 0) },
            eventType: 'default',
            calendarId: 'primary',
            calendarName: T('My Calendar', 'マイカレンダー'),
            calendarBackgroundColor: '#3F51B5',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo8'
        },
        // 15:00–16:00  overlap C
        {
            id: 'demo-9',
            summary:  T('Marketing Webinar Prep', 'マーケウェビナー準備'),
            description: T('Coordinate with marketing on joint webinar.', 'マーケティングとの合同ウェビナー調整。'),
            location: T('Zoom', 'オンライン'),
            start: { dateTime: _d(today, 15, 0) },
            end:   { dateTime: _d(today, 16, 0) },
            eventType: 'default',
            calendarId: 'mkt@sales.com',
            calendarName: T('Marketing', 'マーケチーム'),
            calendarBackgroundColor: '#FF5722',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo9'
        },
        // 14:15–16:15  overlap D (wide)
        {
            id: 'demo-10',
            summary:  T('Quarterly Business Review', '四半期ビジネスレビュー'),
            description: T('QBR with sales manager: targets & strategy.', '営業部長との四半期レビュー。目標・戦略確認。'),
            location: T('Blue Bottle Coffee', 'スタバ 渋谷店'),
            start: { dateTime: _d(today, 14, 15) },
            end:   { dateTime: _d(today, 16, 15) },
            eventType: 'default',
            calendarId: 'mike@sales.com',
            calendarName: T('Mike Torres', '木村 部長'),
            calendarBackgroundColor: '#607D8B',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo10'
        },
        // 10:45–11:30  morning overlap A
        {
            id: 'demo-11',
            summary:  T('Competitor Analysis Sync', '競合情報共有'),
            description: T('Compare pricing with SE team.', 'SEチームと競合の価格・機能を比較確認。'),
            location: T('Zoom', 'オンライン'),
            start: { dateTime: _d(today, 10, 45) },
            end:   { dateTime: _d(today, 11, 30) },
            eventType: 'default',
            calendarId: 'tom@sales.com',
            calendarName: T('Tom Chen', '前田 誠'),
            calendarBackgroundColor: '#00BCD4',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-5',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo11'
        },
        // 11:00–11:45  morning overlap B
        {
            id: 'demo-12',
            summary:  T('New Leads Review', 'リード確認MTG'),
            description: T('Review inbound leads with SDR team.', 'インバウンドリードをSDRチームと確認。'),
            location: T('Conf Room C', '第3会議室'),
            start: { dateTime: _d(today, 11, 0) },
            end:   { dateTime: _d(today, 11, 45) },
            eventType: 'default',
            calendarId: 'lisa@sales.com',
            calendarName: T('Lisa Park', '小林 誠'),
            calendarBackgroundColor: '#8BC34A',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo12'
        },
        // 11:15–11:30  morning overlap C (very short)
        {
            id: 'demo-13',
            summary:  T('Budget Approval', '値引き承認依頼'),
            description: T('Urgent: approve deal discount for ProCo.', '緊急: B社向け特別値引きの承認依頼。'),
            location: '',
            start: { dateTime: _d(today, 11, 15) },
            end:   { dateTime: _d(today, 11, 30) },
            eventType: 'default',
            calendarId: 'mike@sales.com',
            calendarName: T('Mike Torres', '木村 部長'),
            calendarBackgroundColor: '#FFC107',
            calendarForegroundColor: '#000000',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo13'
        }
    ];
}

function _salesTeamLocalEvents(locale) {
    const T = (en, ja) => L(locale, en, ja);
    return [
        { id: 'demo_local_1', title: T('Industry Podcast', '業界ニュースチェック'),    startTime: '08:00', endTime: '08:30', reminder: true },
        { id: 'demo_local_2', title: T('CRM Update', 'CRM更新'),                       startTime: '13:45', endTime: '14:45', reminder: false },
        { id: 'demo_local_3', title: T('Networking Event', '業界交流会'),               startTime: '16:45', endTime: '17:15', reminder: true },
        { id: 'demo_local_4', title: T('Sales Course', '営業スキル勉強'),               startTime: '20:00', endTime: '21:00', reminder: false }
    ];
}

function _salesTeamMemo(locale) {
    return L(locale,
        '📋 Today\'s TODO\n· Send ProCo proposal before demo\n· Follow up on Acme Corp renewal\n· Update CRM after all calls\n\n💡 Notes\n· Mike wants Q3 pipeline report by Friday\n· Get competitor pricing data from Tom',
        '📋 本日のTODO\n・B社向け提案書を商談前に送付\n・A社の更新確認フォローアップ\n・商談後にCRMを更新\n\n💡 メモ\n・木村部長がQ3パイプラインレポートを金曜までに要求\n・前田さんから競合価格情報を確認'
    );
}

function _salesTeamCalendars(locale) {
    const T = (en, ja) => L(locale, en, ja);
    return [
        { id: 'primary',          summary: T('My Calendar', 'マイカレンダー'), primary: true,  backgroundColor: '#3F51B5' },
        { id: 'mike@sales.com',   summary: T('Mike Torres', '木村 部長'),      primary: false, backgroundColor: '#9C27B0' },
        { id: 'tom@sales.com',    summary: T('Tom Chen', '前田 誠'),           primary: false, backgroundColor: '#FF9800' },
        { id: 'lisa@sales.com',   summary: T('Lisa Park', '小林 誠'),          primary: false, backgroundColor: '#8BC34A' },
        { id: 'emma@sales.com',   summary: T('Emma Davis', '大島 由香'),       primary: false, backgroundColor: '#E91E63' },
        { id: 'mkt@sales.com',    summary: T('Marketing', 'マーケチーム'),     primary: false, backgroundColor: '#FF5722' }
    ];
}

// ---------------------------------------------------------------------------
// SCENARIO 3: manager
// Jordan Lee (Eng Manager) / 山田 翔 (エンジニアリングマネージャー)
// 1:1s, hiring, performance reviews
// ---------------------------------------------------------------------------

function _managerEvents(today, locale) {
    const T = (en, ja) => L(locale, en, ja);
    return [
        // 9:00–10:00
        {
            id: 'demo-1',
            summary:  T('Department Planning', '部門計画MTG'),
            description: T('Q3 team goals and resource planning.', 'Q3チーム目標・リソース・採用計画の共有。'),
            location: T('Conf Room A', '第1会議室'),
            start: { dateTime: _d(today, 9, 0) },
            end:   { dateTime: _d(today, 10, 0) },
            eventType: 'default',
            calendarId: 'primary',
            calendarName: T('My Calendar', 'マイカレンダー'),
            calendarBackgroundColor: '#3F51B5',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo1'
        },
        // 10:30–12:00
        {
            id: 'demo-2',
            summary:  T('Performance Reviews', '評価シート作成'),
            description: T('Write midyear feedback docs for reports.', '中期評価のフィードバックを記入。'),
            location: '',
            start: { dateTime: _d(today, 10, 30) },
            end:   { dateTime: _d(today, 12, 0) },
            eventType: 'default',
            calendarId: 'primary',
            calendarName: T('My Calendar', 'マイカレンダー'),
            calendarBackgroundColor: '#3F51B5',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo2'
        },
        // 12:30–13:30
        {
            id: 'demo-3',
            summary:  T('Lunch with CTO', 'CTOとのランチ'),
            description: T('OKR alignment and Q4 headcount.', 'OKRのすり合わせとQ4採用計画について。'),
            location: T('The Trident', '丸の内 ビストロ'),
            start: { dateTime: _d(today, 12, 30) },
            end:   { dateTime: _d(today, 13, 30) },
            eventType: 'default',
            calendarId: 'primary',
            calendarName: T('My Calendar', 'マイカレンダー'),
            calendarBackgroundColor: '#3F51B5',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo3'
        },
        // 14:00–14:15
        {
            id: 'demo-4',
            summary:  T('1:1 with Morgan', '中村さんとの1on1'),
            description: T('Check in after code review feedback.', 'コードレビューのフィードバック後のフォロー。'),
            location: '',
            start: { dateTime: _d(today, 14, 0) },
            end:   { dateTime: _d(today, 14, 15) },
            eventType: 'default',
            calendarId: 'morgan@eng.com',
            calendarName: T('Morgan Davis', '中村 直樹'),
            calendarBackgroundColor: '#4CAF50',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo4'
        },
        // 15:00–16:30
        {
            id: 'demo-5',
            summary:  T('Quarterly Roadmap Review', '四半期ロードマップレビュー'),
            description: T('Align on Q3 roadmap with PM team.', 'PMチームとQ3ロードマップを最終確認。'),
            location: T('Zoom', 'オンライン'),
            start: { dateTime: _d(today, 15, 0) },
            end:   { dateTime: _d(today, 16, 30) },
            eventType: 'default',
            calendarId: 'alex@eng.com',
            calendarName: T('Alex Rivera', '田中 健太'),
            calendarBackgroundColor: '#4CAF50',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-3',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo5'
        },
        // 14:30–15:30  overlap A
        {
            id: 'demo-6',
            summary:  T('1:1 with Jamie', '鈴木さんとの1on1'),
            description: T('Design system feedback and roadmap priorities.', 'デザインシステムのフィードバックと優先度確認。'),
            location: T('Conf Room B', '第2会議室'),
            start: { dateTime: _d(today, 14, 30) },
            end:   { dateTime: _d(today, 15, 30) },
            eventType: 'default',
            calendarId: 'jamie@eng.com',
            calendarName: T('Jamie Kim', '鈴木 花'),
            calendarBackgroundColor: '#E91E63',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo6'
        },
        // 14:45–15:45  overlap B
        {
            id: 'demo-7',
            summary:  T('Sprint Planning', 'スプリント計画'),
            description: T('Next sprint scope and capacity with PM.', '次スプリントのスコープとキャパシティ確認。'),
            location: T('Zoom', 'オンライン'),
            start: { dateTime: _d(today, 14, 45) },
            end:   { dateTime: _d(today, 15, 45) },
            eventType: 'default',
            calendarId: 'alex@eng.com',
            calendarName: T('Alex Rivera', '田中 健太'),
            calendarBackgroundColor: '#9C27B0',
            calendarForegroundColor: '#FFFFFF',
            hangoutLink: 'https://meet.google.com/demo-meeting-4',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo7'
        },
        // 18:30–19:00
        {
            id: 'demo-8',
            summary:  T('Leadership Team Dinner', 'リーダーシップチーム夕食'),
            description: T('Quarterly leadership dinner.', '四半期のリーダーシップチーム夕食。'),
            location: '',
            start: { dateTime: _d(today, 18, 30) },
            end:   { dateTime: _d(today, 19, 0) },
            eventType: 'default',
            calendarId: 'company@eng.com',
            calendarName: T('Company', '全社'),
            calendarBackgroundColor: '#607D8B',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo8'
        },
        // 15:00–16:00  overlap C
        {
            id: 'demo-9',
            summary:  T('Eng Team All-Hands', 'エンジニアチーム全体MTG'),
            description: T('Weekly engineering team sync.', 'エンジニアチームの週次全体MTG。'),
            location: T('Zoom', 'オンライン'),
            start: { dateTime: _d(today, 15, 0) },
            end:   { dateTime: _d(today, 16, 0) },
            eventType: 'default',
            calendarId: 'primary',
            calendarName: T('My Calendar', 'マイカレンダー'),
            calendarBackgroundColor: '#FF5722',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo9'
        },
        // 14:15–16:15  overlap D (wide)
        {
            id: 'demo-10',
            summary:  T('Hiring Panel Interview', '採用パネル面接'),
            description: T('Panel interview: senior engineer candidate.', 'シニアエンジニア候補のパネル面接。'),
            location: T('Blue Bottle Coffee', 'スタバ 渋谷店'),
            start: { dateTime: _d(today, 14, 15) },
            end:   { dateTime: _d(today, 16, 15) },
            eventType: 'default',
            calendarId: 'hr@eng.com',
            calendarName: T('HR Team', '人事部'),
            calendarBackgroundColor: '#00BCD4',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo10'
        },
        // 10:45–11:30  morning overlap A
        {
            id: 'demo-11',
            summary:  T('1:1 with Riley', '林さんとの1on1'),
            description: T('Sprint blockers and career growth goals.', 'スプリントの課題とキャリア目標について。'),
            location: T('Conf Room C', '第3会議室'),
            start: { dateTime: _d(today, 10, 45) },
            end:   { dateTime: _d(today, 11, 30) },
            eventType: 'default',
            calendarId: 'riley@eng.com',
            calendarName: T('Riley Park', '林 拓也'),
            calendarBackgroundColor: '#8BC34A',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo11'
        },
        // 11:00–11:45  morning overlap B
        {
            id: 'demo-12',
            summary:  T('Architecture Review', 'アーキテクチャレビュー'),
            description: T('Auth service redesign proposal.', '認証サービスの再設計案をレビュー。'),
            location: T('Conf Room C', '第3会議室'),
            start: { dateTime: _d(today, 11, 0) },
            end:   { dateTime: _d(today, 11, 45) },
            eventType: 'default',
            calendarId: 'riley@eng.com',
            calendarName: T('Riley Park', '林 拓也'),
            calendarBackgroundColor: '#FFC107',
            calendarForegroundColor: '#000000',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo12'
        },
        // 11:15–11:30  morning overlap C (very short)
        {
            id: 'demo-13',
            summary:  T('Budget Sign-off', '予算承認'),
            description: T('Urgent: approve contractor extension.', '緊急: 契約社員の延長承認依頼。'),
            location: '',
            start: { dateTime: _d(today, 11, 15) },
            end:   { dateTime: _d(today, 11, 30) },
            eventType: 'default',
            calendarId: 'hr@eng.com',
            calendarName: T('HR Team', '人事部'),
            calendarBackgroundColor: '#FF5722',
            calendarForegroundColor: '#FFFFFF',
            htmlLink: 'https://calendar.google.com/calendar/event?eid=demo13'
        }
    ];
}

function _managerLocalEvents(locale) {
    const T = (en, ja) => L(locale, en, ja);
    return [
        { id: 'demo_local_1', title: T('Morning Journaling', '朝の振り返り'),          startTime: '08:00', endTime: '08:30', reminder: true },
        { id: 'demo_local_2', title: T('Slack & Email Catch-up', 'メール・Slack整理'),  startTime: '13:45', endTime: '14:45', reminder: false },
        { id: 'demo_local_3', title: T('Team Retro Notes', 'レトロ振り返りメモ'),       startTime: '16:45', endTime: '17:15', reminder: true },
        { id: 'demo_local_4', title: T('Book Club', '技術書輪読会'),                    startTime: '20:00', endTime: '21:00', reminder: false }
    ];
}

function _managerMemo(locale) {
    return L(locale,
        '📋 Today\'s TODO\n· Write midyear feedback for Riley & Morgan\n· Prep questions for hiring panel\n· Review sprint capacity before planning\n\n💡 Notes\n· Share architecture review notes with team\n· Ask CTO about Q4 headcount',
        '📋 本日のTODO\n・林・中村の中期評価フィードバックを記入\n・採用パネル面接の質問を準備\n・スプリント計画前にキャパシティを確認\n\n💡 メモ\n・アーキテクチャレビューのメモをチームに共有\n・Q4の採用枠をCTOに確認'
    );
}

function _managerCalendars(locale) {
    const T = (en, ja) => L(locale, en, ja);
    return [
        { id: 'primary',          summary: T('My Calendar', 'マイカレンダー'), primary: true,  backgroundColor: '#3F51B5' },
        { id: 'alex@eng.com',     summary: T('Alex Rivera', '田中 健太'),      primary: false, backgroundColor: '#4CAF50' },
        { id: 'riley@eng.com',    summary: T('Riley Park', '林 拓也'),         primary: false, backgroundColor: '#FF9800' },
        { id: 'morgan@eng.com',   summary: T('Morgan Davis', '中村 直樹'),     primary: false, backgroundColor: '#E91E63' },
        { id: 'jamie@eng.com',    summary: T('Jamie Kim', '鈴木 花'),          primary: false, backgroundColor: '#9C27B0' },
        { id: 'hr@eng.com',       summary: T('HR Team', '人事部'),             primary: false, backgroundColor: '#00BCD4' },
        { id: 'company@eng.com',  summary: T('Company', '全社'),               primary: false, backgroundColor: '#607D8B' }
    ];
}

// ---------------------------------------------------------------------------
// Public API — events, local events, memo, calendars
// ---------------------------------------------------------------------------

export async function getDemoEvents() {
    const locale = await getLocale();
    const scenario = getDemoScenario();
    const today = new Date();
    switch (scenario) {
        case 'sales_team': return _salesTeamEvents(today, locale);
        case 'manager':    return _managerEvents(today, locale);
        default:           return _devTeamEvents(today, locale);
    }
}

export async function getDemoLocalEvents() {
    const locale = await getLocale();
    const scenario = getDemoScenario();
    switch (scenario) {
        case 'sales_team': return _salesTeamLocalEvents(locale);
        case 'manager':    return _managerLocalEvents(locale);
        default:           return _devTeamLocalEvents(locale);
    }
}

export async function getDemoMemoContent() {
    const locale = await getLocale();
    const scenario = getDemoScenario();
    switch (scenario) {
        case 'sales_team': return _salesTeamMemo(locale);
        case 'manager':    return _managerMemo(locale);
        default:           return _devTeamMemo(locale);
    }
}

export async function getDemoCalendars() {
    const locale = await getLocale();
    const scenario = getDemoScenario();
    switch (scenario) {
        case 'sales_team': return _salesTeamCalendars(locale);
        case 'manager':    return _managerCalendars(locale);
        default:           return _devTeamCalendars(locale);
    }
}

// ---------------------------------------------------------------------------
// Demo mode on/off
// ---------------------------------------------------------------------------

export const DEMO_BUILD = true;

export function isDemoMode() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('demo') === 'true' || localStorage.getItem('sideTimeTableDemo') === 'true';
}

export function setDemoMode(enabled) {
    if (enabled) {
        localStorage.setItem('sideTimeTableDemo', 'true');
    } else {
        localStorage.removeItem('sideTimeTableDemo');
    }
}

// ---------------------------------------------------------------------------
// Demo current time
// ---------------------------------------------------------------------------

const DEMO_TIME_KEY = 'sideTimeTableDemoTime';
const DEMO_TIME_DEFAULT = '12:00';

export function getDemoCurrentTime() {
    const stored = localStorage.getItem(DEMO_TIME_KEY) || DEMO_TIME_DEFAULT;
    const { hour, minute } = parseTimeString(stored);
    const now = new Date();
    now.setHours(hour, minute, 0, 0);
    return now;
}

export function setDemoCurrentTime(timeString) {
    if (timeString) {
        localStorage.setItem(DEMO_TIME_KEY, timeString);
    } else {
        localStorage.removeItem(DEMO_TIME_KEY);
    }
}

export function getDemoCurrentTimeString() {
    return localStorage.getItem(DEMO_TIME_KEY) || DEMO_TIME_DEFAULT;
}

export function getCurrentTime() {
    return isDemoMode() ? getDemoCurrentTime() : new Date();
}

// ---------------------------------------------------------------------------
// Demo options settings (options page preview)
// ---------------------------------------------------------------------------

const _DEMO_SELECTED_CALENDARS = {
    dev_team:   ['primary', 'jordan@team.com', 'sam@team.com', 'jamie@team.com', 'casey@team.com', 'eng-team@team.com', 'product@team.com', 'research@team.com'],
    sales_team: ['primary', 'mike@sales.com', 'tom@sales.com', 'lisa@sales.com', 'emma@sales.com', 'mkt@sales.com'],
    manager:    ['primary', 'alex@eng.com', 'riley@eng.com', 'morgan@eng.com', 'jamie@eng.com', 'hr@eng.com', 'company@eng.com']
};

export function getDemoOptionsSettings() {
    const scenario = getDemoScenario();
    return {
        openTime: '09:00',
        closeTime: '18:00',
        breakTimeFixed: true,
        breakTimeStart: '12:00',
        breakTimeEnd: '13:00',
        timelineBackgroundColor: '#f0f0f0',
        panelBackgroundColor: '#f0f0f0',
        googleEventDefaultColor: '#d3d3d3',
        workTimeColor: '#d4d4d4',
        breakTimeColor: '#fda9ca',
        localEventColor: '#bbf2b1',
        currentTimeLineColor: '#ff0000',
        language: 'auto',
        googleEventReminder: true,
        reminderMinutes: 10,
        googleIntegrated: true,
        selectedCalendars: _DEMO_SELECTED_CALENDARS[scenario] || _DEMO_SELECTED_CALENDARS.dev_team
    };
}
