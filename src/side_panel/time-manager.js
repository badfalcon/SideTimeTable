/**
 * SideTimeTable - 時間管理モジュール
 * 
 * このファイルはタイムテーブルの基本構造と時間関連の機能を管理します。
 */

import { TIME_CONSTANTS } from '../lib/utils.js';

/**
 * EventLayoutManager - イベントの配置を管理するクラス
 * 複数のイベントが時間的に重なる場合の表示位置を調整する
 */
export class EventLayoutManager {
    /**
     * コンストラクタ
     */
    constructor() {
        this.events = [];
        this.layoutGroups = [];
        this.maxWidth = 200; // イベントの最大幅（ピクセル）
        this.baseLeft = 65;  // イベントの基本左位置（ピクセル）
        this.gap = 5;        // イベント間の間隔（ピクセル）
    }

    /**
     * イベントを登録
     * @param {Object} eventData - イベント情報
     * @param {Date|number} eventData.startTime - 開始時間
     * @param {Date|number} eventData.endTime - 終了時間
     * @param {HTMLElement} eventData.element - イベント要素
     * @param {string} eventData.type - イベントタイプ ('google' または 'local')
     * @param {string} eventData.id - イベントの一意識別子
     * @throws {Error} - 無効なイベントデータの場合
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
    
        this.events.push(eventData);
    }

    /**
     * すべてのイベントをクリア
     * DOM要素への参照も解放してメモリリークを防止
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
        this.layoutGroups = [];
    }

    /**
     * 特定のイベントを削除
     * @param {string} id - 削除するイベントのID
     * @returns {boolean} - イベントが見つかり削除された場合はtrue、それ以外はfalse
     */
    removeEvent(id) {
        if (!id) {
            throw new Error('削除するイベントのIDが指定されていません');
        }
        
        const originalLength = this.events.length;
        this.events = this.events.filter(event => event.id !== id);
        
        // 削除されたかどうかを返す
        return this.events.length < originalLength;
    }

