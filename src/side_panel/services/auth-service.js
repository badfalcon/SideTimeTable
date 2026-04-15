/**
 * AuthService - Authentication UI handling for the side panel.
 *
 * Manages the auth-expired banner and reconnect flow.
 */

import { sendMessage } from '../../lib/chrome-messaging.js';

export class AuthService {

    /**
     * Show the auth-expired banner at the top of the timeline.
     * @param {HTMLElement} container - The parent container element
     * @param {HTMLElement|null} insertBeforeEl - Element to insert banner before
     * @param {Function} onReconnectSuccess - Called after successful reconnect
     */
    showAuthExpiredBanner(container, insertBeforeEl, onReconnectSuccess) {
        // Prevent duplicate banners
        if (document.getElementById('authExpiredBanner')) return;

        const banner = document.createElement('div');
        banner.id = 'authExpiredBanner';
        banner.className = 'auth-expired-banner';

        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-triangle-exclamation';
        icon.setAttribute('aria-hidden', 'true');
        banner.appendChild(icon);

        const message = document.createElement('span');
        message.textContent = window.getLocalizedMessage?.('authExpiredMessage') || 'Google Calendar authorization has expired. Please reconnect.';
        banner.appendChild(message);

        const reconnectBtn = document.createElement('button');
        reconnectBtn.className = 'auth-expired-reconnect-btn';
        reconnectBtn.textContent = window.getLocalizedMessage?.('authExpiredReconnect') || 'Reconnect';
        reconnectBtn.addEventListener('click', () => this._handleReconnect(reconnectBtn, onReconnectSuccess));
        banner.appendChild(reconnectBtn);

        const dismissBtn = document.createElement('button');
        dismissBtn.className = 'auth-expired-dismiss-btn';
        dismissBtn.setAttribute('aria-label', window.getLocalizedMessage?.('dismissNotification') || 'Dismiss');
        dismissBtn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
        dismissBtn.addEventListener('click', () => banner.remove());
        banner.appendChild(dismissBtn);

        if (insertBeforeEl) {
            container.insertBefore(banner, insertBeforeEl);
        } else {
            container.appendChild(banner);
        }
    }

    /**
     * Handle reconnect button click - trigger Google auth directly.
     * @param {HTMLElement} btn - The reconnect button
     * @param {Function} onSuccess - Called after successful reconnect
     * @private
     */
    async _handleReconnect(btn, onSuccess) {
        if (btn) btn.disabled = true;
        try {
            const response = await sendMessage({ action: 'authenticateGoogle' });
            if (response && response.success) {
                const banner = document.getElementById('authExpiredBanner');
                if (banner) banner.remove();
                if (onSuccess) onSuccess();
            } else {
                if (btn) btn.disabled = false;
            }
        } catch (error) {
            console.warn('Reconnect failed:', error.message);
            if (btn) btn.disabled = false;
        }
    }
}
