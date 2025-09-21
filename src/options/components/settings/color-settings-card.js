/**
 * ColorSettingsCard - 色設定カードコンポーネント
 */
import { CardComponent } from '../base/card-component.js';

export class ColorSettingsCard extends CardComponent {
    constructor(onSettingsChange) {
        super({
            title: '色設定',
            titleLocalize: '__MSG_colorSettings__',
            icon: 'fas fa-palette',
            iconColor: 'text-warning'
        });

        this.onSettingsChange = onSettingsChange;

        // カラーピッカー要素
        this.workTimeColorInput = null;
        this.localEventColorInput = null;
        this.googleEventColorInput = null;

        // 現在の設定値
        this.settings = {
            workTimeColor: '#d4d4d4',
            localEventColor: '#bbf2b1',
            googleEventColor: '#c3d6f7'
        };
    }

    createElement() {
        const card = super.createElement();

        // フォーム要素を作成
        const form = this._createForm();
        this.addContent(form);

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

        // グリッドレイアウト
        const row = document.createElement('div');
        row.className = 'row';

        // 業務時間色
        const workTimeCol = this._createColorInputColumn(
            'work-time-color',
            '__MSG_workTimeColor__',
            '業務時間:',
            this.settings.workTimeColor,
            (input) => this.workTimeColorInput = input
        );
        row.appendChild(workTimeCol);

        // ローカルイベント色
        const localEventCol = this._createColorInputColumn(
            'local-event-color',
            '__MSG_localEventColor__',
            'ローカルイベント:',
            this.settings.localEventColor,
            (input) => this.localEventColorInput = input
        );
        row.appendChild(localEventCol);

        // Googleイベント色
        const googleEventCol = this._createColorInputColumn(
            'google-event-color',
            '__MSG_googleEventColor__',
            'Google イベント:',
            this.settings.googleEventColor,
            (input) => this.googleEventColorInput = input
        );
        row.appendChild(googleEventCol);

        form.appendChild(row);

        // プリセットボタンエリア
        const presetArea = this._createPresetArea();
        form.appendChild(presetArea);

        return form;
    }

    /**
     * カラー入力カラムを作成
     * @private
     */
    _createColorInputColumn(id, localizeKey, labelText, defaultValue, inputSetter) {
        const col = document.createElement('div');
        col.className = 'col-md-4 mb-3';

        // ラベル
        const label = document.createElement('label');
        label.htmlFor = `color-settings-${id}`;
        label.className = 'form-label';
        label.setAttribute('data-localize', localizeKey);
        label.textContent = labelText;

        // カラーピッカー
        const input = document.createElement('input');
        input.type = 'color';
        input.className = 'form-control form-control-color';
        input.id = `color-settings-${id}`;
        input.value = defaultValue;

        // プレビュー表示
        const preview = document.createElement('div');
        preview.className = 'mt-2 p-2 rounded border';
        preview.style.backgroundColor = defaultValue;
        preview.style.color = this._getContrastColor(defaultValue);
        preview.style.fontSize = '0.875rem';
        preview.textContent = 'プレビュー';

        // 入力要素を設定
        inputSetter(input);

        // プレビューを更新する関数を保存
        input._preview = preview;

        col.appendChild(label);
        col.appendChild(input);
        col.appendChild(preview);

        return col;
    }

    /**
     * プリセットエリアを作成
     * @private
     */
    _createPresetArea() {
        const area = document.createElement('div');
        area.className = 'mt-4 pt-3 border-top';

        // プリセットタイトル
        const title = document.createElement('h6');
        title.className = 'mb-3';
        title.textContent = 'カラープリセット';

        // プリセットボタンコンテナ
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'd-flex flex-wrap gap-2';

        // プリセットデータ
        const presets = [
            {
                name: 'デフォルト',
                colors: {
                    workTimeColor: '#d4d4d4',
                    localEventColor: '#bbf2b1',
                    googleEventColor: '#c3d6f7'
                }
            },
            {
                name: 'モノクローム',
                colors: {
                    workTimeColor: '#f0f0f0',
                    localEventColor: '#e0e0e0',
                    googleEventColor: '#d0d0d0'
                }
            },
            {
                name: 'パステル',
                colors: {
                    workTimeColor: '#fdf2e9',
                    localEventColor: '#e8f5e8',
                    googleEventColor: '#e3f2fd'
                }
            },
            {
                name: 'ビビッド',
                colors: {
                    workTimeColor: '#ffecb3',
                    localEventColor: '#c8e6c9',
                    googleEventColor: '#bbdefb'
                }
            }
        ];

        presets.forEach(preset => {
            const button = this._createPresetButton(preset);
            buttonContainer.appendChild(button);
        });

        area.appendChild(title);
        area.appendChild(buttonContainer);

        return area;
    }

