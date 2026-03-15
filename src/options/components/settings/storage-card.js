/**
 * StorageCard - Chrome storage inspector and management card
 */
import { CardComponent } from '../base/card-component.js';
import { StorageHelper } from '../../../lib/storage-helper.js';
import { STORAGE_KEYS } from '../../../lib/utils.js';

export class StorageCard extends CardComponent {
    // 階層ごとの縦線の色
    static DEPTH_COLORS = Object.freeze(['#6c757d', '#0d6efd', '#198754', '#dc3545', '#fd7e14', '#6f42c1']);
    static SYNC_QUOTA = 102400;
    static LOCAL_QUOTA = 10485760;

    constructor() {
        super({
            id: 'storage-card',
            title: 'Storage',
            subtitle: 'Inspect and manage Chrome storage data.',
            icon: 'fas fa-database',
            iconColor: 'text-info',
            hidden: true
        });
    }

    createElement() {
        const card = super.createElement();
        this.addContent(this._createContent());
        return card;
    }

    _createContent() {
        const container = document.createElement('div');
        container.appendChild(this._createStorageActionsSection());
        container.appendChild(this._createStorageViewerSection());
        return container;
    }

    // ------------------------------------------------------------------ Actions

    _createStorageActionsSection() {
        const section = document.createElement('div');
        section.className = 'mb-4';

        const title = document.createElement('h6');
        title.className = 'mb-3 text-secondary';
        title.innerHTML = `<i class="fas fa-tools me-1"></i>${chrome.i18n.getMessage('storageActions') || 'Actions'}`;

        const btnGroup = document.createElement('div');
        btnGroup.className = 'd-flex flex-wrap gap-2';

        btnGroup.appendChild(this._createActionBtn('trash', 'Clear Local Events', 'danger', async () => {
            if (!window.confirm(chrome.i18n.getMessage('confirmClearLocalEvents') || 'Delete all localEvents_* keys?')) return;
            try {
                const localData = await StorageHelper.getLocal(null);
                const keys = Object.keys(localData).filter(k => k.startsWith(STORAGE_KEYS.LOCAL_EVENTS_PREFIX));
                if (keys.length > 0) await chrome.storage.local.remove(keys);
                this._showAlert(chrome.i18n.getMessage('clearLocalEventsSuccess') || 'Local Events deleted.', 'success');
                await this._refreshViewer();
            } catch (e) {
                this._showAlert((chrome.i18n.getMessage('deleteFailed') || 'Deletion failed: ') + e.message, 'danger');
            }
        }));

        btnGroup.appendChild(this._createActionBtn('eraser', 'Clear Memo', 'warning', async () => {
            if (!window.confirm(chrome.i18n.getMessage('confirmClearMemo') || 'Delete memoContent / memoCollapsed / memoHeight?')) return;
            try {
                await chrome.storage.local.remove(['memoContent', 'memoCollapsed', 'memoHeight']);
                this._showAlert(chrome.i18n.getMessage('clearMemoSuccess') || 'Memo data deleted.', 'success');
                await this._refreshViewer();
            } catch (e) {
                this._showAlert((chrome.i18n.getMessage('deleteFailed') || 'Deletion failed: ') + e.message, 'danger');
            }
        }));

        btnGroup.appendChild(this._createActionBtn('download', 'Export Settings', 'primary', async (e) => {
            const btn = e.currentTarget;
            try {
                const syncData = await StorageHelper.get(null);
                await this._copyToClipboard(JSON.stringify(syncData, null, 2));
                this._showCopyNotification(btn);
            } catch (err) {
                this._showAlert((chrome.i18n.getMessage('exportFailed') || 'Export failed: ') + err.message, 'danger');
            }
        }));

        section.appendChild(title);
        section.appendChild(btnGroup);
        return section;
    }

