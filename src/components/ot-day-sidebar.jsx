import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { twMerge } from "tailwind-merge";
import {
    CalendarIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    TriangleAlertIcon,
} from "lucide-react";

import Collapsible from "./collapsible";
import { ToolBar, ToolBarButton, ToolBarButtonLabel } from "./toolbar";
import { useProcedureList } from "@/contexts/procedure-list-context";
import { describeProcedureCodesSimplified } from "@/lib/procedure-codes";
import {
    adjacentOtDay,
    findOtDayOnDate,
    otDaysOnDate,
    proceduresOnOtDays,
    SIDEBAR_PROCEDURE_EXPAND,
} from "@/lib/ot-days";
import { pb } from "@/lib/pb";
import { calendarDate, formateDateLong } from "@/utils/dates";

function ProcedureRow({ procedure, otDay, selected, onNavigate }) {
    const patient = procedure.expand?.patient;
    const description = describeProcedureCodesSimplified(procedure).join(" + ");

    return (
        <Link
            to={`/ot/${otDay.id}/${otDay.otList}/${procedure.id}`}
            onClick={onNavigate}
            aria-current={selected ? "true" : undefined}
            className={twMerge(
                // The same hover, selection and focus colours as the days
                // list in ot-days-list.jsx.
                "flex gap-2 px-3 py-2 text-sm hover:bg-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600",
                selected ? "bg-blue-300 hover:bg-blue-300" : "bg-transparent",
            )}
        >
            <div className="w-5 shrink-0 text-gray-500 text-right">
                {procedure.order}
            </div>
            <div className="grow min-w-0">
                <div className="flex gap-2 items-baseline">
                    <span className="font-medium truncate">
                        {patient?.name || "-"}
                    </span>
                    <span className="text-xs text-gray-500 shrink-0">
                        {patient?.nid}
                    </span>
                </div>
                <div className="text-xs text-gray-600 truncate">
                    {description || procedure.diagnosis || "-"}
                </div>
            </div>
            {/* Read off the procedure, as the list row does: the checklist
                itself is kept out of the list queries. */}
            {procedure.checklistOutstanding > 0 && (
                <div
                    className="shrink-0 flex items-center gap-1 text-red-600 text-xs"
                    title={`${procedure.checklistOutstanding} checklist item${
                        procedure.checklistOutstanding === 1 ? "" : "s"
                    } outstanding`}
                >
                    <TriangleAlertIcon size={12} aria-hidden="true" />
                    {procedure.checklistOutstanding}
                </div>
            )}
        </Link>
    );
}

/**
 * One list's cases on the open date, grouped by operating room, in a
 * collapsible section whose state the sidebar owns.
 *
 * @param {Object} otDay - The OT day, with `otList.operatingRooms` expanded
 * @param {Array} procedures - Its procedures; removed ones are left out here
 * @param {boolean} selected - Whether this is the selected OT day
 * @param {boolean} open - Whether the section is expanded
 * @param {function} onOpenChange - Called with the state the toggle asks for
 */
function ListGroup({
    otDay,
    procedures,
    selected,
    open,
    onOpenChange,
    selectedProcedureId,
    onNavigate,
}) {
    const rooms = otDay.expand?.otList?.expand?.operatingRooms || [];
    const shown = useMemo(
        () =>
            procedures
                .filter((p) => !p.removed)
                .sort((a, b) => a.order - b.order),
        [procedures],
    );

    return (
        <Collapsible
            open={open}
            onOpenChange={onOpenChange}
            className="border-b border-gray-200"
            summaryClassName={twMerge(
                "w-full px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600",
                selected && "text-blue-800",
                !!otDay.disabled && "text-red-400",
            )}
            contentClassName="pb-1"
            summary={
                <span className="grow min-w-0">
                    <span className="flex gap-2 items-baseline">
                        <span className="grow truncate">
                            {otDay.expand?.otList?.name}
                        </span>
                        <span className="text-xs font-normal text-gray-500">
                            {shown.length}
                        </span>
                    </span>
                    {!!otDay.disabled && (
                        <span className="block text-xs font-normal italic">
                            {otDay.remarks || "No OT for this date"}
                        </span>
                    )}
                </span>
            }
        >
            {rooms.map((room) => {
                const inRoom = shown.filter((p) => p.operatingRoom === room.id);
                return (
                    <div key={room.id} className="mb-1">
                        <div className="px-3 pt-1 pb-1 uppercase font-medium text-gray-500 text-xs">
                            {room.name}
                        </div>
                        {inRoom.length === 0 ? (
                            <div className="px-3 py-1 text-xs text-gray-400 italic">
                                No cases
                            </div>
                        ) : (
                            inRoom.map((p) => (
                                <ProcedureRow
                                    key={p.id}
                                    procedure={p}
                                    otDay={otDay}
                                    selected={p.id === selectedProcedureId}
                                    onNavigate={onNavigate}
                                />
                            ))
                        )}
                    </div>
                );
            })}
        </Collapsible>
    );
}

