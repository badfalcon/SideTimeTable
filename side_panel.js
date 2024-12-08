// DOMが読み込まれたときに実行
document.addEventListener('DOMContentLoaded', function () {

    const parentDiv = document.getElementById('sideTimeTable');
    const baseDiv = document.getElementById('sideTimeTableBase');
    const eventsDiv = document.getElementById('sideTimeTableEvents');
    const googleEventsDiv = document.getElementById('sideTimeTableEventsGoogle');
    const localEventsDiv = document.getElementById('sideTimeTableEventsLocal');

    // 1時間あたりのミリ秒数
    const hourMillis = 3600000;
    // 1分あたりのミリ秒数
    const minuteMillis = 60000;

    // 1時間あたりの高さ
    const unitHeight = 60;

    // 始業時間と終業時間
    let  openHour = '09:00';
    let  closeHour = '18:00';
    let openTimeHour = parseInt(openHour.split(':')[0], 10);
    let openTimeMinute = parseInt(openHour.split(':')[1], 10);
    let closeTimeHour = parseInt(closeHour.split(':')[0], 10);
    let closeTimeMinute = parseInt(closeHour.split(':')[1], 10);
    let openTime = new Date().setHours(openHour, 0, 0, 0);
    let closeTime = new Date().setHours(closeHour, 0, 0, 0);
    // 時間差分の計算
    let hourDiff = (closeTime - openTime) / hourMillis;

    // 時間の選択肢を生成
    const timeList = document.getElementById('time-list');
    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time;
            timeList.appendChild(option);
        }
    }

    // ストレージから設定を取得
    chrome.storage.sync.get({
        openTime: '09:00',
        closeTime: '18:00',
        workTimeColor: '#D3D3D3',
        breakTimeFixed: false,
        breakTimeStart: '12:00',
        breakTimeEnd: '13:00',
        localEventColor: '#A9A9A9',
        googleEventColor: '#808080'
    }, (items) => {
        console.log(items);
        openHour = items.openTime;
        closeHour = items.closeTime;

        document.documentElement.style.setProperty('--side-calendar-work-time-color', items.workTimeColor);
        document.documentElement.style.setProperty('--side-calendar-local-event-color', items.localEventColor);
        document.documentElement.style.setProperty('--side-calendar-google-event-color', items.googleEventColor);

        initializeTimeVariables();
        createBaseTable(items.breakTimeFixed, items.breakTimeStart, items.breakTimeEnd);
        fetchEvents();
    });

    // 時間関連の変数を初期化
    function initializeTimeVariables() {
        openTimeHour = parseInt(openHour.split(':')[0], 10);
        openTimeMinute = parseInt(openHour.split(':')[1], 10);
        closeTimeHour = parseInt(closeHour.split(':')[0], 10);
        closeTimeMinute = parseInt(closeHour.split(':')[1], 10);
        openTime = new Date().setHours(openTimeHour, openTimeMinute, 0, 0);
        closeTime = new Date().setHours(closeTimeHour, closeTimeMinute, 0, 0);
        hourDiff = (closeTime - openTime) / hourMillis;
        console.log(`openTime: ${openTime}, closeTime: ${closeTime}, hourDiff: ${hourDiff}`);
    }

    function createBaseTable(breakTimeFixed, breakTimeStart, breakTimeEnd) {
        parentDiv.style.height = `${unitHeight * (hourDiff + 2)}px`;
        baseDiv.innerHTML = ''; // 以前の表示をクリア
        baseDiv.style.height = `${unitHeight * (hourDiff + 2)}px`;

        // 業務時間に色を付ける(休憩時間を除く)
        if (breakTimeFixed) {
            const breakTimeStartHour = parseInt(breakTimeStart.split(':')[0], 10);
            const breakTimeStartMinute = parseInt(breakTimeStart.split(':')[1], 10);
            const breakTimeEndHour = parseInt(breakTimeEnd.split(':')[0], 10);
            const breakTimeEndMinute = parseInt(breakTimeEnd.split(':')[1], 10);
            const breakTimeStartMillis = new Date().setHours(breakTimeStartHour, breakTimeStartMinute, 0, 0);

            const breakTimeEndMillis = new Date().setHours(breakTimeEndHour, breakTimeEndMinute, 0, 0);

            const breakTimeStartOffset = (1 + (breakTimeStartMillis - openTime) / hourMillis) * unitHeight;
            const breakTimeDuration = (breakTimeEndMillis - breakTimeStartMillis) / minuteMillis * unitHeight / 60;

            // 休憩時間を避けて業務時間を表示
            const workTimeDiv1 = document.createElement('div');
            workTimeDiv1.className = 'work-time';
            workTimeDiv1.style.top = `${unitHeight}px`;
            workTimeDiv1.style.height = `${breakTimeStartOffset - unitHeight}px`;
            baseDiv.appendChild(workTimeDiv1);

            const workTimeDiv2 = document.createElement('div');
            workTimeDiv2.className = 'work-time';
            workTimeDiv2.style.top = `${breakTimeStartOffset + breakTimeDuration}px`;
            workTimeDiv2.style.height = `${unitHeight * (closeTime - breakTimeEndMillis) / hourMillis}px`;
            baseDiv.appendChild(workTimeDiv2);

        }else{
            const workTimeDiv = document.createElement('div');
            workTimeDiv.className = 'work-time';
            workTimeDiv.style.top = `${unitHeight}px`;
            workTimeDiv.style.height = `${unitHeight * hourDiff}px`;
            baseDiv.appendChild(workTimeDiv);
        }

        // 各時間ラベルと補助線を追加
        for (let i = 0; i <= hourDiff+2; i++) {
            if(i===0 && openTimeMinute !== 0){
                continue;
            }
            const hourLabel = document.createElement('div');
            hourLabel.className = 'hour-label';
            hourLabel.style.top = `${i * 60 - openTimeMinute}px`;
            const hour = new Date(openTime + (i-1) * hourMillis).getHours();
            hourLabel.textContent = `${hour}:00`;
            baseDiv.appendChild(hourLabel);

            const hourLine = document.createElement('div');
            hourLine.className = 'hour-line';
            hourLine.style.top = `${i * 60 - openTimeMinute}px`;
            baseDiv.appendChild(hourLine);
        }
    }

    // カレンダーから予定を取得
    function fetchEvents() {
        console.log('fetchEvents');
        chrome.runtime.sendMessage({action: "getEvents"}, (response) => {
            console.log(response);
            if (response.error) {
                parentDiv.innerHTML = "エラー: " + response.error;
                return;
            }

            // 以前の表示をクリア
            googleEventsDiv.innerHTML = '';

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
                        eventDiv.className = 'event google-event';
                        const startDate = new Date(event.start.dateTime || event.start.date);
                        const endDate = new Date(event.end.dateTime || event.end.date);
                        const startOffset = (1 + (startDate - openTime) / hourMillis) * unitHeight;
                        const duration = (endDate - startDate) / minuteMillis * unitHeight / 60;
                        if (duration < 30) {
                            eventDiv.className = 'event google-event short'; // 30分未満の場合はpaddingを減らす
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
                        googleEventsDiv.appendChild(eventDiv);
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
            parentDiv.appendChild(currentTimeLine);
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

    // 設定アイコンのクリックイベント
    const settingsIcon = document.getElementById('settingsIcon');
    settingsIcon.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
    // 新しい要素
    const addLocalEventButton = document.getElementById('addLocalEventButton');
    const localEventDialog = document.getElementById('localEventDialog');
    const closeDialog = document.getElementById('closeDialog');
    const saveEventButton = document.getElementById('saveEventButton');
    const cancelEventButton = document.getElementById('cancelEventButton');
    const eventTitleInput = document.getElementById('eventTitle');
    const eventStartTimeInput = document.getElementById('eventStartTime');
    const eventEndTimeInput = document.getElementById('eventEndTime');

    addLocalEventButton.addEventListener('click', () => {
        localEventDialog.style.display = 'block';
    });

    closeDialog.addEventListener('click', () => {
        localEventDialog.style.display = 'none';
    });

    cancelEventButton.addEventListener('click', () => {
        localEventDialog.style.display = 'none';
    });

// 保存されたローカルイベントを読み込んで表示
    function loadLocalEvents() {
        chrome.storage.sync.get({localEvents: []}, (data) => {
            data.localEvents.forEach(event => {
                const eventDiv = createEventDiv(event.title, event.startTime, event.endTime);
                localEventsDiv.appendChild(eventDiv);
            });
        });
    }

// イベントを作成する関数を追加
    function createEventDiv(title, startTime, endTime) {
        const eventDiv = document.createElement('div');
        eventDiv.className = 'event local-event';
        const startDate = new Date();
        startDate.setHours(startTime.split(':')[0], startTime.split(':')[1], 0, 0);
        const endDate = new Date();
        endDate.setHours(endTime.split(':')[0], endTime.split(':')[1], 0, 0);

        const startOffset = (1 + (startDate - openTime) / hourMillis) * unitHeight;
        const duration = (endDate - startDate) / minuteMillis * unitHeight / 60;

        if (duration < 30) {
            eventDiv.className = 'event local-event short';
            eventDiv.style.height = `${duration}px`;
        } else {
            eventDiv.style.height = `${duration - 10}px`;
        }
        eventDiv.style.top = `${startOffset}px`;
        eventDiv.textContent = `${startTime} - ${endTime}: ${title}`;

        return eventDiv;
    }

// 保存ボタンのクリック時にイベントを保存して表示
    saveEventButton.addEventListener('click', () => {
        const title = eventTitleInput.value;
        const startTime = eventStartTimeInput.value;
        const endTime = eventEndTimeInput.value;
        const currentDate = getFormattedDate(); // 現在の日付を取得

        if (title && startTime && endTime) {
            const eventDiv = createEventDiv(title, startTime, endTime);
            localEventsDiv.appendChild(eventDiv);

            // ローカルイベントを storage.sync に保存
            chrome.storage.sync.get({localEvents: [], lastUpdateDate: ''}, (data) => {
                let localEvents = data.localEvents;
                const lastUpdateDate = data.lastUpdateDate;

                // 日付が変わっていた場合も考慮する
                if (currentDate !== lastUpdateDate) {
                    localEvents = []; // 日付が変わったらイベントをリセット
                }

                localEvents.push({title, startTime, endTime});
                chrome.storage.sync.set({
                    localEvents,
                    lastUpdateDate: currentDate // 日付を更新
                }, () => {
                    alert('イベントが保存されました');
                });
            });

            localEventDialog.style.display = 'none';
        } else {
            alert('すべてのフィールドを入力してください');
        }
    });


// 現在のフォーマットされた日付を取得するための関数
    function getFormattedDate() {
        const today = new Date();
        return today.toISOString().split('T')[0]; // YYYY-MM-DD 形式の文字列を取得
    }

// ローカルイベントをリセットする関数
    function resetLocalEventsIfNewDay() {
        // ストレージに保存した最後の更新日を取得
        chrome.storage.sync.get({lastUpdateDate: '', localEvents: []}, (data) => {
            const lastUpdateDate = data.lastUpdateDate;
            const currentDate = getFormattedDate();

            // 日付が変わった場合、ローカルイベントをリセット
            if (currentDate !== lastUpdateDate) {
                chrome.storage.sync.set({
                    lastUpdateDate: currentDate,
                    localEvents: [] // イベントを空にする
                }, () => {
                    // 更新した後で、ローカルイベントエリアをクリア
                    localEventsDiv.innerHTML = '';
                    alert('新しい日付になりました。ローカルイベントがリセットされました。');
                });
            } else {
                // 日が変わっていない場合、ローカルイベントをロード
                loadLocalEvents();
            }
        });
    }

// 初回読み込み時にローカルイベントをロードしてチェック
    resetLocalEventsIfNewDay();
    // タイトル設定
    const today = new Date();
    const title = document.querySelector('h1');
    title.textContent = today.toLocaleDateString(undefined, { dateStyle : 'full' });

    // 1秒ごとに更新をチェック
    setInterval(checkSideCalendarUpdate, 1000);
});