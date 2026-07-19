/**
 * landing-en-data.js - English dictionary and config for the static landing
 * page generator (scripts/build-landing-en.js) and its staleness test
 * (tests/docs/landing-en.test.js).
 *
 * The Japanese root pages (docs/index.html, docs/privacy.html) are the source
 * of truth for Japanese copy and carry data-i18n* annotations. The generator
 * applies the English strings below to produce docs/en/. There is no runtime
 * language swap: each URL serves one language, and the root pages redirect
 * non-Japanese visitors to /en/.
 *
 * After editing this file OR the Japanese copy in the root pages, regenerate:
 *   npm run build:landing
 */

'use strict';

const SITE = 'https://sidetimetable.com';
const STORAGE_KEY = 'sideTimeTableLang';

// Keys whose values contain trusted static markup (line breaks, spans) and
// must be applied via innerHTML rather than textContent.
const HTML_KEYS = ['hero.title', 'hero.desc'];

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
    // The space before each <br> keeps words separated when the <br> is hidden
    // on mobile (style.css); trailing whitespace before a break does not render.
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

// One entry per root page. jaUrl/enUrl use the canonical directory form for the
// homepage. jaBackHref is the English page's link back to the Japanese page
// (?lang=ja tells the root snippet to stay Japanese and remember the choice).
// enSelfHref: the English page's own address in canonical (directory) form —
// './' for the home page so internal links match the /en/ canonical rather
// than producing a duplicate /en/index.html.
const PAGES = [
    {
        src: 'index.html',
        jaUrl: `${SITE}/`,
        enUrl: `${SITE}/en/`,
        ogImage: `${SITE}/img/image_1_en.png`,
        jaBackHref: '../index.html?lang=ja',
        enSelfHref: './'
    },
    {
        src: 'privacy.html',
        jaUrl: `${SITE}/privacy.html`,
        enUrl: `${SITE}/en/privacy.html`,
        ogImage: `${SITE}/img/image_1_en.png`,
        jaBackHref: '../privacy.html?lang=ja',
        enSelfHref: 'privacy.html'
    }
];

module.exports = { SITE, STORAGE_KEY, HTML_KEYS, EN, PAGES };
