/**
 * GoogleEventModal - Googleイベント詳細モーダル
 */
import { ModalComponent } from './modal-component.js';

export class GoogleEventModal extends ModalComponent {
    constructor(options = {}) {
        super({
            id: 'googleEventDialog',
            ...options
        });

        // 表示要素
        this.titleElement = null;
        this.calendarElement = null;
        this.timeElement = null;
        this.descriptionElement = null;
        this.locationElement = null;
        this.meetElement = null;

        // 現在表示中のイベント
        this.currentEvent = null;
    }

    createContent() {
        const content = document.createElement('div');

        // イベントタイトル
        this.titleElement = document.createElement('h2');
        this.titleElement.className = 'google-event-title';
        content.appendChild(this.titleElement);

        // カレンダー名
        this.calendarElement = document.createElement('div');
        this.calendarElement.className = 'google-event-calendar mb-2';
        content.appendChild(this.calendarElement);

        // 開催時刻
        this.timeElement = document.createElement('div');
        this.timeElement.className = 'google-event-time mb-2';
        content.appendChild(this.timeElement);

        // 説明
        this.descriptionElement = document.createElement('div');
        this.descriptionElement.className = 'google-event-description mb-2';
        content.appendChild(this.descriptionElement);

        // 場所
        this.locationElement = document.createElement('div');
        this.locationElement.className = 'google-event-location mb-2';
        content.appendChild(this.locationElement);

        // Meet情報
        this.meetElement = document.createElement('div');
        this.meetElement.className = 'google-event-meet';
        content.appendChild(this.meetElement);

        // modalBodyへの参照を保存
        this.modalBody = content;

        return content;
    }

    /**
     * Googleイベントを表示
     * @param {Object} event Googleイベントデータ
     */
    showEvent(event) {
        this.currentEvent = event;

        // エレメントが存在しない場合は作成
        if (!this.element) {
            this.createElement();
        }

        // タイトル
        this.titleElement.textContent = event.summary || 'タイトルなし';

        // カレンダー名
        this._setCalendarInfo(event);

        // 時刻情報
        this._setTimeInfo(event);

        // 説明
        this._setDescription(event);

        // 場所
        this._setLocation(event);

        // Meet情報
        this._setMeetInfo(event);

        // 参加者情報
        this._setAttendeesInfo(event);

        this.show();
    }

