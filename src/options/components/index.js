/**
 * Components Index - The component integration module
 *
 * Centrally manages all the UI components and simplifies external usage
 */

// The base components
export { CardComponent } from './base/card-component.js';
export { ControlButtonsComponent } from './base/control-buttons-component.js';

// The calendar-related components
export { GoogleIntegrationCard } from './calendar/google-integration-card.js';
export { CalendarManagementCard } from './calendar/calendar-management-card.js';

// The settings-related components
export { TimeSettingsCard } from './settings/time-settings-card.js';
export { ColorSettingsCard } from './settings/color-settings-card.js';
export { LanguageSettingsCard } from './settings/language-settings-card.js';
export { ShortcutSettingsCard } from './settings/shortcut-settings-card.js';
export { ReminderSettingsCard } from './settings/reminder-settings-card.js';
export { DeveloperSettingsCard } from './settings/developer-settings-card.js';
export { WhatsNewCard } from './settings/whats-new-card.js';

/**
 * ComponentManager - The component lifecycle management
 *
 * Integrates the management of multiple components and efficiently handles initialization and destruction
 */
export class ComponentManager {
    constructor() {
        this.components = new Map();
        this.container = null;
    }

    /**
     * Set the container
     * @param {HTMLElement} container
     */
    setContainer(container) {
        this.container = container;
    }

    /**
     * Register the component
     * @param {string} name The component name
     * @param {Object} component The component instance
     */
    register(name, component) {
        this.components.set(name, component);

        // Automatically add if the container is set
        if (this.container && component.createElement) {
            if (!component.element) {
                component.createElement();
            }
            component.appendTo(this.container);
        }
    }


    /**
     * Initialize all the components
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
     * Destroy all the components
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