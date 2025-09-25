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
     * Get component
     * @param {string} name Component name
     * @returns {Object|null} Component instance
     */
    get(name) {
        return this.components.get(name);
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

    /**
     * Batch operations on specific type of components
     * @param {string} method Method name
     * @param {...any} args Method arguments
     */
    broadcast(method, ...args) {
        for (const [name, component] of this.components) {
            if (component[method] && typeof component[method] === 'function') {
                try {
                    component[method](...args);
                } catch (error) {
                    console.error(`✗ Broadcast failed for ${name}.${method}:`, error);
                }
            }
        }
    }

    /**
     * Get list of registered components
     * @returns {string[]} Array of component names
     */
    list() {
        return Array.from(this.components.keys());
    }

    /**
     * Get component statistics
     * @returns {Object} Statistics information
     */
    getStats() {
        const total = this.components.size;
        const visible = Array.from(this.components.values())
            .filter(comp => comp.element && comp.element.style.display !== 'none').length;

        return {
            total,
            visible,
            hidden: total - visible,
            names: this.list()
        };
    }
}