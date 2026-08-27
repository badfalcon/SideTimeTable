/**
 * card-template.js - Build the HTML for a release announcement card.
 *
 * Pure functions only (no fs / no browser) so the layout can be unit tested.
 * render.js turns the HTML this produces into a PNG with Playwright.
 *
 * The card is 1200x630 - the size X and LinkedIn both render without cropping.
 */

'use strict';

const WIDTH = 1200;
const HEIGHT = 630;

/** Highlights beyond this are dropped: more than 3 lines stops being readable. */
const MAX_HIGHLIGHTS = 3;

/** Screenshots the card may inset, matched to docs/img/<base>.png (ja) / <base>_en.png (en). */
const SCREENSHOTS = ['image_1', 'image_2', 'image_3'];
const DEFAULT_SCREENSHOT = 'image_1';

const TEXT = {
    ja: {
        store: 'Chrome ウェブストアで公開中',
        lead: 'アップデート',
        font: "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', 'Noto Sans CJK JP', sans-serif",
    },
    en: {
        store: 'Now on the Chrome Web Store',
        lead: 'Update',
        font: "'Inter', 'Noto Sans', 'DejaVu Sans', -apple-system, sans-serif",
    },
};

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Parse the plain-text card source written by the announcement workflow:
 * first non-empty line = headline, the following lines = highlights.
 * Leading bullet markers (-, *, •, ・, "1.") are stripped so either style works.
 */
function parseCard(text) {
    const lines = String(text ?? '')
        .split(/\r?\n/)
        .map((line) => line.replace(/^\s*(?:[-*•・]|\d+[.)])\s*/, '').trim())
        .filter((line) => line.length > 0);

    return {
        headline: lines[0] || '',
        highlights: lines.slice(1, 1 + MAX_HIGHLIGHTS),
    };
}

/** Pull a version out of a release name ("SideTimeTable 1.11.0" -> "v1.11.0"). */
function extractVersion(releaseName) {
    const m = String(releaseName ?? '').match(/v?(\d+\.\d+(?:\.\d+)?)/);
    return m ? `v${m[1]}` : '';
}

/** Validate a screenshot choice from the workflow, falling back to the default. */
function resolveScreenshot(name) {
    const base = String(name ?? '').trim();
    return SCREENSHOTS.includes(base) ? base : DEFAULT_SCREENSHOT;
}

/* ---- Typography fitting ------------------------------------------------
 * The draft text is written by an LLM, so its length varies a lot. Rather than
 * measuring in the browser (the card must stay a pure function), the type is
 * sized by estimating how many lines each block takes and picking the largest
 * sizes that still fit the text column.
 */

/** Text column geometry, kept in sync with .content / .highlights in the CSS. */
const TEXT_WIDTH = 536;             // content width 620 - padding 60/24
const HIGHLIGHT_TEXT_WIDTH = 493;   // minus the check badge (30) and its gap (13)
const TEXT_HEIGHT = 520;            // card height 630 - padding 58/52

/** Advance width per font-size unit, and the slack greedy word wrapping wastes. */
const METRICS = {
    ja: { headlineChar: 1.0, highlightChar: 1.0, wrapSlack: 0.95 },
    en: { headlineChar: 0.53, highlightChar: 0.5, wrapSlack: 0.85 },
};

const HEADLINE_SIZES = [56, 50, 44, 40, 36, 32];
const HIGHLIGHT_SIZES = { ja: [26, 24, 22, 20], en: [25, 23, 21, 19] };

/**
 * Longest draft the card is designed to hold, in characters. The announcement
 * workflow asks for these limits in its prompt and check-card.js warns when a
 * draft exceeds them - past this point the type just keeps shrinking. Kept here
 * because they are a property of the layout, not of the workflow.
 */
const LIMITS = {
    ja: { headline: 22, highlight: 20 },
    en: { headline: 42, highlight: 38 },
};

function metrics(lang) {
    return METRICS[lang] || METRICS.ja;
}

