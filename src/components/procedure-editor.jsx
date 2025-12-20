import { useState } from "react";
import { twMerge } from "tailwind-merge";
import Button from "@/components/button";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
dayjs.extend(isSameOrAfter);
import { XIcon, PencilOffIcon } from "lucide-react";

import { ToolBar, ToolBarButton, ToolBarButtonLabel } from "./toolbar";
import { useProcedureList } from "@/contexts/procedure-list-context";

import { ProcedureForm, validateProcedure } from "@/forms/procedure-form";
import PatientInfo from "./patient-info";
import { PacStatus } from "./pac-status";

/**
 * ProcedureEditor - Form component for editing existing OT procedures
 *
 * @param {Object} procedure - Procedure object to edit
 * @param {string} className - Additional CSS classes for the container
 * @param {function} onDiscard - Callback function when edits are discarded
 * @param {function} onClose - Callback function when editor is closed
 * @param {function} onAfterSave - Callback function after successful procedure update
 * @param {Object} error - Error object containing error details
 */
function ProcedureEditor({
    procedure,
    className,
    onDiscard,
    onClose,
    onAfterSave,
    error,
}) {
    const { otDay, updateProcedures } = useProcedureList();

    const [updatedProcedure, setUpdatedProcedure] = useState({
        diagnosis: procedure?.diagnosis || "",
        comorbids: procedure?.comorbids || "",
        procedure: procedure?.procedure || "",
        addedDate: dayjs(procedure?.addedDate).format("YYYY-MM-DD") || "",
        addedBy: procedure?.addedBy || "",
        remarks: procedure?.remarks || "",
        duration: procedure?.duration || "",
        bed: procedure?.bed || "",
        anesthesia: procedure?.anesthesia || "",
        requirements: procedure?.requirements || "",
    });
    const [updatedProcedureErrors, setUpdatedProcedureErrors] = useState({});

    const handleUpdateProcedure = () => {
        const inputErrors = validateProcedure(updatedProcedure);

        setUpdatedProcedureErrors(inputErrors);

        if (Object.keys(inputErrors).length > 0) {
            return;
        }

        const updatedProcedureRecord = {
            id: procedure.id,
            addedBy: updatedProcedure.addedBy,
            addedDate: updatedProcedure.addedDate,
            anesthesia: updatedProcedure.anesthesia,
            bed: updatedProcedure.bed,
            comorbids: updatedProcedure.comorbids,
            diagnosis: updatedProcedure.diagnosis,
            duration: updatedProcedure.duration,
            procedure: updatedProcedure.procedure,
            remarks: updatedProcedure.remarks,
            removed: updatedProcedure.removed,
            requirements: updatedProcedure.requirements,
        };

        updateProcedures([updatedProcedureRecord], null, false);

        onAfterSave();
    };

    return (
        <div
            className={twMerge(
                "flex-auto bg-gray-100 rounded-lg selected",
                className
            )}
        >
            <ToolBar
                className={twMerge(
                    "col-span-4 bg-gray-200 rounded-tr-lg rounded-tl-lg"
                )}
            >
                <ToolBarButton title="Discard" onClick={onDiscard}>
                    <PencilOffIcon width={16} height={16} />
                    <ToolBarButtonLabel>Discard</ToolBarButtonLabel>
                </ToolBarButton>
                <div className="flex-grow"></div>
                {onClose && (
                    <ToolBarButton
                        title="close"
                        disabled={false}
                        onClick={onClose}
                    >
                        <XIcon className="" width={16} height={16} />
                    </ToolBarButton>
                )}
            </ToolBar>
            {error?.type === "update" && (
                <div className="bg-red-400/20 rounded-md m-2 p-2 text-sm">
                    Failed to update procedure
                </div>
            )}
            {procedure.removed && (
                <div className="bg-red-400/20 rounded-md m-2 p-2 text-sm">
                    Removed
                </div>
            )}
            <PacStatus procedureId={procedure?.id} className="p-2" />
            <div className="p-2">
                <ProcedureForm
                    value={updatedProcedure}
                    onChange={(value) => setUpdatedProcedure(value)}
                    surgeons={
                        otDay?.expand?.otList?.expand?.department?.expand
                            ?.activeSurgeons_via_department
                    }
                    errorFields={{
                        ...updatedProcedureErrors,
                        ...error?.response?.data,
                    }}
                />
                <div className="sm:flex sm:flex-row-reverse col-span-full mt-3">
                    <Button
                        onClick={handleUpdateProcedure}
                        className="w-full sm:ml-3 sm:w-auto"
                    >
                        Save
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={onDiscard}
                        className="mt-3 sm:mt-0 w-full sm:w-auto"
                    >
                        Discard
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default ProcedureEditor;
