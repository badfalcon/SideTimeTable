/**
 * Tests for PKCE utility functions
 */
import { generateCodeVerifier, generateCodeChallenge } from '../../src/lib/pkce.js';

describe('PKCE Utility', () => {
    describe('generateCodeVerifier', () => {
        test('generates a string of expected length (base64url encoded)', () => {
            const verifier = generateCodeVerifier(64);
            // base64url output is roughly 4/3 of input length (without padding)
            expect(typeof verifier).toBe('string');
            expect(verifier.length).toBeGreaterThanOrEqual(43);
            expect(verifier.length).toBeLessThanOrEqual(128);
        });

        test('generates different values each time', () => {
            const v1 = generateCodeVerifier();
            const v2 = generateCodeVerifier();
            expect(v1).not.toBe(v2);
        });

        test('only contains base64url-safe characters', () => {
            const verifier = generateCodeVerifier();
            // base64url: A-Z, a-z, 0-9, -, _
            expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
        });

        test('does not contain padding characters', () => {
            const verifier = generateCodeVerifier();
            expect(verifier).not.toContain('=');
        });

        test('respects custom length parameter', () => {
            const short = generateCodeVerifier(32);
            const long = generateCodeVerifier(96);
            // Shorter input should produce shorter output
            expect(short.length).toBeLessThan(long.length);
        });
    });

    describe('generateCodeChallenge', () => {
        test('generates a base64url-encoded string', async () => {
            const verifier = generateCodeVerifier();
            const challenge = await generateCodeChallenge(verifier);
            expect(typeof challenge).toBe('string');
            expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
        });

        test('does not contain padding characters', async () => {
            const verifier = generateCodeVerifier();
            const challenge = await generateCodeChallenge(verifier);
            expect(challenge).not.toContain('=');
        });

        test('produces consistent output for same input', async () => {
            const verifier = 'test-verifier-string-for-consistency';
            const challenge1 = await generateCodeChallenge(verifier);
            const challenge2 = await generateCodeChallenge(verifier);
            expect(challenge1).toBe(challenge2);
        });

        test('produces different output for different input', async () => {
            const challenge1 = await generateCodeChallenge('verifier-a');
            const challenge2 = await generateCodeChallenge('verifier-b');
            expect(challenge1).not.toBe(challenge2);
        });

        test('SHA-256 hash produces 43-character base64url output', async () => {
            const verifier = generateCodeVerifier();
            const challenge = await generateCodeChallenge(verifier);
            // SHA-256 = 32 bytes → base64url = ceil(32*4/3) = 43 chars (no padding)
            expect(challenge.length).toBe(43);
        });
    });
});
