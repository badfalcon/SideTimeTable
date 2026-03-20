/**
 * SideTimeTable - Chrome Messaging Helper
 *
 * Wraps chrome.runtime.sendMessage in a Promise with proper error handling.
 */

/**
 * Send a message to the background script and return the response as a Promise.
 * @param {Object} message - The message to send
 * @returns {Promise<*>} The response from the background script
 */
export function sendMessage(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(response);
            }
        });
    });
}
