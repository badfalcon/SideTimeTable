/**
 * FormBuilder - DOM element creation helpers for forms
 *
 * Reduces boilerplate createElement calls in modal and settings components.
 * Each method creates a properly configured DOM element with localization support.
 */

/**
 * Create a localized label element
 * @param {string} htmlFor - The ID of the associated input
 * @param {string} msgKey - The i18n message key (without __MSG_ prefix)
 * @param {string} [fallback] - Fallback text if i18n lookup fails
 * @returns {HTMLLabelElement}
 */
export function createLabel(htmlFor, msgKey, fallback = '') {
    const label = document.createElement('label');
    label.htmlFor = htmlFor;
    label.setAttribute('data-localize', `__MSG_${msgKey}__`);
    label.textContent = chrome.i18n.getMessage(msgKey) || fallback;
    return label;
}

/**
 * Create a text/time/date input element
 * @param {Object} config - Input configuration
 * @param {string} config.type - Input type ('text', 'time', 'date', etc.)
 * @param {string} config.id - Element ID
 * @param {boolean} [config.required=false] - Whether the input is required
 * @param {string} [config.list] - Associated datalist ID
 * @param {string} [config.style] - Inline CSS styles
 * @param {string} [config.value] - Initial value
 * @returns {HTMLInputElement}
 */
export function createInput(config) {
    const input = document.createElement('input');
    input.type = config.type;
    input.id = config.id;
    if (config.required) input.required = true;
    if (config.list) input.setAttribute('list', config.list);
    if (config.style) input.style.cssText = config.style;
    if (config.value !== undefined) input.value = config.value;
    return input;
}

/**
 * Create a checkbox with label container
 * @param {Object} config - Checkbox configuration
 * @param {string} config.id - Element ID
 * @param {string} config.msgKey - The i18n message key for the label
 * @param {string} [config.fallback] - Fallback label text
 * @param {boolean} [config.checked=false] - Initial checked state
 * @param {string} [config.containerStyle] - Container CSS styles
 * @param {string} [config.checkboxStyle] - Checkbox CSS styles
 * @param {string} [config.labelStyle] - Label CSS styles
 * @returns {{container: HTMLDivElement, checkbox: HTMLInputElement, label: HTMLLabelElement}}
 */
export function createCheckbox(config) {
    const container = document.createElement('div');
    if (config.containerStyle) container.style.cssText = config.containerStyle;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = config.id;
    checkbox.checked = config.checked || false;
    if (config.checkboxStyle) checkbox.style.cssText = config.checkboxStyle;

    const label = document.createElement('label');
    label.htmlFor = config.id;
    label.setAttribute('data-localize', `__MSG_${config.msgKey}__`);
    label.textContent = chrome.i18n.getMessage(config.msgKey) || config.fallback || '';
    if (config.labelStyle) label.style.cssText = config.labelStyle;

    container.appendChild(checkbox);
    container.appendChild(label);

    return { container, checkbox, label };
}

/**
 * Create a select element with localized options
 * @param {Object} config - Select configuration
 * @param {string} config.id - Element ID
 * @param {string} [config.style] - Inline CSS styles
 * @param {Array<{value: string, msgKey: string, fallback: string}>} config.options - Select options
 * @returns {HTMLSelectElement}
 */
export function createSelect(config) {
    const select = document.createElement('select');
    select.id = config.id;
    if (config.style) select.style.cssText = config.style;

    for (const opt of config.options) {
        const option = document.createElement('option');
        option.value = opt.value;
        option.setAttribute('data-localize', `__MSG_${opt.msgKey}__`);
        option.textContent = chrome.i18n.getMessage(opt.msgKey) || opt.fallback;
        select.appendChild(option);
    }

    return select;
}

/**
 * Create a button element
 * @param {Object} config - Button configuration
 * @param {string} config.id - Element ID
 * @param {string} config.className - CSS class name
 * @param {string} config.msgKey - The i18n message key
 * @param {string} [config.fallback] - Fallback text
 * @param {string} [config.style] - Inline CSS styles
 * @returns {HTMLButtonElement}
 */
export function createButton(config) {
    const button = document.createElement('button');
    button.id = config.id;
    button.className = config.className;
    button.setAttribute('data-localize', `__MSG_${config.msgKey}__`);
    button.textContent = chrome.i18n.getMessage(config.msgKey) || config.fallback || '';
    if (config.style) button.style.cssText = config.style;
    return button;
}

/**
 * Create a div container with optional class and style
 * @param {Object} [config] - Container configuration
 * @param {string} [config.className] - CSS class name
 * @param {string} [config.style] - Inline CSS styles
 * @returns {HTMLDivElement}
 */
export function createContainer(config = {}) {
    const div = document.createElement('div');
    if (config.className) div.className = config.className;
    if (config.style) div.style.cssText = config.style;
    return div;
}
