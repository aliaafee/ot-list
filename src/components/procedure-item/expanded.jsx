import { useState } from "react";
import { twMerge } from "tailwind-merge";
import { ChevronRight, TriangleAlertIcon } from "lucide-react";

import { age, hospitalTime } from "@/utils/dates";
import LabelValue from "../label-value";
import { PacStatusSmall } from "../pac-status";
import ProcedureComments from "./comments";
import ProcedureChecklist from "./checklist";
import { describeProcedureCodesSimplified } from "@/lib/procedure-codes";
import Collapsible from "../collapsible";

/**
 * ProcedureExpandedView - Display expanded procedure item with full patient details
 *
 * @param {Object} procedure - Procedure object with patient and details
 * @param {boolean} isUpdating - Whether the procedure is currently being updated
 * @param {string} className - Additional CSS classes for the container
 * @param {function} onSelected - Callback when clicking to collapse the view
 * @param {ReactNode} children - Additional content (e.g., editor, view controls)
 * @param {boolean} focusChecklist - Open the checklist and scroll to it
 * @param {function} onEdit - Opens the procedure for editing, for the checklist
 *   to offer when its fix is on the procedure's codes; omit while editing
 */
function ProcedureExpandedView({
    procedure,
    isUpdating,
    className,
    onSelected,
    children,
    focusChecklist = false,
    onEdit,
}) {
    const [showPatientDetails, setShowPatientDetails] = useState(false);
    // Bumped by the outstanding-items alert; the checklist opens and scrolls
    // into view on every change. Starts set when the row was opened from the
    // alert in its collapsed form.
    const [checklistFocus, setChecklistFocus] = useState(
        focusChecklist ? 1 : 0,
    );

    return (
        <div
            className={twMerge(
                "flex-auto selected rounded-lg bg-gray-100",
                isUpdating ? "animate-pulse" : "",
                className,
            )}
        >
            <div
                className={twMerge(
                    "flex-auto p-2 grid grid-cols-10 lg:grid-cols-14 cursor-pointer gap-1",
                    !!procedure.removed && "line-through",
                )}
                onClick={() => onSelected(null)}
            >
                <LabelValue
                    value={!procedure.removed && procedure.order}
                    blank={<>&nbsp;</>}
                />
                <LabelValue
                    // label="NID"
                    value={procedure?.expand?.patient?.nid}
                    className="col-span-2 lg:col-span-2"
                    copyButton={true}
                />
                <LabelValue
                    className="col-span-2 lg:col-span-2"
                    // label="Name"
                    value={procedure?.expand?.patient?.name}
                />
                <LabelValue
                    // label="Age/Sex"
                    value={`${
                        procedure?.expand?.patient?.dateOfBirth
                            ? age(procedure?.expand?.patient?.dateOfBirth)
                            : "-"
                    } / ${procedure?.expand?.patient?.sex[0]?.toUpperCase() || "-"}`}
                    className="col-span-1 hidden lg:inline"
                />
                <LabelValue
                    className="col-span-3 hidden lg:inline"
                    // label="Diagnosis"
                    value={procedure.diagnosis}
                />
                <LabelValue
                    className="col-span-3"
                    // label="Procedure"
                    value={describeProcedureCodesSimplified(procedure).join(
                        " + ",
                    )}
                />
                <div className="col-span-1">
                    <PacStatusSmall status={procedure?.pacStatus} />
                </div>
                {/* Read off the procedure rather than loading its checklist: this
                renders once per row, and the checklist items are deliberately
                kept out of the list queries. */}
                <div className="col-span-1 flex items-center justify-center">
                    {procedure?.checklistOutstanding > 0 && (
                        // Goes to the checklist; the click goes no further,
                        // or the header would close the row.
                        <button
                            type="button"
                            className="p-1 rounded text-red-600 flex items-center gap-1 cursor-pointer hover:bg-red-100"
                            title={`${procedure.checklistOutstanding} checklist item${
                                procedure.checklistOutstanding === 1 ? "" : "s"
                            } outstanding - show the checklist`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setChecklistFocus((n) => n + 1);
                            }}
                        >
                            <TriangleAlertIcon size={14} aria-hidden="true" />
                            <span className="text-xs">
                                {procedure.checklistOutstanding}
                            </span>
                        </button>
                    )}
                </div>
            </div>
            <div
                className="flex items-center cursor-pointer md:hidden p-2 gap-2 text-gray-600"
                onClick={() => setShowPatientDetails(!showPatientDetails)}
            >
                <ChevronRight
                    width={16}
                    height={16}
                    className={twMerge(
                        "transition-transform",
                        showPatientDetails && "rotate-90",
                    )}
                />{" "}
                <span className="text-sm font-medium ">Patient Details</span>
            </div>
            <div
                className={twMerge(
                    "p-2 grid grid-cols-1 md:grid-cols-14 gap-2",
                    !showPatientDetails && "hidden md:grid",
                )}
            >
                <div className="hidden md:inline-block"></div>
                <LabelValue
                    label="Hospital ID"
                    value={procedure?.expand?.patient?.hospitalId}
                    className="col-span-1 md:col-span-3"
                    copyButton={true}
                />
                <LabelValue
                    label="Phone"
                    value={procedure?.expand?.patient?.phone}
                    className="col-span-1 md:col-span-2"
                    copyButton={true}
                />
                <LabelValue
                    label="Address"
                    value={procedure?.expand?.patient?.address}
                    className="col-span-1 md:col-span-7"
                />
            </div>
            {children}
            <ProcedureChecklist
                procedure={procedure}
                className="p-2"
                focusKey={checklistFocus}
                onEditProcedure={onEdit}
            />
            <div className="text-xs text-gray-500 px-2 py-1 text-right sm:flex  sm:justify-end gap-2 bg-gray-200">
                <div>
                    Created:{" "}
                    <span>
                        {hospitalTime(procedure?.created).format("DD MMM YYYY HH:mm")}
                    </span>{" "}
                    by{" "}
                    <span className="font-semibold">
                        {procedure?.expand?.creator?.name}
                    </span>
                </div>
                {procedure?.created !== procedure?.updated && (
                    <div>
                        Updated:{" "}
                        <span>
                            {hospitalTime(procedure?.updated).format(
                                "DD MMM YYYY HH:mm",
                            )}
                        </span>{" "}
                        by{" "}
                        <span className="font-semibold">
                            {procedure?.expand?.updater?.name}
                        </span>
                    </div>
                )}
            </div>
            <Collapsible
                className="p-2"
                summaryClassName="text-sm font-semibold"
                summary={<>Comments</>}
                defaultOpen={true}
            >
                <ProcedureComments procedureId={procedure.id} />
            </Collapsible>
        </div>
    );
}

export default ProcedureExpandedView;
