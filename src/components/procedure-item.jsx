import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
dayjs.extend(isSameOrAfter);

import { age } from "@/utils/dates";
import LabelValue from "./label-value";
import { useProcedureList } from "@/contexts/procedure-list-context";
import ProcedureEditor from "./procedure-editor";
import { PacStatusSmall } from "./pac-status";
import ProcedureView from "./procedure-view";
import ExpandedView from "./procedure-expanded";

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

    if (recordError?.type === "update") {
        return (
            <ExpandedView
                procedure={procedure}
                isUpdating={isUpdating(procedure)}
                className={className}
                onSelected={onSelected}
            >
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
            <ExpandedView
                procedure={procedure}
                isUpdating={isUpdating(procedure)}
                className={className}
                onSelected={onSelected}
            >
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
            <ExpandedView
                procedure={procedure}
                isUpdating={isUpdating(procedure)}
                className={className}
                onSelected={onSelected}
            >
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
