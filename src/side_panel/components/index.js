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
}