    /**
     * プリセットボタンを作成
     * @private
     */
    _createPresetButton(preset) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-outline-secondary btn-sm';
        button.textContent = preset.name;

        // カラープレビューを追加
        const colorPreview = document.createElement('span');
        colorPreview.className = 'd-inline-block ms-1';
        colorPreview.style.cssText = `
            width: 12px;
            height: 12px;
            border-radius: 2px;
            background: linear-gradient(45deg,
                ${preset.colors.workTimeColor} 0%,
                ${preset.colors.localEventColor} 50%,
                ${preset.colors.googleEventColor} 100%);
            border: 1px solid #ddd;
        `;

        button.appendChild(colorPreview);

        // クリックイベント
        button.addEventListener('click', () => {
            this.updateSettings(preset.colors);
            this._handleColorChange();
        });

        return button;
    }

    /**
     * コントラスト色を取得（テキスト表示用）
     * @private
     */
    _getContrastColor(hexColor) {
        // HEXを RGB に変換
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);

        // 明度を計算
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    /**
     * プレビューを更新
     * @private
     */
    _updatePreview(input, color) {
        if (input._preview) {
            input._preview.style.backgroundColor = color;
            input._preview.style.color = this._getContrastColor(color);
        }
    }

    /**
     * イベントリスナーを設定
     * @private
     */
    _setupEventListeners() {
        // 各カラーピッカーの変更イベント
        this.workTimeColorInput?.addEventListener('input', (e) => {
            this._updatePreview(e.target, e.target.value);
        });

        this.workTimeColorInput?.addEventListener('change', () => this._handleColorChange());

        this.localEventColorInput?.addEventListener('input', (e) => {
            this._updatePreview(e.target, e.target.value);
        });

        this.localEventColorInput?.addEventListener('change', () => this._handleColorChange());

        this.googleEventColorInput?.addEventListener('input', (e) => {
            this._updatePreview(e.target, e.target.value);
        });

        this.googleEventColorInput?.addEventListener('change', () => this._handleColorChange());
    }

    /**
     * 色設定変更を処理
     * @private
     */
    _handleColorChange() {
        const newSettings = this.getSettings();
        this.settings = newSettings;

        // 変更をコールバック
        if (this.onSettingsChange) {
            this.onSettingsChange(newSettings);
        }
    }

    /**
     * 現在の設定を取得
     */
    getSettings() {
        return {
            workTimeColor: this.workTimeColorInput?.value || this.settings.workTimeColor,
            localEventColor: this.localEventColorInput?.value || this.settings.localEventColor,
            googleEventColor: this.googleEventColorInput?.value || this.settings.googleEventColor
        };
    }

    /**
     * 設定を更新
     */
    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };

        if (this.workTimeColorInput) {
            this.workTimeColorInput.value = this.settings.workTimeColor;
            this._updatePreview(this.workTimeColorInput, this.settings.workTimeColor);
        }

        if (this.localEventColorInput) {
            this.localEventColorInput.value = this.settings.localEventColor;
            this._updatePreview(this.localEventColorInput, this.settings.localEventColor);
        }

        if (this.googleEventColorInput) {
            this.googleEventColorInput.value = this.settings.googleEventColor;
            this._updatePreview(this.googleEventColorInput, this.settings.googleEventColor);
        }
    }

    /**
     * デフォルト設定にリセット
     */
    resetToDefaults() {
        const defaultSettings = {
            workTimeColor: '#d4d4d4',
            localEventColor: '#bbf2b1',
            googleEventColor: '#c3d6f7'
        };

        this.updateSettings(defaultSettings);
        this._handleColorChange();
    }

    /**
     * ライブプレビューの有効/無効を切り替え
     */
    setLivePreview(enabled) {
        const eventType = enabled ? 'input' : 'change';

        // 既存のリスナーを削除して再設定
        [this.workTimeColorInput, this.localEventColorInput, this.googleEventColorInput]
            .filter(input => input)
            .forEach(input => {
                const newInput = input.cloneNode(true);
                input.parentNode.replaceChild(newInput, input);

                newInput.addEventListener(eventType, () => this._handleColorChange());
                newInput.addEventListener('input', (e) => {
                    this._updatePreview(e.target, e.target.value);
                });
            });
    }
}