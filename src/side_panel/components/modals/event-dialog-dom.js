/**
 * Shared DOM builders for the event dialogs: the local event form, the local
 * and Google event details, and the Google edit form.
 *
 * They all use one layout made for the ~384px side panel: a sticky header and
 * footer, and one row per field with an icon in place of a label line. Icons
 * are decorative (`aria-hidden`); every control keeps an accessible name
 * through a visually hidden `<label>` or an aria-label.
 *
 * `owner` parameters take the Component that owns the listener, so the
 * listener is removed when the component is destroyed.
 */
import { timeStringToMinutes, minutesToTimeString } from '../../../lib/time-utils.js';

/** Duration presets offered next to the time inputs, in minutes. */
export const DURATION_PRESETS = [
    { minutes: 15, msgKey: 'duration15m', fallback: '15 min' },
    { minutes: 30, msgKey: 'duration30m', fallback: '30 min' },
    { minutes: 45, msgKey: 'duration45m', fallback: '45 min' },
    { minutes: 60, msgKey: 'duration1h', fallback: '1 hr' },
    { minutes: 90, msgKey: 'duration90m', fallback: '1 hr 30 min' },
    { minutes: 120, msgKey: 'duration2h', fallback: '2 hr' },
    { minutes: 180, msgKey: 'duration3h', fallback: '3 hr' }
];

/** Value of the duration option shown when the times match no preset. */
export const CUSTOM_DURATION = 'custom';

/**
 * Localized message with a fallback for a missing key.
 * @param {string} key
 * @param {string} fallback
 * @returns {string}
 */
