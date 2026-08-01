import dayjs from "dayjs";

/**
 * Insert an OT day into a list that is kept sorted by date, without mutating
 * the original. Used by both the reducer and the realtime handlers so that a
 * day arriving out of band still lands in the right place.
 */
export function insertDayInOrder(days, day) {
    const index = days.findIndex((d) => dayjs(d.date).isAfter(dayjs(day.date)));
    const next = [...days];
    next.splice(index === -1 ? next.length : index, 0, day);
    return next;
}

/**
 * True if an OT day falls within the given year and 1-based month.
 */
export function isInMonth(date, year, month) {
    const d = dayjs(date);
    return d.year() === year && d.month() + 1 === month;
}
