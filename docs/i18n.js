/**
 * Landing page i18n (ja / en).
 *
 * The markup ships in Japanese and is the single source of truth for the
 * Japanese copy: on first apply, each element's original text/attribute is
 * captured into a data-* attribute, and only the English strings live in
 * the dictionary below. Toggling back to Japanese restores the captured
 * originals.
 *
 * An inline snippet in each page's <head> resolves the language before
 * first paint (localStorage → navigator.language) and stamps it on
 * <html lang>; this script applies the translations and wires up the
 * language switcher in the navbar.
 *
 * Supported data attributes:
 *   data-i18n="key"          → textContent (innerHTML for keys in HTML_KEYS)
 *   data-i18n-alt="key"      → alt attribute
 *   data-i18n-content="key"  → content attribute (meta tags)
 *   data-i18n-src            → image with a localized variant: the English
 *                              file adds an "_en" suffix (image_1.png →
 *                              image_1_en.png, matching scripts/screenshots)
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'sideTimeTableLang';

    // Keys whose values contain trusted static markup (line breaks, spans)
    const HTML_KEYS = new Set(['hero.title', 'hero.desc']);

    const EN = {
        'index.title': 'SideTimeTable - Manage your day in the side panel',
        'index.description': 'SideTimeTable - A Chrome extension that shows Google Calendar and local events as a timeline in Chrome’s side panel',

        'nav.features': 'Features',
        'nav.screenshots': 'Screenshots',
        'nav.install': 'Install',
        'nav.privacy': 'Privacy',
        'nav.cta': 'Add to Chrome',

        'hero.badge': 'Chrome Extension · 100% Free',
        'hero.title': 'See your whole day<br><span class="text-gradient">in the side panel</span><br>at a glance',
        // <br>の前のスペースは、モバイルで<br>を非表示にした際（style.css）に
        // 単語が連結しないための語間スペース（行末の空白は描画に影響しない）
        'hero.desc': 'Syncs with Google Calendar to show today’s schedule <br>as a timeline while you work. <br>Never miss an important event again.',
        'hero.btnPrimary': 'Add from Chrome Web Store',
        'hero.btnGhost': 'See features →',
        'hero.meta1Val': 'Free',
        'hero.meta1Lbl': 'to use',
        'hero.meta2Val': 'Google',
        'hero.meta2Lbl': 'Calendar sync',
        'hero.meta3Val': 'MV3',
        'hero.meta3Lbl': 'latest manifest',

        'mock.date': 'Wed, 01/15/2025',
        'mock.t1': '9 AM',
        'mock.t2': '10 AM',
        'mock.t3': '1:20 PM',
        'mock.t4': '2 PM',
        'mock.t5': '4 PM',
        'mock.ev1Name': 'Team Meeting',
        'mock.ev1Dur': '9:00 AM - 10:00 AM',
        'mock.ev2Name': 'Code Review',
        'mock.ev2Dur': '10:30 AM - 11:00 AM',
        'mock.ev3Name': '1on1 Meeting',
        'mock.ev3Dur': '2:00 PM - 2:45 PM',
        'mock.ev4Name': 'Weekly Retro',
        'mock.ev4Dur': '4:00 PM - 5:00 PM',

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
    };

    function saveLang(lang) {
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch (e) {
            // Storage unavailable (private mode etc.) — language just won't persist
        }
    }

    function resolveLang() {
        // The head snippet already resolved and stamped the language
        const docLang = document.documentElement.lang;
        if (docLang === 'ja' || docLang === 'en') {
            return docLang;
        }
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved === 'ja' || saved === 'en') {
                return saved;
            }
        } catch (e) {
            // fall through to browser language
        }
        return (navigator.language || '').toLowerCase().startsWith('ja') ? 'ja' : 'en';
    }

    function applyLang(lang) {
        const en = (key) => EN[key] || '';

        document.documentElement.lang = lang;

        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const useHtml = HTML_KEYS.has(el.dataset.i18n);
            if (el.dataset.i18nOrig === undefined) {
                el.dataset.i18nOrig = useHtml ? el.innerHTML : el.textContent;
            }
            const value = (lang === 'en' && en(el.dataset.i18n)) || el.dataset.i18nOrig;
            if (useHtml) {
                el.innerHTML = value;
            } else {
                el.textContent = value;
            }
        });

        document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
            if (el.dataset.i18nOrigAlt === undefined) {
                el.dataset.i18nOrigAlt = el.getAttribute('alt') || '';
            }
            const value = (lang === 'en' && en(el.dataset.i18nAlt)) || el.dataset.i18nOrigAlt;
            el.setAttribute('alt', value);
        });

        document.querySelectorAll('[data-i18n-content]').forEach((el) => {
            if (el.dataset.i18nOrigContent === undefined) {
                el.dataset.i18nOrigContent = el.getAttribute('content') || '';
            }
            const value = (lang === 'en' && en(el.dataset.i18nContent)) || el.dataset.i18nOrigContent;
            el.setAttribute('content', value);
        });

        document.querySelectorAll('[data-i18n-src]').forEach((el) => {
            if (el.dataset.i18nOrigSrc === undefined) {
                el.dataset.i18nOrigSrc = el.getAttribute('src');
            }
            const base = el.dataset.i18nOrigSrc;
            const src = lang === 'en' ? base.replace(/\.(png|jpg|jpeg|webp)$/, '_en.$1') : base;
            if (el.getAttribute('src') !== src) {
                el.setAttribute('src', src);
            }
        });

        document.querySelectorAll('.lang-switch [data-lang]').forEach((btn) => {
            const active = btn.dataset.lang === lang;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', String(active));
        });

        // Reveal the page (hidden by the head snippet while English loads)
        document.documentElement.classList.remove('i18n-pending');
    }

    applyLang(resolveLang());

    document.querySelectorAll('.lang-switch [data-lang]').forEach((btn) => {
        btn.addEventListener('click', () => {
            saveLang(btn.dataset.lang);
            applyLang(btn.dataset.lang);
        });
    });
})();
