/**
 * StorageCard - Chrome storage inspector and management card
 */
import { CardComponent } from '../base/card-component.js';
import { createButton, createIcon, createIconButton, msg, setText } from '../base/settings-dom.js';
import { StorageHelper } from '../../../lib/storage-helper.js';
import { STORAGE_KEYS } from '../../../lib/constants.js';

export class StorageCard extends CardComponent {
    // Nesting levels cycle through this many line colours (.storage-depth-N)
    static DEPTH_LEVELS = 4;
    static SYNC_QUOTA = 102400;
    static LOCAL_QUOTA = 10485760;

    constructor() {
        super({
            id: 'storage-card',
            title: msg('storageCardTitle', 'Storage'),
            titleLocalize: '__MSG_storageCardTitle__',
            subtitle: msg('storageCardSubtitle', 'Inspect and manage Chrome storage data.'),
            subtitleLocalize: '__MSG_storageCardSubtitle__',
            icon: 'fas fa-database',
            hidden: true
        });
    }

    createElement() {
        const card = super.createElement();
        this.addContent(this._createStorageActionsSection());
        this.addContent(this._createStorageViewerSection());
        return card;
    }

    /**
     * A block's small heading, with an optional control on the right
     * @private
     */
    _createBlockHead(key, fallback, control = null) {
        const head = document.createElement('div');
        head.className = 'settings-block-head';
        const title = setText(document.createElement('h3'), key, fallback);
        title.className = 'settings-block-title';
        head.appendChild(title);
        if (control) head.appendChild(control);
        return head;
    }

    // ------------------------------------------------------------------ Actions

    _createStorageActionsSection() {
        const section = document.createElement('div');
        section.className = 'settings-block';
        section.appendChild(this._createBlockHead('storageActions', 'Actions'));

        const btnGroup = document.createElement('div');
        btnGroup.className = 'settings-button-row';

        btnGroup.appendChild(this._createActionBtn('fas fa-trash-can', 'clearLocalEvents', 'Clear Local Events', 'danger', async () => {
            if (!window.confirm(msg('confirmClearLocalEvents', 'Delete all localEvents_* keys?'))) return;
            try {
                const localData = await StorageHelper.getLocal(null);
                const keys = Object.keys(localData).filter(k => k.startsWith(STORAGE_KEYS.LOCAL_EVENTS_PREFIX));
                if (keys.length > 0) await chrome.storage.local.remove(keys);
                this._showAlert(msg('clearLocalEventsSuccess', 'Local Events deleted.'), 'success');
                await this._refreshViewer();
            } catch (e) {
                this._showAlert(msg('deleteFailed', 'Deletion failed: ') + e.message, 'danger');
            }
        }));

        btnGroup.appendChild(this._createActionBtn('fas fa-eraser', 'clearMemo', 'Clear Memo', 'danger', async () => {
            if (!window.confirm(msg('confirmClearMemo', 'Delete memoContent / memoCollapsed / memoHeight?'))) return;
            try {
                await chrome.storage.local.remove(['memoContent', 'memoCollapsed', 'memoHeight']);
                this._showAlert(msg('clearMemoSuccess', 'Memo data deleted.'), 'success');
                await this._refreshViewer();
            } catch (e) {
                this._showAlert(msg('deleteFailed', 'Deletion failed: ') + e.message, 'danger');
            }
        }));

        btnGroup.appendChild(this._createActionBtn('fas fa-download', 'exportSettings', 'Export Settings', 'secondary', async (e) => {
            const btn = e.currentTarget;
            try {
                const syncData = await StorageHelper.get(null);
                await this._copyToClipboard(JSON.stringify(syncData, null, 2));
                this._showCopyNotification(btn);
            } catch (err) {
                this._showAlert(msg('exportFailed', 'Export failed: ') + err.message, 'danger');
            }
        }));

        section.appendChild(btnGroup);
        return section;
    }

    _createActionBtn(icon, labelKey, labelFallback, kind, handler) {
        const btn = createButton({ icon, labelKey, labelFallback, kind });
        btn.addEventListener('click', handler);
        return btn;
    }

    // ------------------------------------------------------------------ Viewer

    _createStorageViewerSection() {
        const section = document.createElement('div');
        section.className = 'settings-block';

        const refreshBtn = createIconButton({ icon: 'fas fa-arrows-rotate', labelKey: 'storageRefresh', labelFallback: 'Refresh' });
        refreshBtn.addEventListener('click', () => this._refreshViewer());
        section.appendChild(this._createBlockHead('storageViewer', 'Viewer', refreshBtn));

        this._viewerContent = document.createElement('div');
        this._viewerContent.className = 'storage-viewer';
        this._viewerContent.textContent = msg('storageLoading', 'Loading…');
        section.appendChild(this._viewerContent);

        // Load once the card is in the page
        queueMicrotask(() => this._refreshViewer());
        return section;
    }

