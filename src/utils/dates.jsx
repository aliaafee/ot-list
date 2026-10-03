import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { hospitalToday, hospitalUtcOffset } from "@/lib/app-settings";

dayjs.extend(utc);

/**
 * Dates and times, always as the hospital sees them - see the "Time zone"
 * section of the README. The browser's own zone never decides what is shown.
 *
 * The database holds two kinds of value, and they are read differently:
 *
 * - A **calendar date** - an OT day, a date of birth, an added date. Stored
 *   as that date at UTC midnight, and it means the date, not a moment: read
 *   it with `calendarDate`, which takes the date part and never converts it.
 * - A **timestamp** - created, updated, ticked at, commented at. Stored in
 *   UTC, and it is a moment: read it with `hospitalTime`, which shows it on
 *   the hospital's clock.
 *
 * A bare `dayjs(value).format(...)` on either is the browser's zone, and is
 * wrong for anyone outside the hospital's.
 */

/**
 * A stored calendar date as a dayjs on that date, whatever the browser's
 * zone. An empty value gives an invalid dayjs, as `dayjs("")` does.
 */
export function calendarDate(value) {
    return dayjs(String(value ?? "").slice(0, 10));
}

/**
 * A stored timestamp as a dayjs on the hospital's clock. If the settings
 * could not be loaded it falls back to the browser's zone.
 */
export function hospitalTime(value) {
    const offset = hospitalUtcOffset();
    return offset === null ? dayjs(value) : dayjs(value).utcOffset(offset);
}

/**
 * Age as of today at the hospital (the app setting), counted on calendar
 * dates: both ends are read as plain "YYYY-MM-DD", so neither the browser's
 * zone nor the time of day can move it.
 */
export function age(dateOfBirth) {
    const today = dayjs(hospitalToday());
    const birth = calendarDate(dateOfBirth);
    const years = today.diff(birth, "year");
    if (years < 1) {
        const months = today.diff(birth, "month");
        if (months < 1) {
            return `${today.diff(birth, "days")} days`;
        }
        return `${months} months`;
    }
    return years;
}

/** A timestamp, as date and time at the hospital. */
export function formatDateTime(dateTime) {
    return hospitalTime(dateTime).format("D MMM YYYY HH:mm");
}

/** A timestamp, as the date it fell on at the hospital. */
export function formatTimestampDate(dateTime) {
    return hospitalTime(dateTime).format("D MMM YYYY");
}

/** A timestamp, as the time of day at the hospital. */
export function formatTime(dateTime) {
    return hospitalTime(dateTime).format("HH:mm");
}

/** A calendar date. */
export function formatDate(date) {
    return calendarDate(date).format("D MMM YYYY");
}

/** A calendar date, with its weekday. */
export function formateDateLong(date) {
    return calendarDate(date).format("dddd, DD MMM YYYY ");
}
