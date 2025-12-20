import { useState } from "react";
import { useSearchParams } from "react-router";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
dayjs.extend(isSameOrAfter);
import {
    EditIcon,
    MoveUpIcon,
    MoveDownIcon,
    XIcon,
    TrashIcon,
    CalendarArrowDownIcon,
    UndoDotIcon,
    UserPenIcon,
    ChevronRight,
} from "lucide-react";

import { age } from "@/utils/dates";
import LabelValue from "./label-value";
import {
    ToolBar,
    ToolBarButton,
    ToolBarButtonLabel,
    ToolBarPill,
    ToolBarTitle,
} from "./toolbar";
import { useProcedureList } from "@/contexts/procedure-list-context";
import ProcedureEditor from "./procedure-editor";
import ModalWindow from "@/modals/modal-window";
import { JSONTree } from "react-json-tree";
import ProcedureComments from "./procedure-comments";
import PatientInfo from "./patient-info";
import EditPatientModal from "@/modals/edit-patient-modal";
import { PacStatus, PacStatusSmall } from "./pac-status";

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
}) {
    const {
        proceduresList,
        setSelected,
        isUpdating,
        getUpdateError,
        isBusy,
        getProcedureError,
        discardProcedureUpdate,
        reloadProcedure,
        otDay,
    } = useProcedureList();

    const recordError = getProcedureError(procedure);
    const [editing, setEditing] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [editingPatient, setEditingPatient] = useState(false);
    const [showPatientDetails, setShowPatientDetails] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();

    const selectedProcedureId = searchParams.get("procedureId");

    const SimplifiedView = () => {
        return (
            <div
                className={twMerge(
                    "flex-auto p-2 grid grid-cols-10 lg:grid-cols-14 cursor-pointer gap-1 rounded-lg md:rounded-l-none",
                    isUpdating(procedure) ? "animate-pulse" : "",
                    !!procedure.removed && "line-through",
                    className
                )}
                onClick={() => setSelected(procedure.id)}
            >
                <LabelValue
                    value={!procedure.removed && procedure.order}
                    blank={<>&nbsp;</>}
                />
                <LabelValue
                    // label="NID"
                    value={procedure?.expand?.patient?.nid}
                    className="col-span-2 lg:col-span-2"
                />
                <LabelValue
                    className="col-span-2 lg:col-span-2"
                    // label="Name"
                    value={procedure?.expand?.patient?.name}
                />
                <LabelValue
                    // label="Age/Sex"
                    value={`${
                        !!procedure?.expand?.patient?.dateOfBirth
                            ? age(procedure?.expand?.patient?.dateOfBirth)
                            : "-"
                    } / ${procedure?.expand?.patient?.sex[0].toUpperCase()}`}
                    className="col-span-1 hidden lg:inline"
                />
                <LabelValue
                    className="col-span-3 hidden lg:inline"
                    // label="Diagnosis"
                    value={procedure.diagnosis}
                />
                <LabelValue
                    className="col-span-3"
                    // label="Procedure"
                    value={procedure.procedure}
                />
                <div className="col-span-2">
                    <PacStatusSmall status={"cleared"} />
                </div>
            </div>
        );
    };

    const ExpandedView = ({ children }) => {
        return (
            <div
                className={twMerge(
                    "flex-auto selected  rounded-lg",
                    isUpdating(procedure) ? "animate-pulse" : "",
                    className
                )}
            >
                <div
                    className={twMerge(
                        "flex-auto p-2 grid grid-cols-10 lg:grid-cols-14 cursor-pointer gap-1 rounded-lg md:rounded-l-none",
                        !!procedure.removed && "line-through"
                    )}
                    onClick={() => setSelected(null)}
                >
                    <LabelValue
                        value={!procedure.removed && procedure.order}
                        blank={<>&nbsp;</>}
                        className="font-medium"
                    />
                    <LabelValue
                        // label="NID"
                        value={procedure?.expand?.patient?.nid}
                        className="col-span-2 lg:col-span-2 font-medium"
                    />
                    <LabelValue
                        className="col-span-2 lg:col-span-2 font-medium"
                        // label="Name"
                        value={procedure?.expand?.patient?.name}
                    />
                    <LabelValue
                        // label="Age/Sex"
                        value={`${
                            !!procedure?.expand?.patient?.dateOfBirth
                                ? age(procedure?.expand?.patient?.dateOfBirth)
                                : "-"
                        } / ${procedure?.expand?.patient?.sex[0].toUpperCase()}`}
                        className="col-span-1 hidden lg:inline font-medium"
                    />
                    <LabelValue
                        className="col-span-3 hidden lg:inline font-medium"
                        // label="Diagnosis"
                        value={procedure.diagnosis}
                    />
                    <LabelValue
                        className="col-span-3 font-medium"
                        // label="Procedure"
                        value={procedure.procedure}
                    />
                    <div className="col-span-2">
                        <PacStatusSmall status={"cleared"} />
                    </div>
                </div>
                <div
                    className="flex items-center cursor-pointer md:hidden p-2"
                    onClick={() => setShowPatientDetails(!showPatientDetails)}
                >
                    <ChevronRight
                        width={16}
                        height={16}
                        className={twMerge(
                            "transition-transform",
                            showPatientDetails && "rotate-90"
                        )}
                    />{" "}
                    Patient Details
                </div>
                <div
                    className={twMerge(
                        "p-2 grid grid-cols-1 md:grid-cols-14 gap-2",
                        !showPatientDetails && "hidden md:grid"
                    )}
                >
                    <div className="hidden md:inline-block"></div>
                    <LabelValue
                        label="Hospital ID"
                        value={procedure?.expand?.patient?.hospitalId}
                        className="col-span-1 md:col-span-3"
                    />
                    <LabelValue
                        label="Phone"
                        value={procedure?.expand?.patient?.phone}
                        className="col-span-1 md:col-span-2"
                    />
                    <LabelValue
                        label="Address"
                        value={procedure?.expand?.patient?.address}
                        className="col-span-1 md:col-span-7"
                    />
                </div>
                {children}
            </div>
        );
    };

    const ProcedureView = () => {
        return (
            <div className="bg-gray-100 rounded-lg">
                <ToolBar
                    className={twMerge(
                        "col-span-4 bg-gray-200 rounded-tr-lg rounded-tl-lg transition-colors"
                    )}
                >
                    {!procedure.removed && (
                        <>
                            <ToolBarButton
                                title="Move Up"
                                disabled={isBusy()}
                                onClick={() => onMoveUp(procedure)}
                            >
                                <MoveUpIcon
                                    className=""
                                    width={16}
                                    height={16}
                                />
                            </ToolBarButton>
                            <ToolBarButton
                                title="Move Down"
                                disabled={isBusy()}
                                onClick={() => onMoveDown(procedure)}
                            >
                                <MoveDownIcon
                                    className=""
                                    width={16}
                                    height={16}
                                />
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
                    <div className="flex-grow"></div>
                    <ToolBarButton
                        title="close"
                        disabled={false}
                        onClick={() => setSelected(null)}
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
                <ProcedureComments procedureId={procedure.id} />
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
                                "DD MMM YYYY"
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
    };

    if (recordError?.type === "update") {
        return (
            <ExpandedView>
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
            </ExpandedView>
        );
    }

    if (editing) {
        return (
            <ExpandedView>
                <ProcedureEditor
                    procedure={procedure}
                    className={className}
                    onDiscard={() => {
                        setEditing(false);
                    }}
                    onClose={() => {
                        setEditing(false);
                        if (selectedProcedureId === procedure.id) {
                            setSelected(null);
                        }
                    }}
                    onAfterSave={() => {
                        setEditing(false);
                    }}
                />
            </ExpandedView>
        );
    }

    if (procedure.id === selectedProcedureId) {
        return (
            <ExpandedView>
                <ProcedureView />
            </ExpandedView>
        );
    }

    return <SimplifiedView />;
}

export default ProcedureItem;
