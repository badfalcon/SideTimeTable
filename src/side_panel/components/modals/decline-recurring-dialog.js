/**
 * DeclineRecurringDialog - Confirmation dialog when declining a recurring Google event instance
 *
 * The Google Calendar API's `singleEvents=true` returns expanded instances, so a PATCH
 * to attendee.responseStatus only affects that single occurrence. This dialog makes that
 * scope explicit to the user before sending the API request.
 */

export class DeclineRecurringDialog {
    constructor() {
        this._overlay = null;
    }

    /**
     * Show the decline confirmation dialog
     * @param {Object} event - The recurring event instance
     * @param {Object} callbacks - { onConfirm, onCancel }
     */
    show(event, callbacks = {}) {
        this.remove();

        const overlay = document.createElement('div');
        overlay.className = 'decline-recurring-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10001; display: flex; align-items: center; justify-content: center;';

        const dialog = document.createElement('div');
        dialog.className = 'decline-recurring-dialog';
        dialog.style.cssText = 'background: var(--side-calendar-modal-bg); color: inherit; padding: 20px; border-radius: 8px; max-width: 320px; text-align: center;';

        const title = document.createElement('h3');
        title.style.cssText = 'margin: 0 0 15px 0; font-size: 1.1em;';
        title.setAttribute('data-localize', '__MSG_declineRecurringTitle__');
        title.textContent = window.getLocalizedMessage('declineRecurringTitle') || 'Decline this event?';
        dialog.appendChild(title);

        const message = document.createElement('p');
        message.style.cssText = 'margin: 0 0 20px 0; font-size: 0.9em; color: var(--side-calendar-secondary-text-color);';
        message.setAttribute('data-localize', '__MSG_declineRecurringMessage__');
        message.textContent = window.getLocalizedMessage('declineRecurringMessage') || 'Only this occurrence will be marked as declined. Future occurrences are not affected.';
        dialog.appendChild(message);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn btn-danger';
        confirmBtn.style.cssText = 'width: 100%; padding: 8px;';
        confirmBtn.setAttribute('data-localize', '__MSG_declineThisOccurrence__');
        confirmBtn.textContent = window.getLocalizedMessage('declineThisOccurrence') || 'Decline this occurrence';
        confirmBtn.addEventListener('click', () => {
            this.remove();
            if (callbacks.onConfirm) {
                callbacks.onConfirm(event);
            }
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.style.cssText = 'width: 100%; padding: 8px;';
        cancelBtn.setAttribute('data-localize', '__MSG_cancel__');
        cancelBtn.textContent = window.getLocalizedMessage('cancel') || 'Cancel';
        cancelBtn.addEventListener('click', () => {
            this.remove();
            if (callbacks.onCancel) {
                callbacks.onCancel();
            }
        });

        buttonContainer.appendChild(confirmBtn);
        buttonContainer.appendChild(cancelBtn);
        dialog.appendChild(buttonContainer);

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        this._overlay = overlay;

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.remove();
                if (callbacks.onCancel) {
                    callbacks.onCancel();
                }
            }
        });
    }

    remove() {
        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }
    }
}
