/**
 * GuestField - The "add guests" part of the Google event form
 *
 * An address box with suggestions (people from events the panel has already
 * loaded), the added guests as removable chips, and the choice of whether
 * Google should email them an invitation. Addresses that do not look like
 * email addresses stay visible as red chips instead of being dropped, so the
 * user can see what to fix.
 */
import { isValidEmail, normalizeEmail, parseGuestInput } from '../../../lib/guest-utils.js';
import { createHiddenLabel, createHint, createIcon, createRow, msg, msgWith, setLocalizedText } from './event-dialog-dom.js';

const SEPARATOR_KEYS = new Set([',', ';', '、']);

export class GuestField {
    /**
     * @param {Object} owner - Component used to register listeners (cleaned up with it)
     * @param {Object} [options]
     * @param {Function} [options.getDirectory] - Returns an object with
     *   `search(query, {exclude})` and `nameFor(email)` (a GuestDirectory), or null
     * @param {Function} [options.onChange] - Called after guests are added or removed
     */
    constructor(owner, { getDirectory, onChange } = {}) {
        this.owner = owner;
        this.getDirectory = getDirectory || (() => null);
        this.onChange = onChange || (() => {});

        /** @type {Array<{email: string, name: string, valid: boolean}>} */
        this.guests = [];
        this.suggestions = [];
        this.activeIndex = -1;

        this.container = null;
        this.input = null;
        this.popup = null;
        this.listbox = null;
        this.chipList = null;
        this.errorLine = null;
        this.notifyRow = null;
        this.notifyCheckbox = null;
        this.notifyHint = null;
    }

    /**
     * Build the field and append it to the parent.
     * @param {HTMLElement} parentElement
     * @returns {HTMLElement} The container (toggle its `hidden` to show/hide)
     */
    build(parentElement) {
        const container = document.createElement('div');
        container.className = 'guest-field';

        const row = createRow('fas fa-user-friends');
        row.appendChild(createHiddenLabel('googleEventGuests', 'guests', 'Guests'));

        const combobox = document.createElement('div');
        combobox.className = 'guest-combobox';

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.id = 'googleEventGuests';
        this.input.className = 'event-form-field';
        this.input.autocomplete = 'off';
        this.input.spellcheck = false;
        this.input.setAttribute('inputmode', 'email');
        this.input.setAttribute('role', 'combobox');
        this.input.setAttribute('aria-autocomplete', 'list');
        this.input.setAttribute('aria-expanded', 'false');
        this.input.setAttribute('aria-controls', 'googleEventGuestSuggestions');
        this.input.setAttribute('aria-describedby', 'googleEventGuestError');
        this.input.setAttribute('data-localize-placeholder', '__MSG_addGuests__');
        this.input.placeholder = msg('addGuests', 'Add guests');
        combobox.appendChild(this.input);

        this.popup = document.createElement('div');
        this.popup.className = 'guest-suggest';
        this.popup.hidden = true;

        const heading = document.createElement('p');
        heading.className = 'guest-suggest-heading';
        heading.id = 'googleEventGuestSuggestHeading';
        setLocalizedText(heading, 'guestSuggestHeading', 'From your recent events');
        this.popup.appendChild(heading);

        this.listbox = document.createElement('ul');
        this.listbox.className = 'guest-suggest-list';
        this.listbox.id = 'googleEventGuestSuggestions';
        this.listbox.setAttribute('role', 'listbox');
        this.listbox.setAttribute('aria-labelledby', heading.id);
        this.popup.appendChild(this.listbox);

        combobox.appendChild(this.popup);
        row.appendChild(combobox);
        container.appendChild(row);

        this.chipList = document.createElement('ul');
        this.chipList.className = 'guest-chips';
        this.chipList.setAttribute('aria-label', msg('guests', 'Guests'));
        this.chipList.hidden = true;
        container.appendChild(this.chipList);

        this.errorLine = document.createElement('p');
        this.errorLine.className = 'guest-error';
        this.errorLine.id = 'googleEventGuestError';
        this.errorLine.setAttribute('role', 'alert');
        this.errorLine.hidden = true;
        container.appendChild(this.errorLine);

        // Sending invitations reaches people outside the panel, so the choice
        // sits right under the guests, with what "off" means spelled out.
        this.notifyRow = document.createElement('label');
        this.notifyRow.className = 'event-form-check-row';
        this.notifyRow.htmlFor = 'googleEventNotifyGuests';
        this.notifyRow.appendChild(createIcon('fas fa-envelope event-form-row-icon'));
        const notifyText = document.createElement('span');
        notifyText.className = 'event-form-check-label';
        setLocalizedText(notifyText, 'notifyGuests', 'Email invitations to guests');
        this.notifyRow.appendChild(notifyText);
        this.notifyCheckbox = document.createElement('input');
        this.notifyCheckbox.type = 'checkbox';
        this.notifyCheckbox.id = 'googleEventNotifyGuests';
        this.notifyCheckbox.className = 'event-form-check-input';
        this.notifyCheckbox.checked = true;
        this.notifyCheckbox.setAttribute('aria-describedby', 'googleEventNotifyHint');
        this.notifyRow.appendChild(this.notifyCheckbox);
        this.notifyRow.hidden = true;
        container.appendChild(this.notifyRow);

        this.notifyHint = createHint('notifyGuestsHint', 'When off, the event is added without sending email.');
        this.notifyHint.id = 'googleEventNotifyHint';
        this.notifyHint.classList.add('event-form-hint-indented');
        this.notifyHint.hidden = true;
        container.appendChild(this.notifyHint);

        this._bindEvents();

        parentElement.appendChild(container);
        this.container = container;
        return container;
    }

