/**
 * SideTimeTable - 時間管理モジュール
 *
 * このファイルはタイムテーブルの基本構造と時間関連の機能を管理します。
 */

import {TIME_CONSTANTS} from '../lib/utils.js';
import {calculateBreakHours, calculateWorkHours, isSameDay} from '../lib/time-utils.js';

// EventLayoutManager関連の定数
const LAYOUT_CONSTANTS = {
    BASE_LEFT: 65,           // イベントの基本左位置（px）
    GAP: 5,                  // イベント間の基本間隔（px）
    RESERVED_SPACE_MARGIN: 25,    // baseLeft以外の予約領域（px）
    MIN_WIDTH: 100,          // 最小保証幅（px）
    DEFAULT_WIDTH: 200,      // デフォルト最大幅（px）
    MIN_CONTENT_WIDTH: 20,   // 最小コンテンツ幅（px）
    MIN_GAP: 2,              // 最小間隔（px）
    MIN_DISPLAY_WIDTH: 40,   // タイトルのみ表示の閾値（px）
    Z_INDEX: 5,              // Flexコンテナのz-index

    // パディング設定
    PADDING: {
        BASIC: 10,           // 基本パディング（2レーン以下）
        COMPACT: 8,          // コンパクトパディング（3-4レーン）
        MICRO: 6             // マイクロパディング（5レーン以上）
    },

    // レーン数による閾値
    LANE_THRESHOLDS: {
        COMPACT: 2,          // コンパクトモードになるレーン数
        MICRO: 4             // マイクロモードになるレーン数
    }
};

/**
 * EventLayoutManager - イベントの配置を管理するクラス
 *
 * このクラスは複数のイベントが時間的に重なる場合の表示位置を調整します。
 * イベントの重なり検出やレイアウト計算を効率的に行い、
 * UIにおけるイベントの視覚的な配置を最適化します。
 *
 * @example
 * // 使用例:
 * const layoutManager = new EventLayoutManager();
 * layoutManager.registerEvent({
 *   id: 'event1',
 *   startTime: new Date('2023-01-01T10:00:00'),
 *   endTime: new Date('2023-01-01T11:00:00'),
 *   element: document.getElementById('event1'),
 *   type: 'local'
 * });
 * layoutManager.calculateLayout(); // レイアウトを計算して適用
 */
export class EventLayoutManager {
    /**
     * EventLayoutManagerのインスタンスを作成
     *
     * @constructor
     * @param {HTMLElement} [baseElement] - sideTimeTableBase要素への参照（幅計算用）
     */
    constructor(baseElement = null) {
        /**
         * 登録されたイベントの配列
         * @type {Array<Object>}
         * @private
         */
        this.events = [];

        /**
         * 計算されたレイアウトグループの配列
         * @type {Array<Array<Object>>}
         * @private
         */
        this.layoutGroups = [];

        /**
         * sideTimeTableBase要素への参照
         * @type {HTMLElement|null}
         * @private
         */
        this.baseElement = baseElement;

        /**
         * イベントの最大幅（ピクセル）
         * @type {number}
         */
        this.maxWidth = this._calculateMaxWidth();

        /**
         * 時間値のキャッシュ（パフォーマンス向上のため）
         * @type {Map<string, number>}
         * @private
         */
        this.timeValueCache = new Map();

        /**
         * リサイズオブザーバー
         * @type {ResizeObserver|null}
         * @private
         */
        this.resizeObserver = null;

        // リサイズオブザーバーを初期化
        this._initializeResizeObserver();
    }

    /**
     * 最大幅を計算する
     * @returns {number} 計算された最大幅
     * @private
     */
    _calculateMaxWidth() {
        if (this.baseElement) {
            const rect = this.baseElement.getBoundingClientRect();
            const availableWidth = rect.width - LAYOUT_CONSTANTS.BASE_LEFT - LAYOUT_CONSTANTS.RESERVED_SPACE_MARGIN;
            return Math.max(availableWidth, LAYOUT_CONSTANTS.MIN_WIDTH);
        }
        return LAYOUT_CONSTANTS.DEFAULT_WIDTH;
    }

    /**
     * リサイズオブザーバーを初期化
     * @private
     */
    _initializeResizeObserver() {
        if (this.baseElement && window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver((entries) => {
                // デバウンス処理
                if (this.resizeTimeout) {
                    clearTimeout(this.resizeTimeout);
                }

                this.resizeTimeout = setTimeout(() => {
                    this._handleResize();
                }, 100); // 100ms のデバウンス
            });

            this.resizeObserver.observe(this.baseElement);
        }
    }

    /**
     * リサイズハンドラー
     * @private
     */
    _handleResize() {
        // 最大幅を再計算
        const oldMaxWidth = this.maxWidth;
        this.maxWidth = this._calculateMaxWidth();

        // 幅が変わった場合のみレイアウトを再計算
        if (Math.abs(oldMaxWidth - this.maxWidth) > 5) { // 5px以上の変化で更新
            this.calculateLayout();
        }
    }

