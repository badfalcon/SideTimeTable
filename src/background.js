/**
 * SideTimeTable - バックグラウンドスクリプト
 * 
 * このファイルはChrome拡張機能のバックグラウンドで実行され、
 * サイドパネルの設定やGoogleカレンダーとの連携を管理します。
 */

// サイドパネルの設定 - アクションツールバーアイコンをクリックして開く
chrome.sidePanel
    .setPanelBehavior({openPanelOnActionClick: true})
    .catch((error) => console.error("サイドパネル設定エラー:", error));

// 拡張機能がインストールされたときの処理
chrome.runtime.onInstalled.addListener(() => {
    // インストール時の処理をここに記述
});

/**
 * Googleカレンダーからイベントを取得する
 * @param {string} [dateStr=null] - 取得する日付（YYYY-MM-DD形式、省略時は今日の日付）
 * @returns {Promise<Array>} イベントの配列を返すPromise
 */
function getCalendarEvents(dateStr = null) {
    return new Promise((resolve, reject) => {
        try {
            chrome.identity.getAuthToken({interactive: true}, (token) => {
                if (chrome.runtime.lastError || !token) {
                    const error = chrome.runtime.lastError || new Error("認証トークンが取得できませんでした");
                    console.error("認証トークン取得エラー:", error);
                    reject(error);
                    return;
                }
                
                // 指定された日付または今日の日付の範囲を設定
                let targetDate;
                if (dateStr) {
                    targetDate = new Date(dateStr);
                    // 無効な日付の場合は今日の日付を使用
                    if (isNaN(targetDate.getTime())) {
                        console.warn("無効な日付形式です。今日の日付を使用します。", dateStr);
                        targetDate = new Date();
                    }
                } else {
                    targetDate = new Date();
                }
                
                const startOfDay = new Date(targetDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(targetDate);
                endOfDay.setHours(23, 59, 59, 999);
                
                // カレンダーAPIのURL
                const calendarApiUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startOfDay.toISOString()}&timeMax=${endOfDay.toISOString()}&singleEvents=true&orderBy=startTime`;
                
                fetch(calendarApiUrl, {
                    headers: {
                        Authorization: "Bearer " + token
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    resolve(data.items || []);
                })
                .catch(error => {
                    console.error("カレンダーイベント取得エラー:", error);
                    reject(error);
                });
            });
        } catch (error) {
            console.error("カレンダーイベント取得例外:", error);
            reject(error);
        }
    });
}

/**
 * Googleアカウントの認証状態を確認する
 * @returns {Promise<boolean>} 認証状態を返すPromise
 */
function checkGoogleAuth() {
    return new Promise((resolve, reject) => {
        try {
            chrome.identity.getAuthToken({interactive: false}, (token) => {
                if (chrome.runtime.lastError) {
                    // エラーがあっても認証されていないだけなのでrejectしない
                    resolve(false);
                    return;
                }
                
                const isAuthenticated = !!token;
                resolve(isAuthenticated);
            });
        } catch (error) {
            console.error("認証状態確認例外:", error);
            reject(error);
        }
    });
}

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case "getEvents":
            getCalendarEvents(request.date)
                .then(events => sendResponse({events}))
                .catch(error => sendResponse({error: error.message || "イベント取得エラー"}));
            return true; // 非同期応答を示す
            
        case "checkAuth":
            checkGoogleAuth()
                .then(isAuthenticated => sendResponse({isAuthenticated}))
                .catch(error => sendResponse({error: error.message || "認証確認エラー"}));
            return true; // 非同期応答を示す
            
        case "reloadSideTimeTable":
            // サイドパネルのリロードリクエストは単に応答を返す
            sendResponse({success: true});
            return false; // 同期応答
            
        default:
            console.warn("未知のアクション:", request.action);
            sendResponse({error: "未知のアクション"});
            return false; // 同期応答
    }
});