    // ===== Reading =====

    /**
     * Guests with a valid address, for the request.
     * @returns {Array<{email: string, name: string}>}
     */
    getValidGuests() {
        return this.guests.filter(guest => guest.valid);
    }

    /**
     * The first entry that is not an email address, if any.
     * @returns {{email: string}|null}
     */
    getFirstInvalid() {
        return this.guests.find(guest => !guest.valid) || null;
    }

    /**
     * Whether Google should email the guests.
     * @returns {boolean}
     */
    shouldNotify() {
        return !!this.notifyCheckbox?.checked;
    }

    // ===== Changing =====

    /**
     * Turn whatever is still typed into chips (on blur, and before saving, so
     * an address the user typed but did not confirm is not silently lost).
     * @returns {boolean} Whether anything was added
     */
    commitPending() {
        const text = this.input?.value || '';
        if (!text.trim()) {
            return false;
        }
        this.input.value = '';
        this._closeSuggestions();
        return this.addFromText(text);
    }

    /**
     * Add every address in some typed or pasted text.
     * @param {string} text
     * @returns {boolean} Whether anything was added
     */
    addFromText(text) {
        const before = this.guests.length;
        parseGuestInput(text).forEach(({ email, name }) => this._addGuest(email, name));
        const added = this.guests.length > before;
        if (added) {
            this._render();
        }
        return added;
    }

    /**
     * Remove one guest.
     * @param {string} email
     */
    remove(email) {
        const key = normalizeEmail(email);
        this.guests = this.guests.filter(guest => normalizeEmail(guest.email) !== key);
        this._render();
    }

    /**
     * Back to empty, invitations on.
     */
    reset() {
        this.guests = [];
        if (this.input) this.input.value = '';
        if (this.notifyCheckbox) this.notifyCheckbox.checked = true;
        this._closeSuggestions();
        this._render();
    }

    /**
     * Put focus in the address box.
     */
    focus() {
        this.input?.focus();
    }

    // ===== Internals =====

    /**
     * @param {string} email
     * @param {string} [name]
     * @private
     */
    _addGuest(email, name = '') {
        const address = String(email || '').trim();
        if (!address) return;
        const key = normalizeEmail(address);
        if (this.guests.some(guest => normalizeEmail(guest.email) === key)) return;
        const valid = isValidEmail(address);
        const knownName = valid ? (this.getDirectory()?.nameFor?.(address) || '') : '';
        this.guests.push({ email: address, name: name || knownName, valid });
    }

    /**
     * @private
     */
    _bindEvents() {
        const on = (target, type, handler) => this.owner.addEventListener(target, type, handler);

        on(this.input, 'input', () => this._updateSuggestions());

        on(this.input, 'keydown', (e) => this._handleKeydown(e));

        // A paste of several addresses (a list copied from mail) becomes chips
        // at once; a single address is left in the box to finish typing.
        on(this.input, 'paste', (e) => {
            const text = e.clipboardData?.getData('text') || '';
            if (/[\s,;<]/.test(text.trim())) {
                e.preventDefault();
                this.addFromText(`${this.input.value} ${text}`);
                this.input.value = '';
                this._closeSuggestions();
            }
        });

        on(this.input, 'blur', () => {
            this.commitPending();
            this._closeSuggestions();
        });

        // mousedown, not click: picking must happen before the input's blur
        // commits the half-typed text as an address of its own.
        on(this.listbox, 'mousedown', (e) => {
            const option = e.target.closest('[role="option"]');
            if (!option) return;
            e.preventDefault();
            this._pick(Number(option.dataset.index));
        });

        on(this.chipList, 'click', (e) => {
            const button = e.target.closest('.guest-chip-remove');
            if (!button) return;
            this.remove(button.dataset.email);
            this.focus();
        });
    }

