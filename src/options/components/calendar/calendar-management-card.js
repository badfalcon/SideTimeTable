/**
 * CalendarManagementCard - カレンダー管理カードコンポーネント
 */
import { CardComponent } from '../base/card-component.js';
import { loadSelectedCalendars, saveSelectedCalendars, logError } from '../../../lib/utils.js';

export class CalendarManagementCard extends CardComponent {
    constructor() {
        super({
            id: 'calendar-management-card',
            title: 'カレンダー管理',
            titleLocalize: '__MSG_calendarSelection__',
            subtitle: '表示するGoogleカレンダーを選択し、色を設定できます。',
            subtitleLocalize: '__MSG_calendarSelectionDescription__',
            icon: 'fas fa-calendar-alt',
            iconColor: 'text-success',
            hidden: true
        });

        this.availableCalendars = {};
        this.selectedCalendarIds = [];
        this.hasAutoFetched = false;
        this.allCalendars = [];

        // UI要素の参照
        this.refreshBtn = null;
        this.loadingIndicator = null;
        this.calendarList = null;
        this.noCalendarsMsg = null;
        this.searchInput = null;
        this.clearSearchBtn = null;
    }

    createElement() {
        const card = super.createElement();

        // コントロールボタン
        const controlsDiv = this._createControlsSection();
        this.addContent(controlsDiv);

        // 検索フィールド
        const searchDiv = this._createSearchSection();
        this.addContent(searchDiv);

        // カレンダーリストコンテナ
        const listContainer = this._createListContainer();
        this.addContent(listContainer);

        this._setupEventListeners();

        return card;
    }

    /**
     * コントロールセクションを作成
     * @private
     */
    _createControlsSection() {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'd-flex align-items-center mb-3';

        // 更新ボタン
        this.refreshBtn = document.createElement('button');
        this.refreshBtn.id = 'refresh-calendars-btn';
        this.refreshBtn.className = 'btn btn-outline-primary btn-sm';
        this.refreshBtn.innerHTML = `
            <i class="fas fa-refresh me-1"></i>
            <span data-localize="__MSG_refreshCalendars__">更新</span>
        `;

        // ローディングインジケーター
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.id = 'calendar-loading-indicator';
        this.loadingIndicator.className = 'ms-2';
        this.loadingIndicator.style.display = 'none';
        this.loadingIndicator.innerHTML = `
            <div class="spinner-border spinner-border-sm text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        `;

        controlsDiv.appendChild(this.refreshBtn);
        controlsDiv.appendChild(this.loadingIndicator);

        return controlsDiv;
    }

    /**
     * 検索セクションを作成
     * @private
     */
    _createSearchSection() {
        const searchDiv = document.createElement('div');
        searchDiv.className = 'mb-3';

        const inputGroup = document.createElement('div');
        inputGroup.className = 'input-group';

        // 検索アイコン
        const iconSpan = document.createElement('span');
        iconSpan.className = 'input-group-text';
        iconSpan.innerHTML = '<i class="fas fa-search text-muted"></i>';

        // 検索入力フィールド
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.id = 'calendar-search';
        this.searchInput.className = 'form-control';
        this.searchInput.placeholder = 'カレンダーを検索...';
        this.searchInput.setAttribute('data-localize-placeholder', '__MSG_searchCalendars__');

        // クリアボタン
        this.clearSearchBtn = document.createElement('button');
        this.clearSearchBtn.id = 'clear-search-btn';
        this.clearSearchBtn.className = 'btn btn-outline-secondary';
        this.clearSearchBtn.type = 'button';
        this.clearSearchBtn.style.display = 'none';
        this.clearSearchBtn.innerHTML = '<i class="fas fa-times"></i>';

        inputGroup.appendChild(iconSpan);
        inputGroup.appendChild(this.searchInput);
        inputGroup.appendChild(this.clearSearchBtn);
        searchDiv.appendChild(inputGroup);

        return searchDiv;
    }

