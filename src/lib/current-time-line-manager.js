/**
 * CurrentTimeLineManager - 現在時刻線の管理クラス
 * 
 * このクラスは現在時刻を示す線の表示・非表示と位置計算を担当します。
 * 責任を明確に分離することで、テストしやすく保守しやすい設計になっています。
 */

import {calculateWorkHours} from './time-utils.js';
import {isDemoMode} from './demo-data.js';

/**
 * 現在時刻線を管理するクラス
 */
export class CurrentTimeLineManager {
    /**
     * CurrentTimeLineManagerのインスタンスを作成
     * 
     * @param {HTMLElement} parentElement - 現在時刻線を配置する親要素
     */
    constructor(parentElement) {
        /**
         * 現在時刻線を配置する親要素
         * @type {HTMLElement}
         */
        this.parentElement = parentElement;

        /**
         * 現在時刻線のDOM要素
         * @type {HTMLElement|null}
         */
        this.timeLineElement = null;
    }

    /**
     * 現在時刻線を更新
     * 
     * @param {Date} targetDate - 表示対象の日付
     * @param {string} openHour - 業務開始時間（"HH:MM"形式）
     * @param {string} closeHour - 業務終了時間（"HH:MM"形式）
     * @returns {void}
     */
    update(targetDate, openHour, closeHour) {
        const currentTime = new Date();
        
        // 現在時刻線の要素を取得または作成
        this._ensureTimeLineElement();
        
        // 現在時刻が今日の業務時間内かどうかを判定
        const shouldShow = this._shouldShowTimeLine(currentTime, targetDate, openHour, closeHour);
        
        if (shouldShow) {
            this._showTimeLine(currentTime, targetDate, openHour, closeHour);
        } else {
            this._hideTimeLine();
        }
    }

    /**
     * 現在時刻線を強制的に非表示にする
     * 
     * @returns {void}
     */
    hide() {
        if (this.timeLineElement) {
            this.timeLineElement.style.display = 'none';
        }
    }

    /**
     * 現在時刻線の要素を削除
     * 
     * @returns {void}
     */
    remove() {
        if (this.timeLineElement && this.timeLineElement.parentNode) {
            this.timeLineElement.parentNode.removeChild(this.timeLineElement);
            this.timeLineElement = null;
        }
    }

    /**
     * 現在時刻線のDOM要素が存在することを保証
     * 
     * @private
     * @returns {void}
     */
    _ensureTimeLineElement() {
        if (!this.timeLineElement) {
            this.timeLineElement = document.createElement('div');
            this.timeLineElement.id = 'currentTimeLine';
            this.timeLineElement.className = 'current-time-line';
            this.parentElement.appendChild(this.timeLineElement);
        }
    }

    /**
     * 現在時刻線を表示すべきかどうかを判定
     * 
     * @private
     * @param {Date} currentTime - 現在時刻
     * @param {Date} targetDate - 表示対象の日付
     * @returns {boolean} 表示すべき場合true
     */
    _shouldShowTimeLine(currentTime, targetDate) {
        try {
            // 24時間表示なので、今日の場合は常に表示
            return this._isSameDay(currentTime, targetDate);
        } catch (error) {
            console.warn('現在時刻線の表示判定でエラーが発生しました:', error);
            return false;
        }
    }

    /**
     * 現在時刻線を表示する
     * 
     * @private
     * @param {Date} currentTime - 現在時刻
     * @param {Date} targetDate - 表示対象の日付
     * @param {string} openHour - 業務開始時間
     * @param {string} closeHour - 業務終了時間
     * @returns {void}
     */
    _showTimeLine(currentTime, targetDate, openHour, closeHour) {
        try {
            const { openTime } = calculateWorkHours(targetDate, openHour, closeHour);
            const offset = this._calculateTimeLinePosition(currentTime, openTime);
            
            this.timeLineElement.style.top = `${offset}px`;
            this.timeLineElement.style.display = 'block';
        } catch (error) {
            console.error('現在時刻線の表示でエラーが発生しました:', error);
            this._hideTimeLine();
        }
    }

    /**
     * 現在時刻線を非表示にする
     * 
     * @private
     * @returns {void}
     */
    _hideTimeLine() {
        if (this.timeLineElement) {
            this.timeLineElement.style.display = 'none';
        }
    }

    /**
     * 現在時刻線の位置を計算
     * 
     * @private
     * @param {Date} currentTime - 現在時刻
     * @returns {number} 位置（ピクセル）
     */
    _calculateTimeLinePosition(currentTime) {
        // デモモードの場合は固定位置（737px）を返す
        if (isDemoMode()) {
            return 737;
        }
        
        // 24時間座標系での位置計算（0:00からの分数）
        return currentTime.getHours() * 60 + currentTime.getMinutes();
    }

    /**
     * 2つの日付が同じ日かどうかを判定
     * 
     * @private
     * @param {Date} date1 - 日付1
     * @param {Date} date2 - 日付2
     * @returns {boolean} 同じ日の場合true
     */
    _isSameDay(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        d1.setHours(0, 0, 0, 0);
        d2.setHours(0, 0, 0, 0);
        return d1.getTime() === d2.getTime();
    }
}