import { useState } from "react";
import dayjs from "dayjs";
import { formateDateLong } from "@/utils/dates";
import {
    EditIcon,
    MoveUpIcon,
    MoveDownIcon,
    XIcon,
    TrashIcon,
    CalendarArrowDownIcon,
    UndoDotIcon,
    UserPenIcon,
    CopyIcon,
    CopyCheckIcon,
} from "lucide-react";
import { twMerge } from "tailwind-merge";

import LabelValue from "./label-value";
import { useProcedureList } from "@/contexts/procedure-list-context";
import { ToolBar, ToolBarButton, ToolBarButtonLabel } from "./toolbar";
import { PacStatus } from "./pac-status";
import ModalWindow from "@/modals/modal-window";
import EditPatientModal from "@/modals/edit-patient-modal";

/**
 * ProcedureView - Detailed view of a procedure with action toolbar
 *
 * Displays full procedure details with toolbar for editing, moving, copying,
 * removing/restoring procedures, and editing patient information.
 * Manages local state for confirmation dialogs and patient editing.
 *
 * @param {Object} procedure - Procedure object with expanded patient and details
 * @param {function} onMoveUp - Callback to move procedure up in order
 * @param {function} onMoveDown - Callback to move procedure down in order
 * @param {function} onRestore - Callback to restore a removed procedure
 * @param {function} onMoveDate - Callback to move procedure to different date
 * @param {function} onSelected - Callback when procedure selection changes
 * @param {function} setEditing - Callback to enable editing mode
 * @param {function} onRemove - Callback to remove/mark procedure as removed
 * @param {Object} recordError - Error object for this procedure if any
 */
