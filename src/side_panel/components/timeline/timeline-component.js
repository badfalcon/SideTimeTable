/**
 * TimelineComponent - タイムライン表示コンポーネント
 */
import { Component } from '../base/component.js';
import { CurrentTimeLineManager } from '../../../lib/current-time-line-manager.js';

export class TimelineComponent extends Component {
    constructor(options = {}) {
        super({
            id: 'sideTimeTable',
            className: 'side-time-table',
            ...options
        });

        // 24時間のピクセル高（各時間60px）
        this.TOTAL_HEIGHT = 24 * 60;
        this.HOUR_HEIGHT = 60;

        // UI要素
        this.baseLayer = null;
        this.eventsLayer = null;
        this.localEventsContainer = null;
        this.googleEventsContainer = null;

        // 現在時刻ライン管理
        this.showCurrentTimeLine = options.showCurrentTimeLine !== false;
        this.currentTimeLineManager = null;

        // 表示対象の日付
        this.currentDate = new Date();
    }

    createElement() {
        const container = super.createElement();

        // 既に内容が作成済みの場合はスキップ
        if (container.children.length > 0) {
            return container;
        }

        // ベースレイヤー（時間軸）を作成
        this.baseLayer = this._createBaseLayer();
        container.appendChild(this.baseLayer);

        // イベントレイヤーを作成
        this.eventsLayer = this._createEventsLayer();
        container.appendChild(this.eventsLayer);

        // 現在時刻ラインを作成（今日の場合）
        if (this.showCurrentTimeLine) {
            this._setupCurrentTimeLine();
        }

        return container;
    }

    /**
     * ベースレイヤー（時間軸）を作成
     * @private
     */
    _createBaseLayer() {
        const baseDiv = document.createElement('div');
        baseDiv.className = 'side-time-table-base';
        baseDiv.id = 'sideTimeTableBase';

        // 24時間分の時間ラベルと補助線を作成
        for (let hour = 0; hour < 24; hour++) {
            const topPosition = hour * this.HOUR_HEIGHT;

            // 時間ラベル
            const label = document.createElement('div');
            label.className = 'hour-label';
            label.style.top = `${topPosition}px`;
            label.textContent = `${hour}:00`;

            // 補助線
            const line = document.createElement('div');
            line.className = 'hour-line';
            line.style.top = `${topPosition}px`;

            baseDiv.appendChild(label);
            baseDiv.appendChild(line);
        }

        return baseDiv;
    }

    /**
     * イベントレイヤーを作成
     * @private
     */
    _createEventsLayer() {
        const eventsDiv = document.createElement('div');
        eventsDiv.className = 'side-time-table-events';
        eventsDiv.id = 'sideTimeTableEvents';

        // ローカルイベントコンテナ
        this.localEventsContainer = document.createElement('div');
        this.localEventsContainer.className = 'side-time-table-events-local';
        this.localEventsContainer.id = 'sideTimeTableEventsLocal';

        // Googleイベントコンテナ
        this.googleEventsContainer = document.createElement('div');
        this.googleEventsContainer.className = 'side-time-table-events-google';
        this.googleEventsContainer.id = 'sideTimeTableEventsGoogle';

        eventsDiv.appendChild(this.localEventsContainer);
        eventsDiv.appendChild(this.googleEventsContainer);

        return eventsDiv;
    }

    /**
     * 現在時刻ラインを設定
     * @private
     */
    _setupCurrentTimeLine() {
        if (!this.currentTimeLineManager) {
            this.currentTimeLineManager = new CurrentTimeLineManager(this.eventsLayer, this.currentDate);
        }
        this.currentTimeLineManager.update();
    }

    /**
     * 現在時刻ラインを表示/非表示
     * @param {boolean} visible 表示するかどうか
     */
    setCurrentTimeLineVisible(visible) {
        this.showCurrentTimeLine = visible;

        if (visible) {
            this._setupCurrentTimeLine();
        } else if (this.currentTimeLineManager) {
            this.currentTimeLineManager.forceHide();
        }
    }