    /**
     * ベース要素を更新（動的に変更される場合）
     * @param {HTMLElement} newBaseElement - 新しいベース要素
     */
    updateBaseElement(newBaseElement) {
        // 既存のオブザーバーを停止
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        // 新しい要素を設定
        this.baseElement = newBaseElement;
        this.maxWidth = this._calculateMaxWidth();

        // 新しいオブザーバーを初期化
        this._initializeResizeObserver();

        // レイアウトを再計算
        if (this.events.length > 0) {
            this.calculateLayout();
        }
    }

    /**
     * イベントを登録する
     *
     * @param {Object} event - 登録するイベントオブジェクト
     * @param {string} event.id - イベントの一意ID
     * @param {Date} event.startTime - 開始時刻
     * @param {Date} event.endTime - 終了時刻
     * @param {HTMLElement} event.element - イベントのDOM要素
     * @param {string} [event.type] - イベントのタイプ ('local', 'google')
     * @param {string} [event.title] - イベントのタイトル
     * @param {string} [event.calendarId] - カレンダーID（Googleイベントの場合）
     *
     * @example
     * layoutManager.registerEvent({
     *   id: 'meeting-123',
     *   startTime: new Date('2023-01-01T14:00:00'),
     *   endTime: new Date('2023-01-01T15:30:00'),
     *   element: document.getElementById('meeting-div'),
     *   type: 'google',
     *   title: 'チームミーティング'
     * });
     */
    registerEvent(event) {
        if (!event.id || !event.startTime || !event.endTime || !event.element) {
            console.warn('イベント登録に必要な情報が不足しています:', event);
            return;
        }

        // 既存のイベントを更新（同じIDの場合）
        const existingIndex = this.events.findIndex(e => e.id === event.id);
        if (existingIndex !== -1) {
            this.events[existingIndex] = { ...this.events[existingIndex], ...event };
        } else {
            this.events.push(event);
        }
    }

    /**
     * 指定したIDのイベントを削除する
     *
     * @param {string} eventId - 削除するイベントのID
     * @returns {boolean} 削除が成功したかどうか
     *
     * @example
     * const removed = layoutManager.removeEvent('meeting-123');
     * if (removed) {
     *   console.log('イベントが削除されました');
     * }
     */
    removeEvent(eventId) {
        const initialLength = this.events.length;
        this.events = this.events.filter(event => event.id !== eventId);
        return this.events.length < initialLength;
    }

    /**
     * 時間値をキャッシュから取得または計算してキャッシュに保存
     * @param {Date} time - 時間オブジェクト
     * @returns {number} 0:00からの経過分数
     * @private
     */
    _getCachedTimeValue(time) {
        const timeKey = time.toISOString();

        if (this.timeValueCache.has(timeKey)) {
            return this.timeValueCache.get(timeKey);
        }

        const value = time.getHours() * 60 + time.getMinutes();
        this.timeValueCache.set(timeKey, value);
        return value;
    }

    /**
     * 2つのイベントが時間的に重なっているかを判定
     *
     * @param {Object} event1 - 第1のイベント
     * @param {Object} event2 - 第2のイベント
     * @returns {boolean} 重なっている場合true
     * @private
     *
     * @example
     * const overlaps = layoutManager._areEventsOverlapping(event1, event2);
     */
    _areEventsOverlapping(event1, event2) {
        const start1 = this._getCachedTimeValue(event1.startTime);
        const end1 = this._getCachedTimeValue(event1.endTime);
        const start2 = this._getCachedTimeValue(event2.startTime);
        const end2 = this._getCachedTimeValue(event2.endTime);

        // 時間が重なる条件: event1の開始 < event2の終了 AND event2の開始 < event1の終了
        return start1 < end2 && start2 < end1;
    }

    /**
     * 重なるイベントをグループ化
     * @returns {Array<Array<Object>>} グループ化されたイベントの配列
     * @private
     */
    _groupOverlappingEvents() {
        const groups = [];
        const processedEvents = new Set();

        for (const event of this.events) {
            if (processedEvents.has(event.id)) continue;

            const group = [event];
            processedEvents.add(event.id);

            // このイベントと重なる他のイベントを見つける
            for (const otherEvent of this.events) {
                if (processedEvents.has(otherEvent.id)) continue;

                // グループ内のいずれかのイベントと重なるかチェック
                let overlapsWithGroup = false;
                for (const groupEvent of group) {
                    if (this._areEventsOverlapping(groupEvent, otherEvent)) {
                        overlapsWithGroup = true;
                        break;
                    }
                }

                if (overlapsWithGroup) {
                    group.push(otherEvent);
                    processedEvents.add(otherEvent.id);
                }
            }

            groups.push(group);
        }

        return groups;
    }

