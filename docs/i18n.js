/**
 * Landing page i18n (ja / en).
 *
 * The markup ships in Japanese. This script swaps the text based on the
 * visitor's saved preference (localStorage) or browser language, and wires
 * up the language switcher in the navbar.
 *
 * Supported data attributes:
 *   data-i18n="key"          → textContent (innerHTML for keys in HTML_KEYS)
 *   data-i18n-alt="key"      → alt attribute
 *   data-i18n-content="key"  → content attribute (meta tags)
 *   data-i18n-src="key"      → src attribute (localized screenshots)
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'sideTimeTableLang';

    // Keys whose values contain trusted static markup (line breaks, spans)
    const HTML_KEYS = new Set(['hero.title', 'hero.desc']);

    const MESSAGES = {
        ja: {
            'index.title': 'SideTimeTable - サイドパネルで今日を管理する',
            'index.description': 'SideTimeTable - ChromeのサイドパネルにGoogleカレンダーとローカルイベントをタイムライン表示するChrome拡張機能',

            'nav.features': '機能',
            'nav.screenshots': 'スクショ',
            'nav.install': 'インストール',
            'nav.privacy': 'プライバシー',
            'nav.cta': '無料で追加',

            'hero.badge': 'Chrome拡張機能 · 完全無料',
            'hero.title': '今日の流れを<br><span class="text-gradient">サイドパネルで</span><br>ひと目で把握',
            'hero.desc': 'Googleカレンダーと連携し、作業しながら<br>今日のスケジュールをタイムライン表示。<br>大事な予定を見逃さない、新しい働き方へ。',
            'hero.btnPrimary': 'Chrome ウェブストアから追加',
            'hero.btnGhost': '機能を見る →',
            'hero.meta1Val': '無料',
            'hero.meta1Lbl': 'で利用可能',
            'hero.meta2Val': 'Google',
            'hero.meta2Lbl': 'カレンダー連携',
            'hero.meta3Val': 'MV3',
            'hero.meta3Lbl': '最新仕様対応',

            'mock.date': '2025年1月15日 (水)',
            'mock.ev1Name': 'チームミーティング',
            'mock.ev1Dur': '09:00〜10:00',
            'mock.ev2Name': 'コードレビュー',
            'mock.ev2Dur': '10:30〜11:00',
            'mock.ev3Name': '1on1ミーティング',
            'mock.ev3Dur': '14:00〜14:45',
            'mock.ev4Name': '週次振り返り',
            'mock.ev4Dur': '16:00〜17:00',

            'features.tag': '機能',
            'features.title': 'シンプルに、でも強力に',
            'features.sub': '必要なものをすべて、サイドパネルひとつに',
            'features.calendarTitle': 'Google カレンダー連携',
            'features.calendarDesc': '複数のカレンダーをシームレスに同期。カレンダーをグループにまとめて、ワンクリックで「仕事」「プライベート」を切り替えられます。',
            'features.timelineTitle': 'タイムライン表示',
            'features.timelineDesc': '時刻軸に沿って予定を視覚化。重複するイベントも自動で整列し、ひと目で把握できます。',
            'features.nowLineTitle': '現在時刻ライン',
            'features.nowLineDesc': '今の時刻が赤いラインで常時表示。スケジュールの進捗を直感的に把握できます。',
            'features.localTitle': 'ローカルイベント',
            'features.localDesc': 'Googleカレンダー不要で使える独自のイベント管理。繰り返しイベントにも対応しています。',
            'features.reminderTitle': 'リマインダー通知',
            'features.reminderDesc': '大事な予定の前に通知。設定した時間に確実にお知らせするので、うっかり忘れを防ぎます。',
            'features.customTitle': 'カスタマイズ対応',
            'features.customDesc': '表示設定、カラースキーム、業務時間など自分好みに設定可能。色覚対応プリセットや日英2言語にも対応しています。',
            'features.memoTitle': 'メモパネル',
            'features.memoDesc': 'サイドパネル下部に折りたたみ可能なメモ欄を常備。高さを自由に調整でき、メモは自動で保存されます。',

            'shots.tag': 'スクリーンショット',
            'shots.title': '実際の画面を見てみる',
            'shots.img1': 'img/image_1.png',
            'shots.img2': 'img/image_2.png',
            'shots.img3': 'img/image_3.png',
            'shots.alt1': 'SideTimeTableの画面1',
            'shots.alt2': 'SideTimeTableの画面2',
            'shots.alt3': 'SideTimeTableの画面3',

            'install.tag': 'インストール',
            'install.title': '1分で始められる',
            'install.sub': '3ステップでサイドパネルが使えるようになります',
            'install.step1Title': 'ウェブストアを開く',
            'install.step1Desc': '下のボタンからChrome ウェブストアのページへアクセスします。',
            'install.step2Title': '「Chromeに追加」',
            'install.step2Desc': 'ページ右上の「Chromeに追加」ボタンをクリックします。',
            'install.step3Title': 'サイドパネルを開く',
            'install.step3Desc': 'ツールバーのアイコンをクリックしてすぐに使い始めることができます。',
            'install.cta': 'Chrome ウェブストアからインストール',

            'footer.features': '機能',
            'footer.screenshots': 'スクリーンショット',
            'footer.install': 'インストール',
            'footer.privacy': 'プライバシーポリシー',

            'privacy.title': 'プライバシーポリシー - SideTimeTable',
            'privacy.description': 'SideTimeTable プライバシーポリシー',
            'privacy.heroTitle': 'プライバシーポリシー',
            'privacy.heroSub': 'SideTimeTable のプライバシーに関する方針',
            'privacy.lead': 'このプライバシーポリシーは、SideTimeTable の拡張機能および関連サービスにおけるプライバシーに関する方針を説明しています。',
            'privacy.collectTitle': '情報の収集',
            'privacy.collectDesc': 'SideTimeTable は、ユーザーの個人情報を収集しません。この拡張機能は、Google カレンダーとの同期に必要な最低限の情報にアクセスしますが、これらのデータはユーザーのローカル環境で処理され、外部に送信されることはありません。',
            'privacy.accessTitle': 'Google ユーザーデータへのアクセス',
            'privacy.accessDesc': 'SideTimeTable は、Google カレンダーとの同期のために Google ユーザーデータにアクセスします。アクセスするデータには以下が含まれます。',
            'privacy.accessItem1': 'カレンダーイベントのタイトル・日時・場所',
            'privacy.accessItem2': '参加者情報',
            'privacy.accessItem3': 'Google Meet のリンク',
            'privacy.accessItem4': 'カレンダーの一覧情報（読み取り専用）',
            'privacy.accessNote': 'また、出欠回答（RSVP）機能のために、カレンダーイベントへの書き込みアクセス権を使用します。書き込みは出欠ステータスの更新のみに限定されます。',
            'privacy.retentionTitle': 'Google ユーザーデータの保持と削除',
            'privacy.retentionDesc': 'SideTimeTable は、Google ユーザーデータをローカル環境にのみ保持し、外部サーバーに保存することはありません。ユーザーが拡張機能をアンインストールするか、Google アカウントとの同期を解除した場合、すべての Google ユーザーデータはローカル環境から削除されます。',
            'privacy.useTitle': '情報の使用',
            'privacy.useDesc': '収集された情報は、拡張機能の提供および機能改善のためにのみ使用されます。情報は匿名化され、個人を特定することはありません。',
            'privacy.shareTitle': '情報の共有',
            'privacy.shareDesc': 'SideTimeTable は、ユーザーの情報を第三者と共有することはありません。また、販売や貸与も行いません。',
            'privacy.protectTitle': '情報の保護',
            'privacy.protectDesc': 'ユーザーのプライバシーを保護するために、厳格なセキュリティ対策を講じています。この拡張機能は、ユーザーのデータをローカル環境に保存し、外部サーバーへの転送を行いません。',
            'privacy.contactTitle': 'お問い合わせ',
            'privacy.contactDesc': 'プライバシーに関するご質問やご不明点がある場合は、下記のメールアドレスまでお気軽にご連絡ください。',
            'privacy.changesTitle': 'プライバシーポリシーの変更',
            'privacy.changesDesc': 'このプライバシーポリシーは、必要に応じて変更されることがあります。変更があった場合には、本ページ上でお知らせいたします。',
            'privacy.back': '← トップページへ戻る'
        },

        en: {
            'index.title': 'SideTimeTable - Manage your day in the side panel',
            'index.description': 'SideTimeTable - A Chrome extension that shows Google Calendar and local events as a timeline in Chrome’s side panel',

            'nav.features': 'Features',
            'nav.screenshots': 'Screenshots',
            'nav.install': 'Install',
            'nav.privacy': 'Privacy',
            'nav.cta': 'Add to Chrome',

            'hero.badge': 'Chrome Extension · 100% Free',
            'hero.title': 'See your whole day<br><span class="text-gradient">in the side panel</span><br>at a glance',
            'hero.desc': 'Syncs with Google Calendar to show today’s schedule<br>as a timeline while you work.<br>Never miss an important event again.',
            'hero.btnPrimary': 'Add from Chrome Web Store',
            'hero.btnGhost': 'See features →',
            'hero.meta1Val': 'Free',
            'hero.meta1Lbl': 'to use',
            'hero.meta2Val': 'Google',
            'hero.meta2Lbl': 'Calendar sync',
            'hero.meta3Val': 'MV3',
            'hero.meta3Lbl': 'latest manifest',

            'mock.date': 'Wed, Jan 15, 2025',
            'mock.ev1Name': 'Team Meeting',
            'mock.ev1Dur': '9:00 – 10:00 AM',
            'mock.ev2Name': 'Code Review',
            'mock.ev2Dur': '10:30 – 11:00 AM',
            'mock.ev3Name': '1on1 Meeting',
            'mock.ev3Dur': '2:00 – 2:45 PM',
            'mock.ev4Name': 'Weekly Retro',
            'mock.ev4Dur': '4:00 – 5:00 PM',

            'features.tag': 'Features',
            'features.title': 'Simple, yet powerful',
            'features.sub': 'Everything you need, in a single side panel',
            'features.calendarTitle': 'Google Calendar Integration',
            'features.calendarDesc': 'Seamlessly sync multiple calendars. Group them together and switch between work and personal with one click.',
            'features.timelineTitle': 'Timeline View',
            'features.timelineDesc': 'Visualize your schedule along a time axis. Overlapping events are arranged automatically so you can grasp your day at a glance.',
            'features.nowLineTitle': 'Current Time Line',
            'features.nowLineDesc': 'A red line always marks the current time, so you can intuitively track your progress through the day.',
            'features.localTitle': 'Local Events',
            'features.localDesc': 'Manage your own events without a Google account. Recurring events are supported too.',
            'features.reminderTitle': 'Reminder Notifications',
            'features.reminderDesc': 'Get notified before important events. Reliable alerts at the timing you choose, so nothing slips through the cracks.',
            'features.customTitle': 'Customizable',
            'features.customDesc': 'Adjust display settings, color schemes, and working hours to your liking. Includes color-blind-friendly presets and English/Japanese support.',
            'features.memoTitle': 'Memo Panel',
            'features.memoDesc': 'A collapsible memo area at the bottom of the panel. Resize it freely — your notes are saved automatically.',

            'shots.tag': 'Screenshots',
            'shots.title': 'See it in action',
            'shots.img1': 'img/image_1_en.png',
            'shots.img2': 'img/image_2_en.png',
            'shots.img3': 'img/image_3_en.png',
            'shots.alt1': 'SideTimeTable screenshot 1',
            'shots.alt2': 'SideTimeTable screenshot 2',
            'shots.alt3': 'SideTimeTable screenshot 3',

            'install.tag': 'Install',
            'install.title': 'Get started in a minute',
            'install.sub': 'Three steps to get the side panel up and running',
            'install.step1Title': 'Open the Web Store',
            'install.step1Desc': 'Click the button below to visit the Chrome Web Store page.',
            'install.step2Title': 'Click “Add to Chrome”',
            'install.step2Desc': 'Click the “Add to Chrome” button at the top right of the page.',
            'install.step3Title': 'Open the side panel',
            'install.step3Desc': 'Click the toolbar icon and start using it right away.',
            'install.cta': 'Install from Chrome Web Store',

            'footer.features': 'Features',
            'footer.screenshots': 'Screenshots',
            'footer.install': 'Install',
            'footer.privacy': 'Privacy Policy',

            'privacy.title': 'Privacy Policy - SideTimeTable',
            'privacy.description': 'SideTimeTable Privacy Policy',
            'privacy.heroTitle': 'Privacy Policy',
            'privacy.heroSub': 'How SideTimeTable handles your privacy',
            'privacy.lead': 'This Privacy Policy explains how the SideTimeTable extension and related services handle your privacy.',
            'privacy.collectTitle': 'Information Collection',
            'privacy.collectDesc': 'SideTimeTable does not collect any personal information. The extension accesses only the minimum information required to sync with Google Calendar, and this data is processed locally on your device — it is never sent to external servers.',
            'privacy.accessTitle': 'Access to Google User Data',
            'privacy.accessDesc': 'SideTimeTable accesses Google user data to sync with Google Calendar. The data accessed includes:',
            'privacy.accessItem1': 'Event titles, dates, times, and locations',
            'privacy.accessItem2': 'Attendee information',
            'privacy.accessItem3': 'Google Meet links',
            'privacy.accessItem4': 'Your list of calendars (read-only)',
            'privacy.accessNote': 'The extension also uses write access to calendar events for the RSVP feature. Writes are strictly limited to updating your attendance status.',
            'privacy.retentionTitle': 'Retention and Deletion of Google User Data',
            'privacy.retentionDesc': 'SideTimeTable keeps Google user data only on your local device and never stores it on external servers. When you uninstall the extension or disconnect your Google account, all Google user data is deleted from your device.',
            'privacy.useTitle': 'Use of Information',
            'privacy.useDesc': 'Collected information is used solely to provide and improve the extension. Information is anonymized and cannot be used to identify individuals.',
            'privacy.shareTitle': 'Information Sharing',
            'privacy.shareDesc': 'SideTimeTable never shares your information with third parties, nor does it sell or lease it.',
            'privacy.protectTitle': 'Data Protection',
            'privacy.protectDesc': 'Strict security measures are in place to protect your privacy. The extension stores your data locally and does not transfer it to external servers.',
            'privacy.contactTitle': 'Contact',
            'privacy.contactDesc': 'If you have any questions or concerns about privacy, feel free to contact us at the email address below.',
            'privacy.changesTitle': 'Changes to This Privacy Policy',
            'privacy.changesDesc': 'This Privacy Policy may be updated from time to time. Any changes will be announced on this page.',
            'privacy.back': '← Back to top'
        }
    };

    function loadSavedLang() {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            return null;
        }
    }

    function saveLang(lang) {
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch (e) {
            // Storage unavailable (private mode etc.) — language just won't persist
        }
    }

    function detectLang() {
        const saved = loadSavedLang();
        if (saved === 'ja' || saved === 'en') {
            return saved;
        }
        const browserLang = (navigator.language || '').toLowerCase();
        return browserLang.startsWith('ja') ? 'ja' : 'en';
    }

    function applyLang(lang) {
        const dict = MESSAGES[lang] || MESSAGES.ja;
        const t = (key) => dict[key] || MESSAGES.ja[key] || '';

        document.documentElement.lang = lang;

        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.dataset.i18n;
            const value = t(key);
            if (!value) return;
            if (HTML_KEYS.has(key)) {
                el.innerHTML = value;
            } else {
                el.textContent = value;
            }
        });

        document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
            el.setAttribute('alt', t(el.dataset.i18nAlt));
        });

        document.querySelectorAll('[data-i18n-content]').forEach((el) => {
            el.setAttribute('content', t(el.dataset.i18nContent));
        });

        document.querySelectorAll('[data-i18n-src]').forEach((el) => {
            const src = t(el.dataset.i18nSrc);
            if (src) el.setAttribute('src', src);
        });

        document.querySelectorAll('.lang-switch [data-lang]').forEach((btn) => {
            const active = btn.dataset.lang === lang;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', String(active));
        });
    }

    function init() {
        applyLang(detectLang());

        document.querySelectorAll('.lang-switch [data-lang]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const lang = btn.dataset.lang;
                saveLang(lang);
                applyLang(lang);
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
