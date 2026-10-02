/**
 * Shared DOM builders for the options page, in the side panel's design
 * language: a setting is one row — its name and a short explanation on the
 * left, the control (switch, select, button) on the right.
 */

/**
 * Localized message with a fallback for a missing key.
 * @param {string} key
 * @param {string} fallback
 * @returns {string}
 */
export function msg(key, fallback) {
    const text = window.getLocalizedMessage?.(key);
    return text && text !== key ? text : fallback;
}

/**
 * Localized message with `$1`, `$2`, … replaced by the given values.
 * @param {string} key
 * @param {string} fallback - Same placeholders as the message
 * @param {...(string|number)} values
 * @returns {string}
 */
export function msgWith(key, fallback, ...values) {
    return values.reduce(
        (text, value, i) => text.split(`$${i + 1}`).join(String(value)),
        msg(key, fallback)
    );
}

/**
 * Put localized text on an element and mark it for a later re-localization
 * (language switch).
 * @param {HTMLElement} element
 * @param {string} key
 * @param {string} fallback
 * @returns {HTMLElement} the element
 */
export function setText(element, key, fallback) {
    element.setAttribute('data-localize', `__MSG_${key}__`);
    element.textContent = msg(key, fallback);
    return element;
}

/**
 * A decorative Font Awesome icon.
 * @param {string} className
 * @returns {HTMLElement}
 */
export function createIcon(className) {
    const icon = document.createElement('i');
    icon.className = className;
    icon.setAttribute('aria-hidden', 'true');
    return icon;
}

/**
 * One setting: name and explanation on the left, control on the right.
 * @param {Object} options
 * @param {string} options.labelKey
 * @param {string} options.labelFallback
 * @param {string} [options.labelFor] - Id of the control the name labels
 * @param {string} [options.hintKey]
 * @param {string} [options.hintFallback]
 * @param {HTMLElement|HTMLElement[]} [options.control]
 * @returns {{row: HTMLElement, label: HTMLElement, hint: HTMLElement|null, controlBox: HTMLElement}}
 */
export function createSettingRow({ labelKey, labelFallback, labelFor, hintKey, hintFallback, control }) {
    const row = document.createElement('div');
    row.className = 'setting-row';

    const text = document.createElement('div');
    text.className = 'setting-row-text';

    const label = document.createElement(labelFor ? 'label' : 'div');
    label.className = 'setting-row-label';
    if (labelFor) label.htmlFor = labelFor;
    setText(label, labelKey, labelFallback);
    text.appendChild(label);

    let hint = null;
    if (hintKey) {
        hint = document.createElement('p');
        hint.className = 'setting-row-hint';
        setText(hint, hintKey, hintFallback);
        text.appendChild(hint);
    }

    const controlBox = document.createElement('div');
    controlBox.className = 'setting-row-control';
    (Array.isArray(control) ? control : control ? [control] : []).forEach(el => controlBox.appendChild(el));

    row.appendChild(text);
    row.appendChild(controlBox);

    // A hint describes the control as well as the name
    if (hint && labelFor) {
        hint.id = `${labelFor}-hint`;
        const target = controlBox.querySelector(`#${CSS.escape(labelFor)}`);
        target?.setAttribute('aria-describedby', hint.id);
    }

    return { row, label, hint, controlBox };
}

/**
 * An on/off switch (a checkbox drawn as a switch).
 * @param {string} id
 * @param {boolean} [checked=false]
 * @returns {HTMLInputElement}
 */
export function createSwitch(id, checked = false) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.className = 'setting-switch';
    input.setAttribute('role', 'switch');
    input.checked = checked;
    return input;
}

/**
 * A select in the settings style.
 * @param {string} id
 * @param {Array<{value: (string|number), text: string, key?: string}>} options
 * @returns {HTMLSelectElement}
 */
export function createSelect(id, options = []) {
    const select = document.createElement('select');
    select.id = id;
    select.className = 'setting-select';
    options.forEach(({ value, text, key }) => {
        const option = document.createElement('option');
        option.value = value;
        if (key) {
            option.setAttribute('data-localize', key);
        }
        option.textContent = text;
        select.appendChild(option);
    });
    return select;
}

/**
 * A button in the settings style.
 * @param {Object} options
 * @param {string} [options.id]
 * @param {string} options.labelKey
 * @param {string} options.labelFallback
 * @param {string} [options.icon] - Font Awesome classes
 * @param {'secondary'|'primary'|'danger'} [options.kind='secondary']
 * @returns {HTMLButtonElement}
 */
export function createButton({ id, labelKey, labelFallback, icon, kind = 'secondary' }) {
    const button = document.createElement('button');
    button.type = 'button';
    if (id) button.id = id;
    button.className = `settings-btn${kind === 'secondary' ? '' : ` is-${kind}`}`;
    if (icon) {
        button.appendChild(createIcon(icon));
    }
    button.appendChild(setText(document.createElement('span'), labelKey, labelFallback));
    return button;
}

/**
 * A quiet square icon button.
 * @param {Object} options
 * @param {string} [options.id]
 * @param {string} options.icon - Font Awesome classes
 * @param {string} options.labelKey
 * @param {string} options.labelFallback
 * @returns {HTMLButtonElement}
 */
export function createIconButton({ id, icon, labelKey, labelFallback }) {
    const button = document.createElement('button');
    button.type = 'button';
    if (id) button.id = id;
    button.className = 'settings-icon-btn';
    const label = msg(labelKey, labelFallback);
    button.title = label;
    button.setAttribute('aria-label', label);
    button.setAttribute('data-localize-title', `__MSG_${labelKey}__`);
    button.setAttribute('data-localize-aria-label', `__MSG_${labelKey}__`);
    button.appendChild(createIcon(icon));
    return button;
}

/**
 * A notice inside a card or the page (saved, failed, reload needed). The
 * close button removes it; no Bootstrap JS needed.
 * @param {Object} options
 * @param {string|Node} options.content - Text, or a node to put inside
 * @param {'info'|'success'|'danger'} [options.tone='info']
 * @param {number} [options.duration=0] - Remove after this many ms (0 = stay)
 * @param {string} [options.className]
 * @returns {HTMLElement}
 */
export function createNotice({ content, tone = 'info', duration = 0, className = '' }) {
    const notice = document.createElement('div');
    notice.className = `settings-notice is-${tone}${className ? ` ${className}` : ''}`;
    notice.setAttribute('role', tone === 'danger' ? 'alert' : 'status');

    const body = document.createElement('div');
    body.className = 'settings-notice-body';
    if (typeof content === 'string') {
        body.textContent = content;
    } else if (content) {
        body.appendChild(content);
    }
    notice.appendChild(body);

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'settings-notice-close';
    close.setAttribute('aria-label', msg('close', 'Close'));
    close.appendChild(createIcon('fas fa-xmark'));
    close.addEventListener('click', () => notice.remove());
    notice.appendChild(close);

    if (duration > 0) {
        setTimeout(() => notice.remove(), duration);
    }
    return notice;
}
