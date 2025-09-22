/**
 * LocalEventModal - ローカルイベント編集モーダル
 */
import { ModalComponent } from './modal-component.js';

export class LocalEventModal extends ModalComponent {
    constructor(options = {}) {
        super({
            id: 'localEventDialog',
            ...options
        });

        // フォーム要素
        this.titleInput = null;
        this.startTimeInput = null;
        this.endTimeInput = null;
        this.saveButton = null;
        this.deleteButton = null;
        this.cancelButton = null;

        // 編集中のイベント
        this.currentEvent = null;

        // コールバック
        this.onSave = options.onSave || null;
        this.onDelete = options.onDelete || null;
        this.onCancel = options.onCancel || null;

        // 編集モード（create/edit）
        this.mode = 'create';
    }

    createContent() {
        const content = document.createElement('div');

        // タイトル
        const title = document.createElement('h2');
        title.setAttribute('data-localize', '__MSG_eventDialogTitle__');
        title.textContent = '予定を作成/編集';
        content.appendChild(title);

        // タイトル入力
        const titleLabel = document.createElement('label');
        titleLabel.htmlFor = 'eventTitle';
        titleLabel.setAttribute('data-localize', '__MSG_eventTitle__');
        titleLabel.textContent = 'タイトル:';
        content.appendChild(titleLabel);

        this.titleInput = document.createElement('input');
        this.titleInput.type = 'text';
        this.titleInput.id = 'eventTitle';
        this.titleInput.required = true;
        content.appendChild(this.titleInput);

        // 開始時刻入力
        const startLabel = document.createElement('label');
        startLabel.htmlFor = 'eventStartTime';
        startLabel.setAttribute('data-localize', '__MSG_startTime__');
        startLabel.textContent = '開始時刻:';
        content.appendChild(startLabel);

        this.startTimeInput = document.createElement('input');
        this.startTimeInput.type = 'time';
        this.startTimeInput.id = 'eventStartTime';
        this.startTimeInput.setAttribute('list', 'time-list');
        this.startTimeInput.required = true;
        content.appendChild(this.startTimeInput);

        // 終了時刻入力
        const endLabel = document.createElement('label');
        endLabel.htmlFor = 'eventEndTime';
        endLabel.setAttribute('data-localize', '__MSG_endTime__');
        endLabel.textContent = '終了時刻:';
        content.appendChild(endLabel);

        this.endTimeInput = document.createElement('input');
        this.endTimeInput.type = 'time';
        this.endTimeInput.id = 'eventEndTime';
        this.endTimeInput.setAttribute('list', 'time-list');
        this.endTimeInput.required = true;
        content.appendChild(this.endTimeInput);

        // ボタングループ
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'modal-buttons';

        // 保存ボタン
        this.saveButton = document.createElement('button');
        this.saveButton.id = 'saveEventButton';
        this.saveButton.className = 'btn btn-success';
        this.saveButton.setAttribute('data-localize', '__MSG_save__');
        this.saveButton.textContent = '保存';

        // 削除ボタン
        this.deleteButton = document.createElement('button');
        this.deleteButton.id = 'deleteEventButton';
        this.deleteButton.className = 'btn btn-danger';
        this.deleteButton.setAttribute('data-localize', '__MSG_delete__');
        this.deleteButton.textContent = '削除';

        // キャンセルボタン
        this.cancelButton = document.createElement('button');
        this.cancelButton.id = 'cancelEventButton';
        this.cancelButton.className = 'btn btn-secondary';
        this.cancelButton.setAttribute('data-localize', '__MSG_cancel__');
        this.cancelButton.textContent = 'キャンセル';

        buttonGroup.appendChild(this.saveButton);
        buttonGroup.appendChild(this.deleteButton);
        buttonGroup.appendChild(this.cancelButton);
        content.appendChild(buttonGroup);

        // イベントリスナーを設定
        this._setupFormEventListeners();

        return content;
    }

