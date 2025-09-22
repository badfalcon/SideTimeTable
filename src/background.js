/**
 * SideTimeTable - バックグラウンドスクリプト
 *
 * このファイルはChrome拡張機能のバックグラウンドで実行され、
 * サイドパネルの設定やGoogleカレンダーとの連携を管理します。
 */

import { StorageHelper } from './lib/storage-helper.js';

// サイドパネルの設定 - アクションツールバーアイコンをクリックして開く
chrome.sidePanel
    .setPanelBehavior({openPanelOnActionClick: true})
    .catch((error) => console.error("サイドパネル設定エラー:", error));

// 拡張機能がインストールされたときの処理
chrome.runtime.onInstalled.addListener(() => {
    console.log("拡張機能がインストールされました");
});

// キーボードショートカットのハンドラー
// StackOverflowの解決策：awaitを使わず、callbackで即座にsidePanel.open()を呼ぶ
if (chrome.commands && chrome.commands.onCommand && chrome.commands.onCommand.addListener) {
    chrome.commands.onCommand.addListener((command) => {
        console.log("ショートカットコマンド受信:", command);
        
        switch (command) {
            case 'open-side-panel':
                // async操作を最小限に抑え、即座にsidePanel.open()を呼ぶ
                chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
                    if (activeTab) {
                        console.log("サイドパネルを開く試行:", activeTab.id);
                        chrome.sidePanel.open({ tabId: activeTab.id })
                            .then(() => {
                                console.log("サイドパネル開閉成功！");
                            });
                    } else {
                        console.error("アクティブタブが見つかりません");
                    }
                });
                break;
                
            default:
                console.warn("未知のコマンド:", command);
                break;
        }
    });
} else {
    console.warn("chrome.commands API が利用できない環境です。manifest.json の commands 設定を確認してください。");
}

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
                        StorageHelper.set({ selectedCalendars: primaryCalendarIds })
                            .then(() => {
                                console.log("プライマリカレンダーを自動選択しました:", primaryCalendar.summary);
                            })
                            .catch((error) => {
                                console.error("プライマリカレンダー選択設定エラー:", error);
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
            StorageHelper.get(['selectedCalendars'], { selectedCalendars: [] })
                .then((storageData) => {
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
                            const allCalendars = listData.items || [];
                            const selectedCalendars = allCalendars.filter(cal => cal.selected);
                            const accessibleCalendars = selectedCalendars.filter(cal => cal.accessRole && cal.accessRole !== 'none');

                            // プライマリカレンダーを必ず含める
                            const calendarsToReturn = [...accessibleCalendars];
                            const primaryCalendar = allCalendars.find(cal => cal.primary);

                            // プライマリカレンダーがselectedフラグに関係なく確実に含まれるようにする
                            if (primaryCalendar && !calendarsToReturn.some(cal => cal.id === primaryCalendar.id)) {
                                calendarsToReturn.unshift(primaryCalendar);
                            }

                            if (calendarsToReturn.length === 0) {
                                return [ { id: 'primary' } ];
                            }

                            return calendarsToReturn.map(c => ({ id: c.id }));
                        });
                    } else {
                        // 選択されたカレンダーを使用
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
                                    // キャンセルされたイベントをスキップ
                                    if (event.status === 'cancelled') {
                                        return;
                                    }
                                    
                                    // 参加を辞退したイベントをスキップ
                                    if (event.attendees && event.attendees.some(attendee => 
                                        attendee.self && attendee.responseStatus === 'declined'
                                    )) {
                                        return;
                                    }
                                    
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
                        // 色情報なしでもイベント自体は返す（キャンセルされたイベントと参加を辞退したイベントは除外）
                        const merged = resultsPerCalendar.flatMap(r => 
                            (r.events || []).filter(event => {
                                // キャンセルされたイベントを除外
                                if (event.status === 'cancelled') {
                                    return false;
                                }
                                // 参加を辞退したイベントを除外
                                if (event.attendees && event.attendees.some(attendee => 
                                    attendee.self && attendee.responseStatus === 'declined'
                                )) {
                                    return false;
                                }
                                return true;
                            })
                        );
                        resolve(merged);
                    }
                })
                .catch(error => {
                    console.error("カレンダーイベント取得エラー:", error);
                    reject(error);
                });
                });
                })
                .catch((error) => {
                    console.error("選択カレンダー取得エラー:", error);
                    reject(error);
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
            const requestId = request.requestId;
            getCalendarEvents(targetDate)
                .then(events => sendResponse({events, requestId}))
                .catch(error => {
                    const detail = (error && (error.message || error.toString())) || "イベント取得エラー";
                    console.error("イベント取得エラー詳細:", error);
                    sendResponse({ error: detail, errorType: (error && error.name) || undefined, requestId });
                });
            return true; // 非同期応答を示す
            
        case "getCalendarList":
            const reqIdList = request.requestId;
            getCalendarList()
                .then(calendars => sendResponse({calendars, requestId: reqIdList}))
                .catch(error => {
                    const detail = (error && (error.message || error.toString())) || "カレンダー一覧取得エラー";
                    console.error("カレンダー一覧取得エラー詳細:", error);
                    sendResponse({ error: detail, errorType: (error && error.name) || undefined, requestId: reqIdList });
                });
            return true; // 非同期応答を示す
            
        case "checkAuth":
            checkGoogleAuth()
                .then(isAuthenticated => sendResponse({isAuthenticated}))
                .catch(error => {
                                    const detail = (error && (error.message || error.toString())) || "認証確認エラー";
                                    console.error("認証確認エラー詳細:", error);
                                    sendResponse({ error: detail, errorType: (error && error.name) || undefined });
                                });
            return true; // 非同期応答を示す

        case "authenticateGoogle":
            // Google認証を実行
            chrome.identity.getAuthToken({interactive: true}, (token) => {
                if (chrome.runtime.lastError || !token) {
                    const error = chrome.runtime.lastError || new Error("認証に失敗しました");
                    console.error("Google認証エラー:", error);
                    sendResponse({ success: false, error: error.message });
                    return;
                }

                console.log("Google認証成功");
                sendResponse({ success: true, token: token });
            });
            return true; // 非同期応答を示す

        case "disconnectGoogle":
            // Googleアカウントとの連携を解除
            chrome.identity.getAuthToken({interactive: false}, (token) => {
                if (chrome.runtime.lastError || !token) {
                    // トークンがない場合は既に切断済み
                    console.log("認証トークンなし（既に切断済み）");
                    sendResponse({ success: true, alreadyDisconnected: true });
                    return;
                }

                // キャッシュされたトークンを削除
                chrome.identity.removeCachedAuthToken({ token: token }, () => {
                    if (chrome.runtime.lastError) {
                        console.error("トークン削除エラー:", chrome.runtime.lastError);
                        sendResponse({ success: false, error: chrome.runtime.lastError.message });
                        return;
                    }

                    console.log("Google認証トークンを削除しました");
                    sendResponse({
                        success: true,
                        requiresManualRevoke: true,
                        revokeUrl: 'https://myaccount.google.com/permissions'
                    });
                });
            });
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
