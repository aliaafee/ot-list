import dayjs from "dayjs";

import { pb } from "@/lib/pb";

/**
 * What a procedure row in the workspace sidebar shows: the patient and the
 * codes that describe the procedure. A subset of the procedure expand, which
 * CLAUDE.md lists with the places it is repeated.
 */
export const SIDEBAR_PROCEDURE_EXPAND =
    "patient,procedureCodes_via_procedure.concept,procedureCodes_via_procedure.spinalLevels";

/**
 * The OT days on one calendar date ("YYYY-MM-DD"), sorted by list name, each
 * with its list and the list's operating rooms.
 *
 * OT days are stored at UTC midnight, so the date is matched as the range
 * from that midnight to the next rather than through any clock.
 */
export async function otDaysOnDate(date) {
    const next = dayjs(date).add(1, "day").format("YYYY-MM-DD");
    return await pb.collection("otDays").getFullList({
        filter: pb.filter("date >= {:start} && date < {:end}", {
            start: `${date} 00:00:00`,
            end: `${next} 00:00:00`,
        }),
        sort: "otList.name",
        expand: "otList,otList.operatingRooms",
        requestKey: null,
    });
}

/** The procedures booked on any of the given OT days, removed ones included. */
export async function proceduresOnOtDays(otDayIds) {
    if (otDayIds.length === 0) return [];
    return await pb.collection("procedures").getFullList({
        filter: otDayIds
            .map((id, i) =>
                pb.filter(`procedureDay = {:id${i}}`, { [`id${i}`]: id }),
            )
            .join(" || "),
        sort: "order",
        expand: SIDEBAR_PROCEDURE_EXPAND,
        requestKey: null,
    });
}

/**
 * The OT day on a date, preferring the given list when it runs that day and
 * otherwise the first by list name. Null when no list runs that day.
 */
export async function findOtDayOnDate(date, preferredListId = null) {
    const days = await otDaysOnDate(date);
    return days.find((d) => d.otList === preferredListId) || days[0] || null;
}

/**
 * The OT day before (direction -1) or after (+1) the given one.
 *
 * By default only the same list's days count. With `anyList`, the step is to
 * the nearest other date with any list, landing on its first list by name in
 * either direction; lists sharing the given day's date are skipped.
 *
 * @param {Object} otDay - The OT day to step from
 * @param {number} direction - -1 for the one before, +1 for the one after
 * @param {Object} [options]
 * @param {boolean} [options.anyList=false] - Step by date across all lists
 */
export async function adjacentOtDay(
    otDay,
    direction,
    { anyList = false } = {},
) {
    const before = direction < 0;

    const filter = anyList
        ? before
            ? "date < {:date}"
            : "date > {:date}"
        : before
          ? "otList = {:otList} && date < {:date}"
          : "otList = {:otList} && date > {:date}";
    const sort = anyList
        ? before
            ? "-date,otList.name"
            : "date,otList.name"
        : before
          ? "-date"
          : "date";

    const result = await pb.collection("otDays").getList(1, 1, {
        filter: pb.filter(filter, { otList: otDay.otList, date: otDay.date }),
        sort,
        requestKey: null,
    });
    return result.items[0] || null;
}
