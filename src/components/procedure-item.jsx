import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
dayjs.extend(isSameOrAfter);
import { ChevronRight } from "lucide-react";

import { age } from "@/utils/dates";
import LabelValue from "./label-value";
import { useProcedureList } from "@/contexts/procedure-list-context";
import ProcedureEditor from "./procedure-editor";
import ProcedureComments from "./procedure-comments";
import { PacStatusSmall } from "./pac-status";
import ProcedureView from "./procedure-view";

/**
 * ProcedureItem - Display and manage a single OT procedure item
 *
 * @param {Object} procedure - Procedure object with patient and details
 * @param {string} className - Additional CSS classes for the container
 * @param {function} onMoveUp - Callback to move procedure up in order
 * @param {function} onMoveDown - Callback to move procedure down in order
 * @param {function} onRemove - Callback to remove/mark procedure as removed
 * @param {function} onRestore - Callback to restore a removed procedure
 * @param {function} onMoveDate - Callback to move procedure to different date
 */
function ProcedureItem({
    procedure,
    className,
    onMoveUp = (item) => {},
    onMoveDown = (item) => {},
    onRemove = (item) => {},
    onRestore = (item) => {},
    onMoveDate = (item) => {},
    onSelected = (id, scrollTo = false) => {},
}) {
    const { isUpdating, getProcedureError, discardProcedureUpdate } =
        useProcedureList();

    const recordError = getProcedureError(procedure);
    const [editing, setEditing] = useState(false);

    const [showPatientDetails, setShowPatientDetails] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();

    const selectedProcedureId = searchParams.get("procedureId");

    const SimplifiedView = () => {
        return (
            <div
                className={twMerge(
                    "flex-auto p-2 grid grid-cols-10 lg:grid-cols-14 cursor-pointer gap-1 rounded-lg md:rounded-l-none",
                    isUpdating(procedure) ? "animate-pulse" : "",
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
    };

    const ExpandedView = ({ children }) => {
        return (
            <div
                className={twMerge(
                    "flex-auto selected rounded-lg bg-gray-100",
                    isUpdating(procedure) ? "animate-pulse" : "",
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
                    <span className="text-sm font-medium ">
                        Patient Details
                    </span>
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
                            {dayjs(procedure?.created).format(
                                "DD MMM YYYY HH:mm",
                            )}
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
    };

    if (recordError?.type === "update") {
        return (
            <ExpandedView>
                <ProcedureEditor
                    procedure={procedure}
                    className={className}
                    onDiscard={() => {
                        setEditing(false);
                        discardProcedureUpdate(procedure.id);
                    }}
                    onClose={null}
                    onAfterSave={() => {
                        setEditing(false);
                    }}
                    error={recordError}
                />
            </ExpandedView>
        );
    }

    if (editing) {
        return (
            <ExpandedView>
                <ProcedureEditor
                    procedure={procedure}
                    className={className}
                    onDiscard={() => {
                        setEditing(false);
                    }}
                    onClose={() => {
                        setEditing(false);
                        if (selectedProcedureId === procedure.id) {
                            onSelected(null);
                        }
                    }}
                    onAfterSave={() => {
                        setEditing(false);
                    }}
                />
            </ExpandedView>
        );
    }

    if (procedure.id === selectedProcedureId) {
        return (
            <ExpandedView>
                <ProcedureView
                    procedure={procedure}
                    onMoveUp={onMoveUp}
                    onMoveDown={onMoveDown}
                    onRestore={onRestore}
                    onMoveDate={onMoveDate}
                    onSelected={onSelected}
                    setEditing={setEditing}
                    onRemove={onRemove}
                    recordError={recordError}
                />
            </ExpandedView>
        );
    }

    return <SimplifiedView />;
}

export default ProcedureItem;
