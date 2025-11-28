import { useState } from "react";
import { UserPenIcon } from "lucide-react";
import ModalWindow from "./modal-window";
import { PatientForm, validatePatient } from "@/forms/patient-form";
import { pb } from "@/lib/pb";
import dayjs from "dayjs";

export default function EditPatientModal({ patient, onCancel, onSuccess }) {
    const [editedPatient, setEditedPatient] = useState({
        nid: patient?.nid || "",
        hospitalId: patient?.hospitalId || "",
        name: patient?.name || "",
        dateOfBirth: dayjs(patient?.dateOfBirth).format("YYYY-MM-DD") || "",
        sex: patient?.sex || "",
        phone: patient?.phone || "",
        address: patient?.address || "",
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [updateError, setUpdateError] = useState(null);

    const handleSave = async () => {
        setUpdateError(null);

        const validationErrors = validatePatient(editedPatient);
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            return;
        }

        setLoading(true);
        try {
            await pb.collection("patients").update(patient.id, editedPatient);
            onSuccess?.();
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
        >
            <div className="mt-2">
                {updateError && (
                    <div className="bg-red-400/20 rounded-md mb-2 p-2 text-sm">
                        Failed to update patient:{" "}
                        {updateError?.message || "Unknown error"}
                    </div>
                )}
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