/**
 * OtDaySidebar - The OT workspace's sidebar: every list's cases on the
 * selected OT day's date, one collapsible group per list, each grouped by
 * operating room, with controls to move to another day.
 *
 * The URL is the one source of the selection, `/ot/:otDayId/:otListId/:procedureId`:
 * - `otDayId` fixes the date, and is the day the page loads into the context.
 * - `otListId` is the active list: its group is open and every other one is
 *   closed. Without it every group is closed.
 * - `procedureId` is the case open in the body.
 * Opening a group makes its day and list the selection; closing it drops the
 * list and keeps the day. A case's link carries its own day and list.
 *
 * The sidebar loads every list's cases on the date itself, the selected day's
 * included, and keeps them live with its own subscription, so switching the
 * active list on the same date shows what is already there rather than
 * waiting on the context to reload.
 *
 * - Previous / next: the nearest other date with any list. With a list
 *   active, its day on that date if it runs then, else the first list by
 *   name, opened; with none, every group stays closed.
 * - Today and the date picker: that date's day of the active list, else the
 *   first list by name. The active list stays active, or none stays none.
 *
 * @param {string} otDayId - The selected OT day
 * @param {string} [otListId] - The active list, if any
 * @param {string} [selectedProcedureId] - The procedure open in the body
 * @param {function} [onNavigate] - Called when a procedure is chosen, so the
 *   page can close the small screen overlay. Changing day or list does not
 *   call it: the next step there is usually choosing a case.
 * @param {string} [className] - Additional CSS classes for the container
 */
