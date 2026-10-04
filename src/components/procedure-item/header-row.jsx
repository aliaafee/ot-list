import { twMerge } from "tailwind-merge";
import { TriangleAlertIcon } from "lucide-react";

import { age } from "@/utils/dates";
import { describeProcedureCodesSimplified } from "@/lib/procedure-codes";
import LabelValue from "../label-value";
import { PacStatusSmall } from "../pac-status";

/**
 * ProcedureHeaderRow - the one-line summary of a procedure
 *
 * Order, NID, name, age/sex, diagnosis, procedure, PAC status and the
 * outstanding-checklist alert. It is the whole of the collapsed row and the
 * top line of the expanded one, so the two cannot drift: its columns line up
 * with the list's table header.
 *
 * What a click does is the caller's: the collapsed row opens, the expanded
 * one closes. The same goes for the alert, which is why it is a callback
 * rather than something this component decides.
 *
 * @param {Object} procedure - Procedure with `patient` expanded
 * @param {string} className - Additional CSS classes for the row
 * @param {function} onClick - Called when the row is clicked
 * @param {function} onChecklistAlert - Called when the outstanding-items alert
 *   is clicked; the click goes no further than the alert
 */
function ProcedureHeaderRow({
    procedure,
    className,
    onClick,
    onChecklistAlert,
}) {
    const patient = procedure?.expand?.patient;

    return (
        <div
            className={twMerge(
                "flex-auto p-2 grid grid-cols-10 lg:grid-cols-14 cursor-pointer gap-1",
                !!procedure.removed && "line-through",
                className,
            )}
            onClick={onClick}
        >
            <LabelValue
                value={!procedure.removed && procedure.order}
                blank={<>&nbsp;</>}
            />
            <LabelValue
                // label="NID"
                value={patient?.nid}
                className="col-span-2 lg:col-span-2"
                copyButton={true}
            />
            <LabelValue
                className="col-span-2 lg:col-span-2"
                // label="Name"
                value={patient?.name}
            />
            <LabelValue
                // label="Age/Sex"
                value={`${
                    patient?.dateOfBirth ? age(patient?.dateOfBirth) : "-"
                } / ${patient?.sex[0]?.toUpperCase() || "-"}`}
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
                    // The click goes no further than this button, or it
                    // would also do whatever a click on the row does.
                    <button
                        type="button"
                        className="p-1 rounded text-red-600 flex items-center gap-1 cursor-pointer hover:bg-red-100"
                        title={`${procedure.checklistOutstanding} checklist item${
                            procedure.checklistOutstanding === 1 ? "" : "s"
                        } outstanding - show the checklist`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onChecklistAlert?.();
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
    );
}

export default ProcedureHeaderRow;
