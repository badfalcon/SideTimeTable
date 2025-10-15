/**
 * GoogleIntegrationCard - The Google integration settings card component
 */
import { CardComponent } from '../base/card-component.js';

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
        const button = document.createElement('button');
        button.className = 'gsi-material-button';
        button.id = 'google-integration-button';

        const state = document.createElement('div');
        state.className = 'gsi-material-button-state';

        const wrapper = document.createElement('div');
        wrapper.className = 'gsi-material-button-content-wrapper';

        // The Google icon
        const iconDiv = document.createElement('div');
        iconDiv.className = 'gsi-material-button-icon';
        iconDiv.innerHTML = `
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"
                 xmlns:xlink="http://www.w3.org/1999/xlink" style="display: block;">
                <path fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
        `;

        // The button text
        const textSpan = document.createElement('span');
        textSpan.className = 'gsi-material-button-contents';
        textSpan.textContent = 'Sign in with Google';

        // The hidden text
        const hiddenSpan = document.createElement('span');
        hiddenSpan.style.display = 'none';
        hiddenSpan.textContent = 'Sign in with Google';

        wrapper.appendChild(iconDiv);
        wrapper.appendChild(textSpan);
        wrapper.appendChild(hiddenSpan);

        button.appendChild(state);
        button.appendChild(wrapper);

        return button;
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