    /**
     * グループ内のイベントにレーンを割り当て
     * @param {Array<Object>} group - イベントのグループ
     * @returns {Array<Object>} レーン情報付きのイベント配列
     * @private
     */
    _assignLanesToGroup(group) {
        // 開始時刻でソート
        const sortedEvents = group.sort((a, b) =>
            this._getCachedTimeValue(a.startTime) - this._getCachedTimeValue(b.startTime)
        );

        // レーンごとのイベントリスト
        const lanes = [];

        for (const event of sortedEvents) {
            let assignedLane = -1;

            // 既存のレーンで配置可能なレーンを探す
            for (let i = 0; i < lanes.length; i++) {
                const laneEvents = lanes[i];
                let canPlaceInLane = true;

                // このレーンの全てのイベントと重ならないかチェック
                for (const laneEvent of laneEvents) {
                    if (this._areEventsOverlapping(event, laneEvent)) {
                        canPlaceInLane = false;
                        break;
                    }
                }

                if (canPlaceInLane) {
                    laneEvents.push(event);
                    assignedLane = i;
                    break;
                }
            }

            // 既存のレーンに配置できない場合、新しいレーンを作成
            if (assignedLane === -1) {
                lanes.push([event]);
                assignedLane = lanes.length - 1;
            }

            event.lane = assignedLane;
        }

        // 各イベントに総レーン数を設定
        const totalLanes = lanes.length;
        for (const event of sortedEvents) {
            event.totalLanes = totalLanes;
        }

        return sortedEvents;
    }

    /**
     * 全イベントのレイアウトを計算して適用
     *
     * @example
     * // イベント登録後にレイアウトを計算
     * layoutManager.registerEvent(event1);
     * layoutManager.registerEvent(event2);
     * layoutManager.calculateLayout();
     */
    calculateLayout() {
        if (this.events.length === 0) return;

        // 最大幅を再計算
        this.maxWidth = this._calculateMaxWidth();

        // 重なるイベントをグループ化
        this.layoutGroups = this._groupOverlappingEvents();

        // 各グループにレイアウトを適用
        for (const group of this.layoutGroups) {
            if (group.length === 1) {
                this._applySingleEventLayout(group[0]);
            } else {
                const eventsWithLanes = this._assignLanesToGroup(group);
                this._applyMultiEventLayout(eventsWithLanes);
            }
        }
    }

    /**
     * 単独イベントのレイアウトを適用
     * @param {Object} event - イベントオブジェクト
     * @private
     */
    _applySingleEventLayout(event) {
        if (!event.element) return;

        event.element.style.left = `${LAYOUT_CONSTANTS.BASE_LEFT}px`;
        event.element.style.width = `${this.maxWidth}px`;
        event.element.style.zIndex = LAYOUT_CONSTANTS.Z_INDEX;
    }

    /**
     * 複数イベントのレイアウトを適用
     * @param {Array<Object>} events - レーン情報付きのイベント配列
     * @private
     */
    _applyMultiEventLayout(events) {
        try {
            const totalLanes = Math.max(...events.map(e => e.totalLanes));
            const laneCount = totalLanes;

            // 利用可能幅を計算（間隔を考慮）
            const totalGap = LAYOUT_CONSTANTS.GAP * (laneCount - 1);
            const availableWidth = this.maxWidth - totalGap;
            const laneWidth = Math.max(availableWidth / laneCount, LAYOUT_CONSTANTS.MIN_CONTENT_WIDTH);

            // レイアウトを適用
            requestAnimationFrame(() => {
                events.forEach((event) => {
                    if (!event.element) return;

                    const leftPosition = LAYOUT_CONSTANTS.BASE_LEFT + (event.lane * (laneWidth + LAYOUT_CONSTANTS.GAP));

                    event.element.style.left = `${leftPosition}px`;
                    event.element.style.width = `${laneWidth}px`;
                    event.element.style.zIndex = LAYOUT_CONSTANTS.Z_INDEX;

                    // パディングをレーン数に応じて調整
                    let padding;
                    if (laneCount <= LAYOUT_CONSTANTS.LANE_THRESHOLDS.COMPACT) {
                        padding = LAYOUT_CONSTANTS.PADDING.BASIC;
                    } else if (laneCount <= LAYOUT_CONSTANTS.LANE_THRESHOLDS.MICRO) {
                        padding = LAYOUT_CONSTANTS.PADDING.COMPACT;
                    } else {
                        padding = LAYOUT_CONSTANTS.PADDING.MICRO;
                    }

                    event.element.style.padding = `${padding}px`;

                    // 狭すぎる場合はタイトルのみ表示
                    if (laneWidth < LAYOUT_CONSTANTS.MIN_DISPLAY_WIDTH) {
                        event.element.classList.add('narrow-display');
                    } else {
                        event.element.classList.remove('narrow-display');
                    }
                });
            });
        } catch (error) {
            console.error('イベントレイアウト適用中にエラーが発生しました:', error);
        }
    }

    /**
     * リソースをクリーンアップ
     */
    destroy() {
        // リサイズオブザーバーを停止
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        // タイマーをクリア
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = null;
        }

        // キャッシュをクリア
        this.timeValueCache.clear();

        // イベント配列をクリア
        this.events = [];
        this.layoutGroups = [];
    }
}