    /**
     * @param {KeyboardEvent} e
     * @private
     */
    _handleKeydown(e) {
        if (e.isComposing) return;
        const open = !this.popup.hidden && this.suggestions.length > 0;

        switch (e.key) {
            case 'ArrowDown':
            case 'ArrowUp':
                if (!open) return;
                e.preventDefault();
                this._setActive(e.key === 'ArrowDown'
                    ? (this.activeIndex + 1) % this.suggestions.length
                    : (this.activeIndex - 1 + this.suggestions.length) % this.suggestions.length);
                return;
            case 'Enter':
                if (open && this.activeIndex >= 0) {
                    e.preventDefault();
                    this._pick(this.activeIndex);
                } else if (this.input.value.trim()) {
                    e.preventDefault();
                    this.commitPending();
                }
                return;
            case 'Escape':
                // Close the suggestions, not the dialog
                if (open) {
                    e.preventDefault();
                    e.stopPropagation();
                    this._closeSuggestions();
                }
                return;
            case 'Backspace':
                if (!this.input.value && this.guests.length > 0) {
                    e.preventDefault();
                    this.remove(this.guests[this.guests.length - 1].email);
                }
                return;
            default:
                if (SEPARATOR_KEYS.has(e.key)) {
                    e.preventDefault();
                    this.commitPending();
                }
        }
    }

    /**
     * @private
     */
    _updateSuggestions() {
        const directory = this.getDirectory();
        const query = this.input.value.trim();
        this.suggestions = directory && query
            ? directory.search(query, { exclude: this.guests.map(guest => guest.email) })
            : [];

        this.listbox.innerHTML = '';
        this.suggestions.forEach((person, index) => {
            const option = document.createElement('li');
            option.className = 'guest-option';
            option.id = `googleEventGuestOption${index}`;
            option.setAttribute('role', 'option');
            option.setAttribute('aria-selected', 'false');
            option.dataset.index = String(index);

            option.appendChild(this._createAvatar(person.name || person.email));

            const text = document.createElement('span');
            text.className = 'guest-option-text';
            const primary = document.createElement('span');
            primary.className = 'guest-option-name';
            primary.textContent = person.name || person.email;
            text.appendChild(primary);
            if (person.name) {
                const secondary = document.createElement('span');
                secondary.className = 'guest-option-email';
                secondary.textContent = person.email;
                text.appendChild(secondary);
            }
            option.appendChild(text);
            this.listbox.appendChild(option);
        });

        const open = this.suggestions.length > 0;
        this.popup.hidden = !open;
        this.input.setAttribute('aria-expanded', String(open));
        this._setActive(open ? 0 : -1);
    }

    /**
     * @param {number} index
     * @private
     */
    _setActive(index) {
        this.activeIndex = index;
        [...this.listbox.children].forEach((option, i) => {
            option.setAttribute('aria-selected', String(i === index));
            option.classList.toggle('is-active', i === index);
        });
        if (index >= 0) {
            this.input.setAttribute('aria-activedescendant', `googleEventGuestOption${index}`);
            this.listbox.children[index]?.scrollIntoView?.({ block: 'nearest' });
        } else {
            this.input.removeAttribute('aria-activedescendant');
        }
    }

    /**
     * @param {number} index
     * @private
     */
    _pick(index) {
        const person = this.suggestions[index];
        if (!person) return;
        this._addGuest(person.email, person.name);
        this.input.value = '';
        this._closeSuggestions();
        this._render();
        this.focus();
    }

    /**
     * @private
     */
    _closeSuggestions() {
        this.suggestions = [];
        if (this.popup) this.popup.hidden = true;
        if (this.listbox) this.listbox.innerHTML = '';
        if (this.input) {
            this.input.setAttribute('aria-expanded', 'false');
            this.input.removeAttribute('aria-activedescendant');
        }
        this.activeIndex = -1;
    }

    /**
     * @param {string} label - Name or address the initial is taken from
     * @returns {HTMLElement}
     * @private
     */
    _createAvatar(label) {
        const avatar = document.createElement('span');
        avatar.className = 'guest-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = [...String(label).trim()][0]?.toUpperCase() || '?';
        return avatar;
    }

    /**
     * Redraw the chips, the error line and the invitation choice.
     * @private
     */
    _render() {
        if (!this.chipList) return;
        this.chipList.innerHTML = '';
        this.guests.forEach((guest) => {
            const chip = document.createElement('li');
            chip.className = guest.valid ? 'guest-chip' : 'guest-chip is-invalid';
            chip.title = guest.email;

            if (guest.valid) {
                chip.appendChild(this._createAvatar(guest.name || guest.email));
            } else {
                chip.appendChild(createIcon('fas fa-exclamation-triangle guest-chip-warning'));
            }

            const label = document.createElement('span');
            label.className = 'guest-chip-label';
            label.textContent = guest.name || guest.email;
            chip.appendChild(label);

            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'guest-chip-remove';
            remove.dataset.email = guest.email;
            remove.setAttribute('aria-label', msgWith('removeGuest', 'Remove $1', guest.name || guest.email));
            remove.appendChild(createIcon('fas fa-times'));
            chip.appendChild(remove);

            this.chipList.appendChild(chip);
        });
        this.chipList.hidden = this.guests.length === 0;

        const invalid = this.getFirstInvalid();
        this.errorLine.hidden = !invalid;
        this.errorLine.textContent = invalid
            ? msgWith('guestInvalidEmail', '"$1" is not an email address', invalid.email)
            : '';

        const hasGuests = this.getValidGuests().length > 0;
        this.notifyRow.hidden = !hasGuests;
        this.notifyHint.hidden = !hasGuests;

        this.onChange();
    }
}