export function msg(key, fallback) {
    const text = window.getLocalizedMessage(key);
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
 * Put localized text on an element, and mark it so a later re-localization
 * of the document (language switch) updates it too.
 * @param {HTMLElement} element
 * @param {string} key
 * @param {string} fallback
 * @returns {HTMLElement} the element
 */
export function setLocalizedText(element, key, fallback) {
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
 * A real label that only assistive technology gets.
 * @param {string} htmlFor - id of the labelled control
 * @param {string} msgKey
 * @param {string} fallback
 * @returns {HTMLLabelElement}
 */
export function createHiddenLabel(htmlFor, msgKey, fallback) {
    const label = document.createElement('label');
    label.className = 'visually-hidden';
    label.htmlFor = htmlFor;
    return setLocalizedText(label, msgKey, fallback);
}

/**
 * An icon-led form row. Controls are appended after the icon.
 * @param {string} iconClass - Font Awesome classes
 * @returns {HTMLElement}
 */
export function createRow(iconClass) {
    const row = document.createElement('div');
    row.className = 'event-form-row';
    row.appendChild(createIcon(`${iconClass} event-form-row-icon`));
    return row;
}

/**
 * Wrap a select so the chevron can be drawn over it.
 * @param {HTMLSelectElement} select
 * @returns {HTMLElement}
 */
export function wrapSelect(select) {
    const wrap = document.createElement('div');
    wrap.className = 'event-form-select-wrap';
    wrap.appendChild(select);
    wrap.appendChild(createIcon('fas fa-chevron-down event-form-select-chevron'));
    return wrap;
}

/**
 * An explanatory hint paragraph.
 * @param {string} msgKey
 * @param {string} fallback
 * @returns {HTMLElement}
 */
export function createHint(msgKey, fallback) {
    const hint = document.createElement('p');
    hint.className = 'event-form-hint';
    return setLocalizedText(hint, msgKey, fallback);
}

/**
 * A segmented control: mutually exclusive toggle buttons. role=group plus
 * aria-pressed rather than radiogroup/radio, which would promise arrow-key
 * navigation that is not wired.
 * @param {string} ariaMsgKey - Message key for the group's accessible name
 * @param {string} ariaFallback
 * @returns {HTMLElement}
 */
export function createSegmented(ariaMsgKey, ariaFallback) {
    const group = document.createElement('div');
    group.className = 'event-segmented';
    group.setAttribute('role', 'group');
    group.setAttribute('data-localize-aria-label', `__MSG_${ariaMsgKey}__`);
    group.setAttribute('aria-label', msg(ariaMsgKey, ariaFallback));
    return group;
}

/**
 * One button of a segmented control.
 * @param {Object} owner - Component that tracks the listener
 * @param {string} msgKey
 * @param {string} fallback
 * @param {string|null} iconClass - Font Awesome classes, or null for text only
 * @param {Function} onPick
 * @returns {HTMLButtonElement}
 */
export function createSegmentButton(owner, msgKey, fallback, iconClass, onPick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'event-segmented-btn';
    btn.setAttribute('aria-pressed', 'false');

    if (iconClass) {
        btn.appendChild(createIcon(iconClass));
    }

    const label = document.createElement('span');
    setLocalizedText(label, msgKey, fallback);
    btn.appendChild(label);

    owner.addEventListener(btn, 'click', onPick);
    return btn;
}

/**
 * Show a segmented button as picked or not.
 * @param {HTMLButtonElement} button
 * @param {boolean} pressed
 */
export function setPressed(button, pressed) {
    button.classList.toggle('active', pressed);
    button.setAttribute('aria-pressed', String(pressed));
}

/**
 * The dialog header's close button.
 * @param {Object} owner - Component that tracks the listener
 * @param {Function} onClose
 * @returns {HTMLButtonElement}
 */
export function createCloseButton(owner, onClose) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'event-form-close';
    button.setAttribute('data-localize-aria-label', '__MSG_close__');
    button.setAttribute('aria-label', msg('close', 'Close'));
    button.appendChild(createIcon('fas fa-times'));
    owner.addEventListener(button, 'click', onClose);
    return button;
}

/**
 * A footer button.
 * @param {Object} owner - Component that tracks the listener
 * @param {Object} spec
 * @param {string} [spec.id]
 * @param {'primary'|'secondary'|'danger'} spec.variant
 * @param {string} spec.msgKey
 * @param {string} spec.fallback
 * @param {string} [spec.iconClass]
 * @param {Function} [spec.onClick]
 * @returns {HTMLButtonElement}
 */
export function createButton(owner, { id, variant, msgKey, fallback, iconClass, onClick }) {
    const button = document.createElement('button');
    button.type = 'button';
    if (id) button.id = id;
    button.className = `event-form-btn event-form-btn-${variant}`;
    if (iconClass) {
        button.appendChild(createIcon(iconClass));
    }
    button.appendChild(setLocalizedText(document.createElement('span'), msgKey, fallback));
    if (onClick) owner.addEventListener(button, 'click', onClick);
    return button;
}

/**
 * The footer's delete button: red text rather than a third pill, and apart
 * from the other actions. When a long translation leaves no room, it is the
 * button that gives way: the label wraps onto a line the fixed height clips,
 * so it disappears whole and the icon stays; the title keeps the full word.
 * @param {Object} owner - Component that tracks the listener
 * @param {Object} spec
 * @param {string} [spec.id]
 * @param {Function} [spec.onClick]
 * @returns {HTMLButtonElement}
 */
export function createDeleteButton(owner, { id, onClick } = {}) {
    const button = document.createElement('button');
    button.type = 'button';
    if (id) button.id = id;
    button.className = 'event-form-delete';
    button.appendChild(createIcon('fas fa-trash-alt'));
    button.setAttribute('data-localize-title', '__MSG_delete__');
    button.title = msg('delete', 'Delete');

    const label = document.createElement('span');
    label.className = 'event-form-delete-label';
    button.appendChild(setLocalizedText(label, 'delete', 'Delete'));

    if (onClick) owner.addEventListener(button, 'click', onClick);
    return button;
}

/**
 * A flexible gap that pushes the following footer buttons to the right.
 * @returns {HTMLElement}
 */
export function createFooterSpacer() {
    const spacer = document.createElement('div');
    spacer.className = 'event-form-footer-spacer';
    return spacer;
}

/**
 * The footer that replaces the normal one while a delete waits for
 * confirmation: the consequence on one line, then Cancel and a red Delete.
 * Keeping it in the footer, where Delete was pressed, avoids a second dialog.
 * @param {Object} owner - Component that tracks the listeners
 * @param {Object} spec
 * @param {string} spec.idPrefix - Prefix for the element ids
 * @param {string} spec.messageKey
 * @param {string} spec.messageFallback
 * @param {Function} spec.onConfirm
 * @param {Function} spec.onCancel
 * @returns {{footer: HTMLElement, cancelButton: HTMLButtonElement, confirmButton: HTMLButtonElement}}
 */
export function createDeleteConfirmFooter(owner, { idPrefix, messageKey, messageFallback, onConfirm, onCancel }) {
    const footer = document.createElement('footer');
    footer.className = 'event-form-footer event-confirm-footer';
    footer.setAttribute('role', 'group');
    footer.setAttribute('aria-labelledby', `${idPrefix}ConfirmText`);
    footer.hidden = true;

    const message = document.createElement('p');
    message.className = 'event-confirm-message';
    message.appendChild(createIcon('fas fa-exclamation-triangle'));
    const text = document.createElement('span');
    text.id = `${idPrefix}ConfirmText`;
    message.appendChild(setLocalizedText(text, messageKey, messageFallback));
    footer.appendChild(message);

    const actions = document.createElement('div');
    actions.className = 'event-confirm-actions';

    // Both buttons repeat the question to screen readers, since focus lands on
    // Cancel when the confirmation opens.
    const cancelButton = createButton(owner, {
        id: `${idPrefix}CancelDeleteButton`,
        variant: 'secondary',
        msgKey: 'cancel',
        fallback: 'Cancel',
        onClick: onCancel
    });
    cancelButton.setAttribute('aria-describedby', text.id);

    const confirmButton = createButton(owner, {
        id: `${idPrefix}ConfirmDeleteButton`,
        variant: 'danger',
        msgKey: 'confirmDelete',
        fallback: 'Delete',
        onClick: onConfirm
    });
    confirmButton.setAttribute('aria-describedby', text.id);

    actions.appendChild(cancelButton);
    actions.appendChild(confirmButton);
    footer.appendChild(actions);

    return { footer, cancelButton, confirmButton };
}

/**
 * A one-line outcome message (sent, hidden, failed). Hidden until shown with
 * showStatusLine().
 * @returns {HTMLElement}
 */
export function createStatusLine() {
    const line = document.createElement('p');
    line.className = 'event-status-line';
    line.setAttribute('role', 'status');
    line.hidden = true;
    return line;
}

const STATUS_ICONS = {
    success: 'fas fa-check',
    neutral: 'fas fa-info-circle',
    error: 'fas fa-exclamation-triangle'
};

/**
 * Show a status line with the given tone.
 * @param {HTMLElement} line - From createStatusLine()
 * @param {'success'|'neutral'|'error'} tone
 * @param {string} message
 */
export function showStatusLine(line, tone, message) {
    line.className = `event-status-line is-${tone}`;
    // An error interrupts; the other outcomes wait their turn
    line.setAttribute('role', tone === 'error' ? 'alert' : 'status');
    line.textContent = '';
    line.hidden = false;
    line.appendChild(createIcon(STATUS_ICONS[tone]));
    const text = document.createElement('span');
    text.textContent = message;
    line.appendChild(text);
}

// ===== Time row =====

/**
 * The time row: start, end and a duration picker that writes the end time.
 * The three wrap as a group, so in a narrow panel the duration drops under
 * the times rather than the times being clipped.
 * @param {Object} ids - { start, end, duration } element ids
 * @returns {{row: HTMLElement, startInput: HTMLInputElement, endInput: HTMLInputElement, durationSelect: HTMLSelectElement}}
 */
export function createTimeRow(ids) {
    const row = createRow('fas fa-clock');

    const fields = document.createElement('div');
    fields.className = 'event-time-fields';
    row.appendChild(fields);

    const makeTimeInput = (id, msgKey, fallback) => {
        fields.appendChild(createHiddenLabel(id, msgKey, fallback));

        const input = document.createElement('input');
        input.type = 'time';
        input.id = id;
        input.className = 'event-form-field event-time-input';
        input.setAttribute('list', 'time-list');
        input.required = true;
        fields.appendChild(input);
        return input;
    };

    const startInput = makeTimeInput(ids.start, 'startTime', 'Start time');

    const separator = document.createElement('span');
    separator.className = 'event-time-separator';
    separator.setAttribute('aria-hidden', 'true');
    separator.textContent = '–';
    fields.appendChild(separator);

    const endInput = makeTimeInput(ids.end, 'endTime', 'End time');

    fields.appendChild(createHiddenLabel(ids.duration, 'duration', 'Duration'));

    const durationSelect = document.createElement('select');
    durationSelect.id = ids.duration;
    durationSelect.className = 'event-duration-select';

    DURATION_PRESETS.forEach(preset => {
        const option = document.createElement('option');
        option.value = String(preset.minutes);
        durationSelect.appendChild(setLocalizedText(option, preset.msgKey, preset.fallback));
    });

    // Shown when the times match no preset. Disabled because picking it would
    // mean nothing — it reports a state, it does not set one.
    const customOption = document.createElement('option');
    customOption.value = CUSTOM_DURATION;
    customOption.disabled = true;
    durationSelect.appendChild(setLocalizedText(customOption, 'durationCustom', 'Custom'));

    fields.appendChild(wrapSelect(durationSelect));

    return { row, startInput, endInput, durationSelect };
}

/**
 * Write the end time from the start time plus the picked duration. It only
 * ever writes the end time, so changing the start never silently moves it.
 * A duration crossing midnight is clamped to 23:59.
 * @param {HTMLInputElement} startInput
 * @param {HTMLInputElement} endInput
 * @param {HTMLSelectElement} durationSelect
 */
export function applyDurationPreset(startInput, endInput, durationSelect) {
    const minutes = Number(durationSelect.value);
    const start = timeStringToMinutes(startInput.value);

    if (Number.isFinite(minutes) && minutes > 0 && start !== null) {
        endInput.value = minutesToTimeString(start + minutes);
    }

    // Re-read the times rather than trusting the preset: without a start time
    // nothing was applied, and a clamped end no longer matches the preset.
    syncDurationFromTimes(startInput, endInput, durationSelect);
}

/**
 * Point the duration picker at whatever the times currently say.
 * @param {HTMLInputElement} startInput
 * @param {HTMLInputElement} endInput
 * @param {HTMLSelectElement} durationSelect
 */
export function syncDurationFromTimes(startInput, endInput, durationSelect) {
    const start = timeStringToMinutes(startInput.value);
    const end = timeStringToMinutes(endInput.value);
    const diff = start !== null && end !== null ? end - start : null;
    const matched = diff !== null && DURATION_PRESETS.some(preset => preset.minutes === diff);

    durationSelect.value = matched ? String(diff) : CUSTOM_DURATION;
}

// ===== Detail views =====

/**
 * The header of an event's detail view: colour swatch, event title, optional
 * extra buttons, close.
 * @param {Object} owner - Component that tracks the listeners
 * @param {Object} spec
 * @param {string} spec.titleId
 * @param {Function} spec.onClose
 * @returns {{header: HTMLElement, swatch: HTMLElement, title: HTMLElement, closeButton: HTMLButtonElement, trailing: HTMLElement}}
 */
export function createDetailHeader(owner, { titleId, onClose }) {
    const header = document.createElement('header');
    header.className = 'event-form-header event-detail-header';

    const swatch = document.createElement('span');
    swatch.className = 'event-detail-swatch';
    swatch.setAttribute('aria-hidden', 'true');
    header.appendChild(swatch);

    const title = document.createElement('h2');
    title.className = 'event-detail-title';
    title.id = titleId;
    header.appendChild(title);

    // Slot for buttons that sit between the title and close
    const trailing = document.createElement('div');
    trailing.className = 'event-detail-header-actions';
    header.appendChild(trailing);

    const closeButton = createCloseButton(owner, onClose);
    header.appendChild(closeButton);

    return { header, swatch, title, closeButton, trailing };
}

/**
 * A row of the detail view: icon, then content that may wrap to several lines.
 * @param {string} iconClass - Font Awesome classes
 * @returns {{row: HTMLElement, content: HTMLElement}}
 */
export function createDetailRow(iconClass) {
    const row = document.createElement('div');
    row.className = 'event-detail-row';
    row.appendChild(createIcon(`${iconClass} event-form-row-icon`));

    const content = document.createElement('div');
    content.className = 'event-detail-text';
    row.appendChild(content);

    return { row, content };
}
