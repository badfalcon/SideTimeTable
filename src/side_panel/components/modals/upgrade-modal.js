/**
 * Upgrade Modal Component
 * Displays premium features and pricing information to encourage upgrades
 *
 * @module upgrade-modal
 */

import { Component } from '../base/component.js';
import { licenseManager } from '../../../lib/license-manager.js';
import { getPremiumFeatureList, getPricingInfo } from '../../../lib/feature-flags.js';

/**
 * Modal component for displaying upgrade options
 */
export class UpgradeModal extends Component {
  /**
   * @param {string} featureName - Name of the feature that triggered the modal
   * @param {string} featureDescription - Description of the feature
   */
  constructor(featureName, featureDescription) {
    super();
    this.featureName = featureName;
    this.featureDescription = featureDescription;
    this.modalInstance = null;
  }

  /**
   * Create the modal element
   * @returns {HTMLElement} Modal element
   */
  createElement() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'upgradeModal';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-labelledby', 'upgradeModalLabel');
    modal.setAttribute('aria-hidden', 'true');

    const pricingInfo = getPricingInfo();
    const features = getPremiumFeatureList();

    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
        <div class="modal-content">
          <!-- Header -->
          <div class="modal-header bg-gradient-primary text-white" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <h5 class="modal-title" id="upgradeModalLabel">
              <i class="fas fa-crown me-2"></i>
              ${chrome.i18n.getMessage('upgradeToPremium') || 'Upgrade to Premium'}
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <!-- Feature Highlight -->
            <div class="text-center mb-4 p-3 bg-light rounded">
              <i class="fas fa-lock fa-3x text-primary mb-3" style="color: #667eea !important;"></i>
              <h4 class="mb-2">${this.featureName}</h4>
              <p class="text-muted mb-0">${this.featureDescription}</p>
            </div>