    _createActionBtn(icon, label, variant, handler) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `btn btn-outline-${variant} btn-sm`;
        btn.innerHTML = `<i class="fas fa-${icon} me-1"></i>${label}`;
        btn.addEventListener('click', handler);
        return btn;
    }

    // ------------------------------------------------------------------ Viewer

    _createStorageViewerSection() {
        const section = document.createElement('div');

        const header = document.createElement('div');
        header.className = 'd-flex justify-content-between align-items-center mb-2';

        const title = document.createElement('h6');
        title.className = 'mb-0 text-secondary';
        title.innerHTML = `<i class="fas fa-eye me-1"></i>${chrome.i18n.getMessage('storageViewer') || 'Viewer'}`;

        const refreshBtn = document.createElement('button');
        refreshBtn.type = 'button';
        refreshBtn.className = 'btn btn-outline-secondary btn-sm';
        refreshBtn.innerHTML = `<i class="fas fa-sync-alt me-1"></i>${chrome.i18n.getMessage('storageRefresh') || 'Refresh'}`;
        refreshBtn.addEventListener('click', () => this._refreshViewer());

        header.appendChild(title);
        header.appendChild(refreshBtn);

        this._viewerContent = document.createElement('div');
        this._viewerContent.className = 'small';
        this._viewerContent.textContent = chrome.i18n.getMessage('storageLoading') || 'Loading…';

        section.appendChild(header);
        section.appendChild(this._viewerContent);

        // DOM に追加された後に非同期で読み込む
        queueMicrotask(() => this._refreshViewer());
        return section;
    }

    async _refreshViewer() {
        const content = this._viewerContent;
        if (!content) return;
        content.textContent = chrome.i18n.getMessage('storageLoading') || 'Loading…';

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
            const usageDiv = document.createElement('div');
            usageDiv.className = 'text-muted mb-3 p-2 bg-light rounded small';
            const syncPct = ((syncBytesInUse / syncQuota) * 100).toFixed(1);
            const localPct = ((localBytesInUse / localQuota) * 100).toFixed(1);
            usageDiv.innerHTML =
                `<i class="fas fa-hdd me-1"></i>` +
                `Sync: <strong>${syncBytesInUse.toLocaleString()}</strong> / ${syncQuota.toLocaleString()} bytes (${syncPct}%)&nbsp;&nbsp;` +
                `Local: <strong>${localBytesInUse.toLocaleString()}</strong> / ${localQuota.toLocaleString()} bytes (${localPct}%)`;
            content.appendChild(usageDiv);

            content.appendChild(this._createStorageBlock('Sync Storage (Settings)', syncData));
            content.appendChild(this._createStorageBlock('Local Storage', localData));
        } catch (e) {
            content.textContent = (chrome.i18n.getMessage('storageLoadFailed') || 'Failed to load storage: ') + e.message;
        }
    }

    _createStorageBlock(label, data) {
        const details = document.createElement('details');
        details.className = 'mb-2';
        details.open = true;

        const summary = document.createElement('summary');
        summary.className = 'fw-semibold text-secondary d-flex align-items-center gap-2';
        summary.style.listStyle = 'none';

        const chevron = this._makeChevron(details, { open: true });
        const count = Array.isArray(data) ? data.length : Object.keys(data).length;
        const countLabel = Array.isArray(data) ? 'items' : 'keys';

        const labelEl = document.createElement('span');
        labelEl.textContent = `${label} (${count} ${countLabel})`;

        summary.appendChild(chevron);
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
            el.className = 'text-muted fst-italic small';
            el.textContent = '(deeply nested, truncated)';
            return el;
        }

        const table = document.createElement('div');
        table.style.borderLeft = `2px solid ${StorageCard.DEPTH_COLORS[depth % StorageCard.DEPTH_COLORS.length]}`;
        table.style.marginLeft = '6px';
        table.style.paddingLeft = '8px';
        table.style.marginTop = '2px';

        const entries = Array.isArray(data)
            ? data.map((v, i) => [String(i), v])
            : Object.entries(data);

        if (entries.length === 0) {
            table.style.borderLeft = 'none';
            const empty = document.createElement('div');
            empty.className = 'text-muted fst-italic';
            empty.textContent = '(empty)';
            table.appendChild(empty);
            return table;
        }

        entries.forEach(([key, value]) => {
            const isNested = typeof value === 'object' && value !== null;

            if (isNested) {
                const details = document.createElement('details');
                details.className = 'py-1 border-bottom';

                const summary = document.createElement('summary');
                summary.className = 'd-flex justify-content-between align-items-center gap-2';
                summary.style.listStyle = 'none';

                const color = StorageCard.DEPTH_COLORS[(depth + 1) % StorageCard.DEPTH_COLORS.length];
                const chevron = this._makeChevron(details, { color });

                const keyEl = document.createElement('span');
                keyEl.className = 'fw-semibold text-nowrap';
                keyEl.textContent = key;

                const metaEl = document.createElement('code');
                metaEl.className = 'text-muted small ms-auto';
                metaEl.textContent = Array.isArray(value)
                    ? `[${value.length} items]`
                    : `{${Object.keys(value).length} keys}`;

                summary.appendChild(chevron);
                summary.appendChild(keyEl);
                summary.appendChild(metaEl);
                summary.appendChild(this._makeCopyBtn(JSON.stringify(value)));
                details.appendChild(summary);
                details.appendChild(this._createEntriesTable(value, depth + 1));
                table.appendChild(details);
            } else {
                const row = document.createElement('div');
                row.className = 'd-flex justify-content-between align-items-center py-1 border-bottom gap-2';

                const keyEl = document.createElement('span');
                keyEl.className = 'fw-semibold text-nowrap';
                keyEl.textContent = key;

                const valContainer = document.createElement('div');
                valContainer.className = 'd-flex align-items-center gap-1';

                const valEl = document.createElement('code');
                valEl.className = 'text-break';
                const str = String(value);
                valEl.textContent = str.length > 80 ? str.slice(0, 80) + '…' : str;

                valContainer.appendChild(valEl);
                valContainer.appendChild(this._makeCopyBtn(String(value)));
                row.appendChild(keyEl);
                row.appendChild(valContainer);
                table.appendChild(row);
            }
        });

        return table;
    }

    /**
     * Create a chevron icon and bind it to a details element's toggle.
     * @param {HTMLDetailsElement} details
     * @param {{ color?: string, open?: boolean }} options
     */
    _makeChevron(details, { color, open = false } = {}) {
        const chevron = document.createElement('i');
        chevron.className = 'fas fa-chevron-right fa-xs flex-shrink-0';
        chevron.style.transition = 'transform 0.15s';
        if (color) chevron.style.color = color;
        if (open) chevron.style.transform = 'rotate(90deg)';
        details.addEventListener('toggle', () => {
            chevron.style.transform = details.open ? 'rotate(90deg)' : '';
        });
        return chevron;
    }

    _makeCopyBtn(rawValue) {
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'btn btn-outline-secondary btn-sm py-0 px-1 flex-shrink-0';
        copyBtn.innerHTML = '<i class="fas fa-copy fa-xs"></i>';
        copyBtn.title = chrome.i18n.getMessage('storageCopy') || 'Copy';
        copyBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this._copyToClipboard(rawValue);
            this._showCopyNotification(copyBtn);
        });
        return copyBtn;
    }

}
