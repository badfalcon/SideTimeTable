/**
 * SideTimeTable - 時間管理モジュール
 * 
 * このファイルはタイムテーブルの基本構造と時間関連の機能を管理します。
 */

import { TIME_CONSTANTS } from '../lib/utils.js';
import { calculateWorkHours, calculateBreakHours } from '../lib/time-utils.js';
import { CurrentTimeLineManager } from '../lib/current-time-line-manager.js';

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
     */
    constructor() {
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
         * イベントの最大幅（ピクセル）
         * @type {number}
         */
        this.maxWidth = 200;

        /**
         * イベントの基本左位置（ピクセル）
         * @type {number}
         */
        this.baseLeft = 65;

        /**
         * イベント間の間隔（ピクセル）
         * @type {number}
         */
        this.gap = 5;

        /**
         * 時間計算のキャッシュ
         * @type {Map<string, number>}
         * @private
         */
        this._timeCache = new Map();
    }

    /**
     * 時間値をミリ秒に変換し、結果をキャッシュする
     * 
     * 同じ時間値の変換を繰り返し行うことを避けるため、
     * 変換結果をキャッシュして再利用します。
     * 
     * @private
     * @param {Date|number} time - 変換する時間（DateオブジェクトまたはUNIXタイムスタンプ）
     * @param {string} id - イベントID
     * @param {string} type - 時間の種類 ('start' または 'end')
     * @returns {number} ミリ秒単位の時間値
     */
    _getTimeInMillis(time, id, type) {
        // キャッシュキーを生成
        const cacheKey = `${id}_${type}`;

        // キャッシュに存在する場合はそれを返す
        if (this._timeCache.has(cacheKey)) {
            return this._timeCache.get(cacheKey);
        }

        // 存在しない場合は計算して保存
        const timeInMillis = time instanceof Date ? time.getTime() : time;
        this._timeCache.set(cacheKey, timeInMillis);

        return timeInMillis;
    }

    /**
     * 時間キャッシュをクリアする
     * 
     * すべての時間計算キャッシュをクリアします。
     * イベントの削除や大規模な変更の後に呼び出すことで、
     * 古いキャッシュデータによる問題を防止します。
     * 
     * @private
     */
    _clearTimeCache() {
        this._timeCache.clear();
    }

    /**
     * イベントをレイアウトマネージャーに登録する
     * 
     * このメソッドはイベントをレイアウト計算対象として登録します。
     * 登録されたイベントは calculateLayout() が呼ばれたときに配置が計算されます。
     * 
     * @param {Object} eventData - イベント情報
     * @param {Date|number} eventData.startTime - 開始時間（Date型またはミリ秒のタイムスタンプ）
     * @param {Date|number} eventData.endTime - 終了時間（Date型またはミリ秒のタイムスタンプ）
     * @param {HTMLElement} eventData.element - イベントを表示するDOM要素
     * @param {string} eventData.id - イベントの一意識別子（必須）
     * @param {string} [eventData.type] - イベントタイプ ('google' または 'local')
     * @throws {Error} 無効なイベントデータが渡された場合
     * @throws {Error} 開始時間が終了時間より後の場合
     * @throws {Error} イベントタイプが不正の場合
     * @returns {void}
     * 
     * @example
     * layoutManager.registerEvent({
     *   id: 'event1',
     *   startTime: new Date('2023-01-01T10:00:00'),
     *   endTime: new Date('2023-01-01T11:00:00'),
     *   element: document.getElementById('event1'),
     *   type: 'local'
     * });
     */
    registerEvent(eventData) {
        // 必須パラメータのバリデーション
        if (!eventData || !eventData.startTime || !eventData.endTime || !eventData.element || !eventData.id) {
            throw new Error('無効なイベントデータです');
        }

        // 開始時間と終了時間の検証
        const start = eventData.startTime instanceof Date ? eventData.startTime.getTime() : eventData.startTime;
        const end = eventData.endTime instanceof Date ? eventData.endTime.getTime() : eventData.endTime;

        if (start >= end) {
            throw new Error('開始時間は終了時間より前である必要があります');
        }

        // イベントタイプの検証（存在する場合）
        if (eventData.type && !['google', 'local'].includes(eventData.type)) {
            throw new Error("イベントタイプは 'google' または 'local' である必要があります");
        }

        // 時間をキャッシュに事前に格納しておく
        this._getTimeInMillis(eventData.startTime, eventData.id, 'start');
        this._getTimeInMillis(eventData.endTime, eventData.id, 'end');

        this.events.push(eventData);
    }

    /**
     * すべてのイベントをクリアする
     * 
     * 登録されているすべてのイベントを削除し、DOM要素への参照も解放してメモリリークを防止します。
     * このメソッドを呼び出した後は calculateLayout() を呼び出しても何も表示されません。
     * 
     * @returns {void}
     * 
     * @example
     * // すべてのイベントを削除
     * layoutManager.clearEvents();
     */
    clearEvents() {
        // DOM要素への参照を明示的に解放
        // 注意: 実際にDOM要素を削除するのではなく、参照のみを解放
        this.events.forEach(event => {
            if (event && event.element) {
                // イベント要素への参照を解放
                event.element = null;
            }
        });

        this.events = [];

        /**
         * 計算されたレイアウトグループの配列
         * @type {Array<Array<Object>>}
         * @private
         */
        this.layoutGroups = [];
        this._clearTimeCache(); // 時間キャッシュもクリア
    }

    /**
     * 特定のイベントを削除する
     * 
     * 指定されたIDのイベントを検索して削除します。
     * 削除されたイベントの時間キャッシュもクリアされます。
     * 
     * @param {string} id - 削除するイベントのID
     * @throws {Error} IDが未指定の場合
     * @returns {boolean} イベントが見つかり削除された場合はtrue、それ以外はfalse
     * 
     * @example
     * // 特定のイベントを削除
     * const wasRemoved = layoutManager.removeEvent('event1');
     * if (wasRemoved) {
     *   console.log('イベントが削除されました');
     * } else {
     *   console.log('指定されたIDのイベントが見つかりませんでした');
     * }
     */
    removeEvent(id) {
        if (!id) {
            throw new Error('削除するイベントのIDが指定されていません');
        }

        const originalLength = this.events.length;
        this.events = this.events.filter(event => event.id !== id);

        // イベントが削除された場合、関連するキャッシュもクリア
        if (this.events.length < originalLength) {
            // 削除されたイベントのキャッシュエントリを削除
            const startKey = `${id}_start`;
            const endKey = `${id}_end`;
            this._timeCache.delete(startKey);
            this._timeCache.delete(endKey);
            return true;
        }

        return false;
    }

    /**
     * イベントの配置を計算して適用する
     * 
     * このメソッドは登録されたすべてのイベントを処理し、時間的な重なりに基づいて
     * 視覚的に最適なレイアウトを計算し、各イベント要素のスタイルを更新します。
     * 
     * 処理の流れ:
     * 1. 無効なイベントデータをフィルタリング
     * 2. イベントを開始時間順にソート
     * 3. 時間的に重なるイベントをグループ化
     * 4. 各グループのイベントの幅と位置を計算
     * 5. 計算された配置をDOM要素に適用
     * 
     * @throws {Error} 計算中にエラーが発生した場合
     * @returns {void}
     * 
     * @example
     * // イベントを登録した後、レイアウトを計算
     * layoutManager.registerEvent(...);
     * layoutManager.calculateLayout();
     */
    calculateLayout() {
        if (this.events.length === 0) return;

        try {
            // キャッシュをクリア
            this._timeCache.clear();

            // 無効なデータや参照が解除されたイベントを除外
            this.events = this.events.filter(event => {
                return event && event.startTime && event.endTime && event.element && event.id;
            });

            if (this.events.length === 0) return;

            // イベントを開始時間でソート
            this.events.sort((a, b) => {
                const startA = this._getTimeInMillis(a.startTime, a.id, 'start');
                const startB = this._getTimeInMillis(b.startTime, b.id, 'start');
                return startA - startB;
            });

            // 重なるイベントをグループ化
            this.layoutGroups = this._groupOverlappingEvents();

            // 各グループ内でイベントの配置を計算
            this._applyLayout();
        } catch (error) {
            console.error('イベントレイアウト計算中にエラーが発生しました:', error);
            throw error;
        }
    }

    /**
     * 時間的に重なるイベントをグループ化する
     * 
     * 時間的に重なり合うイベントを検出してグループにまとめます。
     * このグループ化により、重なり合うイベントを横に並べて表示する際の
     * レイアウト計算の基礎となります。
     * 
     * アルゴリズム:
     * 1. イベントは開始時間でソート済みであると想定
     * 2. 各イベントについて、現在のグループ内の他のイベントと時間的な重なりをチェック
     * 3. 重なりがある場合は同じグループに追加、ない場合は新しいグループを作成
     * 
     * @private
     * @returns {Array<Array<Object>>} 重なるイベントのグループ配列
     */
    _groupOverlappingEvents() {
        const groups = [];
        let currentGroup = [];

        // 最初のイベントをグループに追加
        if (this.events.length > 0) {
            currentGroup.push(this.events[0]);
        }

        // 2番目以降のイベントを処理
        for (let i = 1; i < this.events.length; i++) {
            const currentEvent = this.events[i];
            const currentStart = this._getTimeInMillis(currentEvent.startTime, currentEvent.id, 'start');
            const currentEnd = this._getTimeInMillis(currentEvent.endTime, currentEvent.id, 'end');

            // 現在のグループ内の最後のイベントの終了時間を取得
            let overlapsWithGroup = false;

            // グループ内のすべてのイベントと重なりをチェック
            for (const groupEvent of currentGroup) {
                const groupEventStart = this._getTimeInMillis(groupEvent.startTime, groupEvent.id, 'start');
                const groupEventEnd = this._getTimeInMillis(groupEvent.endTime, groupEvent.id, 'end');

                // 時間の重なりをより厳密にチェック（両方のイベントが完全に分離していない場合）
                if (!(currentEnd <= groupEventStart || currentStart >= groupEventEnd)) {
                    overlapsWithGroup = true;
                    break;
                }
            }

            if (overlapsWithGroup) {
                // 重なる場合は現在のグループに追加
                currentGroup.push(currentEvent);
            } else {
                // 重ならない場合は新しいグループを作成
                if (currentGroup.length > 0) {
                    groups.push([...currentGroup]);
                }
                currentGroup = [currentEvent];
            }
        }

        // 最後のグループを追加
        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }

        return groups;
    }

    /**
     * イベントをレーンに割り当てる
     * 
     * 時間的に重なるイベントを効率的にレーンに割り当てます。
     * 開始時間が早いイベントから順に処理し、可能な限り少ないレーン数で
     * すべてのイベントを配置します。
     * 
     * @private
     * @param {Array} events - イベントの配列
     * @returns {Array} - 各イベントに対応するレーン番号（インデックス）
     */
    _assignLanes(events) {
        // 開始時刻でソート（元の順序を保持するためにインデックスを記録）
        const sorted = events.map((e, i) => ({...e, index: i}))
            .sort((a, b) => {
                const startA = this._getTimeInMillis(a.startTime, a.id, 'start');
                const startB = this._getTimeInMillis(b.startTime, b.id, 'start');
                return startA - startB;
            });

        const lanes = [];  // 各レーンの最終終了時刻を記録
        const result = new Array(events.length);

        for (const event of sorted) {
            let assigned = false;

            for (let lane = 0; lane < lanes.length; lane++) {
                const eventStart = this._getTimeInMillis(event.startTime, event.id, 'start');
                if (lanes[lane] <= eventStart) {
                    // このレーンに割り当て可能
                    const eventEnd = this._getTimeInMillis(event.endTime, event.id, 'end');
                    lanes[lane] = eventEnd;
                    result[event.index] = lane;
                    assigned = true;
                    break;
                }
            }

            if (!assigned) {
                // 新しいレーンを作成
                const newLane = lanes.length;
                const eventEnd = this._getTimeInMillis(event.endTime, event.id, 'end');
                lanes.push(eventEnd);
                result[event.index] = newLane;
            }
        }

        return result;
    }

    /**
     * 計算されたレイアウトをイベント要素に適用する
     * 
     * 各グループごとに、イベントの幅と水平位置を計算し、
     * 対応するDOM要素のスタイルを更新します。
     * 
     * レイアウトルール:
     * 1. 単一イベントは最大幅で表示
     * 2. 重なるイベントはレーン割り当てに基づいて配置
     * 3. 最小幅を保証
     * 4. イベント間に設定されたギャップを適用
     * 
     * @private
     */
    _applyLayout() {
        try {
            this.layoutGroups.forEach(group => {
                // 無効なイベントをフィルタリング
                const validEvents = group.filter(event => event && event.element);

                if (validEvents.length === 0) return;

                // 1つしかない場合は最大幅で表示
                if (validEvents.length === 1) {
                    const event = validEvents[0];
                    if (event.element) {
                        event.element.style.left = `${this.baseLeft}px`;
                        event.element.style.width = `${this.maxWidth}px`;
                    }
                    return;
                }

                // レーン割り当てを計算
                const laneAssignments = this._assignLanes(validEvents);

                // 必要なレーン数を計算
                const laneCount = Math.max(...laneAssignments) + 1;

                // 各レーンの幅を計算
                // レーン数に応じて幅を調整する - レーン数が増えるほど幅を狭くする
                const laneWidth = Math.max(60, Math.floor((this.maxWidth * 0.9 - (this.gap * (laneCount - 1))) / laneCount));

                // 各イベントの位置を設定
                validEvents.forEach((event, index) => {
                    if (event.element) {
                        const lane = laneAssignments[index];
                        const left = this.baseLeft + (laneWidth + this.gap) * lane;
                        event.element.style.left = `${left}px`;

                        // レーン数に応じて幅を調整
                        const width = laneWidth;
                        event.element.style.width = `${width}px`;

                        // レーン数が多い場合はフォントサイズを小さくする
                        if (laneCount > 2) {
                            event.element.style.fontSize = '0.9em';
                        } else {
                            event.element.style.fontSize = '1em';
                        }
                    }
                });
            });
        } catch (error) {
            console.error('イベントレイアウト適用中にエラーが発生しました:', error);
        }
    }
}