    /**
     * フォーム用イベントリスナーを設定
     * @private
     */
    _setupFormEventListeners() {
        // 保存ボタン
        this.addEventListener(this.saveButton, 'click', () => {
            this._handleSave();
        });

        // 削除ボタン
        this.addEventListener(this.deleteButton, 'click', () => {
            this._handleDelete();
        });

        // キャンセルボタン
        this.addEventListener(this.cancelButton, 'click', () => {
            this._handleCancel();
        });

        // Enterキーで保存
        this.addEventListener(this.titleInput, 'keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this._handleSave();
            }
        });

        // 時刻入力の検証
        this.addEventListener(this.startTimeInput, 'change', () => {
            this._validateTimes();
        });

        this.addEventListener(this.endTimeInput, 'change', () => {
            this._validateTimes();
        });
    }

    /**
     * 保存処理
     * @private
     */
    _handleSave() {
        if (!this._validateForm()) {
            return;
        }

        const eventData = {
            id: this.currentEvent?.id || null,
            title: this.titleInput.value.trim(),
            startTime: this.startTimeInput.value,
            endTime: this.endTimeInput.value
        };

        if (this.onSave) {
            this.onSave(eventData, this.mode);
        }

        this.hide();
    }

    /**
     * 削除処理
     * @private
     */
    _handleDelete() {
        if (!this.currentEvent) {
            return;
        }

        if (this.onDelete) {
            this.onDelete(this.currentEvent);
        }

        this.hide();
    }

    /**
     * キャンセル処理
     * @private
     */
    _handleCancel() {
        if (this.onCancel) {
            this.onCancel();
        }

        this.hide();
    }

    /**
     * フォームの検証
     * @private
     */
    _validateForm() {
        // タイトルチェック
        if (!this.titleInput.value.trim()) {
            this._showError('タイトルを入力してください');
            this.titleInput.focus();
            return false;
        }

        // 時刻チェック
        if (!this.startTimeInput.value) {
            this._showError('開始時刻を入力してください');
            this.startTimeInput.focus();
            return false;
        }

        if (!this.endTimeInput.value) {
            this._showError('終了時刻を入力してください');
            this.endTimeInput.focus();
            return false;
        }

        // 時刻の妥当性チェック
        if (!this._validateTimes()) {
            return false;
        }

        return true;
    }

    /**
     * 時刻の妥当性を検証
     * @private
     */
    _validateTimes() {
        if (!this.startTimeInput.value || !this.endTimeInput.value) {
            return true; // 空の場合はスキップ
        }

        const startTime = this.startTimeInput.value;
        const endTime = this.endTimeInput.value;

        if (startTime >= endTime) {
            this._showError('終了時刻は開始時刻より後にしてください');
            this.endTimeInput.focus();
            return false;
        }

        this._clearError();
        return true;
    }

    /**
     * エラーメッセージを表示
     * @private
     */
    _showError(message) {
        // 既存のエラーメッセージを削除
        this._clearError();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = 'color: red; font-size: 0.9em; margin-top: 5px;';
        errorDiv.textContent = message;

        this.modalContent.appendChild(errorDiv);
    }

    /**
     * エラーメッセージをクリア
     * @private
     */
    _clearError() {
        const errorElement = this.modalContent?.querySelector('.error-message');
        if (errorElement) {
            errorElement.remove();
        }
    }

    /**
     * 新規作成モードで表示
     * @param {string} defaultStartTime デフォルト開始時刻
     * @param {string} defaultEndTime デフォルト終了時刻
     */
    showCreate(defaultStartTime = '', defaultEndTime = '') {
        this.mode = 'create';
        this.currentEvent = null;

        // フォームをリセット
        this.titleInput.value = '';
        this.startTimeInput.value = defaultStartTime;
        this.endTimeInput.value = defaultEndTime;

        // ボタン表示を調整
        this.deleteButton.style.display = 'none';

        // タイトルを更新
        this.setTitle('予定を作成');

        this._clearError();
        this.show();
    }

    /**
     * 編集モードで表示
     * @param {Object} event 編集するイベント
     */
    showEdit(event) {
        this.mode = 'edit';
        this.currentEvent = event;

        // フォームに値を設定
        this.titleInput.value = event.title || '';
        this.startTimeInput.value = event.startTime || '';
        this.endTimeInput.value = event.endTime || '';

        // ボタン表示を調整
        this.deleteButton.style.display = '';

        // タイトルを更新
        this.setTitle('予定を編集');

        this._clearError();
        this.show();
    }

    /**
     * フォームデータを取得
     * @returns {Object} フォームデータ
     */
    getFormData() {
        return {
            title: this.titleInput?.value.trim() || '',
            startTime: this.startTimeInput?.value || '',
            endTime: this.endTimeInput?.value || ''
        };
    }

    /**
     * フォームをリセット
     */
    resetForm() {
        if (this.titleInput) this.titleInput.value = '';
        if (this.startTimeInput) this.startTimeInput.value = '';
        if (this.endTimeInput) this.endTimeInput.value = '';
        this.currentEvent = null;
        this.mode = 'create';
        this._clearError();
    }
}