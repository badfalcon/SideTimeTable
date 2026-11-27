/**
 * GoogleIntegrationCard - The Google integration settings card component
 *
 * One row: the connection status (with what it allows) and the action. Not
 * connected, the action is Google's own "Sign in with Google" button, as
 * Google's branding rules ask; connected, a plain "Disconnect" button.
 *
 * A second row resets the sign-in Chrome keeps for the extension, for when
 * connecting keeps failing (Google answering "invalid_request" and the like).
 * It is shown connected or not: it is most needed when connecting fails.
 */
import { CardComponent } from '../base/card-component.js';
import { createGoogleSignInButton } from '../../../lib/ui/google-button-helper.js';
import { createButton, createSettingRow, msg } from '../base/settings-dom.js';

export class GoogleIntegrationCard extends CardComponent {
    /**
     * @param {function(boolean)} onIntegrationChange - Connect (true) or disconnect (false)
     * @param {function()} [onResetAuth] - Reset the Google sign-in
     */
    constructor(onIntegrationChange, onResetAuth = null) {
        super({
            title: 'Google Calendar',
            titleLocalize: '__MSG_googleCalendarCardTitle__',
            subtitle: 'Show your Google Calendar events in the side panel.',
            subtitleLocalize: '__MSG_googleIntegration__',
            icon: 'fab fa-google'
        });

        this.onIntegrationChange = onIntegrationChange;
        this.onResetAuth = onResetAuth;
        this.isIntegrated = false;
        this.integrationButton = null;
        this.disconnectButton = null;
        this.resetButton = null;
        this.statusElement = null;
        this.statusHint = null;
    }

    createElement() {
        const card = super.createElement();

        // Not connected: Google's sign-in button
        this.integrationButton = this._createGoogleButton();
        // Connected: a plain button
        this.disconnectButton = createButton({
            id: 'google-disconnect-button',
            labelKey: 'googleDisconnect',
            labelFallback: 'Disconnect'
        });
        this.disconnectButton.hidden = true;

        const { row, label, hint } = createSettingRow({
            labelKey: 'notIntegrated',
            labelFallback: 'Not connected',
            hintKey: 'googleNotConnectedHint',
            hintFallback: 'Connect to show, create and edit your Google Calendar events.',
            control: [this.integrationButton, this.disconnectButton]
        });
        label.classList.add('google-status');
        label.id = 'google-integration-status';
        this.statusElement = label;
        this.statusHint = hint;
        this.addContent(row);

        // Reset the sign-in when connecting keeps failing
        this.resetButton = createButton({
            id: 'google-reset-auth-button',
            icon: 'fas fa-rotate-left',
            labelKey: 'googleResetAuth',
            labelFallback: 'Reset'
        });
        const { row: resetRow } = createSettingRow({
            labelKey: 'googleResetAuthLabel',
            labelFallback: 'Reset Google connection',
            labelFor: 'google-reset-auth-button',
            hintKey: 'googleResetAuthHint',
            hintFallback: 'If connecting fails with an error from Google, clear the sign-in Chrome keeps for this extension and sign in again.',
            control: this.resetButton
        });
        this.addContent(resetRow);

        this._setupEventListeners();

        return card;
    }

    /**
     * Create the Google integration button
     * @private
     * @returns {HTMLElement} The Google button element
     */
    _createGoogleButton() {
        const button = createGoogleSignInButton({ id: 'google-integration-button' });
        const textSpan = button.querySelector('.gsi-material-button-contents');
        if (textSpan) {
            textSpan.setAttribute('data-localize', '__MSG_signInWithGoogle__');
            textSpan.textContent = msg('signInWithGoogle', 'Sign in with Google');
        }
        return button;
    }

    /**
     * Set up the event listeners
     * @private
     */
    _setupEventListeners() {
        if (this.onIntegrationChange) {
            [this.integrationButton, this.disconnectButton].forEach(button => {
                button?.addEventListener('click', () => {
                    this.onIntegrationChange(!this.isIntegrated);
                });
            });
        }
        if (this.onResetAuth) {
            this.resetButton?.addEventListener('click', () => this.onResetAuth());
        }
    }

    /**
     * Show a notice in the card, under the rows, replacing an earlier one
     * from this card.
     * @param {HTMLElement} notice - From createNotice()
     */
    showNotice(notice) {
        this.bodyElement?.querySelectorAll('.google-card-notice').forEach(el => el.remove());
        notice.classList.add('google-card-notice');
        this.bodyElement?.appendChild(notice);
    }

    /**
     * Update the integration status
     * @param {boolean} integrated The integration status
     * @param {string} statusText The status text (optional)
     */
    updateIntegrationStatus(integrated, statusText = null) {
        this.isIntegrated = integrated;

        if (this.statusElement) {
            this.statusElement.classList.toggle('is-connected', integrated && !statusText);
            if (statusText) {
                this.statusElement.textContent = statusText;
                this.statusElement.removeAttribute('data-localize');
            } else {
                const key = integrated ? 'integrated' : 'notIntegrated';
                this.statusElement.setAttribute('data-localize', `__MSG_${key}__`);
                this.statusElement.textContent = msg(key, integrated ? 'Connected' : 'Not connected');
            }
        }
        if (this.statusHint) {
            const key = integrated ? 'googleConnectedHint' : 'googleNotConnectedHint';
            this.statusHint.setAttribute('data-localize', `__MSG_${key}__`);
            this.statusHint.textContent = integrated
                ? msg(key, 'View, create and edit events, and reply to invitations.')
                : msg(key, 'Connect to show, create and edit your Google Calendar events.');
        }

        // Signed in: a plain button to disconnect; signed out: Google's button.
        // A passing status ("Connecting…", an error) keeps the button that
        // was pressed in place.
        if (!statusText) {
            if (this.integrationButton) this.integrationButton.hidden = integrated;
            if (this.disconnectButton) this.disconnectButton.hidden = !integrated;
        }
    }

    /**
     * Toggle the button enable/disable
     * @param {boolean} enabled Whether to enable the button
     */
    setButtonEnabled(enabled) {
        [this.integrationButton, this.disconnectButton, this.resetButton].forEach(button => {
            if (button) button.disabled = !enabled;
        });
    }

    /**
     * Get the integration status
     * @returns {boolean} The current integration status
     */
    getIntegrationStatus() {
        return this.isIntegrated;
    }
}
