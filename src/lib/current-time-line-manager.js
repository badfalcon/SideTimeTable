/**
 * CurrentTimeLineManager - 現在時刻線の管理クラス
 *
 * このクラスは現在時刻を示す線の表示・非表示・位置更新を管理します。
 * タイムライン上に現在時刻を視覚的に表示するための専用クラスです。
 */

/**
 * 現在時刻線を管理するクラス
 */
export class CurrentTimeLineManager {
    /**
     * CurrentTimeLineManagerのインスタンスを作成
     *
     * @param {HTMLElement} parentElement - 現在時刻線を配置する親要素
     * @param {Date} targetDate - 対象の日付（省略時は今日）
     */
    constructor(parentElement, targetDate = null) {
        /**
         * 現在時刻線を配置する親要素
         */
        this.parentElement = parentElement;

        /**
         * 対象の日付
         */
        this.targetDate = targetDate || new Date();

        /**
         * 現在時刻線のDOM要素
         */
        this.timeLineElement = null;

        /**
         * 更新タイマーのID
         */
        this.updateTimer = null;
    }

    /**
     * 現在時刻線を更新
     * 今日の場合のみ表示し、位置を現在時刻に合わせる
     */
    update() {
        if (!this._shouldShowTimeLine()) {
            this.hide();
            return;
        }

        // 現在時刻線の要素を取得または作成
        this._ensureTimeLineElement();

        // 位置を更新
        this._updatePosition();

        // 表示
        this.show();
    }

    /**
     * 現在時刻線を強制的に非表示にする
     */
    forceHide() {
        this.hide();
        this._stopUpdateTimer();
    }

    /**
     * 対象日付を設定
     * @param {Date} targetDate - 対象の日付
     */
    setTargetDate(targetDate) {
        this.targetDate = targetDate;
        this.update();
    }

    /**
     * 現在時刻線の要素を削除
     */
    destroy() {
        this._stopUpdateTimer();

        if (this.timeLineElement) {
            this.timeLineElement.remove();
            this.timeLineElement = null;
        }
    }

    /**
     * 現在時刻線のDOM要素が存在することを保証
     * @private
     */
    _ensureTimeLineElement() {
        if (!this.timeLineElement) {
            // 既存の要素があれば削除
            const existing = document.getElementById('currentTimeLine');
            if (existing) {
                existing.remove();
            }

            this.timeLineElement = document.createElement('div');
            this.timeLineElement.id = 'currentTimeLine';
            this.timeLineElement.className = 'current-time-line';
            this.parentElement.appendChild(this.timeLineElement);
        }
    }

    /**
     * 現在時刻線を表示すべきかどうかを判定
     * @returns {boolean} 表示すべきならtrue
     * @private
     */
    _shouldShowTimeLine() {
        try {
            const today = new Date();
            return today.toDateString() === this.targetDate.toDateString();
        } catch (error) {
            console.warn('現在時刻線の表示判定でエラーが発生しました:', error);
            return false;
        }
    }

    /**
     * 現在時刻線を表示する
     * @private
     */
    show() {
        if (this.timeLineElement) {
            this.timeLineElement.style.display = '';

            // 1分ごとに更新するタイマーを開始
            if (!this.updateTimer) {
                this.updateTimer = setInterval(() => {
                    this._updatePosition();
                }, 60000);
            }
        }
    }

    /**
     * 現在時刻線を非表示にする
     * @private
     */
    hide() {
        if (this.timeLineElement) {
            this.timeLineElement.style.display = 'none';
        }
        this._stopUpdateTimer();
    }

    /**
     * 現在時刻線の位置を計算
     * @private
     */
    _updatePosition() {
        if (!this.timeLineElement) return;

        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const totalMinutes = hours * 60 + minutes;

        // 1分 = 1px として計算
        const topPosition = totalMinutes;

        this.timeLineElement.style.top = `${topPosition}px`;
    }

    /**
     * 更新タイマーを停止
     * @private
     */
    _stopUpdateTimer() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }
}