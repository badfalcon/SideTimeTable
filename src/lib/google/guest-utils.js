/**
 * Guest (attendee) helpers for creating Google events: splitting what the
 * user typed or pasted into addresses, checking them, and suggesting people
 * from the events the side panel has already loaded.
 *
 * No contacts API is involved: suggestions only come from attendee lists the
 * panel fetched anyway, and they live in memory for the session.
 */

// A pragmatic check, not RFC 5322: one "@", no spaces or list separators,
// and a dotted domain whose last label is at least two characters. It exists
// to catch typos such as "tanaka@examp" before Google rejects the request.
const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:".]{2,}$/;

/**
 * @param {string} value
 * @returns {boolean}
 */
export function isValidEmail(value) {
    return typeof value === 'string' && EMAIL_PATTERN.test(value.trim());
}

/**
 * Normalize an address for comparison (addresses are case-insensitive in
 * practice, and Google treats them that way).
 * @param {string} email
 * @returns {string}
 */
export function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

// How many avatar colours there are (`.guest-avatar.tone-1` … `tone-6`)
export const GUEST_TONE_COUNT = 6;

/**
 * The avatar colour for a person, from their address: the same person always
 * gets the same one, wherever they appear.
 * @param {string} email
 * @returns {number} 1 … GUEST_TONE_COUNT
 */
export function guestTone(email) {
    const key = normalizeEmail(email);
    let hash = 0;
    for (const char of key) {
        hash = (hash * 31 + char.codePointAt(0)) >>> 0;
    }
    return (hash % GUEST_TONE_COUNT) + 1;
}

/**
 * Split typed or pasted text into guests. Accepts addresses separated by
 * commas, semicolons, whitespace or new lines, and the "Name <address>" form
 * mail clients copy.
 *
 * @param {string} text
 * @returns {Array<{email: string, name: string}>} In input order; entries that
 *   are not valid addresses are kept (with `name` empty) so the caller can
 *   show them as errors instead of silently dropping them.
 */
export function parseGuestInput(text) {
    const source = String(text || '');
    const guests = [];

    // "Name <address>" first, so the name's spaces do not split it
    const named = /([^<>,;\n]*)<([^<>]+)>/g;
    const rest = source.replace(named, (_, name, email) => {
        guests.push({ email: email.trim(), name: name.trim().replace(/^"|"$/g, '').trim() });
        return ',';
    });

    rest.split(/[\s,;、]+/).forEach((token) => {
        const email = token.trim();
        if (email) {
            guests.push({ email, name: '' });
        }
    });

    return guests;
}

/**
 * The guests part of an events.insert body.
 * @param {Array<{email: string}>} guests
 * @returns {Array<{email: string}>} Valid, de-duplicated addresses only
 */
export function buildAttendees(guests) {
    const seen = new Set();
    const attendees = [];
    (guests || []).forEach(({ email }) => {
        const key = normalizeEmail(email);
        if (!isValidEmail(key) || seen.has(key)) return;
        seen.add(key);
        attendees.push({ email: String(email).trim() });
    });
    return attendees;
}

/**
 * People seen on loaded events, most recently seen first. Used to suggest
 * guests while typing.
 */
export class GuestDirectory {
    /**
     * @param {number} [limit=300] How many people to remember
     */
    constructor(limit = 300) {
        this.limit = limit;
        /** @type {Map<string, {email: string, name: string}>} */
        this.people = new Map();
    }

    /**
     * Remember the attendees of some events. The signed-in user and meeting
     * rooms are skipped: neither is someone you invite.
     * @param {Array<Object>} events Google Calendar event resources
     */
    addFromEvents(events) {
        (events || []).forEach((event) => {
            (event?.attendees || []).forEach((attendee) => {
                if (!attendee || attendee.self || attendee.resource) return;
                this.add(attendee.email, attendee.displayName);
            });
        });
    }

    /**
     * @param {string} email
     * @param {string} [name]
     */
    add(email, name = '') {
        const key = normalizeEmail(email);
        if (!isValidEmail(key)) return;
        const previous = this.people.get(key);
        // Re-insert so the Map's order tracks recency
        this.people.delete(key);
        this.people.set(key, {
            email: String(email).trim(),
            name: (name || '').trim() || previous?.name || ''
        });
        if (this.people.size > this.limit) {
            this.people.delete(this.people.keys().next().value);
        }
    }

    /**
     * People whose name or address matches what was typed. A match at the
     * start of the address, or of any word of the name, counts.
     * @param {string} query
     * @param {Object} [options]
     * @param {Iterable<string>} [options.exclude] Addresses already added
     * @param {number} [options.max=5]
     * @returns {Array<{email: string, name: string}>} Most recently seen first
     */
    search(query, { exclude = [], max = 5 } = {}) {
        const q = String(query || '').trim().toLowerCase();
        if (!q) return [];
        const excluded = new Set([...exclude].map(normalizeEmail));
        const matches = [];
        const recentFirst = [...this.people.values()].reverse();
        for (const person of recentFirst) {
            if (excluded.has(normalizeEmail(person.email))) continue;
            const email = person.email.toLowerCase();
            const name = person.name.toLowerCase();
            const hit = email.startsWith(q)
                || (name && (name.startsWith(q) || name.split(/\s+/).some(word => word.startsWith(q))));
            if (hit) {
                matches.push(person);
                if (matches.length >= max) break;
            }
        }
        return matches;
    }

    /**
     * Look up a remembered name for an address.
     * @param {string} email
     * @returns {string}
     */
    nameFor(email) {
        return this.people.get(normalizeEmail(email))?.name || '';
    }
}
