/**
 * OutlookIntegrationCard - The Outlook integration settings card component
 */
import { CardComponent } from '../base/card-component.js';
import { StorageHelper } from '../../../lib/storage-helper.js';

export class OutlookIntegrationCard extends CardComponent {
    constructor(onIntegrationChange) {
        super({
            title: 'Outlook Calendar Integration',
            titleLocalize: '__MSG_outlookIntegrationTitle__',
            subtitle: 'Integrate with Outlook Calendar to display events.',
            subtitleLocalize: '__MSG_outlookIntegration__',
            icon: 'fab fa-microsoft',
            iconColor: 'text-info'
        });

        this.onIntegrationChange = onIntegrationChange;
        this.isIntegrated = false;
        this.integrationButton = null;
        this.statusElement = null;
        this.clientIdInput = null;
        this.saveClientIdBtn = null;
    }

    createElement() {
        const card = super.createElement();

        // Client ID configuration section
        const clientIdSection = this._createClientIdSection();
        this.addContent(clientIdSection);

        // Integration button and status
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'd-flex align-items-center mt-3';

        this.integrationButton = this._createOutlookButton();
        controlsDiv.appendChild(this.integrationButton);

        this.statusElement = document.createElement('span');
        this.statusElement.id = 'outlook-integration-status';
        this.statusElement.className = 'ms-2';
        this.statusElement.setAttribute('data-localize', '__MSG_notIntegrated__');
        this.statusElement.textContent = window.getLocalizedMessage('notIntegrated') || 'Not integrated';
        controlsDiv.appendChild(this.statusElement);

        this.addContent(controlsDiv);
        this._setupEventListeners();

        return card;
    }

    /**
     * Create Client ID input section
     * @private
     */
    _createClientIdSection() {
        const section = document.createElement('div');
        section.className = 'mb-2';

        const label = document.createElement('label');
        label.className = 'form-label small';
        label.setAttribute('data-localize', '__MSG_outlookClientIdLabel__');
        label.textContent = window.getLocalizedMessage('outlookClientIdLabel') || 'Azure App Client ID';
        section.appendChild(label);

        const inputGroup = document.createElement('div');
        inputGroup.className = 'input-group input-group-sm';

        this.clientIdInput = document.createElement('input');
        this.clientIdInput.type = 'text';
        this.clientIdInput.className = 'form-control';
        this.clientIdInput.placeholder = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
        this.clientIdInput.setAttribute('data-localize-placeholder', '__MSG_outlookClientIdPlaceholder__');
        inputGroup.appendChild(this.clientIdInput);

        this.saveClientIdBtn = document.createElement('button');
        this.saveClientIdBtn.className = 'btn btn-outline-primary';
        this.saveClientIdBtn.type = 'button';
        this.saveClientIdBtn.setAttribute('data-localize', '__MSG_save__');
        this.saveClientIdBtn.textContent = window.getLocalizedMessage('save') || 'Save';
        inputGroup.appendChild(this.saveClientIdBtn);

        section.appendChild(inputGroup);

        const helpText = document.createElement('small');
        helpText.className = 'form-text text-muted';
        helpText.setAttribute('data-localize', '__MSG_outlookClientIdHelp__');
        helpText.textContent = window.getLocalizedMessage('outlookClientIdHelp') || 'Register an app in Azure Portal to get a Client ID.';
        section.appendChild(helpText);

        return section;
    }

    /**
     * Create the Outlook sign-in button
     * @private
     */
    _createOutlookButton() {
        const button = document.createElement('button');
        button.id = 'outlook-integration-button';
        button.className = 'btn btn-outline-primary btn-sm';
        button.innerHTML = `
            <i class="fab fa-microsoft me-1"></i>
            <span data-localize="__MSG_signInWithOutlook__">${window.getLocalizedMessage('signInWithOutlook') || 'Sign in with Microsoft'}</span>
        `;
        return button;
    }

    /**
     * Set up event listeners
     * @private
     */
    _setupEventListeners() {
        if (this.integrationButton && this.onIntegrationChange) {
            this.integrationButton.addEventListener('click', () => {
                this.onIntegrationChange(!this.isIntegrated);
            });
        }

        if (this.saveClientIdBtn) {
            this.saveClientIdBtn.addEventListener('click', async () => {
                const clientId = this.clientIdInput.value.trim();
                // Validate UUID format (Azure App Client ID)
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!clientId || !uuidRegex.test(clientId)) {
                    this.clientIdInput.classList.add('is-invalid');
                    setTimeout(() => this.clientIdInput.classList.remove('is-invalid'), 3000);
                    return;
                }
                this.clientIdInput.classList.remove('is-invalid');
                await StorageHelper.setLocal({ outlookClientId: clientId });
                this.saveClientIdBtn.textContent = window.getLocalizedMessage('saved') || 'Saved!';
                setTimeout(() => {
                    this.saveClientIdBtn.setAttribute('data-localize', '__MSG_save__');
                    this.saveClientIdBtn.textContent = window.getLocalizedMessage('save') || 'Save';
                }, 2000);
            });
        }
    }

    /**
     * Load stored client ID
     */
    async loadData() {
        try {
            const data = await StorageHelper.getLocal(['outlookClientId'], { outlookClientId: '' });
            if (this.clientIdInput && data.outlookClientId) {
                this.clientIdInput.value = data.outlookClientId;
            }
        } catch (error) {
            console.error('Failed to load Outlook client ID:', error);
        }
    }

    /**
     * Update integration status
     * @param {boolean} integrated
     * @param {string} [statusText]
     */
    updateIntegrationStatus(integrated, statusText = null) {
        this.isIntegrated = integrated;

        if (this.statusElement) {
            if (statusText) {
                this.statusElement.textContent = statusText;
                this.statusElement.removeAttribute('data-localize');
            } else if (integrated) {
                this.statusElement.setAttribute('data-localize', '__MSG_integrated__');
                this.statusElement.textContent = window.getLocalizedMessage('integrated') || 'Integrated';
            } else {
                this.statusElement.setAttribute('data-localize', '__MSG_notIntegrated__');
                this.statusElement.textContent = window.getLocalizedMessage('notIntegrated') || 'Not integrated';
            }
        }

        if (this.integrationButton) {
            const textSpan = this.integrationButton.querySelector('span');
            if (textSpan) {
                textSpan.setAttribute('data-localize', integrated ? '__MSG_disconnectOutlook__' : '__MSG_signInWithOutlook__');
                textSpan.textContent = integrated
                    ? (window.getLocalizedMessage('disconnectOutlook') || 'Disconnect Outlook')
                    : (window.getLocalizedMessage('signInWithOutlook') || 'Sign in with Microsoft');
            }
        }
    }

    /**
     * Toggle button enabled state
     * @param {boolean} enabled
     */
    setButtonEnabled(enabled) {
        if (this.integrationButton) {
            this.integrationButton.disabled = !enabled;
            this.integrationButton.style.opacity = enabled ? '1' : '0.6';
        }
    }

    getIntegrationStatus() {
        return this.isIntegrated;
    }
}