    /**
     * 業務時間の背景を設定
     * @param {string} startTime 開始時刻（HH:MM形式）
     * @param {string} endTime 終了時刻（HH:MM形式）
     * @param {string} color 背景色
     */
    setWorkTimeBackground(startTime, endTime, color = '#f8f9fa') {
        // 既存の業務時間背景を削除
        const existingBg = this.baseLayer?.querySelector('.work-time-background');
        if (existingBg) {
            existingBg.remove();
        }

        if (!startTime || !endTime) {
            return;
        }

        try {
            const [startHour, startMinute] = startTime.split(':').map(Number);
            const [endHour, endMinute] = endTime.split(':').map(Number);

            const startMinutes = startHour * 60 + startMinute;
            const endMinutes = endHour * 60 + endMinute;

            if (startMinutes >= endMinutes) {
                return; // 無効な時間範囲
            }

            const background = document.createElement('div');
            background.className = 'work-time-background';
            background.style.cssText = `
                position: absolute;
                left: 0;
                right: 0;
                top: ${startMinutes}px;
                height: ${endMinutes - startMinutes}px;
                background-color: ${color};
                z-index: 1;
                pointer-events: none;
            `;

            this.baseLayer?.appendChild(background);
        } catch (error) {
            console.warn('業務時間背景の設定に失敗:', error);
        }
    }

    /**
     * 表示中の日付が今日かどうかを判定
     * @returns {boolean} 今日の場合true
     */
    isToday() {
        const today = new Date();
        return today.toDateString() === this.currentDate.toDateString();
    }

    /**
     * 表示対象の日付を設定
     * @param {Date} date 表示対象の日付
     */
    setCurrentDate(date) {
        this.currentDate = date;

        // CurrentTimeLineManagerにも日付を設定
        if (this.currentTimeLineManager) {
            this.currentTimeLineManager.setTargetDate(date);
        }
    }

    /**
     * 指定時刻にスクロール
     * @param {string} time 時刻（HH:MM形式）
     */
    scrollToTime(time) {
        if (!time || !this.element) {
            return;
        }

        try {
            const [hour, minute] = time.split(':').map(Number);
            const totalMinutes = hour * 60 + minute;
            const scrollTop = Math.max(0, totalMinutes - 200); // 200px上にマージン

            this.element.scrollTop = scrollTop;
        } catch (error) {
            console.warn('時刻へのスクロールに失敗:', error);
        }
    }

    /**
     * 現在時刻にスクロール
     */
    scrollToCurrentTime() {
        if (!this.isToday()) {
            return;
        }

        const now = new Date();
        const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        this.scrollToTime(timeString);
    }

    /**
     * 業務開始時刻にスクロール
     * @param {string} startTime 業務開始時刻（HH:MM形式）
     */
    scrollToWorkTime(startTime) {
        if (startTime) {
            this.scrollToTime(startTime);
        }
    }

    /**
     * ローカルイベントコンテナをクリア
     */
    clearLocalEvents() {
        if (this.localEventsContainer) {
            this.localEventsContainer.innerHTML = '';
        }
    }

    /**
     * Googleイベントコンテナをクリア
     */
    clearGoogleEvents() {
        if (this.googleEventsContainer) {
            this.googleEventsContainer.innerHTML = '';
        }
    }

    /**
     * 全てのイベントをクリア
     */
    clearAllEvents() {
        this.clearLocalEvents();
        this.clearGoogleEvents();
    }

    /**
     * ローカルイベントコンテナを取得
     * @returns {HTMLElement} ローカルイベントコンテナ
     */
    getLocalEventsContainer() {
        return this.localEventsContainer;
    }

    /**
     * Googleイベントコンテナを取得
     * @returns {HTMLElement} Googleイベントコンテナ
     */
    getGoogleEventsContainer() {
        return this.googleEventsContainer;
    }

    /**
     * 時間軸の高さを取得
     * @returns {number} 総高さ（ピクセル）
     */
    getTotalHeight() {
        return this.TOTAL_HEIGHT;
    }

    /**
     * 1時間の高さを取得
     * @returns {number} 1時間の高さ（ピクセル）
     */
    getHourHeight() {
        return this.HOUR_HEIGHT;
    }

    /**
     * リソースをクリーンアップ
     */
    destroy() {
        // 現在時刻ライン管理を破棄
        if (this.currentTimeLineManager) {
            this.currentTimeLineManager.destroy();
            this.currentTimeLineManager = null;
        }

        super.destroy();
    }
}