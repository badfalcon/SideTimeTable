/**
 * TimeUtils - 時間計算の純粋関数集
 * 
 * このファイルは時間関連の計算を行う純粋関数を提供します。
 * 副作用がなく、同じ入力に対して常に同じ出力を返すため、
 * テストしやすく、デバッグしやすい設計になっています。
 */

/**
 * 指定した日付に指定した時間を設定した新しいDateオブジェクトを作成
 * 
 * @param {Date} date - ベースとなる日付
 * @param {number} hour - 時（0-23）
 * @param {number} minute - 分（0-59）
 * @param {number} second - 秒（0-59、デフォルト: 0）
 * @param {number} millisecond - ミリ秒（0-999、デフォルト: 0）
 * @returns {Date} 新しいDateオブジェクト
 */
export function createTimeOnDate(date, hour, minute, second = 0, millisecond = 0) {
    const newDate = new Date(date);
    newDate.setHours(hour, minute, second, millisecond);
    return newDate;
}

/**
 * "HH:MM" 形式の時間文字列をパースして時と分を返す
 * 
 * @param {string} timeString - "HH:MM" 形式の時間文字列
 * @returns {{hour: number, minute: number}} パース結果
 * @throws {Error} 不正な形式の場合
 */
export function parseTimeString(timeString) {
    if (!timeString || typeof timeString !== 'string') {
        throw new Error('時間文字列が無効です');
    }
    
    const parts = timeString.split(':');
    if (parts.length !== 2) {
        throw new Error('時間文字列は "HH:MM" 形式である必要があります');
    }
    
    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);
    
    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        throw new Error('無効な時間値です');
    }
    
    return { hour, minute };
}

/**
 * 指定した日付が今日かどうかを判定
 * 
 * @param {Date} date - 判定対象の日付
 * @returns {boolean} 今日の場合true
 */
export function isToday(date) {
    const today = new Date();
    return isSameDay(date, today);
}

/**
 * 2つの日付が同じ日かどうかを判定
 * 
 * @param {Date} date1 - 比較対象の日付1
 * @param {Date} date2 - 比較対象の日付2
 * @returns {boolean} 同じ日の場合true
 */
export function isSameDay(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    return d1.getTime() === d2.getTime();
}

/**
 * 2つの時間の差をミリ秒で計算
 * 
 * @param {Date|number} startTime - 開始時間
 * @param {Date|number} endTime - 終了時間
 * @returns {number} 時間差（ミリ秒）
 */
export function calculateTimeDifference(startTime, endTime) {
    const start = startTime instanceof Date ? startTime.getTime() : startTime;
    const end = endTime instanceof Date ? endTime.getTime() : endTime;
    return end - start;
}

/**
 * 指定した日付における業務開始・終了時間を計算
 * 
 * @param {Date} date - 対象の日付
 * @param {string} openHour - 業務開始時間（"HH:MM"形式）
 * @param {string} closeHour - 業務終了時間（"HH:MM"形式）
 * @returns {{openTime: Date, closeTime: Date, hourDiff: number}} 計算結果
 */
export function calculateWorkHours(date, openHour, closeHour) {
    const { hour: openTimeHour, minute: openTimeMinute } = parseTimeString(openHour);
    const { hour: closeTimeHour, minute: closeTimeMinute } = parseTimeString(closeHour);
    
    const openTime = createTimeOnDate(date, openTimeHour, openTimeMinute);
    const closeTime = createTimeOnDate(date, closeTimeHour, closeTimeMinute);
    const hourDiff = calculateTimeDifference(openTime, closeTime) / (60 * 60 * 1000);
    
    return { openTime, closeTime, hourDiff };
}

/**
 * 指定した日付における休憩時間を計算
 * 
 * @param {Date} date - 対象の日付
 * @param {string} breakStart - 休憩開始時間（"HH:MM"形式）
 * @param {string} breakEnd - 休憩終了時間（"HH:MM"形式）
 * @returns {{breakStartTime: Date, breakEndTime: Date}} 計算結果
 */
export function calculateBreakHours(date, breakStart, breakEnd) {
    const { hour: breakStartHour, minute: breakStartMinute } = parseTimeString(breakStart);
    const { hour: breakEndHour, minute: breakEndMinute } = parseTimeString(breakEnd);
    
    const breakStartTime = createTimeOnDate(date, breakStartHour, breakStartMinute);
    const breakEndTime = createTimeOnDate(date, breakEndHour, breakEndMinute);
    
    return { breakStartTime, breakEndTime };
}

/**
 * 現在時刻が指定した時間範囲内かどうかを判定
 * 
 * @param {Date} currentTime - 現在時刻
 * @param {Date} startTime - 開始時間
 * @param {Date} endTime - 終了時間
 * @returns {boolean} 範囲内の場合true
 */
export function isTimeInRange(currentTime, startTime, endTime) {
    const current = currentTime.getTime();
    const start = startTime.getTime();
    const end = endTime.getTime();
    return current >= start && current <= end;
}

/**
 * 現在時刻が今日の業務時間内かどうかを判定
 * 
 * @param {Date} currentTime - 現在時刻
 * @param {string} openHour - 業務開始時間（"HH:MM"形式）
 * @param {string} closeHour - 業務終了時間（"HH:MM"形式）
 * @returns {boolean} 業務時間内の場合true
 */
export function isCurrentTimeInWorkHours(currentTime, openHour, closeHour) {
    if (!isToday(currentTime)) {
        return false;
    }
    
    const { openTime, closeTime } = calculateWorkHours(currentTime, openHour, closeHour);
    return isTimeInRange(currentTime, openTime, closeTime);
}