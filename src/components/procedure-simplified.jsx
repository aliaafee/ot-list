import { twMerge } from "tailwind-merge";

import { age } from "@/utils/dates";
import LabelValue from "./label-value";
import { describeProcedureCodesSimplified } from "@/lib/procedure-codes";
import { PacStatusSmall } from "./pac-status";
import { TriangleAlertIcon } from "lucide-react";

/**
 * ProcedureSimplifiedView - Display simplified procedure item in list view
 *
 * @param {Object} procedure - Procedure object with patient and details
 * @param {boolean} isUpdating - Whether the procedure is currently being updated
 * @param {string} className - Additional CSS classes for the container
 * @param {function} onSelected - Callback when clicking to expand the view
 */
function ProcedureSimplifiedView({
    procedure,
    isUpdating,
    className,
    onSelected,
}) {
    return (
        <div
            className={twMerge(
                "flex-auto p-2 grid grid-cols-10 lg:grid-cols-14 cursor-pointer gap-1 rounded-lg md:rounded-l-none",
                isUpdating ? "animate-pulse" : "",
                !!procedure.removed && "line-through",
                className,
            )}
            onClick={() => onSelected(procedure.id)}
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
                // label="Procedure Codes"
                // One line per row, so staged or multiple codes read as a
                // single procedure: "ACDF (Left, C5-C6) + Burr hole drainage".
                value={describeProcedureCodesSimplified(procedure).join(" + ")}
            />
            <div className="col-span-1">
                <PacStatusSmall status={procedure?.pacStatus} />
            </div>
            {/* Read off the procedure rather than loading its checklist: this
                renders once per row, and the checklist items are deliberately
                kept out of the list queries. */}
            <div className="col-span-1 flex items-center justify-center">
                {procedure?.checklistOutstanding > 0 && (
                    <span
                        className="px-2 text-red-600 flex items-center gap-1"
                        title={`${procedure.checklistOutstanding} checklist item${
                            procedure.checklistOutstanding === 1 ? "" : "s"
                        } outstanding`}
                    >
                        <TriangleAlertIcon size={14} />
                        <span className="text-xs">
                            {procedure.checklistOutstanding}
                        </span>
                    </span>
                )}
            </div>
        </div>
    );
}

export default ProcedureSimplifiedView;