/** Rough line count for `text` at `fontSize` inside `width` pixels. */
function estimateLines(text, fontSize, charWidth, width, wrapSlack) {
    const perLine = Math.max(1, Math.floor((width / (fontSize * charWidth)) * wrapSlack));
    return Math.max(1, Math.ceil(String(text ?? '').length / perLine));
}

/** Estimated height of the text column for a given pair of font sizes. */
function estimateContentHeight(headline, highlights, headlineSize, highlightSize, lang) {
    const m = metrics(lang);
    const brand = 52;
    const lead = 34 + 28;
    const headlineLines = estimateLines(headline, headlineSize, m.headlineChar, TEXT_WIDTH, m.wrapSlack);
    const headlineHeight = 12 + headlineLines * headlineSize * 1.3;
    const items = highlights.length
        ? 30
          + highlights.reduce((total, item) => total + Math.max(
              32,
              estimateLines(item, highlightSize, m.highlightChar, HIGHLIGHT_TEXT_WIDTH, m.wrapSlack) * highlightSize * 1.45,
          ), 0)
          + (highlights.length - 1) * 15
        : 0;
    const store = 26 + 32;
    return brand + lead + headlineHeight + items + store;
}

/**
 * Largest headline/highlight sizes whose estimated height fits the card.
 * Falls back to the smallest pair when even that overflows (the text column
 * clips rather than colliding with the store line - see `.content` overflow).
 */
function fitTypography(headline, highlights, lang) {
    const highlightSizes = HIGHLIGHT_SIZES[lang] || HIGHLIGHT_SIZES.ja;
    for (const headlineSize of HEADLINE_SIZES) {
        for (const highlightSize of highlightSizes) {
            if (estimateContentHeight(headline, highlights, headlineSize, highlightSize, lang) <= TEXT_HEIGHT) {
                return { headlineSize, highlightSize };
            }
        }
    }
    return {
        headlineSize: HEADLINE_SIZES[HEADLINE_SIZES.length - 1],
        highlightSize: highlightSizes[highlightSizes.length - 1],
    };
}

/**
 * Build the full card document.
 *
 * @param {object} options
 * @param {'ja'|'en'} options.lang      Card language (drives copy and font stack)
 * @param {string}    options.version   Version badge text, e.g. "v1.11.0" (optional)
 * @param {string}    options.headline  Main line
 * @param {string[]}  options.highlights Up to 3 supporting lines
 * @param {string}    options.iconSrc   Extension icon (data: URI or path)
 * @param {string}    options.shotSrc   Product screenshot inset (data: URI or path; optional)
 * @returns {string} A complete HTML document sized WIDTH x HEIGHT
 */
