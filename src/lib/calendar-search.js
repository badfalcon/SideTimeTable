/**
 * Calendar search helpers.
 *
 * A Google calendar's ID is its address: for a personal or shared calendar
 * that is the owner's email address, so a search term should match either the
 * display name (summary) or the address.
 */

/**
 * Check whether a calendar matches a search term.
 *
 * The term is matched case-insensitively against the display name and the
 * calendar ID independently, so a term never matches across the boundary
 * between the two fields. An empty term matches everything.
 *
 * @param {{id?: string, summary?: string}} calendar - Calendar to test
 * @param {string} term - Raw search term (trimmed and lowercased here)
 * @returns {boolean} True when the calendar should be shown
 */
export function calendarMatchesSearch(calendar, term) {
    const normalizedTerm = (term || '').toLowerCase().trim();
    if (!normalizedTerm) return true;
    if (!calendar) return false;

    const summary = (calendar.summary || '').toLowerCase();
    if (summary.includes(normalizedTerm)) return true;

    const id = (calendar.id || '').toLowerCase();
    return id.includes(normalizedTerm);
}
