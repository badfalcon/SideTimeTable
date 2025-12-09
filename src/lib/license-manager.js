/**
 * License Manager
 * Handles license validation, storage, and feature access control
 *
 * @module license-manager
 */

/**
 * Manages license validation and feature access for the extension
 */
export class LicenseManager {
  /**
   * @param {string} apiEndpoint - Base URL for the license API
   */
  constructor(apiEndpoint = 'https://your-license-api.com/api') {
    this.apiEndpoint = apiEndpoint;
    this.license = null;
    this.validationInterval = 24 * 60 * 60 * 1000; // 24 hours
    this.validationTimer = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the license manager
   * Loads license from storage and validates if needed
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load license from storage
      const data = await chrome.storage.sync.get(['license', 'licenseValidatedAt']);
      this.license = data.license || null;

      // Validate if needed
      const lastValidated = data.licenseValidatedAt || 0;
      const now = Date.now();

      if (!this.license || now - lastValidated > this.validationInterval) {
        await this.validateLicense();
      }

      // If no valid license, set to free plan
      if (!this.license) {
        this.license = {
          plan: 'free',
          features: this.getFreeFeatures(),
          status: 'active'
        };
        await this.saveLicense();
      }

      // Schedule periodic validation
      this.scheduleValidation();
      this.isInitialized = true;

    } catch (error) {
      console.error('Failed to initialize license manager:', error);
      // Fallback to free plan on error
      this.license = {
        plan: 'free',
        features: this.getFreeFeatures(),
        status: 'active'
      };
    }
  }

  /**
   * Validate license with remote API
   * @returns {Promise<boolean>} True if validation successful
   */
  async validateLicense() {
    if (!this.license || !this.license.key) {
      // No license key, use free plan
      this.license = {
        plan: 'free',
        features: this.getFreeFeatures(),
        status: 'active'
      };
      await this.saveLicense();
      return false;
    }

    try {
      const response = await fetch(`${this.apiEndpoint}/validate-license`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          licenseKey: this.license.key,
          extensionVersion: chrome.runtime.getManifest().version
        })
      });

      if (response.ok) {
        const data = await response.json();

        if (data.valid) {
          this.license = {
            key: this.license.key,
            plan: data.plan,
            status: data.status,
            expiryDate: data.expiryDate,
            features: data.features || this.getPremiumFeatures(),
            userId: data.userId,
            lastValidated: Date.now()
          };
          await this.saveLicense();
          return true;
        } else {
          // License invalid, revert to free
          console.warn('License validation failed:', data.message);
          this.license = {
            plan: 'free',
            features: this.getFreeFeatures(),
            status: 'expired'
          };
          await this.saveLicense();
          return false;
        }
      } else {
        console.error('License validation request failed:', response.status);
        // Keep existing license on server error (grace period)
        return false;
      }
    } catch (error) {
      console.error('License validation failed:', error);
      // Keep existing license on network error (grace period)
      return false;
    }
  }

  /**
   * Save license to Chrome storage
   */
  async saveLicense() {
    try {
      await chrome.storage.sync.set({
        license: this.license,
        licenseValidatedAt: Date.now()
      });
    } catch (error) {
      console.error('Failed to save license:', error);
    }
  }

  /**
   * Check if a specific feature is available
   * @param {string} featureName - Name of the feature to check
   * @returns {boolean} True if feature is available
   */
  hasFeature(featureName) {
    if (!this.license || !this.license.features) {
      return false;
    }
    return this.license.features[featureName] === true;
  }

  /**
   * Check if user has premium plan
   * @returns {boolean} True if premium
   */
  isPremium() {
    return this.license?.plan === 'premium' && this.license?.status === 'active';
  }

  /**
   * Check if user has free plan
   * @returns {boolean} True if free
   */
  isFree() {
    return !this.isPremium();
  }

  /**
   * Get current license info
   * @returns {Object} License information
   */
  getLicenseInfo() {
    return {
      plan: this.license?.plan || 'free',
      status: this.license?.status || 'active',
      expiryDate: this.license?.expiryDate || null,
      features: this.license?.features || this.getFreeFeatures()
    };
  }

  /**
   * Get features available in free plan
   * @returns {Object} Feature flags
   */
  getFreeFeatures() {
    return {
      // Basic features (always available)
      basicTimeline: true,
      currentTimeLine: true,
      googleCalendarSync: true,
      localization: true,

      // Limited features
      singleCalendar: true,        // Only 1 calendar
      limitedLocalEvents: true,    // Max 3 events per day

      // Premium features (disabled)
      multiCalendar: false,
      unlimitedEvents: false,
      weekView: false,
      monthView: false,
      customThemes: false,
      darkMode: false,
      eventTemplates: false,
      exportFeatures: false,
      analytics: false,
      advancedNotifications: false,
      prioritySync: false,
      prioritySupport: false
    };
  }

  /**
   * Get features available in premium plan
   * @returns {Object} Feature flags
   */
  getPremiumFeatures() {
    return {
      // Basic features
      basicTimeline: true,
      currentTimeLine: true,
      googleCalendarSync: true,
      localization: true,

      // All features enabled
      singleCalendar: true,
      limitedLocalEvents: false,   // No limit
      multiCalendar: true,
      unlimitedEvents: true,
      weekView: true,
      monthView: true,
      customThemes: true,
      darkMode: true,
      eventTemplates: true,
      exportFeatures: true,
      analytics: true,
      advancedNotifications: true,
      prioritySync: true,
      prioritySupport: true
    };
  }

  /**
   * Schedule periodic license validation
   */
  scheduleValidation() {
    // Clear existing timer
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
    }

    // Schedule validation every 24 hours
    this.validationTimer = setInterval(() => {
      this.validateLicense();
    }, this.validationInterval);
  }

  /**
   * Stop scheduled validation
   */
  stopValidation() {
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
      this.validationTimer = null;
    }
  }

  /**
   * Activate a license key
   * @param {string} licenseKey - License key to activate
   * @returns {Promise<Object>} Result with success status and message
   */
  async activateLicense(licenseKey) {
    if (!licenseKey || typeof licenseKey !== 'string') {
      return {
        success: false,
        error: 'Invalid license key format'
      };
    }

    try {
      const response = await fetch(`${this.apiEndpoint}/activate-license`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          licenseKey: licenseKey.trim(),
          extensionVersion: chrome.runtime.getManifest().version
        })
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          this.license = {
            key: licenseKey,
            plan: data.plan,
            status: 'active',
            expiryDate: data.expiryDate,
            features: data.features || this.getPremiumFeatures(),
            userId: data.userId,
            lastValidated: Date.now()
          };
          await this.saveLicense();

          return {
            success: true,
            message: 'License activated successfully'
          };
        } else {
          return {
            success: false,
            error: data.message || 'License activation failed'
          };
        }
      } else {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Server error'
        };
      }
    } catch (error) {
      console.error('License activation error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      };
    }
  }

  /**
   * Deactivate current license
   * @returns {Promise<boolean>} True if successful
   */
  async deactivateLicense() {
    if (this.license?.key) {
      try {
        await fetch(`${this.apiEndpoint}/deactivate-license`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            licenseKey: this.license.key
          })
        });
      } catch (error) {
        console.error('Deactivation request failed:', error);
        // Continue with local deactivation even if API fails
      }
    }

    // Revert to free plan
    this.license = {
      plan: 'free',
      features: this.getFreeFeatures(),
      status: 'active'
    };
    await this.saveLicense();

    return true;
  }

  /**
   * Get the maximum number of local events allowed per day
   * @returns {number} Max events (Infinity for premium, 3 for free)
   */
  getMaxLocalEventsPerDay() {
    return this.hasFeature('unlimitedEvents') ? Infinity : 3;
  }

  /**
   * Get the maximum number of calendars that can be displayed
   * @returns {number} Max calendars (Infinity for premium, 1 for free)
   */
  getMaxCalendars() {
    return this.hasFeature('multiCalendar') ? Infinity : 1;
  }

  /**
   * Check if license is expired
   * @returns {boolean} True if expired
   */
  isExpired() {
    if (!this.license?.expiryDate) {
      return false;
    }
    return new Date(this.license.expiryDate) < new Date();
  }

  /**
   * Get days until license expires
   * @returns {number|null} Days until expiry, or null if no expiry
   */
  getDaysUntilExpiry() {
    if (!this.license?.expiryDate) {
      return null;
    }
    const now = new Date();
    const expiry = new Date(this.license.expiryDate);
    const diff = expiry - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopValidation();
    this.isInitialized = false;
  }
}

// Singleton instance
let licenseManagerInstance = null;

/**
 * Get the singleton license manager instance
 * @returns {LicenseManager} License manager instance
 */
export function getLicenseManager() {
  if (!licenseManagerInstance) {
    licenseManagerInstance = new LicenseManager();
  }
  return licenseManagerInstance;
}

// Export default instance for convenience
export const licenseManager = getLicenseManager();