function ProcedureView({
    procedure,
    onMoveUp,
    onMoveDown,
    onRestore,
    onMoveDate,
    onSelected,
    setEditing,
    onRemove,
    recordError,
}) {
    const { isBusy, reloadProcedure } = useProcedureList();

    const [confirmRemove, setConfirmRemove] = useState(false);
    const [editingPatient, setEditingPatient] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopyAdvice = () => {
        const adviceText = `${procedure?.procedure} for ${procedure?.diagnosis} on ${formateDateLong(procedure?.expand?.procedureDay?.date)} in ${procedure?.expand?.procedureDay?.expand?.otList?.name}`;
        // Copy to clipboard
        navigator.clipboard
            .writeText(adviceText)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch((err) => {
                console.error("Failed to copy advice: ", err);
            });
    };

    return (
        <div className="bg-gray-100">
            <ToolBar
                className={twMerge("col-span-4 bg-gray-200 transition-colors")}
            >
                {!procedure.removed && (
                    <>
                        <ToolBarButton
                            title="Move Up"
                            disabled={isBusy()}
                            onClick={() => onMoveUp(procedure)}
                        >
                            <MoveUpIcon className="" width={16} height={16} />
                        </ToolBarButton>
                        <ToolBarButton
                            title="Move Down"
                            disabled={isBusy()}
                            onClick={() => onMoveDown(procedure)}
                        >
                            <MoveDownIcon className="" width={16} height={16} />
                        </ToolBarButton>
                    </>
                )}
                <ToolBarButton
                    title="Edit OT Procedure"
                    disabled={isBusy()}
                    onClick={() => setEditing(true)}
                >
                    <EditIcon className="" width={16} height={16} />
                    <ToolBarButtonLabel className="hidden sm:inline">
                        Edit
                    </ToolBarButtonLabel>
                </ToolBarButton>
                <ToolBarButton
                    title="Move OT Procedure"
                    disabled={isBusy()}
                    onClick={() => onMoveDate(procedure)}
                >
                    <CalendarArrowDownIcon width={16} height={16} />
                    <ToolBarButtonLabel className="hidden sm:inline">
                        Move
                    </ToolBarButtonLabel>
                </ToolBarButton>
                <ToolBarButton
                    title="Copy Advice"
                    disabled={isBusy()}
                    onClick={handleCopyAdvice}
                >
                    <CopyCheckIcon
                        width={16}
                        height={16}
                        className={copied ? "text-green-500" : "hidden"}
                    />

                    <CopyIcon
                        width={16}
                        height={16}
                        className={copied ? "hidden" : "inline"}
                    />

                    <ToolBarButtonLabel className="hidden sm:inline">
                        Copy
                    </ToolBarButtonLabel>
                </ToolBarButton>
                {!procedure.removed ? (
                    <ToolBarButton
                        title="Remove OT Procedure"
                        disabled={isBusy()}
                        onClick={() => setConfirmRemove(true)}
                    >
                        <TrashIcon
                            className="text-red-400"
                            width={16}
                            height={16}
                        />
                        <ToolBarButtonLabel className="hidden sm:inline">
                            Remove
                        </ToolBarButtonLabel>
                    </ToolBarButton>
                ) : (
                    <ToolBarButton
                        title="Restore OT Procedure"
                        disabled={isBusy()}
                        onClick={() => onRestore(procedure)}
                    >
                        <UndoDotIcon width={16} height={16} />
                        <ToolBarButtonLabel>Restore</ToolBarButtonLabel>
                    </ToolBarButton>
                )}
                <ToolBarButton
                    title="Edit Patient Info"
                    disabled={isBusy()}
                    onClick={() => setEditingPatient(true)}
                >
                    <UserPenIcon className="" width={16} height={16} />
                    <ToolBarButtonLabel className="hidden sm:inline">
                        Edit Patient
                    </ToolBarButtonLabel>
                </ToolBarButton>
                <div className="grow"></div>
                <ToolBarButton
                    title="close"
                    disabled={false}
                    onClick={() => onSelected(null)}
                >
                    <XIcon className="" width={16} height={16} />
                </ToolBarButton>
            </ToolBar>
            {!!recordError && (
                <div className="bg-red-400/20 rounded-md m-2 p-2 text-sm">
                    {recordError?.message}
                </div>
            )}
            {procedure.removed && (
                <div className="bg-red-400/20 rounded-md m-2 p-2 text-sm">
                    Removed
                </div>
            )}
            <PacStatus procedureId={procedure?.id} className="p-2" />
            <div className=" p-2 grid grid-cols-1 md:grid-cols-4 gap-2">
                <LabelValue
                    className="md:col-span-2"
                    label="Diagnosis"
                    value={procedure.diagnosis}
                />
                <LabelValue
                    className="md:col-span-2"
                    label="Procedure"
                    value={procedure.procedure}
                />
                <LabelValue
                    className="md:col-span-4"
                    label="Comorbidities"
                    value={procedure.comorbids}
                />
                <LabelValue
                    label="Anesthesia"
                    value={procedure.anesthesia}
                    className="md:col-span-1"
                />
                <LabelValue
                    label="Expected Duration (minutes)"
                    value={procedure.duration}
                    className="md:col-span-1"
                />
                <LabelValue
                    className="md:col-span-1"
                    label="Added By"
                    value={procedure?.expand?.addedBy?.name}
                />
                <LabelValue
                    className="md:col-span-1"
                    label="Added Date"
                    value={dayjs(procedure.addedDate).format("DD MMM YYYY")}
                />
                <LabelValue label="Admitted Bed" value={procedure.bed} />
                <LabelValue
                    className="md:col-span-full"
                    label="Remarks"
                    value={procedure.remarks}
                />
                <LabelValue
                    className="md:col-span-full"
                    label="Special Requirements"
                    value={procedure.requirements}
                />
            </div>
            {!!confirmRemove && (
                <ModalWindow
                    title="Remove Procedure"
                    okLabel="Remove"
                    onOk={() => {
                        onRemove(procedure);
                        setConfirmRemove(false);
                    }}
                    onCancel={() => {
                        setConfirmRemove(false);
                    }}
                >
                    <p className="mb-2">
                        {procedure?.expand?.patient?.nid}{" "}
                        {procedure?.expand?.patient?.name} planned for{" "}
                        {procedure.procedure} on{" "}
                        {dayjs(procedure?.expand?.procedureDay.date).format(
                            "DD MMM YYYY",
                        )}
                    </p>
                    <p>Remove the selected procedure?</p>
                </ModalWindow>
            )}
            {editingPatient && (
                <EditPatientModal
                    patient={procedure?.expand?.patient}
                    onCancel={() => setEditingPatient(false)}
                    onSuccess={() => {
                        setEditingPatient(false);
                        reloadProcedure(procedure.id);
                    }}
                />
            )}
        </div>
    );
}

export default ProcedureView;
