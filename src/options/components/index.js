/**
 * Components Index - Component integration module
 *
 * Centrally manages all UI components and simplifies external usage
 */

// Base components
export { CardComponent } from './base/card-component.js';
export { ControlButtonsComponent } from './base/control-buttons-component.js';

// Calendar-related components
export { GoogleIntegrationCard } from './calendar/google-integration-card.js';
export { CalendarManagementCard } from './calendar/calendar-management-card.js';

// Settings-related components
export { TimeSettingsCard } from './settings/time-settings-card.js';
export { ColorSettingsCard } from './settings/color-settings-card.js';
export { LanguageSettingsCard } from './settings/language-settings-card.js';
export { ShortcutSettingsCard } from './settings/shortcut-settings-card.js';

/**
 * ComponentManager - Component lifecycle management
 *
 * Integrates management of multiple components and efficiently handles initialization and destruction
 */
export class ComponentManager {
    constructor() {
        this.components = new Map();
        this.container = null;
    }

    /**
     * Set container
     * @param {HTMLElement} container
     */
    setContainer(container) {
        this.container = container;
    }

    /**
     * Register component
     * @param {string} name Component name
     * @param {Object} component Component instance
     */
    register(name, component) {
        this.components.set(name, component);

        // Automatically add if container is set
        if (this.container && component.createElement) {
            if (!component.element) {
                component.createElement();
            }
            component.appendTo(this.container);
        }
    }


    /**
     * Initialize all components
     */
    async initializeAll() {
        for (const [name, component] of this.components) {
            try {
                if (component.loadData && typeof component.loadData === 'function') {
                    await component.loadData();
                }
            } catch (error) {
                console.error(`✗ Component initialization failed: ${name}`, error);
            }
        }
    }

    /**
     * Destroy all components
     */
    destroyAll() {
        for (const [name, component] of this.components) {
            try {
                if (component.destroy && typeof component.destroy === 'function') {
                    component.destroy();
                }
            } catch (error) {
                console.error(`✗ Component destruction failed: ${name}`, error);
            }
        }
        this.components.clear();
    }

}