/**
 * Side Panel Components - Component exports
 */

// Base Components
export { Component } from './base/component.js';

// Header Components
export { HeaderComponent } from './header/header-component.js';

// Timeline Components
export { TimelineComponent } from './timeline/timeline-component.js';

// Modal Components
export { ModalComponent } from './modals/modal-component.js';
export { LocalEventModal } from './modals/local-event-modal.js';
export { GoogleEventModal } from './modals/google-event-modal.js';
export { AlertModal } from './modals/alert-modal.js';

/**
 * ComponentManager - Side panel component management class
 */
export class SidePanelComponentManager {
    constructor() {
        this.components = new Map();
        this.initialized = false;
    }

    /**
     * Register a component
     * @param {string} name Component name
     * @param {Component} component Component instance
     */
    register(name, component) {
        if (this.components.has(name)) {
            console.warn(`Component '${name}' is already registered`);
        }
        this.components.set(name, component);
    }

    /**
     * Get a component
     * @param {string} name Component name
     * @returns {Component|null} Component instance
     */
    get(name) {
        return this.components.get(name) || null;
    }

    /**
     * Check if component exists
     * @param {string} name Component name
     * @returns {boolean} Whether it exists
     */
    has(name) {
        return this.components.has(name);
    }

    /**
     * Initialize all components
     */
    initializeAll() {
        if (this.initialized) {
            console.warn('Components are already initialized');
            return;
        }

        for (const [name, component] of this.components) {
            try {
                if (component && typeof component.createElement === 'function') {
                    // Check if already initialized
                    if (!component.initialized) {
                        component.createElement();
                        component.initialized = true;
                    } else {
                    }
                }
            } catch (error) {
                console.error(`Component '${name}' initialization failed:`, error);
            }
        }
        this.initialized = true;
    }

    /**
     * Localize all components
     */
    localizeAll() {
        for (const [name, component] of this.components) {
            try {
                if (component && typeof component.localize === 'function') {
                    component.localize();
                }
            } catch (error) {
                console.warn(`Component '${name}' localization failed:`, error);
            }
        }
    }

    /**
     * Show specified component
     * @param {string} name Component name
     */
    show(name) {
        const component = this.get(name);
        if (component && typeof component.show === 'function') {
            component.show();
        }
    }

    /**
     * Hide specified component
     * @param {string} name Component name
     */
    hide(name) {
        const component = this.get(name);
        if (component && typeof component.hide === 'function') {
            component.hide();
        }
    }

    /**
     * Destroy all components
     */
    destroyAll() {
        for (const [name, component] of this.components) {
            try {
                if (component && typeof component.destroy === 'function') {
                    component.destroy();
                }
            } catch (error) {
                console.error(`Component '${name}' destruction failed:`, error);
            }
        }
        this.components.clear();
        this.initialized = false;
    }

    /**
     * Get list of registered components
     * @returns {Array<string>} Array of component names
     */
    getComponentNames() {
        return Array.from(this.components.keys());
    }

    /**
     * Get initialization state
     * @returns {boolean} Whether initialized
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Get number of components
     * @returns {number} Number of registered components
     */
    size() {
        return this.components.size;
    }

    /**
     * Set CSS variable for all components
     * @param {string} name CSS variable name (specify without --)
     * @param {string} value Value
     */
    setCSSVariableForAll(name, value) {
        for (const component of this.components.values()) {
            if (component && typeof component.setCSSVariable === 'function') {
                component.setCSSVariable(name, value);
            }
        }
    }

}