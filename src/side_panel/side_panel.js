/**
 * SideTimeTable - サイドパネルタイムテーブル管理（コンポーネント版）
 */

import {
    SidePanelComponentManager,
    HeaderComponent,
    TimelineComponent,
    LocalEventModal,
    GoogleEventModal,
    AlertModal
} from './components/index.js';

import { EventLayoutManager } from './time-manager.js';
import { GoogleEventManager, LocalEventManager } from './event-handlers.js';
import { generateTimeList, loadSettings, logError } from '../lib/utils.js';
import { isToday } from '../lib/time-utils.js';
import { isDemoMode, setDemoMode } from '../lib/demo-data.js';

// リロードメッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "reloadSideTimeTable") {
        location.reload();
        sendResponse({ success: true });
    }
    return true;
});

/**
 * SidePanelUIController - コンポーネントベースのUI管理クラス
 */
class SidePanelUIController {
    constructor() {
        // コンポーネント管理
        this.componentManager = new SidePanelComponentManager();

        // 個別コンポーネント参照
        this.headerComponent = null;
        this.timelineComponent = null;
        this.localEventModal = null;
        this.googleEventModal = null;
        this.alertModal = null;

        // 状態管理
        this.currentDate = new Date();
        this.currentDate.setHours(0, 0, 0, 0);
        this.updateInterval = null;
        this.loadEventsDebounceTimeout = null;
    }

