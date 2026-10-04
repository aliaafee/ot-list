import { hospitalToday, useAppSettings } from "@/lib/app-settings";

/**
 * Whether a procedure's day is before today at the hospital.
 *
 * The cut-off after which a checklist is left as it was: no rebuild, and no
 * notice prompting one (specs/checklists/README.md, sections 5 and 8.1). The
 * same line the server draws in isPastProcedure - the day's calendar date
 * against today's, from the same app setting - kept in one place here so the
 * toolbar's Rebuild button and the checklist's notices cannot disagree about
 * which procedures are past.
 *
 * A hook because it re-renders when the setting arrives or changes. A
 * procedure with no day expanded is not past.
 *
 * @param {Object} procedure - Procedure with `procedureDay` expanded
 * @returns {boolean}
 */
export default function useIsPastProcedure(procedure) {
    const appSettings = useAppSettings();
    const dayDate = procedure?.expand?.procedureDay?.date;
    return (
        !!dayDate && String(dayDate).slice(0, 10) < hospitalToday(appSettings)
    );
}
