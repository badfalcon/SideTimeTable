/**
 * EventBus - Centralized event communication system
 *
 * Provides decoupled communication between components, replacing
 * direct access to window.sidePanelController. Components emit
 * and listen for events without knowing about each other.
 *
 * @example
 * import { eventBus } from '../lib/event-bus.js';
 *
 * // Listen for an event
 * eventBus.on('showGoogleEvent', (event) => { ... });
 *
 * // Emit an event
 * eventBus.emit('showGoogleEvent', eventData);
 *
 * // One-time listener
 * eventBus.once('initialized', () => { ... });
 */
class EventBus {
    constructor() {
        /** @type {Map<string, Set<Function>>} */
        this._listeners = new Map();
    }

    /**
     * Register an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Handler function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Register a one-time event listener
     * @param {string} event - Event name
     * @param {Function} callback - Handler function
     * @returns {Function} Unsubscribe function
     */
    once(event, callback) {
        const wrapper = (...args) => {
            this.off(event, wrapper);
            callback(...args);
        };
        return this.on(event, wrapper);
    }

    /**
     * Remove an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Handler function to remove
     */
    off(event, callback) {
        const listeners = this._listeners.get(event);
        if (listeners) {
            listeners.delete(callback);
            if (listeners.size === 0) {
                this._listeners.delete(event);
            }
        }
    }

    /**
     * Emit an event to all registered listeners
     * @param {string} event - Event name
     * @param {...*} args - Arguments to pass to listeners
     */
    emit(event, ...args) {
        const listeners = this._listeners.get(event);
        if (listeners) {
            for (const callback of listeners) {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`EventBus error in '${event}' handler:`, error);
                }
            }
        }
    }

    /**
     * Remove all listeners for a specific event, or all listeners entirely
     * @param {string} [event] - Event name (omit to clear all)
     */
    clear(event) {
        if (event) {
            this._listeners.delete(event);
        } else {
            this._listeners.clear();
        }
    }
}

// Singleton instance shared across the application
export const eventBus = new EventBus();

// Event name constants to avoid typos
export const Events = {
    // Google event modal
    SHOW_GOOGLE_EVENT: 'showGoogleEvent',

    // Local event modal
    SHOW_LOCAL_EVENT_CREATE: 'showLocalEventCreate',
    SHOW_LOCAL_EVENT_EDIT: 'showLocalEventEdit',

    // Event data changes
    EVENTS_UPDATED: 'eventsUpdated',

    // Date navigation
    DATE_CHANGED: 'dateChanged',

    // Settings
    SETTINGS_CHANGED: 'settingsChanged'
};