    /**
     * 初期化
     */
    async initialize() {
        try {
            // URLパラメータでデモモードを確認
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('demo') === 'true') {
                setDemoMode(true);
            }

            // 既存のDOM要素を削除（重複防止）
            this._removeExistingElements();

            // コンポーネントを作成・登録
            await this._createComponents();

            // 既存のマネージャークラスを初期化
            await this._initializeManagers();

            // イベントリスナーを設定
            this._setupEventListeners();

            // 初期データを読み込み
            await this._loadInitialData();

            // 定期更新を開始
            this._startPeriodicUpdate();


        } catch (error) {
            console.error('サイドパネルUI初期化エラー:', error);
            this._showError('初期化中にエラーが発生しました: ' + error.message);
        }
    }

    /**
     * 既存のDOM要素を削除（重複防止）
     * @private
     */
    _removeExistingElements() {
        // 既存のヘッダー要素を削除
        const existingHeader = document.getElementById('sideTimeTableHeaderWrapper');
        if (existingHeader) {
            existingHeader.remove();
        }

        // 既存のタイムテーブル要素を削除
        const existingTimeTable = document.getElementById('sideTimeTable');
        if (existingTimeTable) {
            existingTimeTable.remove();
        }

        // 既存のモーダル要素を削除
        const existingModals = [
            'localEventDialog',
            'googleEventDialog',
            'alertModal'
        ];

        existingModals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.remove();
            }
        });

        // 現在時刻ライン要素を削除
        const existingTimeLine = document.getElementById('currentTimeLine');
        if (existingTimeLine) {
            existingTimeLine.remove();
        }

        // その他の重複する可能性のある要素を削除
        const duplicateElements = document.querySelectorAll('[id*="sideTimeTable"], [id*="EventDialog"], [id*="Modal"]');
        duplicateElements.forEach(element => {
            if (element.id !== 'time-list') { // time-listは保持
                element.remove();
            }
        });
    }

    /**
     * コンポーネントを作成・登録
     * @private
     */
    async _createComponents() {
        // ヘッダーコンポーネント
        this.headerComponent = new HeaderComponent({
            onAddEvent: () => this._handleAddLocalEvent(),
            onDateChange: (date) => this._handleDateChange(date),
            onSettingsClick: () => this._openSettings()
        });

        // タイムラインコンポーネント
        this.timelineComponent = new TimelineComponent({
            showCurrentTimeLine: true
        });

        // モーダルコンポーネント
        this.localEventModal = new LocalEventModal({
            onSave: (eventData, mode) => this._handleSaveLocalEvent(eventData, mode),
            onDelete: (event) => this._handleDeleteLocalEvent(event),
            onCancel: () => this._handleCancelLocalEvent()
        });

        this.googleEventModal = new GoogleEventModal();

        this.alertModal = new AlertModal();

        // コンポーネントマネージャーに登録
        this.componentManager.register('header', this.headerComponent);
        this.componentManager.register('timeline', this.timelineComponent);
        this.componentManager.register('localEventModal', this.localEventModal);
        this.componentManager.register('googleEventModal', this.googleEventModal);
        this.componentManager.register('alertModal', this.alertModal);

        // DOMに追加
        const container = document.getElementById('side-panel-container') || document.body;
        this.headerComponent.appendTo(container);
        this.timelineComponent.appendTo(container);
        this.localEventModal.appendTo(container);
        this.googleEventModal.appendTo(container);
        this.alertModal.appendTo(container);

        // 全コンポーネントを初期化
        this.componentManager.initializeAll();

        // コンポーネント初期化後にマネージャーを再初期化
        await this._reinitializeManagers();
    }

    /**
     * コンポーネント初期化後にマネージャーを再初期化
     * @private
     */
    async _reinitializeManagers() {
        // DOM要素が確実に存在する状態でマネージャーを再初期化
        const timeTableBase = document.getElementById('sideTimeTableBase');

        if (timeTableBase) {
            // EventLayoutManagerを再作成
            const { EventLayoutManager } = await import('./time-manager.js');
            this.eventLayoutManager = new EventLayoutManager(timeTableBase);

            // イベントマネージャーのeventLayoutManagerを更新
            if (this.googleEventManager) {
                this.googleEventManager.eventLayoutManager = this.eventLayoutManager;
            }
            if (this.localEventManager) {
                this.localEventManager.eventLayoutManager = this.eventLayoutManager;
            }
        }
    }

    /**
     * 既存のマネージャークラスを初期化
     * @private
     */
    async _initializeManagers() {
        // 時間リストを生成
        generateTimeList();

        // イベントマネージャーを初期化
        const { GoogleEventManager, LocalEventManager } = await import('./event-handlers.js');
        const { EventLayoutManager } = await import('./time-manager.js');

        // レイアウトマネージャーを初期化
        const timeTableBase = document.getElementById('sideTimeTableBase') || this.timelineComponent.element?.querySelector('.side-time-table-base');
        this.eventLayoutManager = new EventLayoutManager(timeTableBase);

        // Googleイベントマネージャーを初期化
        this.googleEventManager = new GoogleEventManager(
            null, // timeTableManagerは使用していないためnull
            this.timelineComponent.getGoogleEventsContainer(),
            this.eventLayoutManager
        );

        // ローカルイベントマネージャーを初期化
        this.localEventManager = new LocalEventManager(
            null, // timeTableManagerは使用していないためnull
            this.timelineComponent.getLocalEventsContainer(),
            this.eventLayoutManager
        );

        // 設定を読み込んで初期設定を適用
        await this._applyInitialSettings();
    }

    /**
     * 初期設定を適用
     * @private
     */
    async _applyInitialSettings() {
        try {
            const settings = await loadSettings();

            // 業務時間の背景を設定
            if (settings.openTime && settings.closeTime && settings.workTimeColor) {
                this.timelineComponent.setWorkTimeBackground(
                    settings.openTime,
                    settings.closeTime,
                    settings.workTimeColor
                );
            }

            // CSS変数を設定
            if (settings.workTimeColor) {
                document.documentElement.style.setProperty('--side-calendar-work-time-color', settings.workTimeColor);
            }
            if (settings.localEventColor) {
                document.documentElement.style.setProperty('--side-calendar-local-event-color', settings.localEventColor);
            }
            if (settings.googleEventColor) {
                document.documentElement.style.setProperty('--side-calendar-google-event-color', settings.googleEventColor);
            }

            // 現在日付を設定
            this.headerComponent.setCurrentDate(this.currentDate);

        } catch (error) {
            console.warn('初期設定の適用に失敗:', error);
        }
    }

    /**
     * イベントリスナーを設定
     * @private
     */
    _setupEventListeners() {
        // リサイズイベント
        const resizeObserver = new ResizeObserver(() => {
            this._handleResize();
        });

        if (this.timelineComponent.element) {
            resizeObserver.observe(this.timelineComponent.element);
        }

        // ローカライゼーション
        this._setupLocalization();
    }

    /**
     * ローカライゼーションを設定
     * @private
     */
    _setupLocalization() {
        if (window.localizeElementText) {
            // 初回ローカライズ
            window.localizeElementText(document.body);

            // コンポーネントのローカライズ
            this.componentManager.localizeAll();
        }
    }

    /**
     * 初期データを読み込み
     * @private
     */
    async _loadInitialData() {
        // TimelineComponentに初期日付を設定
        this.timelineComponent.setCurrentDate(this.currentDate);

        await this._loadEventsForCurrentDate();
        this._scrollToAppropriateTime();
    }

    /**
     * 現在日付のイベントを読み込み
     * @private
     */
    async _loadEventsForCurrentDate() {
        try {
            // 既存のイベントをクリア（重複防止）
            this.timelineComponent.clearAllEvents();
            if (this.eventLayoutManager) {
                this.eventLayoutManager.clearAllEvents();
            }

            // GoogleイベントとローカルイベントをManagerクラス経由で読み込み
            const [localResult, googleResult] = await Promise.allSettled([
                this.localEventManager.loadLocalEvents(this.currentDate),
                this.googleEventManager.fetchEvents(this.currentDate)
            ]);

            // 結果をログ出力
            if (localResult.status === 'fulfilled') {
            }

        } catch (error) {
            console.error('イベント読み込みエラー:', error);
        }
    }


    /**
     * 適切な時刻にスクロール
     * @private
     */
    _scrollToAppropriateTime() {
        if (isToday(this.currentDate)) {
            // 今日の場合は現在時刻にスクロール
            this.timelineComponent.scrollToCurrentTime();
        } else {
            // 他の日の場合は業務開始時刻にスクロール
            loadSettings().then(settings => {
                if (settings.openTime) {
                    this.timelineComponent.scrollToWorkTime(settings.openTime);
                }
            }).catch(console.warn);
        }
    }

    /**
     * 定期更新を開始
     * @private
     */
    _startPeriodicUpdate() {
        // 現在時刻ラインは各コンポーネントで自動更新されるため、
        // ここでは日付変更の監視のみ行う
        this.updateInterval = setInterval(() => {
            const now = new Date();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // 日付が変わった場合
            if (!isToday(this.currentDate) && isToday(today)) {
                this.currentDate = today;
                this.headerComponent.setCurrentDate(this.currentDate);
                this._loadEventsForCurrentDate();
            }
        }, 60000); // 1分ごとにチェック
    }

    /**
     * 日付変更ハンドラー
     * @private
     */
    _handleDateChange(date) {
        this.currentDate = new Date(date);
        this.currentDate.setHours(0, 0, 0, 0);

        // 古い日付のイベントを即座に削除
        this.timelineComponent.clearAllEvents();

        // EventLayoutManagerの状態もクリア
        if (this.eventLayoutManager) {
            this.eventLayoutManager.clearAllEvents();
        }

        // TimelineComponentに日付を設定
        this.timelineComponent.setCurrentDate(this.currentDate);

        // イベントを再読み込み
        this._debounceLoadEvents();

        // 現在時刻ラインの表示を更新
        this.timelineComponent.setCurrentTimeLineVisible(isToday(this.currentDate));

        // スクロール位置を調整
        this._scrollToAppropriateTime();
    }

    /**
     * ローカルイベント追加ハンドラー
     * @private
     */
    _handleAddLocalEvent() {
        // 現在時刻を基にデフォルト時刻を設定
        const now = new Date();
        const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(Math.floor(now.getMinutes() / 15) * 15).padStart(2, '0')}`;
        const endHour = now.getHours() + 1;
        const endTime = `${String(endHour).padStart(2, '0')}:${String(Math.floor(now.getMinutes() / 15) * 15).padStart(2, '0')}`;

        this.localEventModal.showCreate(startTime, endTime);
    }

    /**
     * ローカルイベント保存ハンドラー
     * @private
     */
    async _handleSaveLocalEvent(eventData, mode) {
        try {
            const { loadLocalEvents, saveLocalEvents } = await import('../lib/utils.js');

            if (mode === 'create') {
                // 新規作成
                const localEvents = await loadLocalEvents();
                localEvents.push({
                    title: eventData.title,
                    startTime: eventData.startTime,
                    endTime: eventData.endTime
                });
                await saveLocalEvents(localEvents);
            } else if (mode === 'edit') {
                // 編集
                const localEvents = await loadLocalEvents();
                const eventIndex = localEvents.findIndex(e =>
                    e.title === this.localEventModal.currentEvent.title &&
                    e.startTime === this.localEventModal.currentEvent.startTime &&
                    e.endTime === this.localEventModal.currentEvent.endTime
                );

                if (eventIndex !== -1) {
                    localEvents[eventIndex] = {
                        title: eventData.title,
                        startTime: eventData.startTime,
                        endTime: eventData.endTime
                    };
                    await saveLocalEvents(localEvents);
                }
            }

            // イベント表示を再読み込み
            await this.localEventManager.loadLocalEvents(this.currentDate);

        } catch (error) {
            console.error('ローカルイベント保存エラー:', error);
            this.alertModal.showError('イベントの保存に失敗しました: ' + error.message);
        }
    }

    /**
     * ローカルイベント削除ハンドラー
     * @private
     */
    async _handleDeleteLocalEvent(event) {
        try {
            const { loadLocalEvents, saveLocalEvents } = await import('../lib/utils.js');

            const localEvents = await loadLocalEvents();
            const updatedEvents = localEvents.filter(e =>
                !(e.title === event.title &&
                  e.startTime === event.startTime &&
                  e.endTime === event.endTime)
            );

            await saveLocalEvents(updatedEvents);

            // イベント表示を再読み込み
            await this.localEventManager.loadLocalEvents(this.currentDate);

        } catch (error) {
            console.error('ローカルイベント削除エラー:', error);
            this.alertModal.showError('イベントの削除に失敗しました: ' + error.message);
        }
    }

    /**
     * ローカルイベントキャンセルハンドラー
     * @private
     */
    _handleCancelLocalEvent() {
        // 特に処理なし（モーダルが閉じられるのみ）
    }

    /**
     * 設定画面を開く
     * @private
     */
    _openSettings() {
        try {
            chrome.runtime.openOptionsPage();
        } catch (error) {
            console.warn('設定画面の表示に失敗:', error);
            // フォールバック
            const optionsUrl = chrome.runtime.getURL('src/options/options.html');
            window.open(optionsUrl, '_blank');
        }
    }

    /**
     * リサイズハンドラー
     * @private
     */
    _handleResize() {
        // レイアウト調整（コンポーネント版では特別な処理は不要）
    }

    /**
     * イベント読み込みのデバウンス
     * @private
     */
    _debounceLoadEvents() {
        if (this.loadEventsDebounceTimeout) {
            clearTimeout(this.loadEventsDebounceTimeout);
        }

        this.loadEventsDebounceTimeout = setTimeout(() => {
            this._loadEventsForCurrentDate();
        }, 300);
    }

    /**
     * デバウンス処理
     * @private
     */
    _debounce(func, delay) {
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }
        this.debounceTimeout = setTimeout(func, delay);
    }

    /**
     * エラー表示
     * @private
     */
    _showError(message) {
        if (this.alertModal) {
            this.alertModal.showError(message);
        } else {
            console.error(message);
        }
    }

    /**
     * リソースのクリーンアップ
     */
    destroy() {
        // 定期更新を停止
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        // デバウンスタイマーをクリア
        if (this.loadEventsDebounceTimeout) {
            clearTimeout(this.loadEventsDebounceTimeout);
        }

        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }

        // EventLayoutManagerのクリーンアップ
        if (this.eventLayoutManager) {
            this.eventLayoutManager.destroy();
            this.eventLayoutManager = null;
        }

        // 全コンポーネントを破棄
        this.componentManager.destroyAll();
    }
}

// グローバルスコープでインスタンスを管理
let uiController = null;
let isInitialized = false;

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', async () => {
    // 二重初期化を防ぐ
    if (isInitialized) {
        console.warn('サイドパネルは既に初期化済みです');
        return;
    }

    try {
        isInitialized = true;
        uiController = new SidePanelUIController();
        await uiController.initialize();

        // グローバルアクセス用に公開
        window.sidePanelController = uiController;

    } catch (error) {
        console.error('サイドパネル初期化失敗:', error);
        isInitialized = false; // エラー時はリセット
    }
});

// ページアンロード時にクリーンアップ
window.addEventListener('beforeunload', () => {
    if (uiController) {
        uiController.destroy();
        uiController = null;
        window.sidePanelController = null;
    }
});