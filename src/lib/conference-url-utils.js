/**
 * Conference URL extraction utilities shared between the side panel
 * (Google event modal) and the service worker (reminder notifications).
 *
 * MV3 service workers do not have DOMParser, so HTML entity decoding is
 * implemented with a small regex-based decoder rather than the side panel's
 * DOMParser-based stripHtml.
 */

const ENTITY_REPLACEMENTS = [
    [/&amp;/g, '&'],
    [/&lt;/g, '<'],
    [/&gt;/g, '>'],
    [/&quot;/g, '"'],
    [/&#39;/g, "'"],
    [/&nbsp;/g, ' '],
];

function decodeHtmlEntities(s) {
    let out = s;
    for (const [pattern, replacement] of ENTITY_REPLACEMENTS) {
        out = out.replace(pattern, replacement);
    }
    return out;
}

const URL_TAIL = `[^\\s<>"')]+`;

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
            if (match) return match[0];
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
