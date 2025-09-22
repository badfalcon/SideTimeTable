/**
 * HeaderComponent - サイドパネルヘッダーコンポーネント
 */
import { Component } from '../base/component.js';

export class HeaderComponent extends Component {
    constructor(options = {}) {
        super({
            id: 'sideTimeTableHeaderWrapper',
            className: '',
            ...options
        });

        // コールバック関数
        this.onAddEvent = options.onAddEvent || null;
        this.onDateChange = options.onDateChange || null;
        this.onSettingsClick = options.onSettingsClick || null;

        // UI要素
        this.addEventButton = null;
        this.prevDateButton = null;
        this.nextDateButton = null;
        this.dateInput = null;
        this.settingsButton = null;

        // 現在の日付
        this.currentDate = new Date();
    }

    createElement() {
        const wrapper = super.createElement();

        // 既に内容が作成済みの場合はスキップ
        if (wrapper.children.length > 0) {
            return wrapper;
        }

        // ヘッダー構造を作成
        const header = document.createElement('div');
        header.id = 'sideTimeTableHeader';

        // 追加ボタン
        this.addEventButton = document.createElement('i');
        this.addEventButton.className = 'fas fa-plus-circle add-local-event-icon';
        this.addEventButton.id = 'addLocalEventButton';
        this.addEventButton.setAttribute('data-localize-title', '__MSG_addEvent__');

        // 日付ナビゲーション
        const dateNavigation = this._createDateNavigation();

        // 設定ボタン
        this.settingsButton = document.createElement('i');
        this.settingsButton.className = 'fas fa-cog settings-icon';
        this.settingsButton.id = 'settingsIcon';
        this.settingsButton.setAttribute('data-localize-title', '__MSG_settings__');

        // ヘッダーに要素を追加
        header.appendChild(this.addEventButton);
        header.appendChild(dateNavigation);
        header.appendChild(this.settingsButton);

        wrapper.appendChild(header);

        // イベントリスナーを設定
        this._setupEventListeners();

        // 初期日付を設定
        this._updateDateDisplay();

        return wrapper;
    }

    /**
     * 日付ナビゲーション要素を作成
     * @private
     */
    _createDateNavigation() {
        const container = document.createElement('div');
        container.id = 'dateNavigation';

        // 前の日ボタン
        this.prevDateButton = document.createElement('i');
        this.prevDateButton.className = 'fas fa-chevron-left nav-arrow';
        this.prevDateButton.id = 'prevDateButton';
        this.prevDateButton.title = '前の日';

        // 日付入力
        this.dateInput = document.createElement('input');
        this.dateInput.type = 'date';
        this.dateInput.id = 'currentDateDisplay';
        this.dateInput.setAttribute('data-localize-title', '__MSG_clickToSelectDate__');

        // 次の日ボタン
        this.nextDateButton = document.createElement('i');
        this.nextDateButton.className = 'fas fa-chevron-right nav-arrow';
        this.nextDateButton.id = 'nextDateButton';
        this.nextDateButton.title = '次の日';

        container.appendChild(this.prevDateButton);
        container.appendChild(this.dateInput);
        container.appendChild(this.nextDateButton);

        return container;
    }

    /**
     * イベントリスナーを設定
     * @private
     */
    _setupEventListeners() {
        // 追加ボタン
        this.addEventListener(this.addEventButton, 'click', () => {
            if (this.onAddEvent) {
                this.onAddEvent();
            }
        });

        // 日付ナビゲーション
        this.addEventListener(this.prevDateButton, 'click', () => {
            this._navigateDate(-1);
        });

        this.addEventListener(this.nextDateButton, 'click', () => {
            this._navigateDate(1);
        });

        this.addEventListener(this.dateInput, 'change', () => {
            this._handleDateInputChange();
        });

        // 設定ボタン
        this.addEventListener(this.settingsButton, 'click', () => {
            if (this.onSettingsClick) {
                this.onSettingsClick();
            }
        });
    }

    /**
     * 日付を指定日数だけ移動
     * @private
     */
    _navigateDate(days) {
        const newDate = new Date(this.currentDate);
        newDate.setDate(newDate.getDate() + days);
        this.setCurrentDate(newDate);
    }

    /**
     * 日付入力の変更を処理
     * @private
     */
    _handleDateInputChange() {
        const selectedDate = new Date(this.dateInput.value + 'T00:00:00');
        if (!isNaN(selectedDate.getTime())) {
            this.setCurrentDate(selectedDate);
        }
    }

    /**
     * 日付表示を更新
     * @private
     */
    _updateDateDisplay() {
        if (this.dateInput) {
            // YYYY-MM-DD形式で設定
            const year = this.currentDate.getFullYear();
            const month = String(this.currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(this.currentDate.getDate()).padStart(2, '0');
            this.dateInput.value = `${year}-${month}-${day}`;
        }
    }

    /**
     * 現在の日付を設定
     * @param {Date} date 新しい日付
     */
    setCurrentDate(date) {
        if (date instanceof Date && !isNaN(date.getTime())) {
            this.currentDate = new Date(date);
            this._updateDateDisplay();

            // コールバックを呼び出し
            if (this.onDateChange) {
                this.onDateChange(this.currentDate);
            }
        }
    }

    /**
     * 現在の日付を取得
     * @returns {Date} 現在の日付
     */
    getCurrentDate() {
        return new Date(this.currentDate);
    }

    /**
     * 今日の日付に設定
     */
    setToday() {
        this.setCurrentDate(new Date());
    }

    /**
     * ボタンの有効/無効を設定
     * @param {boolean} enabled 有効にするかどうか
     */
    setButtonsEnabled(enabled) {
        const buttons = [
            this.addEventButton,
            this.prevDateButton,
            this.nextDateButton,
            this.settingsButton
        ];

        buttons.forEach(button => {
            if (button) {
                button.style.pointerEvents = enabled ? '' : 'none';
                button.style.opacity = enabled ? '' : '0.5';
            }
        });

        if (this.dateInput) {
            this.dateInput.disabled = !enabled;
        }
    }

    /**
     * 追加ボタンの表示/非表示を切り替え
     * @param {boolean} visible 表示するかどうか
     */
    setAddButtonVisible(visible) {
        if (this.addEventButton) {
            this.addEventButton.style.display = visible ? '' : 'none';
        }
    }

    /**
     * 日付が今日かどうかをチェック
     * @returns {boolean} 今日の場合true
     */
    isToday() {
        const today = new Date();
        return this.currentDate.toDateString() === today.toDateString();
    }

    /**
     * 日付ナビゲーションの範囲制限を設定
     * @param {Date|null} minDate 最小日付
     * @param {Date|null} maxDate 最大日付
     */
    setDateRange(minDate = null, maxDate = null) {
        if (this.dateInput) {
            if (minDate instanceof Date) {
                const year = minDate.getFullYear();
                const month = String(minDate.getMonth() + 1).padStart(2, '0');
                const day = String(minDate.getDate()).padStart(2, '0');
                this.dateInput.min = `${year}-${month}-${day}`;
            }

            if (maxDate instanceof Date) {
                const year = maxDate.getFullYear();
                const month = String(maxDate.getMonth() + 1).padStart(2, '0');
                const day = String(maxDate.getDate()).padStart(2, '0');
                this.dateInput.max = `${year}-${month}-${day}`;
            }
        }
    }
}