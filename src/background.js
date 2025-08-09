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
    console.log("拡張機能がインストールされました");
});

/**
 * Googleカレンダーからイベントを取得する
 * @returns {Promise<Array>} イベントの配列を返すPromise
 */
function getCalendarEvents() {
    console.log("Googleカレンダーイベント取得開始");
    return new Promise((resolve, reject) => {
        try {
            console.log("認証トークンをリクエスト中");
            chrome.identity.getAuthToken({interactive: true}, (token) => {
                if (chrome.runtime.lastError || !token) {
                    const error = chrome.runtime.lastError || new Error("認証トークンが取得できませんでした");
                    console.error("認証トークン取得エラー:", error);
                    reject(error);
                    return;
                }

                console.log("認証トークン取得成功");
                
                // 今日の日付の範囲を設定
                const today = new Date();
                const startOfDay = new Date(today);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(today);
                endOfDay.setHours(23, 59, 59, 999);
                
                // まず、表示対象のカレンダー一覧を取得
                const calendarListUrl = `https://www.googleapis.com/calendar/v3/users/me/calendarList`;

                console.log("カレンダー一覧をフェッチ中");
                fetch(calendarListUrl, {
                    headers: {
                        Authorization: "Bearer " + token
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`CalendarList APIエラー: ${response.status} ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(listData => {
                    const calendars = (listData.items || [])
                        // GoogleカレンダーのUIで「表示」にチェックされているカレンダーのみ
                        .filter(cal => cal.selected)
                        // 念のため、アクセスできないものを除外
                        .filter(cal => cal.accessRole && cal.accessRole !== 'none');

                    if (calendars.length === 0) {
                        console.log('表示対象のカレンダーがありません。primaryのみ取得します。');
                        return [ { id: 'primary' } ];
                    }

                    return calendars.map(c => ({ id: c.id }));
                })
                .then(calendarsToFetch => {
                    // 今日の日付の範囲を設定（上で計算済みのstartOfDay/endOfDayを使用）
                    const baseUrl = 'https://www.googleapis.com/calendar/v3/calendars';

                    const fetches = calendarsToFetch.map(cal => {
                        const url = `${baseUrl}/${encodeURIComponent(cal.id)}/events?timeMin=${startOfDay.toISOString()}&timeMax=${endOfDay.toISOString()}&singleEvents=true&orderBy=startTime`;
                        return fetch(url, {
                            headers: { Authorization: "Bearer " + token }
                        })
                        .then(res => {
                            if (!res.ok) {
                                // 個別カレンダーのエラーはログだけ出してスキップ
                                console.warn(`カレンダー(${cal.id})の取得に失敗: ${res.status} ${res.statusText}`);
                                return { items: [] };
                            }
                            return res.json();
                        })
                        .then(data => data.items || [])
                        .catch(err => {
                            console.warn(`カレンダー(${cal.id})取得時の例外をスキップ:`, err);
                            return [];
                        });
                    });

                    console.log(`選択中のカレンダー数: ${fetches.length} 件。各カレンダーのイベントを取得します。`);

                    return Promise.all(fetches);
                })
                .then(resultsPerCalendar => {
                    // 結果を平坦化
                    const merged = resultsPerCalendar.flat();
                    console.log(`合計 ${merged.length} 件のイベントを取得しました（全カレンダー）`);
                    resolve(merged);
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
    console.log("Google認証状態確認開始");
    return new Promise((resolve, reject) => {
        try {
            chrome.identity.getAuthToken({interactive: false}, (token) => {
                if (chrome.runtime.lastError) {
                    console.log("認証状態確認エラー:", chrome.runtime.lastError);
                    resolve(false); // エラーがあっても認証されていないだけなのでrejectしない
                    return;
                }
                
                const isAuthenticated = !!token;
                console.log("認証状態:", isAuthenticated ? "認証済み" : "未認証");
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
    console.log("メッセージ受信:", request.action);
    
    switch (request.action) {
        case "getEvents":
            getCalendarEvents()
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