/**
 * TimeTableManager - タイムテーブルの基本構造を管理するクラス
 * 
 * このクラスはタイムテーブルのUI表示と時間軸の管理を担当します。
 * 業務時間の表示、時間ラベルの配置、現在時刻のインジケーターなど、
 * 時間に関連する視覚要素の生成と更新を行います。
 * 
 * 主な機能:
 * - 業務時間の設定と表示
 * - 休憩時間の指定と視覚的な区別
 * - 時間ラベルと時間補助線の生成
 * - リアルタイムの現在時刻インジケーター
 * 
 * @example
 * // 使用例:
 * const parentElement = document.getElementById('timetable-container');
 * const baseElement = document.getElementById('timetable-base');
 * const timeTableManager = new TimeTableManager(parentElement, baseElement);
 * 
 * // 設定を適用
 * timeTableManager.applySettings({
 *   openTime: '09:00',
 *   closeTime: '18:00'
 * });
 * 
 * // 基本的なタイムテーブルを作成（休憩時間あり）
 * timeTableManager.createBaseTable(true, '12:00', '13:00');
 * 
 * // 現在時刻の線を更新
 * setInterval(() => timeTableManager.updateCurrentTimeLine(), 60000);
 */
export class TimeTableManager {
    /**
     * TimeTableManagerのインスタンスを作成
     * 
     * @constructor
     * @param {HTMLElement} parentDiv - タイムテーブルを格納する親要素
     * @param {HTMLElement} baseDiv - 基本的なタイムテーブル要素を格納する要素
     */
    constructor(parentDiv, baseDiv) {
        /**
         * タイムテーブルを格納する親要素
         * @type {HTMLElement}
         */
        this.parentDiv = parentDiv;

        /**
         * 基本的なタイムテーブル要素を格納する要素
         * @type {HTMLElement}
         */
        this.baseDiv = baseDiv;

        /**
         * 業務開始時間（HH:MM形式）
         * @type {string}
         */
        this.openHour = TIME_CONSTANTS.DEFAULT_OPEN_HOUR;

        /**
         * 業務終了時間（HH:MM形式）
         * @type {string}
         */
        this.closeHour = TIME_CONSTANTS.DEFAULT_CLOSE_HOUR;

        /**
         * 業務開始時間（ミリ秒）
         * @type {number}
         */
        this.openTime = 0;

        /**
         * 業務終了時間（ミリ秒）
         * @type {number}
         */
        this.closeTime = 0;

        /**
         * 業務時間の長さ（時間単位）
         * @type {number}
         */
        this.hourDiff = 0;

        /**
         * 現在時刻線マネージャー
         * @type {CurrentTimeLineManager}
         */
        this.currentTimeLineManager = new CurrentTimeLineManager(this.parentDiv);
    }

