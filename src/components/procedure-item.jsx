import { useState } from "react";
import { useSearchParams } from "react-router";

import { useProcedureList } from "@/contexts/procedure-list-context";
import ProcedureEditor from "./procedure-editor";
import ProcedureDetails from "./procedure-details";
import ProcedureExpandedView from "./procedure-expanded";
import ProcedureSimplifiedView from "./procedure-simplified";

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

    if (recordError?.type === "update") {
        return (
            <ProcedureExpandedView
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
            </ProcedureExpandedView>
        );
    }

    if (editing) {
        return (
            <ProcedureExpandedView
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
            </ProcedureExpandedView>
        );
    }

    if (procedure.id === selectedProcedureId) {
        return (
            <ProcedureExpandedView
                procedure={procedure}
                isUpdating={isUpdating(procedure)}
                className={className}
                onSelected={onSelected}
            >
                <ProcedureDetails
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
            </ProcedureExpandedView>
        );
    }

    return (
        <ProcedureSimplifiedView
            procedure={procedure}
            isUpdating={isUpdating(procedure)}
            className={className}
            onSelected={onSelected}
        />
    );
}

export default ProcedureItem;
