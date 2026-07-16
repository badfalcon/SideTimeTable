/**
 * compose.js - Compose raw captures into browser-framed screenshots.
 *
 * Wraps the raw page captures from capture.js in a generic browser window
 * frame (tab strip, toolbar, omnibox, optional side-panel header) and renders
 * the result at 1280x800 - the Chrome Web Store standard screenshot size.
 *
 * Output: image_1[_en].png .. image_3[_en].png
 */

const fs = require('fs');
const path = require('path');
const { loadPlaywright } = require('./pw');

const ROOT = path.resolve(__dirname, '..', '..');
const ICON = path.join(ROOT, 'src', 'img', 'icon32.png');

// Published extension ID, shown in the mock omnibox for extension pages
const STORE_EXT_ID = 'pnknjjpncnciijkpdfgfiikmhlmamaid';
const EXT_URL = `chrome-extension://${STORE_EXT_ID}`;

const THEMES = {
    light: {
        tabstrip: '#dee1e6', tab: '#ffffff', toolbar: '#ffffff',
        border: '#dadce0', pill: '#f1f3f4', text: '#202124',
        subtext: '#5f6368', icon: '#5f6368', panelHeader: '#ffffff',
    },
    dark: {
        tabstrip: '#202124', tab: '#35363a', toolbar: '#35363a',
        border: '#3c4043', pill: '#202124', text: '#e8eaed',
        subtext: '#9aa0a6', icon: '#9aa0a6', panelHeader: '#292a2d',
    },
};

const SHOTS = {
    ja: [
        {
            out: 'image_1.png', theme: 'light',
            tabTitle: 'SideTimeTable - サイドパネルで今日を管理する',
            url: 'sidetimetable.com',
            pageImg: 'landing.png', panelImg: 'panel-light.png',
        },
        {
            out: 'image_2.png', theme: 'light',
            tabTitle: 'SideTimeTableの設定',
            url: `${EXT_URL}/src/options/options.html`,
            pageImg: 'options-light.png', panelImg: null,
        },
        {
            out: 'image_3.png', theme: 'dark',
            tabTitle: 'SideTimeTableの設定',
            url: `${EXT_URL}/src/options/options.html`,
            pageImg: 'options-dark.png', panelImg: 'panel-dark-modal.png',
        },
    ],
    en: [
        {
            out: 'image_1_en.png', theme: 'light',
            tabTitle: 'Changelog - SideTimeTable',
            url: `${EXT_URL}/src/changelog/changelog.html`,
            pageImg: 'changelog-en.png', panelImg: 'panel-light-en.png',
        },
        {
            out: 'image_2_en.png', theme: 'light',
            tabTitle: 'SideTimeTable Settings',
            url: `${EXT_URL}/src/options/options.html`,
            pageImg: 'options-light-en.png', panelImg: null,
        },
        {
            out: 'image_3_en.png', theme: 'dark',
            tabTitle: 'SideTimeTable Settings',
            url: `${EXT_URL}/src/options/options.html`,
            pageImg: 'options-dark-en.png', panelImg: 'panel-dark-modal-en.png',
        },
    ],
};

const b64 = (file) => `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;

function svg(name, color) {
    const p = {
        back: '<path d="M15 4 7 12l8 8" stroke-width="2"/>',
        fwd: '<path d="M9 4l8 8-8 8" stroke-width="2"/>',
        reload: '<path d="M4 12a8 8 0 1 1 2.3 5.6M4 12V7m0 5h5" stroke-width="2"/>',
        panel: '<rect x="3" y="4" width="18" height="16" rx="2" stroke-width="2"/><line x1="14" y1="4" x2="14" y2="20" stroke-width="2"/>',
        kebab: '<circle cx="12" cy="5" r="1.6" fill="CLR" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="CLR" stroke="none"/><circle cx="12" cy="19" r="1.6" fill="CLR" stroke="none"/>',
        puzzle: '<path d="M20 11h-2V7a1 1 0 0 0-1-1h-4V4.5a2 2 0 1 0-4 0V6H5a1 1 0 0 0-1 1v3.5H5.5a2 2 0 1 1 0 4H4V19a1 1 0 0 0 1 1h4v-1.5a2 2 0 1 1 4 0V20h4a1 1 0 0 0 1-1v-4h2a1.5 1.5 0 0 0 0-4z" stroke-width="1.6"/>',
        pin: '<path d="M12 17v5M7 9l1-5h8l1 5c0 3-2.2 5-5 5s-5-2-5-5z" stroke-width="1.8"/>',
        close: '<path d="M6 6l12 12M18 6L6 18" stroke-width="2"/>',
        lock: '<rect x="6" y="11" width="12" height="9" rx="1.6" stroke-width="1.8"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" stroke-width="1.8"/>',
    }[name].replaceAll('CLR', color);
    return `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
}

