document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.getElementById('saveButton');
    const openHourInput = document.getElementById('open-hour');
    const closeHourInput = document.getElementById('close-hour');
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
        const openHour = parseInt(openHourInput.value, 10);
        const closeHour = parseInt(closeHourInput.value, 10);
        const workTimeColor = workTimeColorInput.value;
        const breakTimeFixed = breakTimeFixedInput.checked;
        const breakTimeStart = breakTimeStartInput.value;
        const breakTimeEnd = breakTimeEndInput.value;
        const localEventColor = localEventColorInput.value;
        const googleEventColor = googleEventColorInput.value;

        chrome.storage.sync.set({ openHour, closeHour, workTimeColor, breakTimeFixed, breakTimeStart, breakTimeEnd, localEventColor, googleEventColor }, () => {
            alert('設定が保存されました');
        });
    });

    // 保存された設定を読み込んで表示
    chrome.storage.sync.get(['openHour', 'closeHour', 'workTimeColor', 'breakTimeFixed', 'breakTimeStart', 'breakTimeEnd', 'localEventColor', 'googleEventColor'], (items) => {
        if (items.openHour) openHourInput.value = items.openHour;
        if (items.closeHour) closeHourInput.value = items.closeHour;
        if (items.workTimeColor) workTimeColorInput.value = items.workTimeColor;
        if (items.breakTimeFixed) breakTimeFixedInput.checked = items.breakTimeFixed;
        if (items.breakTimeStart) breakTimeStartInput.value = items.breakTimeStart;
        if (items.breakTimeEnd) breakTimeEndInput.value = items.breakTimeEnd;
        if (items.localEventColor) localEventColorInput.value = items.localEventColor;
        if (items.googleEventColor) googleEventColorInput.value = items.googleEventColor;

        toggleBreakTimeFields(); // 休憩時間設定を更新
    });
});
