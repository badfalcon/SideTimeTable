/**
 * Components Index - コンポーネント統合モジュール
 *
 * すべてのUIコンポーネントを一元管理し、外部からの使用を簡素化
 */

// 基底コンポーネント
export { CardComponent } from './base/card-component.js';
export { ControlButtonsComponent } from './base/control-buttons-component.js';

// カレンダー関連コンポーネント
export { GoogleIntegrationCard } from './calendar/google-integration-card.js';
export { CalendarManagementCard } from './calendar/calendar-management-card.js';

// 設定関連コンポーネント
export { TimeSettingsCard } from './settings/time-settings-card.js';
export { ColorSettingsCard } from './settings/color-settings-card.js';
export { LanguageSettingsCard } from './settings/language-settings-card.js';
export { ShortcutSettingsCard } from './settings/shortcut-settings-card.js';

/**
 * ComponentManager - コンポーネントライフサイクル管理
 *
 * 複数のコンポーネントを統合管理し、初期化・破棄を効率的に行う
 */
export class ComponentManager {
    constructor() {
        this.components = new Map();
        this.container = null;
    }

    /**
     * コンテナを設定
     * @param {HTMLElement} container
     */
    setContainer(container) {
        this.container = container;
    }

    /**
     * コンポーネントを登録
     * @param {string} name コンポーネント名
     * @param {Object} component コンポーネントインスタンス
     */
    register(name, component) {
        this.components.set(name, component);

        // コンテナが設定されている場合は自動的に追加
        if (this.container && component.createElement) {
            if (!component.element) {
                component.createElement();
            }
            component.appendTo(this.container);
        }
    }

    /**
     * コンポーネントを取得
     * @param {string} name コンポーネント名
     * @returns {Object|null} コンポーネントインスタンス
     */
    get(name) {
        return this.components.get(name);
    }

    /**
     * すべてのコンポーネントを初期化
     */
    async initializeAll() {
        for (const [name, component] of this.components) {
            try {
                if (component.loadData && typeof component.loadData === 'function') {
                    await component.loadData();
                }
                console.log(`✓ Component initialized: ${name}`);
            } catch (error) {
                console.error(`✗ Component initialization failed: ${name}`, error);
            }
        }
    }

    /**
     * すべてのコンポーネントを破棄
     */
    destroyAll() {
        for (const [name, component] of this.components) {
            try {
                if (component.destroy && typeof component.destroy === 'function') {
                    component.destroy();
                }
                console.log(`✓ Component destroyed: ${name}`);
            } catch (error) {
                console.error(`✗ Component destruction failed: ${name}`, error);
            }
        }
        this.components.clear();
    }

    /**
     * 特定タイプのコンポーネントを一括操作
     * @param {string} method メソッド名
     * @param {...any} args メソッド引数
     */
    broadcast(method, ...args) {
        for (const [name, component] of this.components) {
            if (component[method] && typeof component[method] === 'function') {
                try {
                    component[method](...args);
                } catch (error) {
                    console.error(`✗ Broadcast failed for ${name}.${method}:`, error);
                }
            }
        }
    }

    /**
     * 登録されているコンポーネント一覧を取得
     * @returns {string[]} コンポーネント名の配列
     */
    list() {
        return Array.from(this.components.keys());
    }

    /**
     * コンポーネントの統計情報を取得
     * @returns {Object} 統計情報
     */
    getStats() {
        const total = this.components.size;
        const visible = Array.from(this.components.values())
            .filter(comp => comp.element && comp.element.style.display !== 'none').length;

        return {
            total,
            visible,
            hidden: total - visible,
            names: this.list()
        };
    }
}