    /**
     * カレンダー情報を設定
     * @private
     */
    _setCalendarInfo(event) {
        this.calendarElement.innerHTML = '';

        if (event.calendarName) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-calendar me-1';

            const text = document.createElement('span');
            text.textContent = event.calendarName;

            // カレンダー色がある場合は背景色を設定
            if (event.calendarBackgroundColor) {
                const colorIndicator = document.createElement('span');
                colorIndicator.style.cssText = `
                    display: inline-block;
                    width: 12px;
                    height: 12px;
                    background-color: ${event.calendarBackgroundColor};
                    border-radius: 2px;
                    margin-right: 8px;
                    vertical-align: middle;
                `;
                this.calendarElement.appendChild(colorIndicator);
            }

            this.calendarElement.appendChild(icon);
            this.calendarElement.appendChild(text);
        }
    }

    /**
     * 時刻情報を設定
     * @private
     */
    _setTimeInfo(event) {
        this.timeElement.innerHTML = '';

        if (event.start && event.end) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-clock me-1';

            const timeText = this._formatEventTime(event);
            const text = document.createElement('span');
            text.textContent = timeText;

            this.timeElement.appendChild(icon);
            this.timeElement.appendChild(text);
        }
    }

    /**
     * イベント時刻をフォーマット
     * @private
     */
    _formatEventTime(event) {
        try {
            const start = event.start.dateTime || event.start.date;
            const end = event.end.dateTime || event.end.date;

            if (!start || !end) {
                return '時刻情報なし';
            }

            const startDate = new Date(start);
            const endDate = new Date(end);

            // 終日イベントの場合
            if (event.start.date && event.end.date) {
                return '終日';
            }

            // 時刻付きイベントの場合
            const startTime = startDate.toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const endTime = endDate.toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit'
            });

            return `${startTime} ～ ${endTime}`;
        } catch (error) {
            console.warn('時刻フォーマットエラー:', error);
            return '時刻情報エラー';
        }
    }

    /**
     * 説明を設定
     * @private
     */
    _setDescription(event) {
        this.descriptionElement.innerHTML = '';

        if (event.description) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-align-left me-1';

            const text = document.createElement('div');
            text.style.cssText = 'margin-left: 20px; white-space: pre-wrap; word-break: break-word;';

            // HTMLタグを除去してテキストのみ表示
            text.textContent = this._stripHtml(event.description);

            this.descriptionElement.appendChild(icon);
            this.descriptionElement.appendChild(text);
        }
    }

    /**
     * 場所を設定
     * @private
     */
    _setLocation(event) {
        this.locationElement.innerHTML = '';

        if (event.location) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-map-marker-alt me-1';

            const text = document.createElement('span');
            text.textContent = event.location;

            this.locationElement.appendChild(icon);
            this.locationElement.appendChild(text);
        }
    }

    /**
     * Meet情報を設定
     * @private
     */
    _setMeetInfo(event) {
        this.meetElement.innerHTML = '';

        // Google MeetのURLを検索
        const meetUrl = this._extractMeetUrl(event);

        if (meetUrl) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-video me-1';

            const link = document.createElement('a');
            link.href = meetUrl;
            link.target = '_blank';
            link.textContent = 'Google Meetに参加';
            link.style.cssText = 'color: #4285f4; text-decoration: none;';

            this.meetElement.appendChild(icon);
            this.meetElement.appendChild(link);
        }

        // その他のビデオ会議リンクを検索
        const otherVideoUrl = this._extractVideoUrl(event);
        if (otherVideoUrl && !meetUrl) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-video me-1';

            const link = document.createElement('a');
            link.href = otherVideoUrl;
            link.target = '_blank';
            link.textContent = 'ビデオ会議に参加';
            link.style.cssText = 'color: #4285f4; text-decoration: none;';

            this.meetElement.appendChild(icon);
            this.meetElement.appendChild(link);
        }
    }

    /**
     * 参加者情報を設定
     * @private
     */
    _setAttendeesInfo(event) {
        // 参加者要素がない場合は作成
        if (!this.attendeesElement) {
            this.attendeesElement = document.createElement('div');
            this.attendeesElement.className = 'mb-3';
            this.attendeesElement.style.cssText = 'display: flex; align-items: flex-start; font-size: 14px;';
            this.modalBody.appendChild(this.attendeesElement);
        }

        this.attendeesElement.innerHTML = '';

        if (event.attendees && event.attendees.length > 0) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-users me-1';
            icon.style.cssText = 'margin-top: 2px; color: #6c757d;';

            const container = document.createElement('div');
            container.style.cssText = 'margin-left: 20px;';

            const title = document.createElement('div');
            title.textContent = `参加者 (${event.attendees.length}人)`;
            title.style.cssText = 'font-weight: bold; margin-bottom: 5px;';

            const attendeesList = document.createElement('div');

            event.attendees.forEach(attendee => {
                const attendeeDiv = document.createElement('div');
                attendeeDiv.style.cssText = 'margin-bottom: 3px; display: flex; align-items: center;';

                // 参加ステータスのアイコン
                const statusIcon = document.createElement('i');
                switch (attendee.responseStatus) {
                    case 'accepted':
                        statusIcon.className = 'fas fa-check-circle';
                        statusIcon.style.color = '#28a745';
                        statusIcon.title = '参加';
                        break;
                    case 'declined':
                        statusIcon.className = 'fas fa-times-circle';
                        statusIcon.style.color = '#dc3545';
                        statusIcon.title = '不参加';
                        break;
                    case 'tentative':
                        statusIcon.className = 'fas fa-question-circle';
                        statusIcon.style.color = '#ffc107';
                        statusIcon.title = '仮参加';
                        break;
                    default:
                        statusIcon.className = 'fas fa-circle';
                        statusIcon.style.color = '#6c757d';
                        statusIcon.title = '未回答';
                }
                statusIcon.style.cssText += ' margin-right: 8px; font-size: 12px;';

                // 参加者名とメール
                const nameSpan = document.createElement('span');
                nameSpan.textContent = attendee.displayName || attendee.email;
                if (attendee.organizer) {
                    nameSpan.textContent += ' (主催者)';
                    nameSpan.style.fontWeight = 'bold';
                }

                attendeeDiv.appendChild(statusIcon);
                attendeeDiv.appendChild(nameSpan);
                attendeesList.appendChild(attendeeDiv);
            });

            container.appendChild(title);
            container.appendChild(attendeesList);

            this.attendeesElement.appendChild(icon);
            this.attendeesElement.appendChild(container);
        }
    }

    /**
     * Google MeetのURLを抽出
     * @private
     */
    _extractMeetUrl(event) {
        const sources = [
            event.hangoutLink,
            event.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri,
            event.description,
            event.location
        ].filter(Boolean);

        for (const source of sources) {
            const meetMatch = source.match(/https:\/\/meet\.google\.com\/[a-z-]+/i);
            if (meetMatch) {
                return meetMatch[0];
            }
        }

        return null;
    }

    /**
     * その他のビデオ会議URLを抽出
     * @private
     */
    _extractVideoUrl(event) {
        const sources = [
            event.description,
            event.location
        ].filter(Boolean);

        const videoPatterns = [
            /https:\/\/.*zoom\.us\/[^\s]+/i,
            /https:\/\/.*teams\.microsoft\.com\/[^\s]+/i,
            /https:\/\/.*webex\.com\/[^\s]+/i
        ];

        for (const source of sources) {
            for (const pattern of videoPatterns) {
                const match = source.match(pattern);
                if (match) {
                    return match[0];
                }
            }
        }

        return null;
    }

    /**
     * HTMLタグを除去
     * @private
     */
    _stripHtml(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    /**
     * 現在表示中のイベントを取得
     * @returns {Object|null} 現在のイベント
     */
    getCurrentEvent() {
        return this.currentEvent;
    }

    /**
     * モーダルを閉じる際のクリーンアップ
     */
    hide() {
        super.hide();
        this.currentEvent = null;
    }
}