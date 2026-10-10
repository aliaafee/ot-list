import { useState } from "react";
import { twMerge } from "tailwind-merge";
import { ChevronRight } from "lucide-react";

import { hospitalTime } from "@/utils/dates";
import LabelValue from "../label-value";
import ProcedureHeaderRow from "./header-row";
import ProcedureComments from "./comments";
import ProcedureChecklist from "./checklist";
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
            {/* The same row the collapsed view shows. Here a click closes the
                procedure, and the alert goes to the checklist below. */}
            <ProcedureHeaderRow
                procedure={procedure}
                onClick={() => onSelected(null)}
                onChecklistAlert={() => setChecklistFocus((n) => n + 1)}
            />
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
