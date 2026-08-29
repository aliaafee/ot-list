import { useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import Button from "@/components/button";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
dayjs.extend(isSameOrAfter);
import { XIcon, PencilOffIcon, SaveIcon } from "lucide-react";

import { ToolBar, ToolBarButton, ToolBarButtonLabel } from "./toolbar";
import { useProcedureList } from "@/contexts/procedure-list-context";

import { ProcedureForm, validateProcedure } from "@/forms/procedure-form";
import PatientInfo from "./patient-info";
import { PacStatus } from "./pac-status";
import { useCatalogue } from "@/contexts/catalogue-context";
import {
    fromProcedureCodeRecords,
    procedureCodeRecordsOf,
    toProcedureCodesPayload,
} from "@/lib/procedure-codes";

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
    const { concepts, conceptById } = useCatalogue();

    const [updatedProcedure, setUpdatedProcedure] = useState({
        diagnosis: procedure?.diagnosis || "",
        comorbids: procedure?.comorbids || "",
        procedure: procedure?.procedure || "",
        // Null until the user edits the codes; what is stored is derived
        // below and used in the meantime.
        procedureCodes: null,
        addedDate: dayjs(procedure?.addedDate).format("YYYY-MM-DD") || "",
        addedBy: procedure?.addedBy || "",
        remarks: procedure?.remarks || "",
        duration: procedure?.duration || "",
        bed: procedure?.bed || "",
        anesthesia: procedure?.anesthesia || "",
        requirements: procedure?.requirements || "",
    });
    const [updatedProcedureErrors, setUpdatedProcedureErrors] = useState({});

    // A stored code names its concept by id, so it can only be turned back
    // into a picker value once the catalogue is in memory. Resolving against
    // an empty catalogue would leave every code blank, and saving that would
    // delete them, so this stays null - which fails validation - until there
    // is a catalogue to resolve against.
    const storedCodes = useMemo(
        () =>
            concepts.length === 0
                ? null
                : fromProcedureCodeRecords(
                      procedureCodeRecordsOf(procedure),
                      conceptById,
                  ),
        [concepts, conceptById, procedure],
    );

    // What is stored, until the user edits and the form starts owning it.
    const procedureCodes = updatedProcedure.procedureCodes ?? storedCodes;
    const codesLoaded = procedureCodes !== null;
    const formValue = { ...updatedProcedure, procedureCodes };

    const handleUpdateProcedure = () => {
        const inputErrors = validateProcedure(formValue);

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
            procedureCodes: toProcedureCodesPayload(procedureCodes),
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
                className,
            )}
        >
            <ToolBar className={twMerge("col-span-4 bg-gray-200")}>
                <ToolBarButton title="Save" onClick={handleUpdateProcedure}>
                    <SaveIcon width={16} height={16} />
                    <ToolBarButtonLabel>Save</ToolBarButtonLabel>
                </ToolBarButton>
                <ToolBarButton title="Discard" onClick={onDiscard}>
                    <PencilOffIcon
                        className="text-red-400"
                        width={16}
                        height={16}
                    />
                    <ToolBarButtonLabel>Discard</ToolBarButtonLabel>
                </ToolBarButton>
                <div className="grow"></div>
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
                {!codesLoaded && (
                    <p className="p-2 text-sm text-gray-500">
                        Loading procedure codes...
                    </p>
                )}
                <ProcedureForm
                    value={formValue}
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
