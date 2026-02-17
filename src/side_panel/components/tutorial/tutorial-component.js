/**
 * TutorialComponent - Step-by-step onboarding tutorial overlay
 */
import { Component } from '../base/component.js';
import { StorageHelper } from '../../../lib/storage-helper.js';

const TUTORIAL_STORAGE_KEY = 'tutorialCompleted';

export class TutorialComponent extends Component {
    constructor(options = {}) {
        super({
            id: 'tutorialOverlay',
            className: 'tutorial-overlay',
            hidden: true,
            ...options
        });

        this.currentStep = 0;
        this.steps = [];
        this.overlayBackdrop = null;
        this.tooltipElement = null;
        this.highlightElement = null;
        this.onComplete = options.onComplete || null;
    }

    createElement() {
        const el = super.createElement();

        if (el.children.length > 0) {
            return el;
        }

        // Backdrop (semi-transparent overlay)
        this.overlayBackdrop = document.createElement('div');
        this.overlayBackdrop.className = 'tutorial-backdrop';
        el.appendChild(this.overlayBackdrop);

        // Highlight cutout
        this.highlightElement = document.createElement('div');
        this.highlightElement.className = 'tutorial-highlight';
        el.appendChild(this.highlightElement);

        // Tooltip container
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.className = 'tutorial-tooltip';
        el.appendChild(this.tooltipElement);

        // Close on backdrop click
        this.addEventListener(this.overlayBackdrop, 'click', (e) => {
            if (e.target === this.overlayBackdrop) {
                this._finish();
            }
        });

        // ESC key to close
        this.addEventListener(document, 'keydown', (e) => {
            if (e.key === 'Escape' && this._isActive()) {
                this._finish();
            }
        });

        return el;
    }

    /**
     * Define the tutorial steps
     * @private
     */
    _defineSteps() {
        this.steps = [
            {
                type: 'welcome',
                titleKey: 'tutorialWelcomeTitle',
                descKey: 'tutorialWelcomeDesc',
                target: null
            },
            {
                titleKey: 'tutorialAddEventTitle',
                descKey: 'tutorialAddEventDesc',
                target: '#addLocalEventButton'
            },
            {
                titleKey: 'tutorialDateNavTitle',
                descKey: 'tutorialDateNavDesc',
                target: '#dateNavigation'
            },
            {
                titleKey: 'tutorialSyncTitle',
                descKey: 'tutorialSyncDesc',
                target: '#syncReminderButton'
            },
            {
                titleKey: 'tutorialSettingsTitle',
                descKey: 'tutorialSettingsDesc',
                target: '#settingsIcon'
            },
            {
                titleKey: 'tutorialTimelineTitle',
                descKey: 'tutorialTimelineDesc',
                target: '.side-time-table'
            },
            {
                type: 'finish',
                titleKey: 'tutorialFinishTitle',
                descKey: 'tutorialFinishDesc',
                target: null
            }
        ];
    }

    /**
     * Check if tutorial should be shown (first launch)
     * @returns {Promise<boolean>}
     */
    async shouldShow() {
        try {
            const data = await StorageHelper.get([TUTORIAL_STORAGE_KEY], {});
            return !data[TUTORIAL_STORAGE_KEY];
        } catch {
            return false;
        }
    }

    /**
     * Start the tutorial
     */
    async start() {
        this._defineSteps();
        this.currentStep = 0;

        if (!this.element) {
            this.createElement();
        }

        this.element.style.display = '';
        this.element.removeAttribute('hidden');

        this._renderStep();
    }

    /**
     * Render the current step
     * @private
     */
    _renderStep() {
        const step = this.steps[this.currentStep];
        if (!step) {
            this._finish();
            return;
        }

        const title = this._getMessage(step.titleKey);
        const desc = this._getMessage(step.descKey);

        // Position highlight (clamp to viewport for large elements)
        if (step.target) {
            const targetEl = document.querySelector(step.target);
            if (targetEl) {
                const rect = targetEl.getBoundingClientRect();
                const padding = 6;
                const viewportH = window.innerHeight;
                const viewportW = window.innerWidth;

                const clampedTop = Math.max(0, rect.top) - padding;
                const clampedLeft = Math.max(0, rect.left) - padding;
                const clampedBottom = Math.min(rect.bottom, viewportH) + padding;
                const clampedRight = Math.min(rect.right, viewportW) + padding;

                this.highlightElement.style.display = 'block';
                this.highlightElement.style.top = `${clampedTop}px`;
                this.highlightElement.style.left = `${clampedLeft}px`;
                this.highlightElement.style.width = `${clampedRight - clampedLeft}px`;
                this.highlightElement.style.height = `${clampedBottom - clampedTop}px`;
            } else {
                this.highlightElement.style.display = 'none';
            }
        } else {
            this.highlightElement.style.display = 'none';
        }

        // Build tooltip content
        const isFirst = this.currentStep === 0;
        const isLast = this.currentStep === this.steps.length - 1;

        this.tooltipElement.innerHTML = '';

        // Step counter
        const counter = document.createElement('div');
        counter.className = 'tutorial-step-counter';
        counter.textContent = `${this.currentStep + 1} / ${this.steps.length}`;
        this.tooltipElement.appendChild(counter);

        // Title
        const titleEl = document.createElement('h3');
        titleEl.className = 'tutorial-tooltip-title';
        titleEl.textContent = title;
        this.tooltipElement.appendChild(titleEl);

        // Description
        const descEl = document.createElement('p');
        descEl.className = 'tutorial-tooltip-desc';
        descEl.textContent = desc;
        this.tooltipElement.appendChild(descEl);

        // Buttons
        const btnContainer = document.createElement('div');
        btnContainer.className = 'tutorial-buttons';

        if (!isFirst) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'tutorial-btn tutorial-btn-secondary';
            prevBtn.textContent = this._getMessage('tutorialPrev');
            prevBtn.addEventListener('click', () => this._prevStep());
            btnContainer.appendChild(prevBtn);
        }