    /**
     * 時間設定を適用する
     * 
     * このメソッドは業務開始時間と終了時間の設定を更新します。
     * 設定後にタイムテーブルを再生成するには createBaseTable を呼び出す必要があります。
     * 
     * @param {Object} settings - 時間設定オブジェクト
     * @param {string} settings.openTime - 業務開始時間（HH:MM形式）
     * @param {string} settings.closeTime - 業務終了時間（HH:MM形式）
     * @returns {void}
     * 
     * @example
     * timeTableManager.applySettings({
     *   openTime: '09:30',
     *   closeTime: '18:30'
     * });
     */
    applySettings(settings) {
        this.openHour = settings.openTime;
        this.closeHour = settings.closeTime;
    }


    /**
     * 時間関連の変数を初期化
     * 
     * 設定された業務開始時間と終了時間を解析し、内部的な時間計算用の変数を設定します。
     * 
     * @param {Date} targetDate - 対象の日付
     * @returns {Object} 初期化された時間変数
     * @returns {number} returnValue.openTimeHour - 業務開始時間（時）
     * @returns {number} returnValue.openTimeMinute - 業務開始時間（分）
     */
    initializeTimeVariables(targetDate) {
        try {
            const { openTime, closeTime, hourDiff } = calculateWorkHours(targetDate, this.openHour, this.closeHour);
            
            this.openTime = openTime.getTime();
            this.closeTime = closeTime.getTime();
            this.hourDiff = hourDiff;

            console.log(`openTime: ${this.openTime}, closeTime: ${this.closeTime}, hourDiff: ${this.hourDiff}`);
            
            const openTimeParts = this.openHour.split(':');
            return {
                openTimeHour: parseInt(openTimeParts[0], 10),
                openTimeMinute: parseInt(openTimeParts[1], 10)
            };
        } catch (error) {
            console.error('時間変数の初期化でエラーが発生しました:', error);
            throw error;
        }
    }

