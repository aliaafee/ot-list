/// <reference path="../pb_data/types.d.ts" />

/**
 * Reading the app settings - see the appSettings migration and the "Time
 * zone" section of the README.
 *
 * `todayDate` is the one answer to "what day is it" on the server. Anything
 * that needs today's date for a rule or a calculation calls it rather than
 * reading the local clock, which is in whatever zone the server is hosted in.
 */

/** The single appSettings record. */
const APP_SETTINGS_ID = "appsettings0001";

/**
 * Today's date at the hospital, as "YYYY-MM-DD".
 *
 * Read from the `utcOffsetMinutes` app setting; the browser reads the same
 * setting, and the upcomingOtDays view applies it in SQL, so all three agree
 * on the day. Falls back to the server's zone if the setting cannot be read.
 */
function todayDate(app) {
    const pad = (n) => ("0" + n).slice(-2);
    try {
        const offset = app
            .findRecordById("appSettings", APP_SETTINGS_ID)
            .getInt("utcOffsetMinutes");
        // Shift the instant, then read it as UTC: the UTC fields of the
        // shifted time are the wall clock at that offset.
        const there = new Date(Date.now() + offset * 60000);
        return `${there.getUTCFullYear()}-${pad(there.getUTCMonth() + 1)}-${pad(there.getUTCDate())}`;
    } catch (err) {
        const now = new Date();
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    }
}

module.exports = { APP_SETTINGS_ID, todayDate };
