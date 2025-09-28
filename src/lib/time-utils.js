/**
 * TimeUtils - Pure function collection for time calculations
 *
 * This file provides pure functions for time-related calculations.
 * With no side effects and always returning the same output for the same input,
 * the design is easy to test and debug.
 */

/**
 * Create a new Date object with the specified time set on the specified date
 *
 * @param {Date} date - The base date
 * @param {number} hour - The hour (0-23)
 * @param {number} minute - The minute (0-59)
 * @param {number} second - The second (0-59, default: 0)
 * @param {number} millisecond - The millisecond (0-999, default: 0)
 * @returns {Date} A new Date object
 */
export function createTimeOnDate(date, hour, minute, second = 0, millisecond = 0) {
    const newDate = new Date(date);
    newDate.setHours(hour, minute, second, millisecond);
    return newDate;
}

/**
 * Parse the time string in "HH:MM" format and return the hour and minute
 *
 * @param {string} timeString - The time string in "HH:MM" format
 * @returns {{hour: number, minute: number}} The parse result
 * @throws {Error} If the format is invalid
 */
export function parseTimeString(timeString) {
    if (!timeString || typeof timeString !== 'string') {
        throw new Error('Invalid time string');
    }
    
    const parts = timeString.split(':');
    if (parts.length !== 2) {
        throw new Error('Time string must be in "HH:MM" format');
    }
    
    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);
    
    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        throw new Error('Invalid time value');
    }
    
    return { hour, minute };
}

/**
 * Determine if the specified date is today
 *
 * @param {Date} date - The date to check
 * @returns {boolean} true if today
 */
export function isToday(date) {
    const today = new Date();
    return isSameDay(date, today);
}

/**
 * Determine if the two dates are the same day
 *
 * @param {Date} date1 - The date 1 to compare
 * @param {Date} date2 - The date 2 to compare
 * @returns {boolean} true if the same day
 */
export function isSameDay(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    return d1.getTime() === d2.getTime();
}

/**
 * Calculate the time difference between the two times in milliseconds
 *
 * @param {Date|number} startTime - The start time
 * @param {Date|number} endTime - The end time
 * @returns {number} The time difference (milliseconds)
 */
export function calculateTimeDifference(startTime, endTime) {
    const start = startTime instanceof Date ? startTime.getTime() : startTime;
    const end = endTime instanceof Date ? endTime.getTime() : endTime;
    return end - start;
}

/**
 * Calculate the business start and end times for a specified date
 *
 * @param {Date} date - The target date
 * @param {string} openHour - The business start time ("HH:MM" format)
 * @param {string} closeHour - The business end time ("HH:MM" format)
 * @returns {{openTime: Date, closeTime: Date, hourDiff: number}} The calculation result
 */
export function calculateWorkHours(date, openHour, closeHour) {
    const { hour: openTimeHour, minute: openTimeMinute } = parseTimeString(openHour);
    const { hour: closeTimeHour, minute: closeTimeMinute } = parseTimeString(closeHour);
    
    const openTime = createTimeOnDate(date, openTimeHour, openTimeMinute);
    const closeTime = createTimeOnDate(date, closeTimeHour, closeTimeMinute);
    const hourDiff = calculateTimeDifference(openTime, closeTime) / (60 * 60 * 1000);
    
    return { openTime, closeTime, hourDiff };
}
