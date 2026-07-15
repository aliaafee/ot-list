import { twMerge } from "tailwind-merge";

import { age } from "@/utils/dates";
import LabelValue from "./label-value";
import { PacStatusSmall } from "./pac-status";

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
    );
}

export default ProcedureSimplifiedView;
