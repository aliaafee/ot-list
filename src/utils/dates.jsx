import dayjs from "dayjs";

import { hospitalToday } from "@/lib/app-settings";

/**
 * Age as of today at the hospital (the app setting), counted on calendar
 * dates: both ends are read as plain "YYYY-MM-DD", so neither the browser's
 * zone nor the time of day can move it.
 */
export function age(dateOfBirth) {
    const today = dayjs(hospitalToday());
    const birth = dayjs(String(dateOfBirth).slice(0, 10));
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

export function formatDateTime(dateTime) {
    return dayjs(dateTime).format("D MMM YYYY HH:mm");
}

export function formatDate(dateTime) {
    return dayjs(dateTime).format("D MMM YYYY");
}

export function formateDateLong(dateTime) {
    return dayjs(dateTime).format("dddd, DD MMM YYYY ");
}

export function formatTime(dateTime) {
    return dayjs(dateTime).format("HH:mm");
}
