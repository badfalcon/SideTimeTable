/**
 * AllDayEventsComponent - Displays all-day events between header and timeline
 */
import { Component } from '../base/component.js';

export class AllDayEventsComponent extends Component {
    constructor(options = {}) {
        super({
            id: 'allDayEventsSection',
            className: 'all-day-events-section',
            hidden: true,
            ...options
        });

        this.container = null;
    }

    createElement() {
        const el = super.createElement();

        if (el.children.length > 0) {
            return el;
        }

        this.container = document.createElement('div');
        this.container.className = 'all-day-events-container';
        el.appendChild(this.container);

        return el;
    }

    /**
     * Get the container element for adding event chips
     * @returns {HTMLElement}
     */
    getContainer() {
        return this.container;
    }

    /**
     * Clear all event chips and hide the section
     */
    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.hide();
    }

    /**
     * Show the section if it has events, hide if empty
     */
    updateVisibility() {
        if (this.container && this.container.children.length > 0) {
            this.show();
        } else {
            this.hide();
        }
    }

    destroy() {
        this.container = null;
        super.destroy();
    }
}
