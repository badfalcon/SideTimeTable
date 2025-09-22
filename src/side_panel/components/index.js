/**
 * Side Panel Components - コンポーネントエクスポート
 */

// Base Components
export { Component } from './base/component.js';

// Header Components
export { HeaderComponent } from './header/header-component.js';

// Timeline Components
export { TimelineComponent } from './timeline/timeline-component.js';

// Modal Components
export { ModalComponent } from './modals/modal-component.js';
export { LocalEventModal } from './modals/local-event-modal.js';
export { GoogleEventModal } from './modals/google-event-modal.js';
export { AlertModal } from './modals/alert-modal.js';

/**
 * ComponentManager - サイドパネル用コンポーネント管理クラス
 */
export class SidePanelComponentManager {
    constructor() {
        this.components = new Map();
        this.initialized = false;
    }

    /**
     * コンポーネントを登録
     * @param {string} name コンポーネント名
     * @param {Component} component コンポーネントインスタンス
     */
    register(name, component) {
        if (this.components.has(name)) {
            console.warn(`コンポーネント '${name}' は既に登録されています`);
        }
        this.components.set(name, component);
    }

    /**
     * コンポーネントを取得
     * @param {string} name コンポーネント名
     * @returns {Component|null} コンポーネントインスタンス
     */
    get(name) {
        return this.components.get(name) || null;
    }

    /**
     * コンポーネントが存在するかチェック
     * @param {string} name コンポーネント名
     * @returns {boolean} 存在するかどうか
     */
    has(name) {
        return this.components.has(name);
    }

    /**
     * 全てのコンポーネントを初期化
     */
    initializeAll() {
        if (this.initialized) {
            console.warn('コンポーネントは既に初期化済みです');
            return;
        }

        for (const [name, component] of this.components) {
            try {
                if (component && typeof component.createElement === 'function') {
                    // 既に初期化済みかチェック
                    if (!component.initialized) {
                        component.createElement();
                        component.initialized = true;
                    } else {
                    }
                }
            } catch (error) {
                console.error(`コンポーネント '${name}' の初期化に失敗:`, error);
            }
        }
        this.initialized = true;
    }

    /**
     * 全てのコンポーネントをローカライズ
     */
    localizeAll() {
        for (const [name, component] of this.components) {
            try {
                if (component && typeof component.localize === 'function') {
                    component.localize();
                }
            } catch (error) {
                console.warn(`コンポーネント '${name}' のローカライズに失敗:`, error);
            }
        }
    }

    /**
     * 指定されたコンポーネントを表示
     * @param {string} name コンポーネント名
     */
    show(name) {
        const component = this.get(name);
        if (component && typeof component.show === 'function') {
            component.show();
        }
    }

    /**
     * 指定されたコンポーネントを非表示
     * @param {string} name コンポーネント名
     */
    hide(name) {
        const component = this.get(name);
        if (component && typeof component.hide === 'function') {
            component.hide();
        }
    }

    /**
     * 全てのコンポーネントを破棄
     */
    destroyAll() {
        for (const [name, component] of this.components) {
            try {
                if (component && typeof component.destroy === 'function') {
                    component.destroy();
                }
            } catch (error) {
                console.error(`コンポーネント '${name}' の破棄に失敗:`, error);
            }
        }
        this.components.clear();
        this.initialized = false;
    }

    /**
     * 登録されているコンポーネント一覧を取得
     * @returns {Array<string>} コンポーネント名の配列
     */
    getComponentNames() {
        return Array.from(this.components.keys());
    }

    /**
     * 初期化状態を取得
     * @returns {boolean} 初期化済みかどうか
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * コンポーネント数を取得
     * @returns {number} 登録されているコンポーネント数
     */
    size() {
        return this.components.size;
    }

    /**
     * 全てのコンポーネントにCSS変数を設定
     * @param {string} name CSS変数名（--なしで指定）
     * @param {string} value 値
     */
    setCSSVariableForAll(name, value) {
        for (const component of this.components.values()) {
            if (component && typeof component.setCSSVariable === 'function') {
                component.setCSSVariable(name, value);
            }
        }
    }

}