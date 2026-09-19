import { useState } from "react";
import { ClipboardPasteIcon, UserPenIcon } from "lucide-react";
import ModalWindow from "./modal-window";
import { PatientForm, validatePatient } from "@/forms/patient-form";
import { pb } from "@/lib/pb";
import dayjs from "dayjs";
import {
    ToolBar,
    ToolBarButton,
    ToolBarButtonLabel,
    ToolBarTitle,
} from "@/components/toolbar";
import { patientInfoFromText } from "@/utils/text-parsers";

/**
 * EditPatientModal - Modal for editing patient information
 * @param {Object} patient - Patient object to edit
 * @param {Function} onCancel - Callback when modal is cancelled
 * @param {Function} onSuccess - Callback with the updated patient record
 */
export default function EditPatientModal({ patient, onCancel, onSuccess }) {
    const [editedPatient, setEditedPatient] = useState({
        nid: patient?.nid || "",
        hospitalId: patient?.hospitalId || "",
        name: patient?.name || "",
        // dayjs("") formats to "Invalid Date", so only format a real value.
        dateOfBirth: patient?.dateOfBirth
            ? dayjs(patient.dateOfBirth).format("YYYY-MM-DD")
            : "",
        sex: patient?.sex || "",
        phone: patient?.phone || "",
        address: patient?.address || "",
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [updateError, setUpdateError] = useState(null);
    const [pasteError, setPasteError] = useState(null);

    const handlePastePatient = async () => {
        try {
            const text = await navigator.clipboard.readText();

            // Only overwrite fields the clipboard actually provided
            setEditedPatient((prev) => ({
                ...prev,
                ...patientInfoFromText(text),
            }));

            // Clear any previous error
            setPasteError(null);
            setUpdateError(null);
        } catch (err) {
            console.error("Failed to paste patient information:", err);
            // Show error to user
            setPasteError(
                "Failed to paste patient information. Please check the clipboard format.",
            );
        }
    };

    const handleSave = async () => {
        setUpdateError(null);

        const validationErrors = validatePatient(editedPatient);
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            return;
        }

        setLoading(true);
        try {
            const updated = await pb
                .collection("patients")
                .update(patient.id, editedPatient);
            onSuccess?.(updated);
        } catch (error) {
            console.error("Failed to update patient:", error);
            setUpdateError(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalWindow
            title="Edit Patient Information"
            icon={<UserPenIcon width={24} height={24} />}
            iconColor="bg-blue-100 text-blue-600"
            okColor="bg-blue-600 hover:bg-blue-500"
            okLabel="Save"
            cancelLabel="Cancel"
            onOk={handleSave}
            onCancel={onCancel}
            loading={loading}
            large={true}
        >
            <div className="mt-2">
                {updateError && (
                    <div className="bg-red-400/20 rounded-md mb-2 p-2 text-sm">
                        Failed to update patient:{" "}
                        {updateError?.message || "Unknown error"}
                    </div>
                )}
                {pasteError && (
                    <div className="bg-red-400/20 rounded-md mb-2 p-2 text-sm">
                        {pasteError}
                    </div>
                )}
                <ToolBar className="w-full flex-wrap sm:flex-nowrap">
                    <div className="grow"></div>

                    <ToolBarButton
                        title="Paste Patient Details from Clipboard"
                        onClick={handlePastePatient}
                    >
                        <ClipboardPasteIcon
                            className=""
                            width={16}
                            height={16}
                        />
                        <ToolBarButtonLabel>Paste</ToolBarButtonLabel>
                    </ToolBarButton>
                </ToolBar>
                <PatientForm
                    value={editedPatient}
                    onChange={setEditedPatient}
                    errorFields={{
                        ...errors,
                        ...updateError?.response?.data,
                    }}
                />
            </div>
        </ModalWindow>
    );
}
