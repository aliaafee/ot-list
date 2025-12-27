import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";

import ModalWindow from "./modal-window";
import { pb } from "@/lib/pb";
import { useAuth } from "@/contexts/auth-context";
import { getStatusColor } from "@/utils/colours";

/**
 * AddPacStatusModal - Modal for adding a PAC status to a procedure
 * @param {Function} onCancel - Callback when modal is cancelled
 * @param {Function} onSuccess - Callback when PAC status is successfully added
 * @param {string} procedureId - ID of the procedure to add PAC status to
 */
function AddPacStatusModal({
    onCancel = () => {},
    onSuccess = () => {},
    procedureId,
}) {
    const [selectedStatus, setSelectedStatus] = useState("");
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState("");
    const { user } = useAuth();

    const statusOptions = [
        {
            value: "referred",
            label: "Referred",
            description: "Patient referred to Preanesthetic Clinic",
        },
        {
            value: "inReview",
            label: "In Review",
            description: "Patient is currently under review at PAC",
        },
        {
            value: "cleared",
            label: "Cleared",
            description: "Patient has been cleared for surgery",
        },
        {
            value: "unfit",
            label: "Unfit",
            description: "Patient deemed unfit for surgery at this time",
        },
    ];

    const handleAddPacStatus = async () => {
        if (!selectedStatus) {
            setError("Please select a status");
            return;
        }

        setAdding(true);
        setError("");

        try {
            console.log(
                "Adding PAC status:",
                selectedStatus,
                "for procedure:",
                procedureId
            );

            const newStatus = await pb
                .collection("procedurePacStatuses")
                .create({
                    procedure: procedureId,
                    creator: user.id,
                    pacStatus: selectedStatus,
                });

            const updatedProcedure = await pb
                .collection("procedures")
                .update(procedureId, {
                    pacStatus: selectedStatus,
                });

            setAdding(false);
            onSuccess(newStatus, updatedProcedure);
        } catch (e) {
            console.error("Failed to add PAC status:", e);
            setError(e.message || "Failed to add PAC status");
            setAdding(false);
        }
    };

    return (
        <ModalWindow
            title="Add PAC Status"
            okLabel="Add"
            onOk={handleAddPacStatus}
            onCancel={onCancel}
            icon={<PlusIcon width={24} height={24} />}
            iconColor="bg-green-100 text-green-600"
            okColor="bg-green-600 hover:bg-green-500"
            loading={adding}
            okDisabled={!selectedStatus}
        >
            <div className="space-y-3">
                <p className="text-sm text-gray-600">
                    Select the PAC status to add:
                </p>
                <div className="grid grid-cols-1 gap-2">
                    {statusOptions.map((option) => (
                        <label
                            key={option.value}
                            className={twMerge(
                                "flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all",
                                selectedStatus === option.value
                                    ? "border-green-500 bg-green-50"
                                    : "border-gray-200 hover:border-gray-300"
                            )}
                        >
                            <input
                                type="radio"
                                name="pacStatus"
                                value={option.value}
                                checked={selectedStatus === option.value}
                                onChange={(e) =>
                                    setSelectedStatus(e.target.value)
                                }
                                className="mr-3"
                            />
                            <span
                                className={twMerge(
                                    "inline-flex items-center px-3 py-1 rounded-lg text-sm border whitespace-nowrap",
                                    getStatusColor(option.value)
                                )}
                            >
                                {option.label}
                            </span>
                            <span className="ml-4 text-sm ">
                                {option.description}
                            </span>
                        </label>
                    ))}
                </div>
            </div>
            {!!error && (
                <div className="bg-red-400/20 rounded-md mt-2 py-1 px-2">
                    {error}
                </div>
            )}
        </ModalWindow>
    );
}

export default AddPacStatusModal;