            <!-- Pricing Cards -->
            <div class="row mb-4">
              <!-- Monthly Plan -->
              <div class="col-md-4 mb-3">
                <div class="card h-100 border-primary">
                  <div class="card-body text-center">
                    <h6 class="card-subtitle mb-3 text-muted">
                      ${chrome.i18n.getMessage('plan_monthly') || 'Monthly'}
                    </h6>
                    <div class="mb-3">
                      <span class="h2 mb-0">${pricingInfo.monthly.displayPrice.split('/')[0]}</span>
                      <span class="text-muted">/month</span>
                    </div>
                    <button class="btn btn-outline-primary w-100" data-plan="monthly">
                      ${chrome.i18n.getMessage('selectPlan') || 'Select Plan'}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Yearly Plan (Popular) -->
              <div class="col-md-4 mb-3">
                <div class="card h-100 border-success shadow" style="transform: scale(1.05);">
                  <div class="card-header bg-success text-white text-center py-1">
                    <small><i class="fas fa-star me-1"></i>${chrome.i18n.getMessage('mostPopular') || 'Most Popular'}</small>
                  </div>
                  <div class="card-body text-center">
                    <h6 class="card-subtitle mb-3 text-muted">
                      ${chrome.i18n.getMessage('plan_yearly') || 'Yearly'}
                    </h6>
                    <div class="mb-2">
                      <span class="h2 mb-0">${pricingInfo.yearly.displayPrice.split('/')[0]}</span>
                      <span class="text-muted">/year</span>
                    </div>
                    <div class="mb-3">
                      <span class="badge bg-success">${chrome.i18n.getMessage('save') || 'Save'} ${pricingInfo.yearly.savings}</span>
                      <div class="small text-muted">${pricingInfo.yearly.monthlyEquivalent}</div>
                    </div>
                    <button class="btn btn-success w-100" data-plan="yearly">
                      ${chrome.i18n.getMessage('selectPlan') || 'Select Plan'}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Lifetime Plan -->
              <div class="col-md-4 mb-3">
                <div class="card h-100 border-warning">
                  <div class="card-body text-center">
                    <h6 class="card-subtitle mb-3 text-muted">
                      ${chrome.i18n.getMessage('plan_lifetime') || 'Lifetime'}
                    </h6>
                    <div class="mb-2">
                      <span class="h2 mb-0">${pricingInfo.lifetime.displayPrice}</span>
                    </div>
                    <div class="mb-3">
                      <small class="text-muted">${pricingInfo.lifetime.note}</small>
                    </div>
                    <button class="btn btn-warning w-100" data-plan="lifetime">
                      ${chrome.i18n.getMessage('selectPlan') || 'Select Plan'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Features List -->
            <div class="mb-3">
              <h6 class="mb-3">
                <i class="fas fa-check-circle text-success me-2"></i>
                ${chrome.i18n.getMessage('premiumFeatures') || 'Premium Features Included'}
              </h6>
              <div class="row g-2">
                ${features.map(feature => `
                  <div class="col-md-6">
                    <div class="d-flex align-items-start p-2 rounded hover-bg-light">
                      <i class="fas ${feature.icon} text-primary me-2 mt-1" style="width: 20px;"></i>
                      <div class="flex-grow-1">
                        <div class="fw-semibold small">${feature.title}</div>
                        <div class="text-muted" style="font-size: 0.75rem;">${feature.description}</div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Money-back Guarantee -->
            <div class="alert alert-info mb-0">
              <i class="fas fa-shield-check me-2"></i>
              <strong>${chrome.i18n.getMessage('moneyBackGuarantee') || '7-Day Money-Back Guarantee'}</strong>
              <div class="small">
                ${chrome.i18n.getMessage('moneyBackGuaranteeDesc') || 'Try premium risk-free. Cancel anytime within 7 days for a full refund.'}
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
              ${chrome.i18n.getMessage('notNow') || 'Not Now'}
            </button>
            <button type="button" class="btn btn-link text-muted" id="learnMoreButton">
              ${chrome.i18n.getMessage('learnMore') || 'Learn More'}
            </button>
          </div>
        </div>
      </div>
    `;

    this.element = modal;
    this.attachEventListeners();
    return modal;
  }

  /**
   * Attach event listeners to modal elements
   */
  attachEventListeners() {
    // Plan selection buttons
    const planButtons = this.element.querySelectorAll('[data-plan]');
    planButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const plan = e.target.getAttribute('data-plan');
        this.handlePlanSelection(plan);
      });
    });

    // Learn more button
    const learnMoreButton = this.element.querySelector('#learnMoreButton');
    if (learnMoreButton) {
      learnMoreButton.addEventListener('click', () => {
        this.handleLearnMore();
      });
    }
  }

  /**
   * Handle plan selection
   * @param {string} plan - Selected plan (monthly, yearly, lifetime)
   */
  async handlePlanSelection(plan) {
    try {
      // Close the modal
      this.hide();

      // Create checkout session
      const checkoutUrl = await this.createCheckoutSession(plan);

      if (checkoutUrl) {
        // Open checkout in new tab
        chrome.tabs.create({ url: checkoutUrl });
      } else {
        // Fallback: Open pricing page
        chrome.tabs.create({
          url: 'https://your-website.com/pricing?plan=' + plan
        });
      }
    } catch (error) {
      console.error('Failed to handle plan selection:', error);
      alert(chrome.i18n.getMessage('checkoutError') || 'Failed to open checkout. Please try again.');
    }
  }

  /**
   * Create checkout session with payment provider
   * @param {string} plan - Selected plan
   * @returns {Promise<string|null>} Checkout URL or null on failure
   */
  async createCheckoutSession(plan) {
    try {
      // Get success and cancel URLs
      const extensionUrl = chrome.runtime.getURL('');
      const successUrl = `${extensionUrl}src/payment/success.html?plan=${plan}`;
      const cancelUrl = `${extensionUrl}src/payment/cancel.html`;

      const response = await fetch('https://your-license-api.com/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan: plan,
          extensionVersion: chrome.runtime.getManifest().version,
          successUrl: successUrl,
          cancelUrl: cancelUrl,
          metadata: {
            featureName: this.featureName
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.checkoutUrl;
      } else {
        console.error('Failed to create checkout session:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Checkout session creation error:', error);
      return null;
    }
  }

  /**
   * Handle learn more button click
   */
  handleLearnMore() {
    chrome.tabs.create({
      url: 'https://your-website.com/features'
    });
  }

  /**
   * Show the modal
   */
  show() {
    if (!this.element) {
      document.body.appendChild(this.createElement());
    }

    // Create Bootstrap modal instance if not exists
    if (!this.modalInstance) {
      this.modalInstance = new bootstrap.Modal(this.element);
    }

    this.modalInstance.show();
  }

  /**
   * Hide the modal
   */
  hide() {
    if (this.modalInstance) {
      this.modalInstance.hide();
    }
  }

  /**
   * Cleanup modal resources
   */
  destroy() {
    if (this.modalInstance) {
      this.modalInstance.dispose();
      this.modalInstance = null;
    }
    super.destroy();
  }
}

/**
 * Show upgrade modal for a specific feature
 * @param {string} featureName - Name of the feature
 * @param {string} featureDescription - Description of the feature
 * @returns {UpgradeModal} Modal instance
 */
export function showUpgradeModal(featureName, featureDescription) {
  const modal = new UpgradeModal(featureName, featureDescription);
  modal.show();
  return modal;
}

/**
 * Global event listener for upgrade modal requests
 */
document.addEventListener('show-upgrade-modal', (event) => {
  const { featureName, featureDescription } = event.detail;
  showUpgradeModal(featureName, featureDescription);
});

export default UpgradeModal;