    /**
     * 基本的なタイムテーブルを作成する
     * 
     * このメソッドは業務時間、休憩時間の表示、時間ラベル、時間補助線などを含む
     * 基本的なタイムテーブルのUI要素を生成します。既存の表示はクリアされます。
     * 
     * @param {boolean} breakTimeFixed - 休憩時間が固定されているかどうか
     * @param {string} [breakTimeStart='12:00'] - 休憩開始時間（HH:MM形式）、breakTimeFixedがtrueの場合に使用
     * @param {string} [breakTimeEnd='13:00'] - 休憩終了時間（HH:MM形式）、breakTimeFixedがtrueの場合に使用
     * @returns {void}
     * @throws {Error} 時間形式が不正な場合にエラーが発生する可能性があります
     * 
     * @example
     * // 固定休憩時間ありのタイムテーブルを作成
     * timeTableManager.createBaseTable(true, '12:00', '13:00');
     * 
     * // 休憩時間なしのタイムテーブルを作成
     * timeTableManager.createBaseTable(false);
     */
    createBaseTable(targetDate, breakTimeFixed, breakTimeStart = '12:00', breakTimeEnd = '13:00') {
        const { openTimeMinute } = this.initializeTimeVariables(targetDate);
        const unitHeight = TIME_CONSTANTS.UNIT_HEIGHT;

        this.parentDiv.style.height = `${unitHeight * (this.hourDiff + 2)}px`;
        this.baseDiv.innerHTML = ''; // 以前の表示をクリア
        this.baseDiv.style.height = `${unitHeight * (this.hourDiff + 2)}px`;

        // 業務時間に色を付ける(休憩時間を除く)
        if (breakTimeFixed) {
            this._createWorkTimeWithBreak(targetDate, breakTimeStart, breakTimeEnd, unitHeight);
        } else {
            this._createWorkTimeWithoutBreak(unitHeight);
        }

        // 各時間ラベルと補助線を追加
        this._addTimeLabelsAndLines(openTimeMinute, unitHeight);
    }