        const skipBtn = document.createElement('button');
        skipBtn.className = 'tutorial-btn tutorial-btn-skip';
        skipBtn.textContent = this._getMessage('tutorialSkip');
        skipBtn.addEventListener('click', () => this._finish());
        btnContainer.appendChild(skipBtn);

        if (isLast) {
            const doneBtn = document.createElement('button');
            doneBtn.className = 'tutorial-btn tutorial-btn-primary';
            doneBtn.textContent = this._getMessage('tutorialDone');
            doneBtn.addEventListener('click', () => this._finish());
            btnContainer.appendChild(doneBtn);
        } else {
            const nextBtn = document.createElement('button');
            nextBtn.className = 'tutorial-btn tutorial-btn-primary';
            nextBtn.textContent = this._getMessage('tutorialNext');
            nextBtn.addEventListener('click', () => this._nextStep());
            btnContainer.appendChild(nextBtn);
        }

        this.tooltipElement.appendChild(btnContainer);

        // Position tooltip
        this._positionTooltip(step);
    }

    /**
     * Position the tooltip relative to the target
     * @private
     */
    _positionTooltip(step) {
        if (!step.target) {
            // Center for welcome/finish screens
            this.tooltipElement.style.position = 'fixed';
            this.tooltipElement.style.top = '50%';
            this.tooltipElement.style.left = '50%';
            this.tooltipElement.style.transform = 'translate(-50%, -50%)';
            return;
        }

        const targetEl = document.querySelector(step.target);
        if (!targetEl) {
            this.tooltipElement.style.position = 'fixed';
            this.tooltipElement.style.top = '50%';
            this.tooltipElement.style.left = '50%';
            this.tooltipElement.style.transform = 'translate(-50%, -50%)';
            return;
        }

        const rect = targetEl.getBoundingClientRect();
        const tooltipRect = this.tooltipElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const margin = 12;
        const edgePadding = 10;

        this.tooltipElement.style.position = 'fixed';
        this.tooltipElement.style.transform = '';

        // Calculate available space above and below the target
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;

        let top;
        if (spaceBelow >= tooltipRect.height + margin + edgePadding) {
            // Enough space below
            top = rect.bottom + margin;
        } else if (spaceAbove >= tooltipRect.height + margin + edgePadding) {
            // Enough space above
            top = rect.top - tooltipRect.height - margin;
        } else {
            // Not enough space above or below (large target like timeline).
            // Place inside the visible area of the target, vertically centered.
            const visibleTop = Math.max(rect.top, 0);
            const visibleBottom = Math.min(rect.bottom, viewportHeight);
            top = visibleTop + (visibleBottom - visibleTop) / 2 - tooltipRect.height / 2;
        }

        // Clamp to viewport bounds
        top = Math.max(edgePadding, Math.min(top, viewportHeight - tooltipRect.height - edgePadding));
        this.tooltipElement.style.top = `${top}px`;

        // Horizontal centering with boundary check
        let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        left = Math.max(edgePadding, Math.min(left, viewportWidth - tooltipRect.width - edgePadding));
        this.tooltipElement.style.left = `${left}px`;
    }

    /**
     * Go to next step
     * @private
     */
    _nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this._renderStep();
        }
    }

    /**
     * Go to previous step
     * @private
     */
    _prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this._renderStep();
        }
    }

    /**
     * Finish the tutorial
     * @private
     */
    async _finish() {
        this.element.style.display = 'none';
        this.element.setAttribute('hidden', '');

        try {
            await StorageHelper.set({ [TUTORIAL_STORAGE_KEY]: true });
        } catch {
            // Ignore storage errors
        }

        if (this.onComplete) {
            this.onComplete();
        }
    }

    /**
     * Check if tutorial is currently active
     * @private
     */
    _isActive() {
        return this.element && !this.element.hasAttribute('hidden');
    }

    /**
     * Get localized message with fallback
     * @private
     */
    _getMessage(key) {
        try {
            const msg = chrome.i18n.getMessage(key);
            return msg || key;
        } catch {
            return key;
        }
    }

    /**
     * Reset tutorial so it shows again
     */
    async reset() {
        try {
            await StorageHelper.remove([TUTORIAL_STORAGE_KEY]);
        } catch {
            // Ignore
        }
    }
}