function buildCardHtml({ lang = 'ja', version = '', headline = '', highlights = [], iconSrc = '', shotSrc = '' } = {}) {
    const t = TEXT[lang] || TEXT.ja;
    const items = (highlights || []).slice(0, MAX_HIGHLIGHTS);
    const { headlineSize, highlightSize } = fitTypography(headline, items, lang);
    // Chromium breaks Japanese lines at phrase boundaries with auto-phrase;
    // other languages keep normal word wrapping.
    const wordBreak = lang === 'ja' ? 'auto-phrase' : 'normal';

    const badge = version
        ? `<span class="badge">${escapeHtml(version)}</span>`
        : '';

    const list = items.length
        ? `<ul class="highlights">${items
            .map((item) => `<li><span class="check">✓</span><span>${escapeHtml(item)}</span></li>`)
            .join('')}</ul>`
        : '';

    const shot = shotSrc
        ? `<div class="shot"><img src="${escapeHtml(shotSrc)}" alt=""></div>`
        : '';

    const icon = iconSrc
        ? `<img class="icon" src="${escapeHtml(iconSrc)}" alt="">`
        : '';

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    overflow: hidden;
    background: #0b0f1e;
  }
  body {
    font-family: ${t.font};
    color: #f0f4ff;
    -webkit-font-smoothing: antialiased;
  }
  .card {
    position: relative;
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    overflow: hidden;
    background:
      radial-gradient(900px 520px at 88% 12%, rgba(6, 182, 212, 0.20), transparent 60%),
      radial-gradient(760px 520px at 6% 96%, rgba(139, 92, 246, 0.22), transparent 62%),
      #0b0f1e;
  }
  /* Faint timetable ruling - a nod to what the product actually is. */
  .grid {
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.045) 0 1px,
      transparent 1px 56px
    );
    mask-image: linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 78%);
    -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 78%);
  }
  .accent {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 7px;
    background: linear-gradient(90deg, #6366f1, #06b6d4);
  }
  .content {
    position: relative;
    width: 620px;
    height: 100%;
    padding: 58px 24px 52px 60px;
    display: flex;
    flex-direction: column;
    overflow: hidden; /* a draft longer than the fit allows clips, never collides */
  }
  .brand { display: flex; align-items: center; gap: 16px; }
  .icon { width: 52px; height: 52px; border-radius: 12px; }
  .name { font-size: 30px; font-weight: 700; letter-spacing: 0.2px; }
  .badge {
    padding: 6px 16px;
    border-radius: 999px;
    background: rgba(99, 102, 241, 0.22);
    border: 1px solid rgba(165, 180, 252, 0.45);
    color: #c7d2fe;
    font-size: 22px;
    font-weight: 700;
  }
  .lead {
    margin-top: 34px;
    font-size: 21px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #8b9ab5;
  }
  .headline {
    margin-top: 12px;
    font-size: ${headlineSize}px;
    font-weight: 800;
    line-height: 1.3;
    letter-spacing: -0.4px;
    word-break: ${wordBreak};
    background: linear-gradient(100deg, #ffffff 30%, #a5b4fc);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .highlights { margin-top: 30px; list-style: none; display: flex; flex-direction: column; gap: 15px; min-height: 0; }
  .highlights li {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    font-size: ${highlightSize}px;
    line-height: 1.45;
    color: #dbe4ff;
    word-break: ${wordBreak};
  }
  .check {
    flex: none;
    width: 30px; height: 30px;
    margin-top: 2px;
    border-radius: 9px;
    background: rgba(16, 185, 129, 0.18);
    border: 1px solid rgba(16, 185, 129, 0.5);
    color: #6ee7b7;
    font-size: 19px;
    font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .store { margin-top: auto; padding-top: 26px; font-size: 22px; font-weight: 600; color: #8b9ab5; }
  .store b { color: #a5b4fc; font-weight: 700; }
  /* The whole screenshot stays inside the card: which one is inset varies per
     release, so nothing may be cropped away at the edges. The 8:5 box matches
     the 1280x800 source, so object-fit: cover scales without cutting. */
  .shot {
    position: absolute;
    top: 146px;
    left: 620px;
    width: 540px;
    height: 338px;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.14);
    box-shadow: 0 36px 80px rgba(0, 0, 0, 0.55);
    transform: rotate(-2deg);
  }
  .shot img { width: 100%; height: 100%; object-fit: cover; object-position: center top; display: block; }
</style>
</head>
<body>
  <div class="card">
    <div class="grid"></div>
    <div class="accent"></div>
    ${shot}
    <div class="content">
      <div class="brand">${icon}<span class="name">SideTimeTable</span>${badge}</div>
      <div class="lead">${escapeHtml(t.lead)}</div>
      <div class="headline">${escapeHtml(headline)}</div>
      ${list}
      <div class="store"><b>${escapeHtml(t.store)}</b></div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = {
    WIDTH,
    HEIGHT,
    MAX_HIGHLIGHTS,
    SCREENSHOTS,
    DEFAULT_SCREENSHOT,
    TEXT_HEIGHT,
    HEADLINE_SIZES,
    HIGHLIGHT_SIZES,
    LIMITS,
    escapeHtml,
    parseCard,
    extractVersion,
    resolveScreenshot,
    estimateContentHeight,
    fitTypography,
    buildCardHtml,
};
