import { useState } from "react";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import { ChevronRight } from "lucide-react";

import { age } from "@/utils/dates";
import LabelValue from "./label-value";
import { PacStatusSmall } from "./pac-status";
import ProcedureComments from "./procedure-comments";

/**
 * ExpandedView - Display expanded procedure item with full patient details
 *
 * @param {Object} procedure - Procedure object with patient and details
 * @param {boolean} isUpdating - Whether the procedure is currently being updated
 * @param {string} className - Additional CSS classes for the container
 * @param {function} onSelected - Callback when clicking to collapse the view
 * @param {ReactNode} children - Additional content (e.g., editor, view controls)
 */
function ExpandedView({
    procedure,
    isUpdating,
    className,
    onSelected,
    children,
}) {
    const [showPatientDetails, setShowPatientDetails] = useState(false);

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
                />
                <LabelValue
                    className="col-span-2 lg:col-span-2"
                    // label="Name"
                    value={procedure?.expand?.patient?.name}
                />
                <LabelValue
                    // label="Age/Sex"
                    value={`${
                        !!procedure?.expand?.patient?.dateOfBirth
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
                    value={procedure.procedure}
                />
                <div className="col-span-2">
                    <PacStatusSmall status={procedure?.pacStatus} />
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
                />
                <LabelValue
                    label="Phone"
                    value={procedure?.expand?.patient?.phone}
                    className="col-span-1 md:col-span-2"
                />
                <LabelValue
                    label="Address"
                    value={procedure?.expand?.patient?.address}
                    className="col-span-1 md:col-span-7"
                />
            </div>
            {children}
            <div className="text-xs text-gray-500 px-2 py-1 text-right sm:flex  sm:justify-end gap-2 bg-gray-200">
                <div>
                    Created:{" "}
                    <span>
                        {dayjs(procedure?.created).format("DD MMM YYYY HH:mm")}
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
                            {dayjs(procedure?.updated).format(
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
            <ProcedureComments procedureId={procedure.id} />
        </div>
    );
}

export default ExpandedView;
