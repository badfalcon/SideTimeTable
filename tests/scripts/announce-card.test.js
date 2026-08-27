/**
 * Unit tests for the release announcement card template
 * (scripts/announce-card/card-template.js).
 *
 * The card source is written by an LLM step in the release announcement
 * workflow, so the parsing and escaping here are what keep a sloppy or hostile
 * draft from producing a broken image.
 */

const {
    WIDTH,
    HEIGHT,
    MAX_HIGHLIGHTS,
    DEFAULT_SCREENSHOT,
    TEXT_HEIGHT,
    HEADLINE_SIZES,
    HIGHLIGHT_SIZES,
    LIMITS,
    parseCard,
    extractVersion,
    resolveScreenshot,
    estimateContentHeight,
    fitTypography,
    buildCardHtml,
} = require('../../scripts/announce-card/card-template');

describe('parseCard', () => {
    test('takes the first line as the headline and the rest as highlights', () => {
        expect(parseCard('終日予定がもっと見やすく\n終日エリアを追加\nメモの高さを保存')).toEqual({
            headline: '終日予定がもっと見やすく',
            highlights: ['終日エリアを追加', 'メモの高さを保存'],
        });
    });

    test('strips bullet markers and blank lines', () => {
        const { headline, highlights } = parseCard('\n  Cleaner timeline  \n\n- Faster load\n• Dark mode polish\n2) Bug fixes\n');
        expect(headline).toBe('Cleaner timeline');
        expect(highlights).toEqual(['Faster load', 'Dark mode polish', 'Bug fixes']);
    });

    test(`keeps at most ${MAX_HIGHLIGHTS} highlights`, () => {
        const { highlights } = parseCard(['head', 'a', 'b', 'c', 'd', 'e'].join('\n'));
        expect(highlights).toHaveLength(MAX_HIGHLIGHTS);
        expect(highlights).toEqual(['a', 'b', 'c']);
    });

    test('handles empty and missing input', () => {
        expect(parseCard('')).toEqual({ headline: '', highlights: [] });
        expect(parseCard(undefined)).toEqual({ headline: '', highlights: [] });
    });
});

describe('extractVersion', () => {
    test.each([
        ['SideTimeTable 1.11.0', 'v1.11.0'],
        ['v1.11.0', 'v1.11.0'],
        ['Release 2.0 - big update', 'v2.0'],
    ])('%s -> %s', (input, expected) => {
        expect(extractVersion(input)).toBe(expected);
    });

    test('returns an empty string when there is no version', () => {
        expect(extractVersion('Latest release')).toBe('');
        expect(extractVersion(undefined)).toBe('');
    });
});

describe('resolveScreenshot', () => {
    test('accepts the known screenshot bases', () => {
        expect(resolveScreenshot('image_2')).toBe('image_2');
        expect(resolveScreenshot(' image_3 ')).toBe('image_3');
    });

    test('falls back to the default for anything else', () => {
        expect(resolveScreenshot('../../etc/passwd')).toBe(DEFAULT_SCREENSHOT);
        expect(resolveScreenshot('')).toBe(DEFAULT_SCREENSHOT);
        expect(resolveScreenshot(undefined)).toBe(DEFAULT_SCREENSHOT);
    });
});

