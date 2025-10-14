import { useState } from "react";
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
} from "lucide-react";

import { age } from "@/utils/dates";
import LabelValue from "./label-value";
import { ToolBar, ToolBarButton, ToolBarButtonLabel } from "./toolbar";
import { useProcedureList } from "@/contexts/procedure-list-context";
import ProcedureEditor from "./procedure-editor";

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
        isBusy,
        getProcedureError,
        otDay,
    } = useProcedureList();

    const recordError = getProcedureError(procedure);
    const [editing, setEditing] = useState(false);

    const SimplifiedView = () => {
        return (
            <div
                className={twMerge(
                    "transition-colors flex-auto p-2 grid grid-cols-8 lg:grid-cols-12 cursor-pointer gap-1 rounded-lg md:rounded-l-none",
                    isUpdating(procedure) ? "animate-pulse" : "",
                    !!procedure.removed && "line-through",
                    !!recordError && "bg-red-200",
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
                    value={procedure.expand.patient.nid}
                    className="col-span-2 lg:col-span-1"
                />
                <LabelValue
                    className="col-span-2 lg:col-span-3"
                    // label="Name"
                    value={procedure.expand.patient.name}
                />
                <LabelValue
                    // label="Age/Sex"
                    value={`${age(procedure.expand.patient.dateOfBirth)} / ${
                        procedure.expand.patient.sex[0]
                    }`}
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
            </div>
        );
    };

    const ExpandedView = () => {
        return (
            <div
                className={twMerge(
                    "flex-auto",
                    isUpdating(procedure) ? "animate-pulse" : "",
                    className
                )}
            >
                <ToolBar
                    className={twMerge(
                        "col-span-4 bg-gray-200 rounded-tr-lg rounded-tl-lg md:rounded-tl-none transition-colors"
                    )}
                >
                    <ToolBarButton disabled={true}>
                        <ToolBarButtonLabel className={"min-w-0"}>
                            {!procedure.removed ? procedure.order : <>&nbsp;</>}
                        </ToolBarButtonLabel>
                    </ToolBarButton>
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
                            onClick={() => onRemove(procedure)}
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
                <div className=" p-2 grid grid-cols-1 md:grid-cols-4 gap-2">
                    {/* <LabelValue label="ID" value={row.id} /> */}
                    <LabelValue
                        label="NID"
                        value={procedure.expand.patient.nid}
                    />
                    <LabelValue
                        label="Hospital ID"
                        value={procedure.expand.patient.hospitalId}
                        className="md:col-span-2"
                    />
                    <LabelValue
                        label="Phone"
                        value={procedure.expand.patient.phone}
                    />
                    <LabelValue
                        className="md:col-span-2"
                        label="Name"
                        value={procedure.expand.patient.name}
                    />
                    <LabelValue
                        label="Age"
                        value={age(procedure.expand.patient.dateOfBirth)}
                    />
                    <LabelValue
                        label="Sex"
                        value={procedure.expand.patient.sex}
                    />

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
                        value={procedure.expand.addedBy.name}
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
            </div>
        );
    };

    if (editing) {
        return (
            <ProcedureEditor
                procedure={procedure}
                className={className}
                onDiscard={() => {
                    setEditing(false);
                }}
                onClose={() => {
                    setEditing(false);
                    if (proceduresList.selected === procedure.id) {
                        setSelected(null);
                    }
                }}
                onAfterSave={() => {
                    setEditing(false);
                }}
            />
        );
    }

    if (proceduresList.selected === procedure.id) {
        return <ExpandedView />;
    }

    return <SimplifiedView />;
}

export default ProcedureItem;
