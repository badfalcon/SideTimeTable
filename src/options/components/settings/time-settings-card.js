/**
 * TimeSettingsCard - 時間設定カードコンポーネント
 */
import { CardComponent } from '../base/card-component.js';
import { generateTimeList } from '../../../lib/utils.js';

export class TimeSettingsCard extends CardComponent {
    constructor(onSettingsChange) {
        super({
            title: '時間設定',
            titleLocalize: '__MSG_timeSettings__',
            icon: 'fas fa-clock',
            iconColor: 'text-info'
        });

        this.onSettingsChange = onSettingsChange;

        // フォーム要素
        this.openTimeInput = null;
        this.closeTimeInput = null;
        this.breakTimeFixedCheckbox = null;
        this.breakTimeStartInput = null;
        this.breakTimeEndInput = null;
        this.timeDatalist = null;

        // 現在の設定値
        this.settings = {
            openTime: '09:00',
            closeTime: '18:00',
            breakTimeFixed: false,
            breakTimeStart: '12:00',
            breakTimeEnd: '13:00'
        };
    }

    createElement() {
        const card = super.createElement();

        // フォーム要素を作成
        const form = this._createForm();
        this.addContent(form);

        // 時間リストを生成
        this._generateTimeList();

        // イベントリスナーを設定
        this._setupEventListeners();

        return card;
    }

    /**
     * フォームを作成
     * @private
     */
    _createForm() {
        const form = document.createElement('form');

        // 就業時間セクション
        const workHoursSection = this._createWorkHoursSection();
        form.appendChild(workHoursSection);

        // 休憩時間セクション
        const breakTimeSection = this._createBreakTimeSection();
        form.appendChild(breakTimeSection);

        // 時間選択リスト
        this.timeDatalist = document.createElement('datalist');
        this.timeDatalist.id = 'time-settings-time-list';
        form.appendChild(this.timeDatalist);

        return form;
    }

    /**
     * 就業時間セクションを作成
     * @private
     */
    _createWorkHoursSection() {
        const section = document.createElement('div');
        section.className = 'mb-3';

        // ラベル
        const label = document.createElement('label');
        label.htmlFor = 'time-settings-open-time';
        label.className = 'form-label';
        label.setAttribute('data-localize', '__MSG_workHours__');
        label.textContent = '就業時間:';

        // 入力グループ
        const inputGroup = document.createElement('div');
        inputGroup.className = 'input-group';

        // 開始時刻
        this.openTimeInput = document.createElement('input');
        this.openTimeInput.type = 'time';
        this.openTimeInput.className = 'form-control';
        this.openTimeInput.id = 'time-settings-open-time';
        this.openTimeInput.step = '900'; // 15分刻み
        this.openTimeInput.value = this.settings.openTime;
        this.openTimeInput.setAttribute('list', 'time-settings-time-list');
        this.openTimeInput.setAttribute('data-localize-aria-label', '__MSG_startTime__');

        // セパレーター
        const separator = document.createElement('span');
        separator.className = 'input-group-text';
        separator.setAttribute('data-localize', '__MSG_to__');
        separator.textContent = '～';

        // 終了時刻
        this.closeTimeInput = document.createElement('input');
        this.closeTimeInput.type = 'time';
        this.closeTimeInput.className = 'form-control';
        this.closeTimeInput.id = 'time-settings-close-time';
        this.closeTimeInput.step = '900';
        this.closeTimeInput.value = this.settings.closeTime;
        this.closeTimeInput.setAttribute('list', 'time-settings-time-list');
        this.closeTimeInput.setAttribute('data-localize-aria-label', '__MSG_endTime__');

        inputGroup.appendChild(this.openTimeInput);
        inputGroup.appendChild(separator);
        inputGroup.appendChild(this.closeTimeInput);

        section.appendChild(label);
        section.appendChild(inputGroup);

        return section;
    }

    /**
     * 休憩時間セクションを作成
     * @private
     */
    _createBreakTimeSection() {
        const section = document.createElement('div');
        section.className = 'mb-3';

        // ラベル
        const label = document.createElement('label');
        label.htmlFor = 'time-settings-break-time-fixed';
        label.className = 'form-label';
        label.setAttribute('data-localize', '__MSG_breakTime__');
        label.textContent = '休憩時間:';

        // チェックボックス
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'form-check mb-2';

        this.breakTimeFixedCheckbox = document.createElement('input');
        this.breakTimeFixedCheckbox.type = 'checkbox';
        this.breakTimeFixedCheckbox.className = 'form-check-input';
        this.breakTimeFixedCheckbox.id = 'time-settings-break-time-fixed';
        this.breakTimeFixedCheckbox.checked = this.settings.breakTimeFixed;

        const checkboxLabel = document.createElement('label');
        checkboxLabel.className = 'form-check-label';
        checkboxLabel.htmlFor = 'time-settings-break-time-fixed';
        checkboxLabel.setAttribute('data-localize', '__MSG_fixed__');
        checkboxLabel.textContent = '固定';

        checkboxDiv.appendChild(this.breakTimeFixedCheckbox);
        checkboxDiv.appendChild(checkboxLabel);

        // 時間入力グループ
        const inputGroup = document.createElement('div');
        inputGroup.className = 'input-group';

        // 開始時刻
        this.breakTimeStartInput = document.createElement('input');
        this.breakTimeStartInput.type = 'time';
        this.breakTimeStartInput.className = 'form-control';
        this.breakTimeStartInput.id = 'time-settings-break-time-start';
        this.breakTimeStartInput.step = '900';
        this.breakTimeStartInput.value = this.settings.breakTimeStart;
        this.breakTimeStartInput.disabled = !this.settings.breakTimeFixed;
        this.breakTimeStartInput.setAttribute('list', 'time-settings-time-list');
        this.breakTimeStartInput.setAttribute('data-localize-aria-label', '__MSG_startTime__');

        // セパレーター
        const separator = document.createElement('span');
        separator.className = 'input-group-text';
        separator.setAttribute('data-localize', '__MSG_to__');
        separator.textContent = '～';

        // 終了時刻
        this.breakTimeEndInput = document.createElement('input');
        this.breakTimeEndInput.type = 'time';
        this.breakTimeEndInput.className = 'form-control';
        this.breakTimeEndInput.id = 'time-settings-break-time-end';
        this.breakTimeEndInput.step = '900';
        this.breakTimeEndInput.value = this.settings.breakTimeEnd;
        this.breakTimeEndInput.disabled = !this.settings.breakTimeFixed;
        this.breakTimeEndInput.setAttribute('list', 'time-settings-time-list');
        this.breakTimeEndInput.setAttribute('data-localize-aria-label', '__MSG_endTime__');

        inputGroup.appendChild(this.breakTimeStartInput);
        inputGroup.appendChild(separator);
        inputGroup.appendChild(this.breakTimeEndInput);

        section.appendChild(label);
        section.appendChild(checkboxDiv);
        section.appendChild(inputGroup);

        return section;
    }

