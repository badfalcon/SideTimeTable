/**
 * SideTimeTable - PKCE (Proof Key for Code Exchange) Utility
 *
 * Generates code_verifier and code_challenge for OAuth2 PKCE flow.
 * Used for Outlook/Microsoft authentication via chrome.identity.launchWebAuthFlow.
 */

/* global crypto, TextEncoder, btoa */

/**
 * Generate a random code verifier string (43-128 characters).
 * @param {number} [length=64] - Length of the verifier
 * @returns {string} The code verifier
 */
export function generateCodeVerifier(length = 64) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return base64UrlEncode(array);
}

/**
 * Generate a code challenge from a code verifier using SHA-256.
 * @param {string} verifier - The code verifier
 * @returns {Promise<string>} The code challenge (base64url-encoded SHA-256 hash)
 */
export async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Base64url encode a Uint8Array (RFC 7636 compliant).
 * @param {Uint8Array} buffer - The buffer to encode
 * @returns {string} Base64url-encoded string
 */
function base64UrlEncode(buffer) {
    let str = '';
    for (let i = 0; i < buffer.length; i++) {
        str += String.fromCharCode(buffer[i]);
    }
    return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
