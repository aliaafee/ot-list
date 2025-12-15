import { useState } from "react";
import {
    XIcon,
    ClipboardPasteIcon,
    SearchIcon,
    UserPlusIcon,
    CameraIcon,
} from "lucide-react";
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
    patientInfoFromText,
} from "@/utils/text-parsers";
import PatientSearchModal from "@/modals/patient-search-modal";
import PatientInfo from "./patient-info";
import { LoadingSpinner } from "./loading-spinner";
import { pb } from "@/lib/pb";
import dayjs from "dayjs";
import IdCardScanModal from "@/modals/id-card-scan-modal";

function ProcedureAdder({
    operatingRoom,
    proceduresByRoom,
    onClose,
    onAfterSave,
}) {
    const { otDay, addProcedure, isBusy } = useProcedureList();
    const [newPatient, setNewPatient] = useState(initialPatientValue);
    const [newPatientErrors, setNewPatientErrors] = useState({});
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [newProcedure, setNewProcedure] = useState({
        ...initialProcedureValue,
        addedDate: dayjs().format("YYYY-MM-DD"),
    });
    const [newProcedureErrors, setNewProcedureErrors] = useState({});
    const [addError, setAddError] = useState(null);
    const [showPatientSearch, setShowPatientSearch] = useState(false);
    const [showIdCardScan, setShowIdCardScan] = useState(false);
    const [checking, setChecking] = useState(false);
    const [adding, setAdding] = useState(false);

    const handleSampleData = () => {
        const sampleData = GenerateProdecureFormData(
            otDay.expand.otList.expand.department.expand
                .activeSurgeons_via_department
        );
        if (!selectedPatient) {
            setNewPatient(sampleData);
        }
        setNewProcedure(sampleData);
    };

    const handlePastePatient = async () => {
        try {
            const text = await navigator.clipboard.readText();

            setNewPatient(patientInfoFromText(text));

            const bedNumber = bedInfoFromHINAIHeader(text);

            setNewProcedure((prev) => ({
                ...prev,
                bed: bedNumber,
            }));

            // Clear any previous error
            setAddError(null);
            setSelectedPatient(null);
        } catch (err) {
            console.error("Failed to paste patient information:", err);
            // Show error to user
            setAddError({
                message:
                    "Failed to paste patient information. Please check the clipboard format.",
            });
        }
    };

    const handleScanPatient = async () => {
        setShowIdCardScan(true);
    };

    const handleIdCardScanned = (patientInfo) => {
        // Merge scanned info with existing patient data
        setNewPatient({
            ...newPatient,
            ...patientInfo,
        });
        setShowIdCardScan(false);
        setSelectedPatient(null);
        setAddError(null);
    };

    const handleFindPatient = async () => {
        setShowPatientSearch(true);
    };

    const handleNewPatient = () => {
        setSelectedPatient(null);
        setNewPatient(initialPatientValue);
        setAddError(null);
    };

    const handlePatientSelected = (patient) => {
        setNewPatient({
            nid: patient.nid,
            hospitalId: patient.hospitalId,
            name: patient.name,
            dateOfBirth: patient.dateOfBirth,
            sex: patient.sex,
            phone: patient.phone,
            address: patient.address || "",
        });
        setSelectedPatient(patient);
        setShowPatientSearch(false);
        setAddError(null);
    };

    const handleAddProcedure = async () => {
        // Clear previous errors
        setAddError(null);

        // Validate procedure input
        const procedureInputErrors = validateProcedure(newProcedure);
        setNewProcedureErrors(procedureInputErrors);

        // Validate patient input only if creating new patient
        let patientInputErrors = {};
        if (!selectedPatient) {
            patientInputErrors = validatePatient(newPatient);
            setNewPatientErrors(patientInputErrors);
        }

        // Check for validation errors
        if (
            Object.keys(procedureInputErrors).length > 0 ||
            Object.keys(patientInputErrors).length > 0
        ) {
            return;
        }

        // Helper function to calculate next order
        const calculateNextOrder = () => {
            if (proceduresByRoom && proceduresByRoom.length > 0) {
                return proceduresByRoom[proceduresByRoom.length - 1].order + 1;
            }
            return 1;
        };

        // Helper function to build procedure object
        const buildProcedure = (order) => ({
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
            order,
        });

        try {
            let patientData;

            if (selectedPatient) {
                // Use existing patient
                patientData = selectedPatient;
            } else {
                // Check for duplicate patient
                setChecking(true);

                try {
                    const records = await pb
                        .collection("patients")
                        .getList(1, 50, {
                            filter: `nid ~ "${newPatient.nid}" || hospitalId ~ "${newPatient.hospitalId}"`,
                            sort: "-created",
                        });

                    if (records.totalItems > 0) {
                        setAddError({
                            message:
                                "A patient with the same NID or Hospital ID already exists. Please use 'Find Patient' to select the existing patient.",
                        });
                        return;
                    }
                } catch (checkError) {
                    console.error(
                        "Error checking for duplicate patient:",
                        checkError
                    );
                    setAddError({
                        message:
                            "Failed to verify patient uniqueness. Please try again.",
                    });
                    return;
                } finally {
                    setChecking(false);
                }

                // Build new patient object
                patientData = {
                    dateOfBirth: newPatient.dateOfBirth,
                    hospitalId: newPatient.hospitalId,
                    name: newPatient.name,
                    nid: newPatient.nid,
                    phone: newPatient.phone,
                    sex: newPatient.sex,
                    address: newPatient.address,
                };
            }

            // Create procedure with calculated order
            const nextOrder = calculateNextOrder();
            const procedure = buildProcedure(nextOrder);

            setAdding(true);
            // Add procedure
            const resultError = await addProcedure(
                patientData,
                procedure,
                otDay
            );
            setAdding(false);

            if (resultError) {
                setAddError(resultError);
            } else {
                onAfterSave?.();
            }
        } catch (error) {
            console.error("Unexpected error in handleAddProcedure:", error);
            setAddError({
                message: "An unexpected error occurred. Please try again.",
            });
            setChecking(false);
            setAdding(false);
        }
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

                <div className="flex-grow"></div>
                <ToolBarButton
                    title="close"
                    disabled={isBusy() || checking}
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
                <ToolBar className="bg-gray-200 rounded-lg sm:w-fit flex-wrap sm:flex-nowrap">
                    <ToolBarButton disabled={true}>Patient</ToolBarButton>

                    <ToolBarButton
                        title="New Patient"
                        disabled={isBusy() || checking}
                        onClick={handleNewPatient}
                    >
                        <UserPlusIcon className="" width={16} height={16} />
                        <ToolBarButtonLabel>New</ToolBarButtonLabel>
                    </ToolBarButton>

                    <ToolBarButton
                        title="Paste Patient Details from Clipboard"
                        disabled={isBusy() || checking}
                        onClick={handlePastePatient}
                    >
                        <ClipboardPasteIcon
                            className=""
                            width={16}
                            height={16}
                        />
                        <ToolBarButtonLabel>Paste</ToolBarButtonLabel>
                    </ToolBarButton>

                    <ToolBarButton
                        title="Find Existing Patient"
                        disabled={isBusy() || checking}
                        onClick={handleFindPatient}
                    >
                        <SearchIcon className="" width={16} height={16} />
                        <ToolBarButtonLabel>Find</ToolBarButtonLabel>
                    </ToolBarButton>

                    <ToolBarButton
                        title="Scan ID Card"
                        disabled={isBusy() || checking}
                        onClick={handleScanPatient}
                    >
                        <CameraIcon className="" width={16} height={16} />
                        <ToolBarButtonLabel>Scan</ToolBarButtonLabel>
                    </ToolBarButton>
                </ToolBar>

                {!!selectedPatient ? (
                    <PatientInfo
                        patient={newPatient}
                        showAddress={true}
                        className="p-0"
                    />
                ) : (
                    <PatientForm
                        value={newPatient}
                        onChange={(value) => setNewPatient(value)}
                        errorFields={{
                            ...newPatientErrors,
                            ...addError?.response?.data,
                        }}
                    />
                )}

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
                        disabled={isBusy() || checking}
                    >
                        {checking ? (
                            <>
                                <LoadingSpinner />{" "}
                                <span className="ml-2">Checking...</span>
                            </>
                        ) : adding ? (
                            <>
                                <LoadingSpinner />{" "}
                                <span className="ml-2">Adding...</span>
                            </>
                        ) : (
                            "Save"
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={handleSampleData}
                        className="mt-3 sm:ml-3 sm:mt-0 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50 sm:w-auto"
                        disabled={isBusy() || checking}
                    >
                        Generate Sample
                    </button>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="mt-3 sm:mt-0 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50  sm:w-auto"
                        disabled={isBusy() || checking}
                    >
                        Cancel
                    </button>
                </div>
            </div>
            {showPatientSearch && (
                <PatientSearchModal
                    onSelect={handlePatientSelected}
                    onCancel={() => setShowPatientSearch(false)}
                />
            )}
            {showIdCardScan && (
                <IdCardScanModal
                    onComplete={handleIdCardScanned}
                    onCancel={() => setShowIdCardScan(false)}
                />
            )}
        </div>
    );
}

export default ProcedureAdder;