    async _refreshViewer() {
        const content = this._viewerContent;
        if (!content) return;
        content.textContent = msg('storageLoading', 'Loading…');

        try {
            const syncQuota = chrome.storage.sync.QUOTA_BYTES || StorageCard.SYNC_QUOTA;
            const localQuota = chrome.storage.local.QUOTA_BYTES || StorageCard.LOCAL_QUOTA;

            const [syncData, localData, syncBytesInUse, localBytesInUse] = await Promise.all([
                StorageHelper.get(null),
                StorageHelper.getLocal(null),
                StorageHelper.getBytesInUse(),
                new Promise(resolve => chrome.storage.local.getBytesInUse(null, resolve))
            ]);

            content.innerHTML = '';

            // Usage summary
            const usage = document.createElement('div');
            usage.className = 'storage-usage';
            usage.appendChild(createIcon('fas fa-hard-drive'));
            const usageText = document.createElement('span');
            usageText.textContent = [
                this._formatUsage(msg('storageSyncLabel', 'Sync'), syncBytesInUse, syncQuota),
                this._formatUsage(msg('storageLocalLabel', 'Local'), localBytesInUse, localQuota)
            ].join('   ');
            usage.appendChild(usageText);
            content.appendChild(usage);

            content.appendChild(this._createStorageBlock(msg('syncStorageLabel', 'Sync Storage (Settings)'), syncData));
            content.appendChild(this._createStorageBlock(msg('localStorageLabel', 'Local Storage'), localData));
        } catch (e) {
            content.textContent = msg('storageLoadFailed', 'Failed to load storage: ') + e.message;
        }
    }

    /**
     * "Sync: 571 / 102,400 bytes (0.6%)"
     * @private
     */
    _formatUsage(label, used, quota) {
        return `${label}: ${used.toLocaleString()} / ${quota.toLocaleString()} bytes (${((used / quota) * 100).toFixed(1)}%)`;
    }

    _createStorageBlock(label, data) {
        const details = document.createElement('details');
        details.className = 'storage-block';
        details.open = true;

        const summary = document.createElement('summary');
        summary.className = 'storage-summary';

        const count = Array.isArray(data) ? data.length : Object.keys(data).length;
        const countLabel = Array.isArray(data) ? msg('storageItems', 'items') : msg('storageKeys', 'keys');

        const labelEl = document.createElement('span');
        labelEl.textContent = `${label} (${count} ${countLabel})`;

        summary.appendChild(this._makeChevron());
        summary.appendChild(labelEl);
        details.appendChild(summary);
        details.appendChild(this._createEntriesTable(data));
        return details;
    }

    /**
     * Build a table of key/value rows from an object or array.
     * @param {Object|Array} data
     * @param {number} depth - nesting depth (0 = top level)
     */
    _createEntriesTable(data, depth = 0) {
        if (depth > 10) {
            const el = document.createElement('div');
            el.className = 'storage-note';
            el.textContent = msg('storageDeeplyNested', '(deeply nested, truncated)');
            return el;
        }

        const table = document.createElement('div');
        table.className = `storage-tree storage-depth-${depth % StorageCard.DEPTH_LEVELS}`;

        const entries = Array.isArray(data)
            ? data.map((v, i) => [String(i), v])
            : Object.entries(data);

        if (entries.length === 0) {
            table.classList.add('is-empty');
            const empty = document.createElement('div');
            empty.className = 'storage-note';
            empty.textContent = msg('storageEmpty', '(empty)');
            table.appendChild(empty);
            return table;
        }

        entries.forEach(([key, value]) => {
            const isNested = typeof value === 'object' && value !== null;

            const keyEl = document.createElement('span');
            keyEl.className = 'storage-key';
            keyEl.textContent = key;

            if (isNested) {
                const details = document.createElement('details');
                details.className = 'storage-entry-group';

                const summary = document.createElement('summary');
                summary.className = 'storage-entry';

                const metaEl = document.createElement('span');
                metaEl.className = 'storage-value';
                metaEl.textContent = Array.isArray(value)
                    ? `[${value.length} ${msg('storageItems', 'items')}]`
                    : `{${Object.keys(value).length} ${msg('storageKeys', 'keys')}}`;

                summary.appendChild(this._makeChevron());
                summary.appendChild(keyEl);
                summary.appendChild(metaEl);
                summary.appendChild(this._makeCopyBtn(JSON.stringify(value)));
                details.appendChild(summary);
                details.appendChild(this._createEntriesTable(value, depth + 1));
                table.appendChild(details);
            } else {
                const row = document.createElement('div');
                row.className = 'storage-entry';

                const valEl = document.createElement('span');
                valEl.className = 'storage-value';
                const str = String(value);
                valEl.textContent = str.length > 80 ? str.slice(0, 80) + '…' : str;
                valEl.title = str;

                row.appendChild(keyEl);
                row.appendChild(valEl);
                row.appendChild(this._makeCopyBtn(str));
                table.appendChild(row);
            }
        });

        return table;
    }

    /**
     * A chevron for a summary; it turns when its details opens (CSS).
     */
    _makeChevron() {
        return createIcon('fas fa-chevron-right storage-chevron');
    }

    _makeCopyBtn(rawValue) {
        const copyBtn = createIconButton({ icon: 'fas fa-copy', labelKey: 'storageCopy', labelFallback: 'Copy' });
        copyBtn.classList.add('storage-copy-btn');
        copyBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await this._copyToClipboard(rawValue);
            this._showCopyNotification(copyBtn);
        });
        return copyBtn;
    }
}
