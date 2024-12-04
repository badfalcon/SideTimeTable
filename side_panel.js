// DOMが読み込まれたときに実行
document.addEventListener('DOMContentLoaded', function () {
    // 1時間あたりのミリ秒数
    const hourMillis = 3600000;
    // 1分あたりのミリ秒数
    const minuteMillis = 60000;

    // 1時間あたりの高さ
    const unitHeight = 60;

    // 始業時間と終業時間
    const openHour = 10;
    const closeHour = 19;
    const openTime = new Date().setHours(openHour, 0, 0, 0);
    const closeTime = new Date().setHours(closeHour, 0, 0, 0);

    // 前後に1時間ずつ余裕を持たせる

    // 時間差分の計算
    const hourDiff = (closeTime - openTime) / hourMillis;

    const timelineDiv = document.getElementById('timeline');

    // カレンダーから予定を取得
    function fetchEvents() {
        chrome.runtime.sendMessage({action: "getEvents"}, (response) => {
            timelineDiv.innerHTML = ''; // 以前の表示をクリア

            if (response.error) {
                timelineDiv.innerHTML = "エラー: " + response.error;
                return;
            }

            // 各時間ラベルと補助線を追加
            for (let i = 0; i <= hourDiff+2; i++) {
                const hourLabel = document.createElement('div');
                hourLabel.className = 'hour-label';
                hourLabel.style.top = `${i * 60}px`;
                const hour = new Date(openTime + (i-1) * hourMillis).getHours();
                hourLabel.textContent = `${hour}:00`;
                timelineDiv.appendChild(hourLabel);

                const hourLine = document.createElement('div');
                hourLine.className = 'hour-line';
                hourLine.style.top = `${i * 60}px`;
                timelineDiv.appendChild(hourLine);
            }

            response.events.forEach(event => {
                console.log(event);
                switch (event.eventType) {
                    case 'workingLocation':
                    case 'focusTime':
                    case 'outOfOffice':
                    default:
                        // 作業場所、集中時間、外出の場合は何も表示しない
                        return;
                    case 'default':
                        // 通常のイベント処理
                        const eventDiv = document.createElement('div');
                        eventDiv.className = 'event';
                        const startDate = new Date(event.start.dateTime || event.start.date);
                        const endDate = new Date(event.end.dateTime || event.end.date);
                        const startOffset = (1 + (startDate - openTime) / hourMillis) * unitHeight;
                        const duration = (endDate - startDate) / minuteMillis * unitHeight / 60;
                        if (duration < 30) {
                            eventDiv.className = 'event short'; // 30分未満の場合はpaddingを減らす
                            eventDiv.style.height = `${duration}px`; // padding分を引かない
                        }else{
                            eventDiv.style.height = `${duration - 10}px`; // padding分を引く
                        }

                        eventDiv.style.top = `${startOffset}px`;
                        let eventContent = `${startDate.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        })} - ${event.summary}`;

                        // Google Meetのリンクが存在する場合は追加
                        if (event.hangoutLink) {
                            const meetLink = document.createElement('a');
                            meetLink.href = event.hangoutLink;
                            meetLink.target = "_blank";
                            meetLink.textContent = eventContent;
                            meetLink.style.display = 'block';
                            eventDiv.appendChild(meetLink);
                        } else {
                            eventDiv.textContent = eventContent;
                        }
                        timelineDiv.appendChild(eventDiv);
                        break;
                }
            });

            // 初回表示
            updateCurrentTimeLine();
        });
    }

    // 現在時刻の線を更新
    const updateCurrentTimeLine = () => {
        const currentTime = new Date();
        let currentTimeLine = document.getElementById('currentTimeLine');

        if (!currentTimeLine) {
            currentTimeLine = document.createElement('div');
            currentTimeLine.id = 'currentTimeLine';
            currentTimeLine.className = 'current-time-line';
            timelineDiv.appendChild(currentTimeLine);
        }

        const offset = (1 + (currentTime - openTime) / hourMillis) * unitHeight;
        currentTimeLine.style.top = `${offset}px`;
    };

    // サイドカレンダーの更新をチェック
    function checkSideCalendarUpdate() {
        const currentTime = new Date();
        const currentMinutes = currentTime.getMinutes();
        if (currentMinutes === 0) {
            // 毎時0分に予定を更新
            fetchEvents();
        }
        const currentSeconds = currentTime.getSeconds();
        if (currentSeconds === 0) {
            // 毎分0秒に現在時刻の線を追加
            updateCurrentTimeLine();
        }
    }
    // タイトル設定
    const today = new Date();
    const title = document.querySelector('h1');
    title.textContent = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日の予定`;

    // 初回表示
    fetchEvents();

    // 1秒ごとに更新をチェック
    setInterval(checkSideCalendarUpdate, 1000);
});