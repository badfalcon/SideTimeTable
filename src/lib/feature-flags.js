/**
 * Feature Flags Utility
 * Provides convenient methods for checking feature access and enforcing limits
 *
 * @module feature-flags
 */

import { licenseManager } from './license-manager.js';

/**
 * Feature flag names (constants for type safety)
 */
export const FEATURES = {
  // Basic features
  BASIC_TIMELINE: 'basicTimeline',
  CURRENT_TIME_LINE: 'currentTimeLine',
  GOOGLE_CALENDAR_SYNC: 'googleCalendarSync',
  LOCALIZATION: 'localization',

  // Limited features
  SINGLE_CALENDAR: 'singleCalendar',
  LIMITED_LOCAL_EVENTS: 'limitedLocalEvents',

  // Premium features
  MULTI_CALENDAR: 'multiCalendar',
  UNLIMITED_EVENTS: 'unlimitedEvents',
  WEEK_VIEW: 'weekView',
  MONTH_VIEW: 'monthView',
  CUSTOM_THEMES: 'customThemes',
  DARK_MODE: 'darkMode',
  EVENT_TEMPLATES: 'eventTemplates',
  EXPORT_FEATURES: 'exportFeatures',
  ANALYTICS: 'analytics',
  ADVANCED_NOTIFICATIONS: 'advancedNotifications',
  PRIORITY_SYNC: 'prioritySync',
  PRIORITY_SUPPORT: 'prioritySupport'
};

/**
 * Check if a feature is available
 * @param {string} featureName - Name of the feature
 * @returns {boolean} True if feature is available
 */
export function hasFeature(featureName) {
  return licenseManager.hasFeature(featureName);
}

/**
 * Check if user is on premium plan
 * @returns {boolean} True if premium
 */
export function isPremium() {
  return licenseManager.isPremium();
}

/**
 * Check if user is on free plan
 * @returns {boolean} True if free
 */
export function isFree() {
  return licenseManager.isFree();
}

/**
 * Get feature availability status for all features
 * @returns {Object} Map of feature names to availability
 */
export function getAllFeatures() {
  const licenseInfo = licenseManager.getLicenseInfo();
  return licenseInfo.features;
}

/**
 * Require premium feature - shows upgrade modal if not available
 * @param {string} featureName - Name of the feature
 * @param {string} featureDescription - Description for upgrade modal
 * @returns {boolean} True if feature is available, false if upgrade needed
 */
export function requirePremiumFeature(featureName, featureDescription) {
  if (hasFeature(featureName)) {
    return true;
  }

  // Show upgrade modal
  showUpgradeModal(featureName, featureDescription);
  return false;
}

/**
 * Show upgrade modal (to be implemented with UI component)
 * @param {string} featureName - Name of the feature
 * @param {string} featureDescription - Description of the feature
 */
export function showUpgradeModal(featureName, featureDescription) {
  // This will be implemented when we create the upgrade modal component
  // For now, dispatch a custom event that can be handled by the UI
  const event = new CustomEvent('show-upgrade-modal', {
    detail: {
      featureName,
      featureDescription
    }
  });
  document.dispatchEvent(event);
}

/**
 * Check if local events limit has been reached for a given date
 * @param {string} dateKey - Date key in YYYY-MM-DD format
 * @param {Array} currentEvents - Current events for the date
 * @returns {Promise<boolean>} True if limit reached
 */
export async function isLocalEventsLimitReached(dateKey, currentEvents) {
  const maxEvents = licenseManager.getMaxLocalEventsPerDay();

  if (maxEvents === Infinity) {
    return false; // No limit for premium
  }

  const eventCount = currentEvents ? currentEvents.length : 0;
  return eventCount >= maxEvents;
}

/**
 * Check if calendar limit has been reached
 * @param {number} currentCalendarCount - Current number of selected calendars
 * @returns {boolean} True if limit reached
 */