    /**
     * 休憩時間ありの業務時間表示を作成する
     * 
     * 指定された休憩時間を除いた業務時間の視覚表示を作成します。
     * 休憩時間の前後に分かれた2つの業務時間ブロックを生成します。
     * 
     * @private
     * @param {string} breakTimeStart - 休憩開始時間（HH:MM形式）
     * @param {string} breakTimeEnd - 休憩終了時間（HH:MM形式）
     * @param {number} unitHeight - 時間単位の高さ（ピクセル）
     * @returns {void}
     */
    _createWorkTimeWithBreak(targetDate, breakTimeStart, breakTimeEnd, unitHeight) {
        const { breakStartTime, breakEndTime } = calculateBreakHours(targetDate, breakTimeStart, breakTimeEnd);
        const breakTimeStartMillis = breakStartTime.getTime();
        const breakTimeEndMillis = breakEndTime.getTime();

        const breakTimeStartOffset = (1 + (breakTimeStartMillis - this.openTime) / TIME_CONSTANTS.HOUR_MILLIS) * unitHeight;
        const breakTimeDuration = (breakTimeEndMillis - breakTimeStartMillis) / TIME_CONSTANTS.MINUTE_MILLIS * unitHeight / 60;

        // 休憩時間前の業務時間
        const workTimeDiv1 = document.createElement('div');
        workTimeDiv1.className = 'work-time';
        workTimeDiv1.style.top = `${unitHeight}px`;
        workTimeDiv1.style.height = `${breakTimeStartOffset - unitHeight}px`;
        this.baseDiv.appendChild(workTimeDiv1);

        // 休憩時間後の業務時間
        const workTimeDiv2 = document.createElement('div');
        workTimeDiv2.className = 'work-time';
        workTimeDiv2.style.top = `${breakTimeStartOffset + breakTimeDuration}px`;
        workTimeDiv2.style.height = `${unitHeight * (this.closeTime - breakTimeEndMillis) / TIME_CONSTANTS.HOUR_MILLIS}px`;
        this.baseDiv.appendChild(workTimeDiv2);
    }