    /**
     * リストコンテナを作成
     * @private
     */
    _createListContainer() {
        const container = document.createElement('div');

        // カレンダーリスト
        this.calendarList = document.createElement('div');
        this.calendarList.id = 'calendar-list';
        this.calendarList.className = 'list-group';

        // 見つからないメッセージ
        this.noCalendarsMsg = document.createElement('div');
        this.noCalendarsMsg.id = 'no-calendars-msg';
        this.noCalendarsMsg.className = 'text-muted';
        this.noCalendarsMsg.style.display = 'none';
        this.noCalendarsMsg.setAttribute('data-localize', '__MSG_noCalendarsFound__');
        this.noCalendarsMsg.textContent = 'カレンダーが見つかりませんでした。';

        container.appendChild(this.calendarList);
        container.appendChild(this.noCalendarsMsg);

        return container;
    }

    /**
     * イベントリスナーを設定
     * @private
     */
    _setupEventListeners() {
        // 更新ボタン
        this.refreshBtn?.addEventListener('click', () => this.refreshCalendars());

        // 検索機能
        this.searchInput?.addEventListener('input', (e) => this._handleSearch(e.target.value));
        this.searchInput?.addEventListener('keyup', (e) => {
            if (e.key === 'Escape') {
                this._clearSearch();
            }
        });

        this.clearSearchBtn?.addEventListener('click', () => this._clearSearch());

        // イベント委譲でカレンダーチェックボックス処理
        this.calendarList?.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                this._handleCalendarToggle(e);
            }
        });
    }

    /**
     * データを読み込み
     */
    async loadData() {
        try {
            this.selectedCalendarIds = this._validateSelectedIds(await loadSelectedCalendars());
            this.render();
        } catch (error) {
            logError('カレンダーデータ読み込み', error);
            this._showError('カレンダーデータの読み込みに失敗しました');
        }
    }

    /**
     * カードを表示
     */
    show() {
        this.setVisible(true);

        // 初回表示時にカレンダーを自動取得
        if (!this.hasAutoFetched && (!this.allCalendars || this.allCalendars.length === 0)) {
            this.hasAutoFetched = true;
            this.refreshCalendars();
        }
    }

    /**
     * カードを非表示
     */
    hide() {
        this.setVisible(false);
    }

    /**
     * カレンダー一覧を更新
     */
    async refreshCalendars() {
        this._setLoading(true);

        try {
            const response = await new Promise((resolve) => {
                const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
                chrome.runtime.sendMessage({action: 'getCalendarList', requestId}, resolve);
            });

            if (response.error) {
                const detail = response.errorType ? `${response.error} (${response.errorType})` : response.error;
                const rid = response.requestId ? ` [Request ID: ${response.requestId}]` : '';
                throw new Error(detail + rid);
            }

            if (response.calendars) {
                this.allCalendars = response.calendars;

                // プライマリカレンダーのみを自動選択（選択されていない場合）
                if (this.selectedCalendarIds.length === 0) {
                    const primaryCalendar = response.calendars.find(cal => cal.primary);
                    if (primaryCalendar) {
                        this.selectedCalendarIds = [primaryCalendar.id];
                    }
                }

                // プライマリカレンダーが選択に含まれていない場合は追加
                const primaryCalendar = response.calendars.find(cal => cal.primary);
                if (primaryCalendar && !this.selectedCalendarIds.includes(primaryCalendar.id)) {
                    this.selectedCalendarIds.unshift(primaryCalendar.id);
                }

                await saveSelectedCalendars(this.selectedCalendarIds);
                this.render();
            }
        } catch (error) {
            logError('カレンダー一覧更新', error);
            this._showError(`カレンダーの更新に失敗しました: ${error.message || '不明なエラー'}`);
        } finally {
            this._setLoading(false);
        }
    }

    /**
     * カレンダーリストを描画
     */
    render() {
        if (!this.allCalendars || this.allCalendars.length === 0) {
            this._showEmptyState();
            return;
        }

        // 検索フィルターを適用
        const searchTerm = this.searchInput?.value.toLowerCase().trim() || '';
        const filteredCalendars = searchTerm
            ? this.allCalendars.filter(calendar =>
                calendar.summary.toLowerCase().includes(searchTerm))
            : this.allCalendars;

        // カレンダーをソート（プライマリを最初に）
        const sortedCalendars = [...filteredCalendars].sort((a, b) => {
            if (a.primary && !b.primary) return -1;
            if (!a.primary && b.primary) return 1;
            return a.summary.localeCompare(b.summary, 'ja');
        });

        if (sortedCalendars.length === 0 && searchTerm) {
            this._showNoSearchResults();
            return;
        }

        this._hideEmptyState();
        this.calendarList.innerHTML = '';

        sortedCalendars.forEach(calendar => {
            const isSelected = this.selectedCalendarIds.includes(calendar.id);
            const item = this._createCalendarItem(calendar, isSelected);
            this.calendarList.appendChild(item);
        });

        this._updateSearchUI(searchTerm);
    }

    /**
     * カレンダーアイテムを作成
     * @private
     */
    _createCalendarItem(calendar, isSelected) {
        const item = document.createElement('div');
        item.className = 'list-group-item d-flex align-items-center py-2';
        item.dataset.calendarId = calendar.id;

        // チェックボックス
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-check-input me-3';
        checkbox.checked = isSelected;

        if (calendar.primary) {
            checkbox.disabled = true;
            checkbox.checked = true;
        }

        // カレンダー情報
        const info = document.createElement('div');
        info.className = 'flex-grow-1';

        const name = document.createElement('div');
        name.className = 'fw-bold';
        name.textContent = calendar.summary;
        if (calendar.primary) {
            name.classList.add('text-primary');
        }

        info.appendChild(name);

        // カラーインジケーター
        const colorIndicator = document.createElement('div');
        colorIndicator.className = 'me-2';
        colorIndicator.style.cssText = `
            width: 12px;
            height: 12px;
            background-color: ${calendar.backgroundColor || '#ccc'};
            border-radius: 50%;
            border: 1px solid #ddd;
        `;

        item.appendChild(checkbox);
        item.appendChild(info);
        item.appendChild(colorIndicator);

        return item;
    }

    /**
     * 検索処理
     * @private
     */
    _handleSearch(searchTerm) {
        this.render();
    }

    /**
     * 検索をクリア
     * @private
     */
    _clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
            this.render();
        }
    }

    /**
     * カレンダー選択の切り替え
     * @private
     */
    async _handleCalendarToggle(event) {
        const calendarId = event.target.closest('[data-calendar-id]')?.dataset.calendarId;
        if (!calendarId) return;

        const isChecked = event.target.checked;

        if (isChecked) {
            if (!this.selectedCalendarIds.includes(calendarId)) {
                this.selectedCalendarIds.push(calendarId);
            }
        } else {
            this.selectedCalendarIds = this.selectedCalendarIds.filter(id => id !== calendarId);
        }

        try {
            await saveSelectedCalendars(this.selectedCalendarIds);
        } catch (error) {
            logError('カレンダー選択保存', error);
            this._showError('設定の保存に失敗しました');
        }
    }

    /**
     * ローディング状態を設定
     * @private
     */
    _setLoading(loading) {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = loading ? 'block' : 'none';
        }
        if (this.refreshBtn) {
            this.refreshBtn.disabled = loading;
        }
    }

    /**
     * 空の状態を表示
     * @private
     */
    _showEmptyState() {
        this.calendarList.innerHTML = '';
        this.noCalendarsMsg.style.display = 'block';
    }

    /**
     * 検索結果なしを表示
     * @private
     */
    _showNoSearchResults() {
        this.calendarList.innerHTML = '<div class="text-muted text-center p-3">検索結果が見つかりませんでした</div>';
        this.noCalendarsMsg.style.display = 'none';
    }

    /**
     * 空の状態を非表示
     * @private
     */
    _hideEmptyState() {
        this.noCalendarsMsg.style.display = 'none';
    }

    /**
     * 検索UIを更新
     * @private
     */
    _updateSearchUI(searchTerm) {
        if (this.clearSearchBtn) {
            this.clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
        }
    }

    /**
     * エラーを表示
     * @private
     */
    _showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger alert-dismissible fade show';
        errorDiv.innerHTML = `
            <strong>エラー:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        if (this.calendarList?.parentElement) {
            this.calendarList.parentElement.insertBefore(errorDiv, this.calendarList);
        }
    }

    /**
     * 選択されたIDを検証
     * @private
     */
    _validateSelectedIds(ids) {
        return Array.isArray(ids) ? ids : [];
    }
}