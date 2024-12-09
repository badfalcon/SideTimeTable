document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.getElementById('saveButton');
    const openTimeInput = document.getElementById('open-time');
    const closeTimeInput = document.getElementById('close-time');
    const workTimeColorInput = document.getElementById('work-time-color');
    const breakTimeFixedInput = document.getElementById('break-time-fixed');
    const breakTimeStartInput = document.getElementById('break-time-start');
    const breakTimeEndInput = document.getElementById('break-time-end');
    const localEventColorInput = document.getElementById('local-event-color');
    const googleEventColorInput = document.getElementById('google-event-color');



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

        chrome.storage.sync.set({ openTime, closeTime, workTimeColor, breakTimeFixed, breakTimeStart, breakTimeEnd, localEventColor, googleEventColor }, () => {
            alert('設定が保存されました');
        });
    });

    // 保存された設定を読み込んで表示
    chrome.storage.sync.get({
        openTime: '09:00',
        closeTime: '18:00',
        workTimeColor: '#FF6347',
        breakTimeFixed: false,
        breakTimeStart: '12:00',
        breakTimeEnd: '13:00',
        localEventColor: '#FFD700',
        googleEventColor: '#4285F4'
    }, (items) => {
        openTimeInput.value = items.openTime;
        closeTimeInput.value = items.closeTime;
        workTimeColorInput.value = items.workTimeColor;
        breakTimeFixedInput.checked = items.breakTimeFixed;
        breakTimeStartInput.value = items.breakTimeStart;
        breakTimeEndInput.value = items.breakTimeEnd;
        localEventColorInput.value = items.localEventColor;
        googleEventColorInput.value = items.googleEventColor;

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
        toggleBreakTimeFields(); // 休憩時間設定を更新
    });
});
