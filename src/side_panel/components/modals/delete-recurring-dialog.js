/**
 * DeleteRecurringDialog - Asks how much of a recurring event to delete
 *
 * Two choices as radio cards — this occurrence (the default) or the whole
 * series — then Cancel and a single red Delete, so the destructive action is
 * one button whatever the scope.
 * This is a plain helper class (not a Component subclass): the dialog is an
 * overlay on top of the event dialog and lives only while it is open.
 */
import { createButton, msg, msgWith, setLocalizedText } from './event-dialog-dom.js';

export class DeleteRecurringDialog {
    constructor() {
        // Tracked overlay element for cleanup
        this._overlay = null;
        this._returnFocusTo = null;
    }

    /**
     * Whether the dialog is open.
     * @returns {boolean}
     */
    isOpen() {
        return !!this._overlay;
    }

    /**
     * Show the dialog.
     * @param {Object} event - The recurring event being deleted
     * @param {Object} options
     * @param {Date} [options.date] - The occurrence being looked at
     * @param {HTMLElement} [options.returnFocusTo] - Refocused when the dialog is dismissed
     * @param {Function} [options.onDeleteThis]
     * @param {Function} [options.onDeleteAll]
     */
    show(event, options = {}) {
        // Remove any existing overlay first
        this.remove();
        this._returnFocusTo = options.returnFocusTo || null;

        const overlay = document.createElement('div');
        overlay.className = 'delete-recurring-overlay';

        const dialog = document.createElement('div');
        dialog.className = 'delete-recurring-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'deleteRecurringTitle');

        const title = document.createElement('h2');
        title.id = 'deleteRecurringTitle';
        title.className = 'delete-recurring-title';
        dialog.appendChild(setLocalizedText(title, 'deleteRecurringTitle', 'Delete recurring event'));

        const fieldset = document.createElement('fieldset');
        fieldset.className = 'delete-scope-options';
        const legend = document.createElement('legend');
        legend.className = 'visually-hidden';
        fieldset.appendChild(setLocalizedText(legend, 'deleteScopeLegend', 'What to delete'));

        const thisOption = this._createOption({
            value: 'this',
            checked: true,
            mainKey: 'deleteScopeThis',
            mainFallback: 'This event',
            detail: this._occurrenceDetail(options.date)
        });
        const allOption = this._createOption({
            value: 'all',
            checked: false,
            mainKey: 'deleteScopeAll',
            mainFallback: 'All events',
            detail: msg('deleteScopeAllDetail', 'Every occurrence in this series')
        });
        fieldset.appendChild(thisOption.label);
        fieldset.appendChild(allOption.label);
        dialog.appendChild(fieldset);

        const actions = document.createElement('div');
        actions.className = 'delete-recurring-actions';
        // A tiny owner shim: the overlay is removed as a whole, taking these
        // listeners with it.
        const owner = { addEventListener: (el, type, fn) => el.addEventListener(type, fn) };
        actions.appendChild(createButton(owner, {
            variant: 'secondary',
            msgKey: 'cancel',
            fallback: 'Cancel',
            onClick: () => this.dismiss()
        }));
        actions.appendChild(createButton(owner, {
            id: 'deleteRecurringConfirmButton',
            variant: 'danger',
            msgKey: 'delete',
            fallback: 'Delete',
            onClick: () => {
                const deleteAll = allOption.input.checked;
                this.remove();
                if (deleteAll) {
                    options.onDeleteAll?.(event);
                } else {
                    options.onDeleteThis?.(event);
                }
            }
        }));
        dialog.appendChild(actions);

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        this._overlay = overlay;

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.dismiss();
            }
        });

        overlay.addEventListener('keydown', (e) => {
            // Escape closes this dialog only, not the event dialog underneath
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                this.dismiss();
                return;
            }
            // Keep Tab inside the dialog while it is modal
            if (e.key === 'Tab') {
                const stops = [...dialog.querySelectorAll('input:checked, button')];
                const first = stops[0];
                const last = stops[stops.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });

        thisOption.input.focus();
    }

    /**
     * One radio card: the choice, and what it covers in smaller text.
     * @private
     */
    _createOption({ value, checked, mainKey, mainFallback, detail }) {
        const label = document.createElement('label');
        label.className = 'delete-scope-option';

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'deleteRecurringScope';
        input.value = value;
        input.checked = checked;
        label.appendChild(input);

        const text = document.createElement('span');
        text.className = 'delete-scope-text';
        const main = document.createElement('span');
        main.className = 'delete-scope-main';
        text.appendChild(setLocalizedText(main, mainKey, mainFallback));
        const sub = document.createElement('span');
        sub.className = 'delete-scope-detail';
        sub.textContent = detail;
        text.appendChild(sub);
        label.appendChild(text);

        return { label, input };
    }

    /**
     * "Only Thu, Sep 25" / "9月25日(木)の回だけ" for the occurrence on screen.
     * @param {Date} [date]
     * @returns {string}
     * @private
     */
    _occurrenceDetail(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return msg('deleteScopeThisDetailNoDate', 'Only this occurrence');
        }
        const locale = navigator.language || 'en';
        const isJa = locale.startsWith('ja');
        const dateText = date.toLocaleDateString(isJa ? 'ja-JP' : 'en-US', isJa
            ? { month: 'long', day: 'numeric', weekday: 'short' }
            : { weekday: 'short', month: 'short', day: 'numeric' });
        return msgWith('deleteScopeThisDetail', 'Only $1', dateText);
    }

    /**
     * Close without deleting, and give focus back to where it came from.
     */
    dismiss() {
        const target = this._returnFocusTo;
        this.remove();
        target?.focus();
    }

    /**
     * Remove the dialog overlay from the DOM
     */
    remove() {
        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }
        this._returnFocusTo = null;
    }
}
