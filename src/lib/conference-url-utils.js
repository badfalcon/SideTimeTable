/**
 * Conference URL extraction utilities shared between the side panel
 * (Google event modal) and the service worker (reminder notifications).
 *
 * MV3 service workers do not have DOMParser, so HTML entity decoding is
 * implemented with a small regex-based decoder rather than the side panel's
 * DOMParser-based stripHtml.
 */

const NAMED_ENTITY_REPLACEMENTS = [
    [/&amp;/g, '&'],
    [/&lt;/g, '<'],
    [/&gt;/g, '>'],
    [/&quot;/g, '"'],
    [/&#39;/g, "'"],
    [/&nbsp;/g, ' '],
];

function decodeHtmlEntities(s) {
    let out = s;
    for (const [pattern, replacement] of NAMED_ENTITY_REPLACEMENTS) {
        out = out.replace(pattern, replacement);
    }
    out = out.replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
    out = out.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
    return out;
}

// Trailing punctuation that's almost always a sentence terminator, not part of the URL.
function trimTrailingPunctuation(url) {
    return url.replace(/[.,;:!?。、)\]]+$/, '');
}

// ASCII URL-safe characters (RFC 3986 unreserved + sub-delims + path chars), minus
// quote/bracket/paren that act as URL boundaries in HTML and prose. Restricting to ASCII
// prevents the URL match from absorbing trailing Japanese text when there is no space
// between the URL and the next sentence.
const URL_TAIL = `[A-Za-z0-9\\-._~:/?#@!$&'*+,;=%\\[\\]]+`;

const VIDEO_PATTERNS = [
    new RegExp(`https:\\/\\/[^\\s/]*zoom\\.us\\/${URL_TAIL}`, 'i'),
    new RegExp(`https:\\/\\/[^\\s/]*teams\\.microsoft\\.com\\/${URL_TAIL}`, 'i'),
    new RegExp(`https:\\/\\/[^\\s/]*webex\\.com\\/${URL_TAIL}`, 'i'),
];

const MEET_PATTERN = /https:\/\/meet\.google\.com\/[a-z-]+/i;

export function extractMeetUrl(event) {
    const sources = [
        event.hangoutLink,
        event.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri,
        event.description,
        event.location,
    ].filter(Boolean).map(decodeHtmlEntities);

    for (const source of sources) {
        const match = source.match(MEET_PATTERN);
        if (match) return match[0];
    }
    return null;
}

export function extractVideoUrl(event) {
    const sources = [event.description, event.location]
        .filter(Boolean)
        .map(decodeHtmlEntities);

    for (const source of sources) {
        for (const pattern of VIDEO_PATTERNS) {
            const match = source.match(pattern);
            if (match) return trimTrailingPunctuation(match[0]);
        }
    }
    return null;
}

export function selectNotificationUrl(eventData) {
    return (
        eventData?.conferenceUrl ||
        eventData?.hangoutLink ||
        eventData?.htmlLink ||
        null
    );
}