export function isCalendarLimitReached(currentCalendarCount) {
  const maxCalendars = licenseManager.getMaxCalendars();

  if (maxCalendars === Infinity) {
    return false; // No limit for premium
  }

  return currentCalendarCount >= maxCalendars;
}

/**
 * Get the remaining number of local events that can be created today
 * @param {string} dateKey - Date key in YYYY-MM-DD format
 * @param {Array} currentEvents - Current events for the date
 * @returns {Promise<number>} Remaining events (Infinity for premium)
 */
export async function getRemainingLocalEvents(dateKey, currentEvents) {
  const maxEvents = licenseManager.getMaxLocalEventsPerDay();

  if (maxEvents === Infinity) {
    return Infinity;
  }

  const eventCount = currentEvents ? currentEvents.length : 0;
  return Math.max(0, maxEvents - eventCount);
}

/**
 * Get premium feature list for display
 * @returns {Array<Object>} List of premium features with details
 */
export function getPremiumFeatureList() {
  return [
    {
      name: 'multiCalendar',
      icon: 'fa-calendar-days',
      title: chrome.i18n.getMessage('feature_multiCalendar') || 'Multi-Calendar Display',
      description: chrome.i18n.getMessage('feature_multiCalendar_desc') || 'Display events from multiple Google Calendars simultaneously'
    },
    {
      name: 'unlimitedEvents',
      icon: 'fa-infinity',
      title: chrome.i18n.getMessage('feature_unlimitedEvents') || 'Unlimited Local Events',
      description: chrome.i18n.getMessage('feature_unlimitedEvents_desc') || 'Create unlimited local events without restrictions'
    },
    {
      name: 'weekView',
      icon: 'fa-calendar-week',
      title: chrome.i18n.getMessage('feature_weekView') || 'Week View',
      description: chrome.i18n.getMessage('feature_weekView_desc') || 'View your schedule for the entire week at a glance'
    },
    {
      name: 'monthView',
      icon: 'fa-calendar',
      title: chrome.i18n.getMessage('feature_monthView') || 'Month View',
      description: chrome.i18n.getMessage('feature_monthView_desc') || 'See your entire month schedule in one view'
    },
    {
      name: 'customThemes',
      icon: 'fa-palette',
      title: chrome.i18n.getMessage('feature_customThemes') || 'Custom Themes',
      description: chrome.i18n.getMessage('feature_customThemes_desc') || 'Personalize with custom color themes and dark mode'
    },
    {
      name: 'eventTemplates',
      icon: 'fa-file-lines',
      title: chrome.i18n.getMessage('feature_eventTemplates') || 'Event Templates',
      description: chrome.i18n.getMessage('feature_eventTemplates_desc') || 'Save and reuse common event templates'
    },
    {
      name: 'exportFeatures',
      icon: 'fa-file-export',
      title: chrome.i18n.getMessage('feature_exportFeatures') || 'Export & Backup',
      description: chrome.i18n.getMessage('feature_exportFeatures_desc') || 'Export your events to CSV or iCal format'
    },
    {
      name: 'analytics',
      icon: 'fa-chart-line',
      title: chrome.i18n.getMessage('feature_analytics') || 'Time Analytics',
      description: chrome.i18n.getMessage('feature_analytics_desc') || 'Analyze your time usage and productivity patterns'
    },
    {
      name: 'prioritySync',
      icon: 'fa-bolt',
      title: chrome.i18n.getMessage('feature_prioritySync') || 'Real-time Sync',
      description: chrome.i18n.getMessage('feature_prioritySync_desc') || 'Faster calendar synchronization for premium users'
    },
    {
      name: 'prioritySupport',
      icon: 'fa-headset',
      title: chrome.i18n.getMessage('feature_prioritySupport') || 'Priority Support',
      description: chrome.i18n.getMessage('feature_prioritySupport_desc') || 'Get priority technical support and assistance'
    }
  ];
}

/**
 * Get pricing information
 * @returns {Object} Pricing details
 */