    /**
     * 時間選択リストを生成
     * @private
     */
    _generateTimeList() {
        if (this.timeDatalist) {
            generateTimeList(this.timeDatalist);
        }
    }

    /**
     * イベントリスナーを設定
     * @private
     */
    _setupEventListeners() {
        // 就業時間の変更
        this.openTimeInput?.addEventListener('change', () => this._handleTimeChange());
        this.closeTimeInput?.addEventListener('change', () => this._handleTimeChange());

        // 休憩時間固定チェックボックス
        this.breakTimeFixedCheckbox?.addEventListener('change', (e) => {
            const isFixed = e.target.checked;
            this.breakTimeStartInput.disabled = !isFixed;
            this.breakTimeEndInput.disabled = !isFixed;
            this._handleTimeChange();
        });

        // 休憩時間の変更
        this.breakTimeStartInput?.addEventListener('change', () => this._handleTimeChange());
        this.breakTimeEndInput?.addEventListener('change', () => this._handleTimeChange());
    }

    /**
     * 時間設定変更を処理
     * @private
     */
    _handleTimeChange() {
        const newSettings = this.getSettings();

        // バリデーション
        if (!this._validateTimeSettings(newSettings)) {
            return;
        }

        this.settings = newSettings;

        // 変更をコールバック
        if (this.onSettingsChange) {
            this.onSettingsChange(newSettings);
        }
    }

    /**
     * 時間設定をバリデーション
     * @private
     */
    _validateTimeSettings(settings) {
        // 就業時間の妥当性チェック
        if (settings.openTime >= settings.closeTime) {
            this._showValidationError('終了時刻は開始時刻より後に設定してください');
            return false;
        }

        // 休憩時間の妥当性チェック（固定の場合）
        if (settings.breakTimeFixed) {
            if (settings.breakTimeStart >= settings.breakTimeEnd) {
                this._showValidationError('休憩終了時刻は開始時刻より後に設定してください');
                return false;
            }

            // 休憩時間が就業時間内にあるかチェック
            if (settings.breakTimeStart < settings.openTime ||
                settings.breakTimeEnd > settings.closeTime) {
                this._showValidationError('休憩時間は就業時間内に設定してください');
                return false;
            }
        }

        return true;
    }

    /**
     * バリデーションエラーを表示
     * @private
     */
    _showValidationError(message) {
        // 既存のエラーメッセージを削除
        const existingError = this.element.querySelector('.time-validation-error');
        if (existingError) {
            existingError.remove();
        }

        // エラーメッセージを作成
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-warning alert-dismissible fade show time-validation-error mt-2';
        errorDiv.innerHTML = `
            <small><strong>注意:</strong> ${message}</small>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        this.bodyElement.appendChild(errorDiv);

        // 3秒後に自動削除
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 3000);
    }

    /**
     * 現在の設定を取得
     */
    getSettings() {
        return {
            openTime: this.openTimeInput?.value || this.settings.openTime,
            closeTime: this.closeTimeInput?.value || this.settings.closeTime,
            breakTimeFixed: this.breakTimeFixedCheckbox?.checked || false,
            breakTimeStart: this.breakTimeStartInput?.value || this.settings.breakTimeStart,
            breakTimeEnd: this.breakTimeEndInput?.value || this.settings.breakTimeEnd
        };
    }

    /**
     * 設定を更新
     */
    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };

        if (this.openTimeInput) this.openTimeInput.value = this.settings.openTime;
        if (this.closeTimeInput) this.closeTimeInput.value = this.settings.closeTime;
        if (this.breakTimeFixedCheckbox) this.breakTimeFixedCheckbox.checked = this.settings.breakTimeFixed;
        if (this.breakTimeStartInput) {
            this.breakTimeStartInput.value = this.settings.breakTimeStart;
            this.breakTimeStartInput.disabled = !this.settings.breakTimeFixed;
        }
        if (this.breakTimeEndInput) {
            this.breakTimeEndInput.value = this.settings.breakTimeEnd;
            this.breakTimeEndInput.disabled = !this.settings.breakTimeFixed;
        }
    }

    /**
     * デフォルト設定にリセット
     */
    resetToDefaults() {
        const defaultSettings = {
            openTime: '09:00',
            closeTime: '18:00',
            breakTimeFixed: false,
            breakTimeStart: '12:00',
            breakTimeEnd: '13:00'
        };

        this.updateSettings(defaultSettings);
        this._handleTimeChange();
    }
}