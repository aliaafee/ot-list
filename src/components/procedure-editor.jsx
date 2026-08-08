import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import Button from "@/components/button";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
dayjs.extend(isSameOrAfter);
import { XIcon, PencilOffIcon, SaveIcon } from "lucide-react";

import { ToolBar, ToolBarButton, ToolBarButtonLabel } from "./toolbar";
import { useProcedureList } from "@/contexts/procedure-list-context";

import { ProcedureForm, validateProcedure } from "@/forms/procedure-form";
import { useCatalogue } from "@/contexts/catalogue-context";
import { procedureName } from "@/lib/nspc";
import {
    buildProcedureCodeBody,
    loadProcedureCode,
} from "@/lib/procedure-codes";
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
    const { findById } = useCatalogue();

    const [updatedProcedure, setUpdatedProcedure] = useState({
        diagnosis: procedure?.diagnosis || "",
        comorbids: procedure?.comorbids || "",
        // The name as it currently reads, from the code row or - for a
        // procedure older than the coding system - from the legacy
        // column. Either way it starts as free text; the effect below
        // swaps in the catalogue selection if there is one to restore.
        procedure: procedureName(procedure),
        addedDate: dayjs(procedure?.addedDate).format("YYYY-MM-DD") || "",
        addedBy: procedure?.addedBy || "",
        remarks: procedure?.remarks || "",
        duration: procedure?.duration || "",
        bed: procedure?.bed || "",
        anesthesia: procedure?.anesthesia || "",
        requirements: procedure?.requirements || "",
        procedureCode: null,
    });
    const [updatedProcedureErrors, setUpdatedProcedureErrors] = useState({});

    // The stored code lives in its own collection, so it is fetched
    // rather than read off the procedure record. It arrives after first
    // paint; the rest of the form is editable meanwhile, and a code the
    // user picks in that window is not overwritten.
    useEffect(() => {
        if (!procedure?.id) return;
        let cancelled = false;

        (async () => {
            try {
                const code = await loadProcedureCode(procedure.id, findById);
                if (cancelled || !code) return;
                setUpdatedProcedure((current) =>
                    current.procedureCode
                        ? current
                        : { ...current, procedureCode: code },
                );
            } catch {
                // Leave the code field empty - the procedure itself is
                // still perfectly editable without it.
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [procedure?.id, findById]);

    const handleUpdateProcedure = async () => {
        const inputErrors = validateProcedure(updatedProcedure);

        setUpdatedProcedureErrors(inputErrors);

        if (Object.keys(inputErrors).length > 0) {
            return;
        }

        // Resolving the code to its record body needs the catalogue id
        // maps, so it can fail on its own - before anything is written,
        // which is the point. `procedureCode` travels with the procedure
        // from here on and the two are saved in one transaction.
        let procedureCode;
        try {
            procedureCode = await buildProcedureCodeBody(
                updatedProcedure.procedureCode ?? updatedProcedure.procedure,
            );
        } catch (e) {
            console.error("Failed to resolve procedure code:", e);
            setUpdatedProcedureErrors({
                procedure: {
                    name: "procedure",
                    message:
                        "Could not resolve this procedure against the catalogue. Try again.",
                },
            });
            return;
        }

        // No `procedure` key: the name is on the code row now, and that
        // column belongs to the records that predate it.
        const updatedProcedureRecord = {
            id: procedure.id,
            addedBy: updatedProcedure.addedBy,
            addedDate: updatedProcedure.addedDate,
            anesthesia: updatedProcedure.anesthesia,
            bed: updatedProcedure.bed,
            comorbids: updatedProcedure.comorbids,
            diagnosis: updatedProcedure.diagnosis,
            duration: updatedProcedure.duration,
            remarks: updatedProcedure.remarks,
            removed: updatedProcedure.removed,
            requirements: updatedProcedure.requirements,
            procedureCode,
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