    /**
     * 休憩時間なしの業務時間表示を作成する
     * 
     * 業務開始時間から終了時間までの連続した業務時間ブロックを生成します。
     * 
     * @private
     * @param {number} unitHeight - 時間単位の高さ（ピクセル）
     * @returns {void}
     */
    _createWorkTimeWithoutBreak(unitHeight) {
        const workTimeDiv = document.createElement('div');
        workTimeDiv.className = 'work-time';
        workTimeDiv.style.top = `${unitHeight}px`;
        workTimeDiv.style.height = `${unitHeight * this.hourDiff}px`;
        this.baseDiv.appendChild(workTimeDiv);
    }

    /**
     * 時間ラベルと補助線を追加する
     * 
     * タイムテーブル上に1時間ごとの時間ラベル（時:00形式）と
     * 水平方向の時間補助線を追加します。
     * 
     * @private
     * @param {number} openTimeMinute - 業務開始時間の分（0-59）
     * @param {number} unitHeight - 時間単位の高さ（ピクセル）
     * @returns {void}
     */
    _addTimeLabelsAndLines(openTimeMinute, unitHeight) {
        for (let i = 0; i <= this.hourDiff + 2; i++) {
            if (i === 0 && openTimeMinute !== 0) {
                continue;
            }

            // 時間ラベル
            const hourLabel = document.createElement('div');
            hourLabel.className = 'hour-label';
            hourLabel.style.top = `${i * 60 - openTimeMinute}px`;
            const hour = new Date(this.openTime + (i - 1) * TIME_CONSTANTS.HOUR_MILLIS).getHours();
            hourLabel.textContent = `${hour}:00`;
            this.baseDiv.appendChild(hourLabel);

            // 時間補助線
            const hourLine = document.createElement('div');
            hourLine.className = 'hour-line';
            hourLine.style.top = `${i * 60 - openTimeMinute}px`;
            this.baseDiv.appendChild(hourLine);
        }
    }

    /**
     * 現在時刻の線を更新する
     * 
     * 現在の時刻に対応する位置に水平線を表示または更新します。
     * 現在時刻が業務時間内の場合のみ表示され、業務時間外の場合は非表示になります。
     * このメソッドは定期的に呼び出すことで、リアルタイムの時間インジケーターとして機能します。
     * 
     * @returns {void}
     * 
     * @example
     * // 1分ごとに現在時刻の線を更新
     * setInterval(() => {
     *   timeTableManager.updateCurrentTimeLine();
     * }, 60000);
     */
    updateCurrentTimeLine(targetDate) {
        this.currentTimeLineManager.update(targetDate, this.openHour, this.closeHour);
    }
}
