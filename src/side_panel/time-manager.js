/**
 * SideTimeTable - 時間管理モジュール
 * 
 * このファイルはタイムテーブルの基本構造と時間関連の機能を管理します。
 */

import { TIME_CONSTANTS } from '../lib/utils.js';

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
