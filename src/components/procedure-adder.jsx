import { useState } from "react";
import { XIcon, ClipboardPasteIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";

import { ToolBar, ToolBarButton, ToolBarButtonLabel } from "./toolbar";
import {
    ProcedureForm,
    initialProcedureValue,
    validateProcedure,
} from "@/forms/procedure-form";
import {
    initialPatientValue,
    PatientForm,
    validatePatient,
} from "@/forms/patient-form";
import { useProcedureList } from "@/contexts/procedure-list-context";
import { GenerateProdecureFormData } from "@/utils/sample-data";
import {
    bedInfoFromHINAIHeader,
    patientInfoFromHINAIHeader,
} from "@/utils/test-parsers";

function ProcedureAdder({
    operatingRoom,
    proceduresByRoom,
    onClose,
    onAfterSave,
}) {
    const { otDay, addProcedure, isBusy } = useProcedureList();
    const [newPatient, setNewPatient] = useState(initialPatientValue);
    const [newPatientErrors, setNewPatientErrors] = useState({});
    const [newProcedure, setNewProcedure] = useState(initialProcedureValue);
    const [newProcedureErrors, setNewProcedureErrors] = useState({});
    const [addError, setAddError] = useState(null);

    const handleSampleData = () => {
        const sampleData = GenerateProdecureFormData(
            otDay.expand.otList.expand.department.expand
                .activeSurgeons_via_department
        );
        setNewPatient(sampleData);
        setNewProcedure(sampleData);
    };

    const handlePastePatient = async () => {
        try {
            const text = await navigator.clipboard.readText();

            setNewPatient(patientInfoFromHINAIHeader(text));

            const bedNumber = bedInfoFromHINAIHeader(text);

            setNewProcedure((prev) => ({
                ...prev,
                bed: bedNumber,
            }));
        } catch (err) {
            console.error("Failed to read clipboard:", err);
            // Optionally show error to user
        }
    };

    const handleAddProcedure = () => {
        setAddError(null);

        const procedureInputErrors = validateProcedure(newProcedure);
        const patientInputErrors = validatePatient(newPatient);

        setNewProcedureErrors(procedureInputErrors);
        setNewPatientErrors(patientInputErrors);

        if (
            Object.keys(procedureInputErrors).length > 0 ||
            Object.keys(patientInputErrors).length > 0
        ) {
            return;
        }

        const patient = {
            address: "",
            dateOfBirth: newPatient.dateOfBirth,
            hospitalId: newPatient.hospitalId,
            name: newPatient.name,
            nid: newPatient.nid,
            phone: newPatient.phone,
            sex: newPatient.sex,
            address: newPatient.address,
        };

        let nextOrder = 1;
        if (proceduresByRoom && proceduresByRoom.length > 0) {
            nextOrder = proceduresByRoom[proceduresByRoom.length - 1].order + 1;
        }

        const procedure = {
            addedBy: newProcedure.addedBy,
            addedDate: newProcedure.addedDate,
            anesthesia: newProcedure.anesthesia,
            bed: newProcedure.bed,
            comorbids: newProcedure.comorbids,
            diagnosis: newProcedure.diagnosis,
            duration: newProcedure.duration,
            operatingRoom: operatingRoom.id,
            procedure: newProcedure.procedure,
            procedureDay: otDay.id,
            remarks: newProcedure.remarks,
            removed: newProcedure.removed,
            requirements: newProcedure.requirements,
            order: nextOrder,
        };

        (async () => {
            const resultError = await addProcedure(patient, procedure, otDay);
            if (resultError) {
                setAddError(resultError);
            } else {
                onAfterSave?.();
            }
        })();
    };

    const handleCancel = () => {
        setAddError(null);
        setNewProcedureErrors({});
        setNewPatientErrors({});
        onClose();
    };

    return (
        <div className={twMerge("flex-auto bg-gray-100 rounded-lg mt-2")}>
            <ToolBar
                className={twMerge(
                    "col-span-4 bg-gray-200 rounded-t-lg transition-colors"
                )}
            >
                <ToolBarButton disabled={true}>Add OT Procedure</ToolBarButton>

                <ToolBarButton
                    title="Paste Patient Details from Clipboard"
                    disabled={isBusy()}
                    onClick={handlePastePatient}
                >
                    <ClipboardPasteIcon className="" width={16} height={16} />
                    <ToolBarButtonLabel>
                        Paste Patient Information
                    </ToolBarButtonLabel>
                </ToolBarButton>

                <div className="flex-grow"></div>
                <ToolBarButton
                    title="close"
                    disabled={isBusy()}
                    onClick={handleCancel}
                >
                    <XIcon className="" width={16} height={16} />
                </ToolBarButton>
            </ToolBar>
            {addError?.message && (
                <div className="bg-red-400/20 rounded-md m-2 p-2 text-sm">
                    {addError.message}
                </div>
            )}
            <div className="p-2 flex flex-col gap-2">
                <PatientForm
                    value={newPatient}
                    onChange={(value) => setNewPatient(value)}
                    errorFields={{
                        ...newPatientErrors,
                        ...addError?.response?.data,
                    }}
                />
                <ProcedureForm
                    value={newProcedure}
                    onChange={(value) => setNewProcedure(value)}
                    surgeons={
                        otDay.expand.otList.expand.department.expand
                            .activeSurgeons_via_department
                    }
                    errorFields={{
                        ...newProcedureErrors,
                        ...addError?.response?.data,
                    }}
                />
                <div className="sm:flex sm:flex-row-reverse col-span-full mt-3">
                    <button
                        type="button"
                        onClick={handleAddProcedure}
                        className="inline-flex w-full justify-center rounded-md  px-3 py-2 text-sm font-semibold text-white shadow-xs  sm:ml-3 sm:w-auto bg-blue-600 hover:bg-blue-500"
                    >
                        Save
                    </button>
                    <button
                        type="button"
                        onClick={handleSampleData}
                        className="mt-3 sm:ml-3 sm:mt-0 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50 sm:w-auto"
                    >
                        Generate Sample
                    </button>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="mt-3 sm:mt-0 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50  sm:w-auto"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ProcedureAdder;