export function getPricingInfo() {
  return {
    monthly: {
      price: 4.99,
      currency: 'USD',
      period: 'month',
      displayPrice: '$4.99/month'
    },
    yearly: {
      price: 39.99,
      currency: 'USD',
      period: 'year',
      displayPrice: '$39.99/year',
      savings: '33%',
      monthlyEquivalent: '$3.33/month'
    },
    lifetime: {
      price: 99.99,
      currency: 'USD',
      period: 'lifetime',
      displayPrice: '$99.99',
      note: 'One-time payment'
    }
  };
}

/**
 * Check if a feature should show an upgrade prompt
 * @param {string} featureName - Name of the feature
 * @returns {boolean} True if upgrade prompt should be shown
 */
export function shouldShowUpgradePrompt(featureName) {
  // Don't show prompts for basic features
  const basicFeatures = [
    FEATURES.BASIC_TIMELINE,
    FEATURES.CURRENT_TIME_LINE,
    FEATURES.GOOGLE_CALENDAR_SYNC,
    FEATURES.LOCALIZATION,
    FEATURES.SINGLE_CALENDAR
  ];

  if (basicFeatures.includes(featureName)) {
    return false;
  }

  // Show prompt if feature is not available
  return !hasFeature(featureName);
}

/**
 * Add premium badge to UI element
 * @param {HTMLElement} element - Element to add badge to
 * @param {string} position - Badge position ('top-right', 'top-left', 'bottom-right', 'bottom-left')
 */
export function addPremiumBadge(element, position = 'top-right') {
  if (!element) return;

  // Don't add badge if already premium
  if (isPremium()) return;

  const badge = document.createElement('span');
  badge.className = `premium-badge premium-badge-${position}`;
  badge.innerHTML = '<i class="fas fa-crown"></i> PRO';
  badge.style.cssText = `
    position: absolute;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: bold;
    z-index: 10;
    ${position === 'top-right' ? 'top: 5px; right: 5px;' : ''}
    ${position === 'top-left' ? 'top: 5px; left: 5px;' : ''}
    ${position === 'bottom-right' ? 'bottom: 5px; right: 5px;' : ''}
    ${position === 'bottom-left' ? 'bottom: 5px; left: 5px;' : ''}
  `;

  element.style.position = 'relative';
  element.appendChild(badge);
}

/**
 * Disable UI element and add premium lock overlay
 * @param {HTMLElement} element - Element to lock
 * @param {string} featureName - Name of the feature
 * @param {string} featureDescription - Description for upgrade modal
 */
export function lockFeatureUI(element, featureName, featureDescription) {
  if (!element) return;

  // Don't lock if already premium
  if (isPremium()) return;

  // Add disabled state
  element.classList.add('premium-locked');
  element.style.opacity = '0.6';
  element.style.cursor = 'pointer';
  element.style.position = 'relative';

  // Add lock icon overlay
  const overlay = document.createElement('div');
  overlay.className = 'premium-lock-overlay';
  overlay.innerHTML = '<i class="fas fa-lock"></i>';
  overlay.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 24px;
    color: #667eea;
    pointer-events: none;
    z-index: 5;
  `;
  element.appendChild(overlay);

  // Add click handler to show upgrade modal
  element.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    requirePremiumFeature(featureName, featureDescription);
  }, true);
}

/**
 * Initialize feature flags system
 * Ensures license manager is initialized
 * @returns {Promise<void>}
 */
export async function initializeFeatureFlags() {
  await licenseManager.initialize();
}

// Export all feature-related utilities
export default {
  FEATURES,
  hasFeature,
  isPremium,
  isFree,
  getAllFeatures,
  requirePremiumFeature,
  showUpgradeModal,
  isLocalEventsLimitReached,
  isCalendarLimitReached,
  getRemainingLocalEvents,
  getPremiumFeatureList,
  getPricingInfo,
  shouldShowUpgradePrompt,
  addPremiumBadge,
  lockFeatureUI,
  initializeFeatureFlags
};
