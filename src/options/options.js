document.addEventListener('DOMContentLoaded', () => {
    let googleIntegrated = false;
    const googleIntegrationButton = document.getElementById('google-integration-button');
    const googleIntegrationStatus = document.getElementById('google-integration-status');
    const openTimeInput = document.getElementById('open-time');
    const closeTimeInput = document.getElementById('close-time');
    const breakTimeFixedInput = document.getElementById('break-time-fixed');
    const breakTimeStartInput = document.getElementById('break-time-start');
    const breakTimeEndInput = document.getElementById('break-time-end');
    const workTimeColorInput = document.getElementById('work-time-color');
    const localEventColorInput = document.getElementById('local-event-color');
    const googleEventColorInput = document.getElementById('google-event-color');
    const saveButton = document.getElementById('saveButton');

    // Googleカレンダー連携ボタンのクリックイベント
    googleIntegrationButton.addEventListener('click', () => {
        // disable button click
        googleIntegrationButton.disabled = true;
        console.log('Googleカレンダーとの連携を試みます');
        chrome.runtime.sendMessage({action: 'getEvents'}, (response) => {
            console.log('Googleカレンダーとの連携結果', response);
            googleIntegrated = !response.error;
            chrome.storage.sync.set({googleIntegrated}, () => {
                console.log('Googleカレンダーとの連携情報を保存しました');
                googleIntegrationStatus.textContent = response.error ? '未連携' : '連携済み';
                alert(response.error ? 'Googleカレンダーとの連携に失敗しました' : 'Googleカレンダーとの連携に成功しました');
                googleIntegrationButton.disabled = false;

                chrome.runtime.sendMessage({ action: "reloadSideTimeTable" }, (response) => {
                    console.log(response);
                });
            });
        });
    });

    // 時間の選択肢を生成
    const timeList = document.getElementById('time-list');
    for (let hour = 7; hour < 21; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time;
            timeList.appendChild(option);
        }
    }

    // 休憩時間設定の表示切り替え
    const toggleBreakTimeFields = () => {
        const isFixed = breakTimeFixedInput.checked;
        breakTimeStartInput.disabled = !isFixed;
        breakTimeEndInput.disabled = !isFixed;
    };

    // 初期状態を設定
    toggleBreakTimeFields();

    // 固定チェックボックスの変更イベント
    breakTimeFixedInput.addEventListener('change', toggleBreakTimeFields);

    // 設定を保存
    saveButton.addEventListener('click', () => {
        const openTime = openTimeInput.value;
        const closeTime = closeTimeInput.value;
        const workTimeColor = workTimeColorInput.value;
        const breakTimeFixed = breakTimeFixedInput.checked;
        const breakTimeStart = breakTimeStartInput.value;
        const breakTimeEnd = breakTimeEndInput.value;
        const localEventColor = localEventColorInput.value;
        const googleEventColor = googleEventColorInput.value;

        chrome.storage.sync.set({
            googleIntegrated,
            openTime,
            closeTime,
            workTimeColor,
            breakTimeFixed,
            breakTimeStart,
            breakTimeEnd,
            localEventColor,
            googleEventColor
        }, () => {
            alert('設定が保存されました');
            chrome.runtime.sendMessage({ action: "reloadSideTimeTable" }, (response) => {
                console.log(response);
            });
        });
    });

    // 保存された設定を読み込んで表示
    chrome.storage.sync.get({
        googleIntegrated: false,
        openTime: '09:00',
        closeTime: '18:00',
        workTimeColor: '#FF6347',
        breakTimeFixed: false,
        breakTimeStart: '12:00',
        breakTimeEnd: '13:00',
        localEventColor: '#FFD700',
        googleEventColor: '#4285F4'
    }, (items) => {
        googleIntegrationStatus.textContent = items.googleIntegrated ? '連携済み' : '未連携';
        openTimeInput.value = items.openTime;
        closeTimeInput.value = items.closeTime;
        workTimeColorInput.value = items.workTimeColor;
        breakTimeFixedInput.checked = items.breakTimeFixed;
        breakTimeStartInput.value = items.breakTimeStart;
        breakTimeEndInput.value = items.breakTimeEnd;
        localEventColorInput.value = items.localEventColor;
        googleEventColorInput.value = items.googleEventColor;

        toggleBreakTimeFields(); // 休憩時間設定を更新
    });
});