    /**
     * イベントの配置を計算して適用
     * @throws {Error} - 計算中にエラーが発生した場合
     */
    calculateLayout() {
        if (this.events.length === 0) return;
    
        try {
            // 無効なデータや参照が解除されたイベントを除外
            this.events = this.events.filter(event => {
                return event && event.startTime && event.endTime && event.element;
            });
            
            if (this.events.length === 0) return;
    
            // イベントを開始時間でソート
            this.events.sort((a, b) => {
                const startA = a.startTime instanceof Date ? a.startTime.getTime() : a.startTime;
                const startB = b.startTime instanceof Date ? b.startTime.getTime() : b.startTime;
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
     * 重なるイベントをグループ化
     * @private
     * @returns {Array} 重なるイベントのグループ配列
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
            const currentStart = currentEvent.startTime instanceof Date ? 
                currentEvent.startTime.getTime() : currentEvent.startTime;
            const currentEnd = currentEvent.endTime instanceof Date ? 
                currentEvent.endTime.getTime() : currentEvent.endTime;

            // 現在のグループ内の最後のイベントの終了時間を取得
            let overlapsWithGroup = false;

            // グループ内のすべてのイベントと重なりをチェック
            for (const groupEvent of currentGroup) {
                const groupEventStart = groupEvent.startTime instanceof Date ? 
                    groupEvent.startTime.getTime() : groupEvent.startTime;
                const groupEventEnd = groupEvent.endTime instanceof Date ? 
                    groupEvent.endTime.getTime() : groupEvent.endTime;
    
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
     * イベントの配置を適用
     * @private
     */
    _applyLayout() {
        try {
            this.layoutGroups.forEach(group => {
                // グループ内のイベント数
                const count = group.length;
                
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
                
                // 複数ある場合は幅を調整
                const width = Math.max(100, Math.floor((this.maxWidth - (this.gap * (validEvents.length - 1))) / validEvents.length));
                
                // 各イベントの位置を設定
                validEvents.forEach((event, index) => {
                    if (event.element) {
                        const left = this.baseLeft + (width + this.gap) * index;
                        event.element.style.left = `${left}px`;
                        event.element.style.width = `${width}px`;
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
 */
export class TimeTableManager {
    /**
     * コンストラクタ
     * @param {HTMLElement} parentDiv - 親要素
     * @param {HTMLElement} baseDiv - 基本要素
     */
    constructor(parentDiv, baseDiv) {
        this.parentDiv = parentDiv;
        this.baseDiv = baseDiv;
        this.openHour = TIME_CONSTANTS.DEFAULT_OPEN_HOUR;
        this.closeHour = TIME_CONSTANTS.DEFAULT_CLOSE_HOUR;
        this.openTime = 0;
        this.closeTime = 0;
        this.hourDiff = 0;
        this.currentTimeLine = null;
    }

    /**
     * 設定を適用する
     * @param {Object} settings - 設定オブジェクト
     */
    applySettings(settings) {
        this.openHour = settings.openTime;
        this.closeHour = settings.closeTime;
    }

    /**
     * 時間関連の変数を初期化
     * @returns {Object} 初期化された時間変数
     */
    initializeTimeVariables() {
        const openTimeParts = this.openHour.split(':');
        const closeTimeParts = this.closeHour.split(':');

        const openTimeHour = parseInt(openTimeParts[0], 10);
        const openTimeMinute = parseInt(openTimeParts[1], 10);
        const closeTimeHour = parseInt(closeTimeParts[0], 10);
        const closeTimeMinute = parseInt(closeTimeParts[1], 10);

        this.openTime = new Date().setHours(openTimeHour, openTimeMinute, 0, 0);
        this.closeTime = new Date().setHours(closeTimeHour, closeTimeMinute, 0, 0);
        this.hourDiff = (this.closeTime - this.openTime) / TIME_CONSTANTS.HOUR_MILLIS;

        console.log(`openTime: ${this.openTime}, closeTime: ${this.closeTime}, hourDiff: ${this.hourDiff}`);
        return { openTimeHour, openTimeMinute };
    }

    /**
     * 基本的なタイムテーブルを作成
     * @param {boolean} breakTimeFixed - 休憩時間が固定かどうか
     * @param {string} breakTimeStart - 休憩開始時間
     * @param {string} breakTimeEnd - 休憩終了時間
     */
    createBaseTable(breakTimeFixed, breakTimeStart, breakTimeEnd) {
        const { openTimeMinute } = this.initializeTimeVariables();
        const unitHeight = TIME_CONSTANTS.UNIT_HEIGHT;

        this.parentDiv.style.height = `${unitHeight * (this.hourDiff + 2)}px`;
        this.baseDiv.innerHTML = ''; // 以前の表示をクリア
        this.baseDiv.style.height = `${unitHeight * (this.hourDiff + 2)}px`;

        // 業務時間に色を付ける(休憩時間を除く)
        if (breakTimeFixed) {
            this._createWorkTimeWithBreak(breakTimeStart, breakTimeEnd, unitHeight);
        } else {
            this._createWorkTimeWithoutBreak(unitHeight);
        }

        // 各時間ラベルと補助線を追加
        this._addTimeLabelsAndLines(openTimeMinute, unitHeight);
    }

    /**
     * 休憩時間ありの業務時間表示を作成
     * @private
     */
    _createWorkTimeWithBreak(breakTimeStart, breakTimeEnd, unitHeight) {
        const breakTimeStartParts = breakTimeStart.split(':');
        const breakTimeEndParts = breakTimeEnd.split(':');

        const breakTimeStartHour = parseInt(breakTimeStartParts[0], 10);
        const breakTimeStartMinute = parseInt(breakTimeStartParts[1], 10);
        const breakTimeEndHour = parseInt(breakTimeEndParts[0], 10);
        const breakTimeEndMinute = parseInt(breakTimeEndParts[1], 10);

        const breakTimeStartMillis = new Date().setHours(breakTimeStartHour, breakTimeStartMinute, 0, 0);
        const breakTimeEndMillis = new Date().setHours(breakTimeEndHour, breakTimeEndMinute, 0, 0);

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
     * 休憩時間なしの業務時間表示を作成
     * @private
     */
    _createWorkTimeWithoutBreak(unitHeight) {
        const workTimeDiv = document.createElement('div');
        workTimeDiv.className = 'work-time';
        workTimeDiv.style.top = `${unitHeight}px`;
        workTimeDiv.style.height = `${unitHeight * this.hourDiff}px`;
        this.baseDiv.appendChild(workTimeDiv);
    }

    /**
     * 時間ラベルと補助線を追加
     * @private
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
     * 現在時刻の線を更新
     */
    updateCurrentTimeLine() {
        const currentTime = new Date();

        // 現在時刻が業務時間内かチェック
        const isWithinWorkHours = currentTime.getTime() >= this.openTime && currentTime.getTime() <= this.closeTime;

        // 既存の線を再利用または作成
        if (!this.currentTimeLine) {
            this.currentTimeLine = document.createElement('div');
            this.currentTimeLine.id = 'currentTimeLine';
            this.currentTimeLine.className = 'current-time-line';
            this.parentDiv.appendChild(this.currentTimeLine);
        }

        if (isWithinWorkHours) {
            // 業務時間内の場合のみ表示
            const offset = (1 + (currentTime.getTime() - this.openTime) / TIME_CONSTANTS.HOUR_MILLIS) * TIME_CONSTANTS.UNIT_HEIGHT;
            this.currentTimeLine.style.top = `${offset}px`;
            this.currentTimeLine.style.display = 'block';
        } else {
            // 業務時間外の場合は非表示
            this.currentTimeLine.style.display = 'none';
        }
    }
}
