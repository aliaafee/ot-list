import { useMemo, useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import dayjs from "dayjs";

import ReorderList from "./reorder-list";
import ProcedureItem from "./procedure-item";
import { useProcedureList } from "@/contexts/procedure-list-context";
import { ToolBar, ToolBarButton, ToolBarButtonLabel } from "./toolbar";
import { twMerge } from "tailwind-merge";
import { ProcedureForm, initialProcedureValue } from "@/forms/procedure-form";
import { GenerateProdecureFormData } from "@/utils/sample-data";

function ProcedureSublist({ procedures, operatingRoom, showRemoved = true }) {
    const { otDay, isBusy, addProcedure, updateProcedures } =
        useProcedureList();
    const [showAddForm, setShowAddForm] = useState(false);
    const [newProcedure, setNewProcedure] = useState(initialProcedureValue);

    const proceduresByRoom = useMemo(
        () =>
            procedures
                .filter(
                    (procedure) => procedure.operatingRoom === operatingRoom?.id
                )
                .filter((procedure) => !procedure.removed)
                .sort((a, b) => a.order - b.order),
        [procedures, operatingRoom]
    );

    const removedProcedures = useMemo(
        () =>
            procedures
                .filter(
                    (procedure) => procedure.operatingRoom === operatingRoom?.id
                )
                .filter((procedure) => procedure.removed),
        [procedures, operatingRoom]
    );

    const handleSampleData = () => {
        setNewProcedure(
            GenerateProdecureFormData(
                otDay.expand.otList.expand.department.expand
                    .surgeons_via_department
            )
        );
    };

    const handleAddProcedure = () => {
        const patient = {
            address: "", //newProcedure.address,
            dateOfBirth: `${dayjs().year() - newProcedure.age}-01-01`, //newProcedure.dateOfBirth,
            hospitalId: newProcedure.hospitalId,
            name: newProcedure.name,
            nid: newProcedure.nid,
            phone: newProcedure.phone,
            sex: newProcedure.sex,
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
            await addProcedure(patient, procedure, otDay);
        })();

        setShowAddForm(false);
    };

    const handleChangeOrder = (newList) => {
        updateProcedures(newList);
    };

    return (
        <div>
            <div className="text-xl mt-2">{operatingRoom?.name}</div>
            <div className="grid">
                <ReorderList
                    items={proceduresByRoom}
                    itemRender={(procedure) => (
                        <ProcedureItem procedure={procedure} />
                    )}
                    itemClassName="group select-none flex bg-gray-100 rounded-lg hover:shadow-md mt-2"
                    onChange={handleChangeOrder}
                    disabled={isBusy()}
                />
                <ul>
                    {showRemoved &&
                        removedProcedures.map((procedure, index) => (
                            <li
                                key={index}
                                className="select-none flex bg-gray-100 rounded-lg hover:shadow-md mt-2"
                            >
                                <div className="p-2 hidden md:block">
                                    <span className="invisible">⠿</span>
                                </div>
                                <div className="grow">
                                    <ProcedureItem procedure={procedure} />
                                </div>
                            </li>
                        ))}
                </ul>
                <div>
                    {showAddForm && (
                        <div
                            className={twMerge(
                                "flex-auto bg-gray-100 rounded-lg mt-2"
                            )}
                        >
                            <ToolBar
                                className={twMerge(
                                    "col-span-4 bg-gray-200 rounded-t-lg transition-colors"
                                )}
                            >
                                <ToolBarButton disabled={true}>
                                    Add OT Procedure
                                </ToolBarButton>

                                <div className="flex-grow"></div>
                                <ToolBarButton
                                    title="close"
                                    disabled={isBusy()}
                                    onClick={() => setShowAddForm(false)}
                                >
                                    <XIcon
                                        className=""
                                        width={16}
                                        height={16}
                                    />
                                </ToolBarButton>
                            </ToolBar>
                            <div className="p-2">
                                <ProcedureForm
                                    value={newProcedure}
                                    onChange={(value) => setNewProcedure(value)}
                                    surgeons={
                                        otDay.expand.otList.expand.department
                                            .expand.surgeons_via_department
                                    }
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
                                        onClick={() => setShowAddForm(false)}
                                        className="mt-3 sm:mt-0 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50  sm:w-auto"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {!showAddForm && (
                        <div
                            className={twMerge(
                                "flex-auto bg-gray-100 rounded-lg mt-2"
                            )}
                        >
                            <ToolBarButton
                                title="Add OT Procedure"
                                disabled={otDay.disabled === 1 || isBusy()}
                                onClick={() => {
                                    setShowAddForm(true),
                                        setNewProcedure(initialProcedureValue);
                                }}
                            >
                                <PlusIcon width={16} height={16} />
                                <ToolBarButtonLabel>Add</ToolBarButtonLabel>
                            </ToolBarButton>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProcedureSublist;
