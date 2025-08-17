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
 * Googleカレンダー一覧を取得する
 * @returns {Promise<Array>} カレンダー一覧を返すPromise
 */
function getCalendarList() {
    console.log("Googleカレンダー一覧取得開始");
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
                        .filter(cal => cal.accessRole && cal.accessRole !== 'none')
                        .map(cal => ({
                            id: cal.id,
                            summary: cal.summary,
                            primary: cal.primary || false,
                            backgroundColor: cal.backgroundColor,
                            foregroundColor: cal.foregroundColor
                        }));

                    console.log(`カレンダー一覧取得完了: ${calendars.length}件`);
                    
                    // プライマリカレンダーのみを自動選択状態にする
                    const primaryCalendar = calendars.find(cal => cal.primary);
                    if (primaryCalendar) {
                        const primaryCalendarIds = [primaryCalendar.id];
                        chrome.storage.sync.set({ selectedCalendars: primaryCalendarIds }, () => {
                            if (chrome.runtime.lastError) {
                                console.error("プライマリカレンダー選択設定エラー:", chrome.runtime.lastError);
                            } else {
                                console.log("プライマリカレンダーを自動選択しました:", primaryCalendar.summary);
                            }
                        });
                    }
                    
                    resolve(calendars);
                })
                .catch(error => {
                    console.error("カレンダー一覧取得エラー:", error);
                    reject(error);
                });
            });
        } catch (error) {
            console.error("カレンダー一覧取得例外:", error);
            reject(error);
        }
    });
}

/**
 * Googleカレンダーからイベントを取得する
 * @param {Date} targetDate - 対象の日付（省略時は今日）
 * @returns {Promise<Array>} イベントの配列を返すPromise
 */
function getCalendarEvents(targetDate = null) {
    console.log("Googleカレンダーイベント取得開始");
    return new Promise((resolve, reject) => {
        try {
            // 選択されたカレンダー一覧を取得
            chrome.storage.sync.get({ selectedCalendars: [] }, (storageData) => {
                if (chrome.runtime.lastError) {
                    console.error("選択カレンダー取得エラー:", chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                    return;
                }

                console.log("認証トークンをリクエスト中");
                chrome.identity.getAuthToken({interactive: true}, (token) => {
                    if (chrome.runtime.lastError || !token) {
                        const error = chrome.runtime.lastError || new Error("認証トークンが取得できませんでした");
                        console.error("認証トークン取得エラー:", error);
                        reject(error);
                        return;
                    }

                    console.log("認証トークン取得成功");
                    
                    // 対象日付の範囲を設定
                    const targetDay = targetDate || new Date();
                    const startOfDay = new Date(targetDay);
                    startOfDay.setHours(0, 0, 0, 0);
                    const endOfDay = new Date(targetDay);
                    endOfDay.setHours(23, 59, 59, 999);
                    
                    const selectedCalendarIds = storageData.selectedCalendars || [];
                    
                    let calendarsPromise;
                    
                    if (selectedCalendarIds.length === 0) {
                        // 選択されたカレンダーがない場合は、Googleカレンダーで表示設定されたカレンダーを使用
                        const calendarListUrl = `https://www.googleapis.com/calendar/v3/users/me/calendarList`;

                        console.log("選択カレンダーなし。全カレンダー一覧をフェッチ中");
                        calendarsPromise = fetch(calendarListUrl, {
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
                        });
                    } else {
                        // 選択されたカレンダーを使用
                        console.log(`選択されたカレンダー: ${selectedCalendarIds.length}件`);
                        calendarsPromise = Promise.resolve(selectedCalendarIds.map(id => ({ id })));
                    }

                    calendarsPromise
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
                        .then(data => {
                            // 各イベントにカレンダーIDを追加
                            const events = data.items || [];
                            events.forEach(event => {
                                event.calendarId = cal.id;
                            });
                            return { calendarId: cal.id, events };
                        })
                        .catch(err => {
                            console.warn(`カレンダー(${cal.id})取得時の例外をスキップ:`, err);
                            return { calendarId: cal.id, events: [] };
                        });
                    });

                    console.log(`選択中のカレンダー数: ${fetches.length} 件。各カレンダーのイベントを取得します。`);

                    return Promise.all(fetches);
                })
                .then(async (resultsPerCalendar) => {
                    // カレンダー情報を取得してイベントに色情報を追加
                    try {
                        const calendarListUrl = `https://www.googleapis.com/calendar/v3/users/me/calendarList`;
                        const calendarResponse = await fetch(calendarListUrl, {
                            headers: { Authorization: "Bearer " + token }
                        });
                        
                        let calendarColors = {};
                        if (calendarResponse.ok) {
                            const calendarData = await calendarResponse.json();
                            calendarData.items?.forEach(cal => {
                                calendarColors[cal.id] = {
                                    backgroundColor: cal.backgroundColor,
                                    foregroundColor: cal.foregroundColor,
                                    summary: cal.summary
                                };
                            });
                        }
                        
                        // 結果を平坦化し、色情報を追加
                        const allEvents = [];
                        resultsPerCalendar.forEach(result => {
                            if (result.events) {
                                result.events.forEach(event => {
                                    const calendarInfo = calendarColors[event.calendarId];
                                    if (calendarInfo) {
                                        event.calendarBackgroundColor = calendarInfo.backgroundColor;
                                        event.calendarForegroundColor = calendarInfo.foregroundColor;
                                        event.calendarName = calendarInfo.summary;
                                    }
                                    allEvents.push(event);
                                });
                            }
                        });
                        
                        console.log(`合計 ${allEvents.length} 件のイベントを取得しました（全カレンダー）`);
                        resolve(allEvents);
                    } catch (colorError) {
                        console.warn('カレンダー色情報取得エラー:', colorError);
                        // 色情報なしでもイベント自体は返す
                        const merged = resultsPerCalendar.flatMap(r => r.events || []);
                        resolve(merged);
                    }
                })
                .catch(error => {
                    console.error("カレンダーイベント取得エラー:", error);
                    reject(error);
                });
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
            const targetDate = request.targetDate ? new Date(request.targetDate) : null;
            getCalendarEvents(targetDate)
                .then(events => sendResponse({events}))
                .catch(error => sendResponse({error: error.message || "イベント取得エラー"}));
            return true; // 非同期応答を示す
            
        case "getCalendarList":
            getCalendarList()
                .then(calendars => sendResponse({calendars}))
                .catch(error => sendResponse({error: error.message || "カレンダー一覧取得エラー"}));
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
