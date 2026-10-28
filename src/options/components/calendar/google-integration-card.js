/**
 * GoogleIntegrationCard - The Google integration settings card component
 *
 * One row: the connection status (with what it allows) and the action. Not
 * connected, the action is Google's own "Sign in with Google" button, as
 * Google's branding rules ask; connected, a plain "Disconnect" button.
 */
import { CardComponent } from '../base/card-component.js';
import { createGoogleSignInButton } from '../../../lib/google-button-helper.js';
import { createButton, createSettingRow, msg } from '../base/settings-dom.js';

export class GoogleIntegrationCard extends CardComponent {
    constructor(onIntegrationChange) {
        super({
            title: 'Google Calendar',
            titleLocalize: '__MSG_googleCalendarCardTitle__',
            subtitle: 'Show your Google Calendar events in the side panel.',
            subtitleLocalize: '__MSG_googleIntegration__',
            icon: 'fab fa-google'
        });

        this.onIntegrationChange = onIntegrationChange;
        this.isIntegrated = false;
        this.integrationButton = null;
        this.disconnectButton = null;
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
        if (!this.onIntegrationChange) return;
        [this.integrationButton, this.disconnectButton].forEach(button => {
            button?.addEventListener('click', () => {
                this.onIntegrationChange(!this.isIntegrated);
            });
        });
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
        [this.integrationButton, this.disconnectButton].forEach(button => {
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
