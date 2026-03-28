import { RELEASE_NOTES, getUnseenReleaseNotes, compareVersions } from '../../src/lib/release-notes.js';

describe('release-notes', () => {
    describe('RELEASE_NOTES', () => {
        test('is a non-empty array', () => {
            expect(Array.isArray(RELEASE_NOTES)).toBe(true);
            expect(RELEASE_NOTES.length).toBeGreaterThan(0);
        });

        test('every entry has version, date, and highlights', () => {
            for (const entry of RELEASE_NOTES) {
                expect(typeof entry.version).toBe('string');
                expect(entry.version).toMatch(/^\d+\.\d+\.\d+$/);
                expect(typeof entry.date).toBe('string');
                expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
                expect(entry.highlights).toBeDefined();
                expect(Array.isArray(entry.highlights.en)).toBe(true);
                expect(Array.isArray(entry.highlights.ja)).toBe(true);
                expect(entry.highlights.en.length).toBeGreaterThan(0);
                expect(entry.highlights.ja.length).toBeGreaterThan(0);
            }
        });

        test('entries are ordered from newest to oldest', () => {
            for (let i = 0; i < RELEASE_NOTES.length - 1; i++) {
                const current = RELEASE_NOTES[i].version;
                const next = RELEASE_NOTES[i + 1].version;
                expect(compareVersions(current, next)).toBeGreaterThan(0);
            }
        });
    });

    describe('compareVersions', () => {
        test('returns 0 for equal versions', () => {
            expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
            expect(compareVersions('2.3.4', '2.3.4')).toBe(0);
        });

        test('returns positive when a > b', () => {
            expect(compareVersions('2.0.0', '1.0.0')).toBeGreaterThan(0);
            expect(compareVersions('1.1.0', '1.0.0')).toBeGreaterThan(0);
            expect(compareVersions('1.0.1', '1.0.0')).toBeGreaterThan(0);
        });

        test('returns negative when a < b', () => {
            expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
            expect(compareVersions('1.0.0', '1.1.0')).toBeLessThan(0);
            expect(compareVersions('1.0.0', '1.0.1')).toBeLessThan(0);
        });

        test('handles different length versions', () => {
            expect(compareVersions('1.0', '1.0.0')).toBe(0);
            expect(compareVersions('1.0.1', '1.0')).toBeGreaterThan(0);
        });

        test('compares multi-digit numbers correctly', () => {
            expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
            expect(compareVersions('2.0.0', '1.99.99')).toBeGreaterThan(0);
        });
    });

    describe('getUnseenReleaseNotes', () => {
        test('returns empty array when lastSeenVersion is null (first install)', () => {
            expect(getUnseenReleaseNotes(null, '1.9.0')).toEqual([]);
        });

        test('returns empty array when lastSeenVersion equals currentVersion', () => {
            expect(getUnseenReleaseNotes('1.9.0', '1.9.0')).toEqual([]);
        });

        test('returns entries between lastSeen and current (exclusive/inclusive)', () => {
            const result = getUnseenReleaseNotes('1.7.0', '1.8.0');
            const versions = result.map(e => e.version);
            expect(versions).toContain('1.7.1');
            expect(versions).toContain('1.7.2');
            expect(versions).toContain('1.7.3');
            expect(versions).toContain('1.8.0');
            expect(versions).not.toContain('1.7.0');
            expect(versions).not.toContain('1.8.1');
        });

        test('returns single entry for consecutive versions', () => {
            const result = getUnseenReleaseNotes('1.8.0', '1.8.1');
            expect(result.length).toBe(1);
            expect(result[0].version).toBe('1.8.1');
        });

        test('returns empty array when already on latest', () => {
            const latest = RELEASE_NOTES[0].version;
            expect(getUnseenReleaseNotes(latest, latest)).toEqual([]);
        });

        test('returns all entries for very old version', () => {
            const latest = RELEASE_NOTES[0].version;
            const result = getUnseenReleaseNotes('0.0.1', latest);
            expect(result.length).toBe(RELEASE_NOTES.length);
        });
    });
});
