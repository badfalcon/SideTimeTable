// options.js
document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.getElementById('saveButton');
    const openHourInput = document.getElementById('open-hour');
    const closeHourInput = document.getElementById('close-hour');

    // 設定を保存
    saveButton.addEventListener('click', () => {
        const openHour = parseInt(openHourInput.value, 10);
        const closeHour = parseInt(closeHourInput.value, 10);
        chrome.storage.sync.set({ openHour, closeHour }, () => {
            alert('設定が保存されました');
        });
    });

    // 保存された設定を読み込んで表示
    chrome.storage.sync.get(['openHour', 'closeHour'], (items) => {
        if (items.openHour) openHourInput.value = items.openHour;
        if (items.closeHour) closeHourInput.value = items.closeHour;
    });
});
