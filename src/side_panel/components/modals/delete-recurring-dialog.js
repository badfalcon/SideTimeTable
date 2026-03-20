/**
 * DeleteRecurringDialog - Helper class for the delete recurring event confirmation dialog
 *
 * Manages the overlay dialog that asks whether to delete a single occurrence
 * or all occurrences of a recurring event.
 * This is a plain helper class (not a Component subclass).
 */

export class DeleteRecurringDialog {
    constructor() {
        // Tracked overlay element for cleanup
        this._overlay = null;
    }

    /**
     * Show the delete recurring event dialog
     * @param {Object} event - The recurring event being deleted
     * @param {Object} callbacks - { onDeleteThis, onDeleteAll, onCancel }
     */
    show(event, callbacks = {}) {
        // Remove any existing overlay first
        this.remove();

        // Create dialog overlay
        const overlay = document.createElement('div');
        overlay.className = 'delete-recurring-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10001; display: flex; align-items: center; justify-content: center;';

        const dialog = document.createElement('div');
        dialog.className = 'delete-recurring-dialog';
        dialog.style.cssText = 'background: var(--side-calendar-modal-bg); color: inherit; padding: 20px; border-radius: 8px; max-width: 300px; text-align: center;';

        const title = document.createElement('h3');
        title.style.cssText = 'margin: 0 0 15px 0; font-size: 1.1em;';
        title.setAttribute('data-localize', '__MSG_deleteRecurringTitle__');
        title.textContent = window.getLocalizedMessage('deleteRecurringTitle') || 'Delete recurring event?';
        dialog.appendChild(title);

        const message = document.createElement('p');
        message.style.cssText = 'margin: 0 0 20px 0; font-size: 0.9em; color: var(--side-calendar-secondary-text-color);';
        message.setAttribute('data-localize', '__MSG_deleteRecurringMessage__');
        message.textContent = window.getLocalizedMessage('deleteRecurringMessage') || 'Do you want to delete this occurrence only or all occurrences?';
        dialog.appendChild(message);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';

        // Delete this occurrence only
        const deleteThisBtn = document.createElement('button');
        deleteThisBtn.className = 'btn btn-outline-danger';
        deleteThisBtn.style.cssText = 'width: 100%; padding: 8px;';
        deleteThisBtn.setAttribute('data-localize', '__MSG_deleteThisOccurrence__');
        deleteThisBtn.textContent = window.getLocalizedMessage('deleteThisOccurrence') || 'Delete this occurrence';
        deleteThisBtn.addEventListener('click', () => {
            this.remove();
            if (callbacks.onDeleteThis) {
                callbacks.onDeleteThis(event);
            }
        });

        // Delete all occurrences
        const deleteAllBtn = document.createElement('button');
        deleteAllBtn.className = 'btn btn-danger';
        deleteAllBtn.style.cssText = 'width: 100%; padding: 8px;';
        deleteAllBtn.setAttribute('data-localize', '__MSG_deleteAllOccurrences__');
        deleteAllBtn.textContent = window.getLocalizedMessage('deleteAllOccurrences') || 'Delete all occurrences';
        deleteAllBtn.addEventListener('click', () => {
            this.remove();
            if (callbacks.onDeleteAll) {
                callbacks.onDeleteAll(event);
            }
        });

        // Cancel
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.style.cssText = 'width: 100%; padding: 8px;';
        cancelBtn.setAttribute('data-localize', '__MSG_cancel__');
        cancelBtn.textContent = window.getLocalizedMessage('cancel') || 'Cancel';
        cancelBtn.addEventListener('click', () => {
            this.remove();
        });

        buttonContainer.appendChild(deleteThisBtn);
        buttonContainer.appendChild(deleteAllBtn);
        buttonContainer.appendChild(cancelBtn);
        dialog.appendChild(buttonContainer);

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        this._overlay = overlay;

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.remove();
            }
        });
    }

    /**
     * Remove the dialog overlay from the DOM
     */
    remove() {
        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }
    }
}
