import { LoadingSpinnerFull } from "@/components/loading-spinner";
import Button from "@/components/button";
import { useProcedureList } from "@/contexts/procedure-list-context";
import { describeProcedureCodes } from "@/lib/procedure-codes";
import { age } from "@/utils/dates";
import dayjs from "dayjs";
import { useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router";
import { twMerge } from "tailwind-merge";

// Merged last by Button, so these win over its own size classes
const controlButtonClasses =
    "grow sm:grow-0 px-4 sm:min-h-0 sm:px-2 sm:text-sm";

// Safari on iOS gates window.print() behind its Block Pop-ups setting and
// says nothing at all when it refuses, so the button can look dead. The Share
// sheet's own Print entry always works, being a native action rather than a
// scripted one. Every iOS browser runs the same engine, but that gate belongs
// to the Safari app, so the other ones are unaffected and need no hint.
const isIosSafari = () => {
    if (typeof navigator === "undefined") {
        return false;
    }
    const ua = navigator.userAgent;
    const isIos =
        /iPad|iPhone|iPod/.test(ua) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    return isIos && !/FxiOS|CriOS|EdgiOS|OPiOS/.test(ua);
};

const showSharePrintHint = isIosSafari();

// The checkbox column stays put while the table is panned sideways. Each cell
// needs its own opaque background or the row would show through it, and its
// grid lines come from an outline rather than a border: under border-collapse
// the borders belong to the table instead of the cell, so they do not travel
// with a sticky one. Pulling the outline in by its own width lands it on the
// cell edge, where the collapsed borders of the other columns sit.
const stickyCell =
    "print:hidden sticky left-0 z-10 outline outline-1 outline-black";

function SubOtListPrint({ procedures, operatingRoom, excluded, onToggle }) {
    const proceduresByRoom = useMemo(
        () =>
            procedures
                .filter(
                    (procedure) =>
                        procedure.operatingRoom === operatingRoom?.id,
                )
                .filter((procedure) => !procedure.removed)
                .sort((a, b) => a.order - b.order),
        [procedures, operatingRoom],
    );

    if (!!!operatingRoom) {
        return <></>;
    }

    // A room whose every procedure was unchecked still prints, under its own
    // heading, reading as empty rather than silently missing from the list.
    const allExcluded =
        proceduresByRoom.length > 0 &&
        proceduresByRoom.every((procedure) => excluded.has(procedure.id));

    return (
        <>
            <tr key={operatingRoom?.name}>
                <td className={`${stickyCell} bg-red-400`}></td>
                <td
                    className="border border-black p-1 text-center font-bold bg-red-400"
                    colSpan={13}
                >
                    {operatingRoom?.name}
                </td>
            </tr>
            {allExcluded && (
                // Print only: on screen the rows are still there, greyed out
                // and waiting to be ticked back on
                <tr className="hidden print:table-row">
                    <td className="print:hidden"></td>
                    <td
                        className="border border-black p-1 font-italic"
                        colSpan={13}
                    >
                        No procedures
                    </td>
                </tr>
            )}
            {proceduresByRoom.length === 0 ? (
                <tr key={`${operatingRoom.id}-empty`}>
                    <td className={`${stickyCell} p-1 bg-white`}></td>
                    <td
                        className="border border-black p-1 font-italic"
                        colSpan={13}
                    >
                        No procedures
                    </td>
                </tr>
            ) : (
                proceduresByRoom.map((item, index) => (
                    <tr
                        key={item.id}
                        className={twMerge(
                            excluded.has(item.id) &&
                                "print:hidden text-gray-400 border border-black",
                        )}
                    >
                        <td
                            className={`${stickyCell} p-1 align-text-top bg-white`}
                        >
                            <input
                                type="checkbox"
                                checked={!excluded.has(item.id)}
                                onChange={() => onToggle(item.id)}
                                aria-label={`Include ${item.expand.patient.name}`}
                                className="cursor-pointer"
                            />
                        </td>
                        <td className="border border-black p-1 pb-10">
                            {item.order}
                        </td>
                        <td className="border border-black p-1 align-text-top">
                            {item.bed}
                        </td>
                        <td className="border border-black p-1 align-text-top">
                            {item.expand.patient.nid}
                        </td>
                        <td className="border border-black p-1 align-text-top">
                            {item.expand.patient.name}
                        </td>
                        <td className="border border-black p-1 text-center align-text-top">
                            {`${
                                !!item?.expand?.patient?.dateOfBirth
                                    ? age(item?.expand?.patient?.dateOfBirth)
                                    : "-"
                            } / ${item?.expand?.patient?.sex[0]?.toUpperCase() || "-"}`}
                        </td>
                        <td className="border border-black p-1 align-text-top">
                            {item.diagnosis}
                        </td>
                        <td className="border border-black p-1 align-text-top">
                            {describeProcedureCodes(item).join(" + ")}
                        </td>
                        <td className="border border-black p-1 align-text-top">
                            Neurosurgery Team
                        </td>
                        <td className="border border-black p-1 align-text-top">
                            {item.comorbids}
                        </td>
                        <td className="border border-black p-1 align-text-top">
                            {item.requirements}
                        </td>
                        <td className="border border-black p-1 align-text-top">
                            {item.anesthesia}
                        </td>
                        <td className="border border-black p-1 align-text-top">
                            {item.expand.patient.phone}
                        </td>
                        <td className="border border-black p-1 align-text-top"></td>
                    </tr>
                ))
            )}
        </>
    );
}

function OtListPrint({}) {
    const { otDayId } = useParams();
    const {
        proceduresList,
        otDay,
        loading,
        error,
        loadProcedures,
        subscribeProcedures,
    } = useProcedureList();

    const [searchParams, setSearchParams] = useSearchParams();

    // Ids left out of the printout, carried in the URL so a partial list can
    // be reloaded, bookmarked or handed to someone else. No parameter means
    // print everything, which keeps the plain /print URL behaving as before.
    // Excluding rather than including is deliberate: a procedure added to the
    // day after the link was made still turns up on the printout.
    const excluded = useMemo(() => {
        const value = searchParams.get("exclude");
        return new Set(value ? value.split(",").filter(Boolean) : []);
    }, [searchParams]);

    const setExcluded = (next) => {
        const params = new URLSearchParams(searchParams);
        if (next.size === 0) {
            params.delete("exclude");
        } else {
            params.set("exclude", [...next].join(","));
        }
        // Replace, so ticking down a list does not bury the back button
        setSearchParams(params, { replace: true });
    };

    useEffect(() => {
        loadProcedures(otDayId);

        const unsubscribe = subscribeProcedures(otDayId);

        return unsubscribe;
    }, [otDayId]);

    const operatingRooms = otDay?.expand?.otList?.expand?.operatingRooms ?? [];

    // The rows that actually reach the table, which is what the counter and
    // the All and None buttons work on.
    const printable = useMemo(() => {
        const roomIds = operatingRooms.map((room) => room.id);
        return (proceduresList?.procedures ?? []).filter(
            (procedure) =>
                !procedure.removed && roomIds.includes(procedure.operatingRoom),
        );
    }, [proceduresList, otDay]);

    const includedCount = printable.filter(
        (procedure) => !excluded.has(procedure.id),
    ).length;

    const toggleProcedure = (id) => {
        const next = new Set(excluded);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setExcluded(next);
    };

    if (loading) {
        return <LoadingSpinnerFull />;
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <div className="w-full inline-block">
            {/* Above the sticky checkbox column, which comes later in the
                markup and would otherwise win on equal z-index */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-300 mb-2 p-2 flex flex-col gap-2 sm:flex-row sm:items-center print:hidden">
                <div className="grow text-sm">
                    <span className="font-semibold">
                        {includedCount} of {printable.length} procedures
                    </span>
                    <span className="text-gray-500 ml-2">
                        Untick a row to leave it out. Applies to this printout
                        only.
                    </span>
                </div>
                {/* Full width and thumb sized on a phone, back to compact
                    toolbar buttons once there is room for them */}
                <div className="flex flex-col gap-1">
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            className={controlButtonClasses}
                            onClick={() => setExcluded(new Set())}
                            disabled={includedCount === printable.length}
                        >
                            All
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            className={controlButtonClasses}
                            onClick={() =>
                                setExcluded(new Set(printable.map((p) => p.id)))
                            }
                            disabled={includedCount === 0}
                        >
                            None
                        </Button>
                        <Button
                            size="sm"
                            className={controlButtonClasses}
                            onClick={() => window.print()}
                            disabled={includedCount === 0}
                        >
                            Print
                        </Button>
                    </div>
                    {showSharePrintHint && (
                        <div className="text-xs text-gray-500 text-center sm:text-right">
                            If nothing happens, use Share then Print
                        </div>
                    )}
                </div>
            </div>
            <div className="text-center font-bold"></div>
            <div className="text-center font-bold">
                {otDay?.expand?.otList?.expand?.department?.description} - OT
                List
            </div>
            <div className="text-center">
                {dayjs(otDay?.date).format("dddd, DD MMM YYYY")} -{" "}
                {otDay?.expand?.otList?.description}
                {!!otDay?.disabled && (
                    <span className="italic ml-2">
                        - {otDay.remarks || "No OT for this date"}
                    </span>
                )}
            </div>
            {/* The table is the only thing allowed to scroll sideways. Left
                on the page, its width would scroll the whole document and
                carry the control bar and headings off screen with it. The
                clipping has to be lifted for print or the paper copy loses
                whatever sits past the fold. */}
            <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full border-collapse text-xs table-auto">
                    <thead>
                        <tr className="font-bold bg-gray-400">
                            <th
                                className={`${stickyCell} p-1 bg-gray-400`}
                            ></th>
                            <th className="border border-black p-1">#</th>
                            <th className="border border-black p-1">Bed</th>
                            <th className="border border-black p-1">NID</th>
                            <th className="border border-black p-1">Name</th>
                            <th className="border border-black p-1">
                                Age / Sex
                            </th>
                            <th className="border border-black p-1">
                                Diagnosis
                            </th>
                            <th className="border border-black p-1">
                                Procedure
                            </th>
                            <th className="border border-black p-1">Surgeon</th>
                            <th className="border border-black p-1">
                                Comorbids
                            </th>
                            <th className="border border-black p-1">
                                Special Requirements
                            </th>
                            <th className="border border-black p-1">Anes</th>
                            <th className="border border-black p-1">Phone</th>
                            <th className="border border-black p-1">
                                OT Use Only
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {operatingRooms.map((operatingRoom) => (
                            <SubOtListPrint
                                key={operatingRoom.id}
                                procedures={proceduresList.procedures}
                                operatingRoom={operatingRoom}
                                excluded={excluded}
                                onToggle={toggleProcedure}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default OtListPrint;
