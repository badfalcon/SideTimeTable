/**
 * Component - Base component class for side panel
 */
export class Component {
    constructor(options = {}) {
        this.options = {
            id: options.id || '',
            className: options.className || '',
            hidden: options.hidden || false,
            ...options
        };

        // DOM element
        this.element = null;

        // Initialization state
        this.initialized = false;

        // Event listener management
        this.eventListeners = [];
    }

    /**
     * Create component element
     * @returns {HTMLElement} Created element
     */
    createElement() {
        // Reuse if element is already created
        if (this.element) {
            return this.element;
        }

        // Remove existing element with same ID from DOM if it exists
        if (this.options.id) {
            const existingElement = document.getElementById(this.options.id);
            if (existingElement) {
                existingElement.remove();
            }
        }

        this.element = document.createElement('div');

        if (this.options.id) {
            this.element.id = this.options.id;
        }

        if (this.options.className) {
            this.element.className = this.options.className;
        }

        if (this.options.hidden) {
            this.element.style.display = 'none';
        }

        return this.element;
    }

    /**
     * Append to specified parent element
     * @param {HTMLElement} parent Parent element
     * @returns {HTMLElement} Appended element
     */
    appendTo(parent) {
        if (!this.element) {
            this.createElement();
        }

        if (parent && typeof parent.appendChild === 'function') {
            parent.appendChild(this.element);
        }

        return this.element;
    }

    /**
     * Insert before specified element
     * @param {HTMLElement} sibling Target sibling element for insertion
     * @returns {HTMLElement} Inserted element
     */
    insertBefore(sibling) {
        if (!this.element) {
            this.createElement();
        }

        if (sibling && sibling.parentNode) {
            sibling.parentNode.insertBefore(this.element, sibling);
        }

        return this.element;
    }

    /**
     * Add event listener (automatic management)
     * @param {HTMLElement|string} target Target element or selector
     * @param {string} event Event name
     * @param {Function} handler Handler function
     * @param {Object} options Event options
     */
    addEventListener(target, event, handler, options = {}) {
        let element;

        if (typeof target === 'string') {
            element = this.element?.querySelector(target);
        } else {
            element = target;
        }

        if (element && typeof element.addEventListener === 'function') {
            element.addEventListener(event, handler, options);

            // Record for cleanup
            this.eventListeners.push({
                element,
                event,
                handler,
                options
            });
        }
    }

    /**
     * Toggle visibility
     * @param {boolean} visible Whether to show
     */
    setVisible(visible) {
        if (this.element) {
            this.element.style.display = visible ? '' : 'none';
        }
        this.options.hidden = !visible;
    }

    /**
     * Show element
     */
    show() {
        this.setVisible(true);
    }

    /**
     * Hide element
     */
    hide() {
        this.setVisible(false);
    }

    /**
     * Remove element
     */
    remove() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Remove event listeners
        this.eventListeners.forEach(({ element, event, handler, options }) => {
            if (element && typeof element.removeEventListener === 'function') {
                element.removeEventListener(event, handler, options);
            }
        });
        this.eventListeners = [];

        // Remove DOM element
        this.remove();
        this.element = null;
        this.initialized = false;
    }

    /**
     * Localize strings within element
     */
    localize() {
        if (this.element && window.localizeElementText) {
            window.localizeElementText(this.element);
        }
    }

    /**
     * Set CSS variable
     * @param {string} name CSS variable name (specify without --)
     * @param {string} value Value
     */
    setCSSVariable(name, value) {
        if (this.element) {
            this.element.style.setProperty(`--${name}`, value);
        }
    }

    /**
     * Get CSS variable
     * @param {string} name CSS variable name (specify without --)
     * @returns {string} Value
     */
    getCSSVariable(name) {
        if (this.element) {
            return getComputedStyle(this.element).getPropertyValue(`--${name}`);
        }
        return '';
    }
}