describe('fitTypography', () => {
    const size = (headline, highlights, lang) => fitTypography(headline, highlights, lang).headlineSize;

    test('shrinks the headline as the text grows', () => {
        expect(size('短い見出し', [], 'ja')).toBeGreaterThan(size('あ'.repeat(40), [], 'ja'));
        expect(size('Short headline', [], 'en')).toBeGreaterThan(size('word '.repeat(20), [], 'en'));
    });

    test('shrinks the headline when the highlights take the space', () => {
        const headline = '終日予定とメモがもっと使いやすく';
        const long = ['長めのハイライトを three 行ぶん'.repeat(2), '二つ目のハイライト', '三つ目のハイライト'];
        expect(size(headline, long, 'ja')).toBeLessThanOrEqual(size(headline, [], 'ja'));
    });

    test.each([
        ['ja', '終日予定とメモがもっと使いやすく', ['終日イベント専用エリアを追加', 'メモの高さを保存できるように', 'ダークテーマの配色を調整']],
        ['en', 'All-day events and memos, refined', ['Dedicated all-day event area', 'Memo panel height is remembered', 'Polished dark theme colors']],
        // At the documented limits - the worst draft the workflow lets through.
        ['ja', 'あ'.repeat(LIMITS.ja.headline), Array(MAX_HIGHLIGHTS).fill('い'.repeat(LIMITS.ja.highlight))],
        ['en', 'x'.repeat(LIMITS.en.headline), Array(MAX_HIGHLIGHTS).fill('y'.repeat(LIMITS.en.highlight))],
    ])('%s: the chosen sizes fit the text column', (lang, headline, highlights) => {
        const { headlineSize, highlightSize } = fitTypography(headline, highlights, lang);
        expect(estimateContentHeight(headline, highlights, headlineSize, highlightSize, lang))
            .toBeLessThanOrEqual(TEXT_HEIGHT);
    });

    // Drafts this long are rejected by the workflow's length check; the card
    // still has to degrade predictably instead of overlapping its own footer.
    test('falls back to the smallest sizes when nothing fits', () => {
        const smallest = {
            headlineSize: HEADLINE_SIZES[HEADLINE_SIZES.length - 1],
            highlightSize: HIGHLIGHT_SIZES.ja[HIGHLIGHT_SIZES.ja.length - 1],
        };
        expect(fitTypography('あ'.repeat(60), ['い'.repeat(40), 'う'.repeat(40), 'え'.repeat(40)], 'ja')).toEqual(smallest);
    });
});

describe('buildCardHtml', () => {
    const base = {
        lang: 'ja',
        version: 'v1.11.0',
        headline: '終日予定がもっと見やすく',
        highlights: ['終日エリアを追加', 'メモの高さを保存'],
        iconSrc: 'data:image/png;base64,AAAA',
        shotSrc: 'data:image/png;base64,BBBB',
    };

    test('renders the headline, version and highlights at the card size', () => {
        const html = buildCardHtml(base);
        expect(html).toContain('終日予定がもっと見やすく');
        expect(html).toContain('v1.11.0');
        expect(html).toContain('終日エリアを追加');
        expect(html).toContain('メモの高さを保存');
        expect(html).toContain(`width: ${WIDTH}px`);
        expect(html).toContain(`height: ${HEIGHT}px`);
    });

    test('uses the language-specific store line', () => {
        expect(buildCardHtml(base)).toContain('Chrome ウェブストアで公開中');
        expect(buildCardHtml({ ...base, lang: 'en', headline: 'All-day events, clearer' }))
            .toContain('Now on the Chrome Web Store');
    });

    test('escapes text coming from the generated draft', () => {
        const html = buildCardHtml({
            ...base,
            headline: '<script>alert("x")</script>',
            highlights: ['a & b'],
        });
        expect(html).not.toContain('<script>alert');
        expect(html).toContain('&lt;script&gt;');
        expect(html).toContain('a &amp; b');
    });

    test(`renders at most ${MAX_HIGHLIGHTS} highlights`, () => {
        const html = buildCardHtml({ ...base, highlights: ['a', 'b', 'c', 'd'] });
        expect((html.match(/<li>/g) || [])).toHaveLength(MAX_HIGHLIGHTS);
        expect(html).not.toContain('>d<');
    });

    test('omits the optional pieces when they are missing', () => {
        const html = buildCardHtml({ lang: 'ja', headline: '見出しのみ' });
        expect(html).not.toContain('class="badge"');
        expect(html).not.toContain('class="shot"');
        expect(html).not.toContain('class="icon"');
        expect(html).not.toContain('<ul class="highlights">');
        expect(html).toContain('見出しのみ');
    });
});
