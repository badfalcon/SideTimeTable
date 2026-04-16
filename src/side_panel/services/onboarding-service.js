/**
 * OnboardingService - Manages first-launch tutorial, initial setup, and changelog flow.
 *
 * Sequential progression: tutorial → initial setup → What's New changelog.
 * DOM-free: delegates show/start to component instances passed as parameters.
 */

import { StorageHelper } from '../../lib/storage-helper.js';

export class OnboardingService {

    /**
     * Start the onboarding flow: tutorial → setup → changelog.
     * @param {Object} tutorialComponent - TutorialComponent instance
     * @param {Object} initialSetupComponent - InitialSetupComponent instance
     * @param {Object} whatsNewModal - WhatsNewModal instance
     */
    async startOnboardingFlow(tutorialComponent, initialSetupComponent, whatsNewModal) {
        try {
            const shouldShow = await tutorialComponent.shouldShow();
            if (shouldShow) {
                setTimeout(() => {
                    tutorialComponent.start();
                }, 500);
                return;
            }

            // Tutorial already done, check initial setup
            await this._checkInitialSetup(initialSetupComponent, whatsNewModal);
        } catch (error) {
            console.warn('Failed to check tutorial state:', error);
            await this._checkInitialSetup(initialSetupComponent, whatsNewModal);
        }
    }

    /**
     * Called when tutorial is completed; check initial setup next.
     * @param {Object} initialSetupComponent
     * @param {Object} whatsNewModal
     */
    async onTutorialComplete(initialSetupComponent, whatsNewModal) {
        await this._checkInitialSetup(initialSetupComponent, whatsNewModal);
    }

    /**
     * Check if initial setup should be shown and start it if needed.
     * @param {Object} initialSetupComponent
     * @param {Object} whatsNewModal
     * @private
     */
    async _checkInitialSetup(initialSetupComponent, whatsNewModal) {
        try {
            const shouldShowSetup = await initialSetupComponent.shouldShow();
            if (shouldShowSetup) {
                setTimeout(() => {
                    initialSetupComponent.start();
                }, 300);
                // Don't show changelog yet - it will show after page reload
                return;
            }

            // Setup not needed, show changelog if applicable
            await this.checkForUpdateNotification(whatsNewModal);
        } catch (error) {
            console.warn('Failed to check initial setup state:', error);
        }
    }

    /**
     * Check if there are unseen updates and show What's New modal.
     * @param {Object} whatsNewModal
     */
    async checkForUpdateNotification(whatsNewModal) {
        try {
            const currentVersion = chrome.runtime.getManifest().version;
            const data = await StorageHelper.get(['lastSeenVersion'], {});

            if (!data.lastSeenVersion) {
                // First install - store current version without showing modal
                await StorageHelper.set({ lastSeenVersion: currentVersion });
                return;
            }

            if (data.lastSeenVersion !== currentVersion) {
                whatsNewModal.showForVersion(data.lastSeenVersion);
            }
        } catch (error) {
            console.warn('Failed to check for update notification:', error);
        }
    }
}