function OtDaySidebar({
    otDayId,
    otListId,
    selectedProcedureId,
    onNavigate,
    className,
}) {
    const { otDay } = useProcedureList();
    const navigate = useNavigate();

    const [busy, setBusy] = useState(false);
    // Tied to the day it was raised on, so moving anywhere clears it.
    const [notice, setNotice] = useState(null);
    // Each tagged with what it was loaded for, so a stale answer from the
    // previous date or set of lists is never shown.
    const [sameDate, setSameDate] = useState({ date: null, days: [] });
    const [cases, setCases] = useState({ key: null, procedures: [] });

    // The selected day's date: from the date's lists when they already hold
    // it, which is the case when switching list on the same date, else from
    // the context once it has loaded the day.
    const knownDay = sameDate.days.find((d) => d.id === otDayId);
    const contextDay = otDay?.id === otDayId ? otDay : null;
    const dayDate = knownDay
        ? sameDate.date
        : contextDay
          ? calendarDate(contextDay.date).format("YYYY-MM-DD")
          : null;

    useEffect(() => {
        if (!dayDate) return;
        let cancelled = false;
        otDaysOnDate(dayDate)
            .then((days) => !cancelled && setSameDate({ date: dayDate, days }))
            .catch((e) => console.error("Error fetching lists on date:", e));
        return () => {
            cancelled = true;
        };
    }, [dayDate]);

    // The lists on the date. Until they arrive, just the selected day.
    const groups = useMemo(() => {
        if (sameDate.date === dayDate && dayDate) return sameDate.days;
        return contextDay ? [contextDay] : [];
    }, [sameDate, dayDate, contextDay]);
    const day = groups.find((d) => d.id === otDayId) || contextDay;

    const casesKey = groups.map((d) => d.id).join(",");

    useEffect(() => {
        const ids = casesKey ? casesKey.split(",") : [];
        if (ids.length === 0) return;
        let cancelled = false;
        // The procedures last shown, so an event for one that has just moved
        // off these days still reloads and drops it.
        let shownIds = new Set();

        const load = () =>
            proceduresOnOtDays(ids)
                .then((procedures) => {
                    if (cancelled) return;
                    shownIds = new Set(procedures.map((p) => p.id));
                    setCases({ key: casesKey, procedures });
                })
                .catch((e) => console.error("Error fetching cases:", e));
        load();

        // Unfiltered in effect, because a filter on these days would not
        // deliver the event of a procedure moving off them. A filter is still
        // passed so this subscription has its own key, apart from the
        // context's (CLAUDE.md, realtime subscriptions).
        const subscription = pb.collection("procedures").subscribe(
            "*",
            (e) => {
                if (
                    ids.includes(e.record.procedureDay) ||
                    shownIds.has(e.record.id)
                ) {
                    load();
                }
            },
            { filter: 'id != ""', expand: SIDEBAR_PROCEDURE_EXPAND },
        );

        return () => {
            cancelled = true;
            subscription.then((unsubscribe) => unsubscribe()).catch(() => {});
        };
        // otDayId as well: the context's cleanup on a day change drops every
        // procedures subscription, this one included, so it is made again.
    }, [casesKey, otDayId]);

    const casesLoaded = cases.key === casesKey;

    const goTo = (found, withList) => {
        navigate(
            withList ? `/ot/${found.id}/${found.otList}` : `/ot/${found.id}`,
        );
    };

    // Runs one lookup with the controls disabled, then goes where it found or
    // says why it did not.
    const lookup = async (find, withList, emptyMessage) => {
        setBusy(true);
        try {
            const found = await find();
            if (found) {
                goTo(found, withList);
            } else {
                setNotice({ dayId: otDayId, text: emptyMessage });
            }
        } catch (e) {
            console.error("Error finding OT day:", e);
            setNotice({ dayId: otDayId, text: "Could not load OT days." });
        } finally {
            setBusy(false);
        }
    };

    const handleAdjacent = (direction) =>
        lookup(
            async () => {
                // Always a whole date: lists sharing this date are already
                // on screen, so stepping through them would only move the
                // open group.
                const found = await adjacentOtDay(day, direction, {
                    anyList: true,
                });
                if (!found || !otListId) return found;
                // Keep the active list when it runs on that date too.
                return await findOtDayOnDate(
                    calendarDate(found.date).format("YYYY-MM-DD"),
                    otListId,
                );
            },
            !!otListId,
            direction < 0 ? "No earlier OT day." : "No later OT day.",
        );

    const handleDate = (date) =>
        lookup(
            () => findOtDayOnDate(date, otListId),
            !!otListId,
            `No list on ${calendarDate(date).format("DD MMM YYYY")}.`,
        );

    const shownNotice = notice?.dayId === otDayId ? notice?.text : null;

    return (
        <div
            className={twMerge("flex flex-col bg-gray-100 min-h-0", className)}
        >
            <ToolBar className="bg-gray-200">
                <ToolBarButton
                    title="Previous OT day"
                    disabled={!day || busy}
                    onClick={() => handleAdjacent(-1)}
                >
                    <ChevronLeftIcon width={16} height={16} />
                </ToolBarButton>
                <div className="grow" />
                {busy ? (
                    <div className="text-sm">Loading...</div>
                ) : (
                    <input
                        type="date"
                        title="Go to date"
                        className="text-sm bg-transparent px-1"
                        value={dayDate || ""}
                        disabled={busy}
                        onChange={(e) =>
                            e.target.value && handleDate(e.target.value)
                        }
                    />
                )}

                <div className="grow" />
                <ToolBarButton
                    title="Next OT day"
                    disabled={!day || busy}
                    onClick={() => handleAdjacent(1)}
                >
                    <ChevronRightIcon width={16} height={16} />
                </ToolBarButton>
            </ToolBar>

            <div className="px-3 py-2 border-b border-gray-200">
                {day ? (
                    // Only the date: whether a list is disabled is shown on
                    // that list's group below.
                    <div className="font-medium">
                        {formateDateLong(day.date)}
                    </div>
                ) : (
                    <div className="text-sm text-gray-500">
                        {otDayId ? "Loading…" : "No list selected."}
                    </div>
                )}
                {shownNotice && (
                    <div className="text-xs text-amber-700 mt-1">
                        {shownNotice}
                    </div>
                )}
            </div>

            <div className="grow overflow-y-auto">
                {groups.length === 0 || !casesLoaded ? (
                    <div className="animate-pulse p-3 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-24" />
                        <div className="h-10 bg-gray-200 rounded" />
                        <div className="h-10 bg-gray-200 rounded" />
                        <div className="h-10 bg-gray-200 rounded" />
                    </div>
                ) : (
                    groups.map((group) => (
                        <ListGroup
                            key={group.id}
                            otDay={group}
                            procedures={cases.procedures.filter(
                                (p) => p.procedureDay === group.id,
                            )}
                            selected={group.otList === otListId}
                            open={group.otList === otListId}
                            onOpenChange={(open) => goTo(group, open)}
                            selectedProcedureId={selectedProcedureId}
                            onNavigate={onNavigate}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default OtDaySidebar;
