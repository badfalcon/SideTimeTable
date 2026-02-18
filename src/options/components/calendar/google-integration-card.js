/**
 * GoogleIntegrationCard - The Google integration settings card component
 */
import { CardComponent } from '../base/card-component.js';
import { createGoogleSignInButton } from '../../../lib/google-button-helper.js';

export class GoogleIntegrationCard extends CardComponent {
    constructor(onIntegrationChange) {
        super({
            title: 'Google Calendar Integration',
            titleLocalize: '__MSG_integration__',
            subtitle: 'Integrate with Google Calendar to display events.',
            subtitleLocalize: '__MSG_googleIntegration__',
            icon: 'fab fa-google',
            iconColor: 'text-primary'
        });

        this.onIntegrationChange = onIntegrationChange;
        this.isIntegrated = false;
        this.integrationButton = null;
        this.statusElement = null;
    }

    createElement() {
        const card = super.createElement();

        // Create the Google integration button and status
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'd-flex align-items-center';

        // The Google integration button
        this.integrationButton = this._createGoogleButton();
        controlsDiv.appendChild(this.integrationButton);

        // The status display
        this.statusElement = document.createElement('span');
        this.statusElement.id = 'google-integration-status';
        this.statusElement.className = 'ms-2';
        this.statusElement.setAttribute('data-localize', '__MSG_notIntegrated__');
        this.statusElement.textContent = 'Not integrated';
        controlsDiv.appendChild(this.statusElement);

        this.addContent(controlsDiv);
        this._setupEventListeners();

        return card;
    }

    /**
     * Create the Google integration button
     * @private
     * @returns {HTMLElement} The Google button element
     */
    _createGoogleButton() {
        return createGoogleSignInButton({ id: 'google-integration-button' });
    }

    /**
     * Set up the event listeners
     * @private
     */
    _setupEventListeners() {
        if (this.integrationButton && this.onIntegrationChange) {
            this.integrationButton.addEventListener('click', () => {
                this.onIntegrationChange(!this.isIntegrated);
            });
        }
    }

    /**
     * Update the integration status
     * @param {boolean} integrated The integration status
     * @param {string} statusText The status text (optional)
     */
    updateIntegrationStatus(integrated, statusText = null) {
        this.isIntegrated = integrated;

        if (this.statusElement) {
            if (statusText) {
                this.statusElement.textContent = statusText;
                this.statusElement.removeAttribute('data-localize');
            } else if (integrated) {
                this.statusElement.setAttribute('data-localize', '__MSG_integrated__');
                this.statusElement.textContent = chrome.i18n.getMessage('integrated');
            } else {
                this.statusElement.setAttribute('data-localize', '__MSG_notIntegrated__');
                this.statusElement.textContent = chrome.i18n.getMessage('notIntegrated');
            }
        }

        // Update the button text
        if (this.integrationButton) {
            const textSpan = this.integrationButton.querySelector('.gsi-material-button-contents');
            if (textSpan) {
                textSpan.setAttribute('data-localize', integrated ? '__MSG_disconnectGoogle__' : '__MSG_signInWithGoogle__');
                textSpan.textContent = integrated
                    ? chrome.i18n.getMessage('disconnectGoogle')
                    : chrome.i18n.getMessage('signInWithGoogle');
            }
        }
    }

    /**
     * Toggle the button enable/disable
     * @param {boolean} enabled Whether to enable the button
     */
    setButtonEnabled(enabled) {
        if (this.integrationButton) {
            this.integrationButton.disabled = !enabled;
            this.integrationButton.style.opacity = enabled ? '1' : '0.6';
        }
    }

    /**
     * Get the integration status
     * @returns {boolean} The current integration status
     */
    getIntegrationStatus() {
        return this.isIntegrated;
    }
}