function pageHtml({ theme, tabTitle, url, pageImg, panelImg }, rawDir) {
    const t = THEMES[theme];
    const icon = b64(ICON);
    const panel = panelImg ? `
      <div class="sidepanel">
        <div class="sp-header">
          <img class="sp-icon" src="${icon}" alt="">
          <span class="sp-title">SideTimeTable</span>
          <span class="sp-actions">
            <span class="i i16">${svg('pin', t.icon)}</span>
            <span class="i i16">${svg('close', t.icon)}</span>
          </span>
        </div>
        <img class="sp-img" src="${b64(path.join(rawDir, panelImg))}" alt="">
      </div>` : '';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { width:1280px; height:800px; overflow:hidden;
             font-family:'Noto Sans CJK JP','Noto Sans JP','Hiragino Sans','Yu Gothic UI',system-ui,sans-serif; }
      .tabstrip { height:40px; background:${t.tabstrip}; display:flex; align-items:flex-end; padding:0 8px; }
      .tab { height:34px; width:248px; background:${t.tab}; border-radius:10px 10px 0 0;
             display:flex; align-items:center; gap:8px; padding:0 12px; margin-left:8px; }
      .tab img { width:16px; height:16px; }
      .tab span { font-size:12px; color:${t.text}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .newtab { width:28px; height:28px; margin:0 0 3px 10px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
      .newtab::before { content:''; width:12px; height:2px; background:${t.icon}; position:absolute; }
      .newtab::after { content:''; width:2px; height:12px; background:${t.icon}; position:absolute; }
      .winctl { margin-left:auto; display:flex; gap:18px; align-items:center; padding:0 10px 8px 0; }
      .winctl span { width:10px; height:10px; border-radius:50%; background:${t.icon}; opacity:.55; }
      .toolbar { height:44px; background:${t.toolbar}; border-bottom:1px solid ${t.border};
                 display:flex; align-items:center; gap:6px; padding:0 10px; }
      .i { display:inline-flex; width:20px; height:20px; }
      .i svg { width:100%; height:100%; }
      .i16 { width:16px; height:16px; }
      .navbtn { width:28px; height:28px; display:flex; align-items:center; justify-content:center; }
      .dim { opacity:.4; }
      .omnibox { flex:1; height:30px; background:${t.pill}; border-radius:15px;
                 display:flex; align-items:center; gap:8px; padding:0 14px; margin:0 6px; }
      .omnibox .i { width:14px; height:14px; }
      .omnibox span { font-size:12.5px; color:${t.subtext}; }
      .content { height:716px; display:flex; }
      .page { flex:1; height:716px; overflow:hidden; }
      .page img { display:block; width:100%; height:100%; }
      .sidepanel { width:384px; border-left:1px solid ${t.border}; display:flex; flex-direction:column; }
      .sp-header { height:36px; background:${t.panelHeader}; border-bottom:1px solid ${t.border};
                   display:flex; align-items:center; gap:8px; padding:0 12px; }
      .sp-icon { width:16px; height:16px; }
      .sp-title { font-size:12px; font-weight:600; color:${t.text}; }
      .sp-actions { margin-left:auto; display:flex; gap:12px; align-items:center; }
      .sp-img { display:block; width:384px; height:680px; }
    </style></head><body>
      <div class="tabstrip">
        <div class="tab"><img src="${icon}" alt=""><span>${tabTitle}</span></div>
        <div class="newtab"></div>
        <div class="winctl"><span></span><span></span><span></span></div>
      </div>
      <div class="toolbar">
        <div class="navbtn"><span class="i">${svg('back', t.icon)}</span></div>
        <div class="navbtn dim"><span class="i">${svg('fwd', t.icon)}</span></div>
        <div class="navbtn"><span class="i">${svg('reload', t.icon)}</span></div>
        <div class="omnibox"><span class="i">${svg('lock', t.subtext)}</span><span>${url}</span></div>
        <div class="navbtn"><span class="i">${svg('puzzle', t.icon)}</span></div>
        <div class="navbtn"><span class="i">${svg('panel', t.icon)}</span></div>
        <div class="navbtn"><span class="i">${svg('kebab', t.icon)}</span></div>
      </div>
      <div class="content">
        <div class="page"><img src="${b64(path.join(rawDir, pageImg))}" alt=""></div>
        ${panel}
      </div>
    </body></html>`;
}

/**
 * Compose the final framed screenshots for one language.
 * @param {'ja'|'en'} lang - Target language
 * @param {Object} opts
 * @param {string} opts.rawDir - Directory containing the raw captures
 * @param {string} opts.outDir - Directory for the final images
 */
async function compose(lang, { rawDir, outDir }) {
    const shots = SHOTS[lang];
    if (!shots) throw new Error(`Unknown language: ${lang}`);
    const { chromium } = loadPlaywright();

    fs.mkdirSync(outDir, { recursive: true });
    const browser = await chromium.launch({ headless: true, channel: 'chromium' });
    try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
        for (const shot of shots) {
            await page.setContent(pageHtml(shot, rawDir), { waitUntil: 'load' });
            await page.waitForTimeout(300);
            await page.screenshot({ path: path.join(outDir, shot.out) });
            console.log(`  composed ${shot.out}`);
        }
    } finally {
        await browser.close();
    }
}

module.exports = { compose };
