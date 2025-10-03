import { useMemo, useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";

import ReorderList from "./reorder-list";
import ProcedureItem from "./procedure-item";
import { useProcedureList } from "@/contexts/procedure-list-context";
import { ToolBar, ToolBarButton, ToolBarButtonLabel } from "./toolbar";
import { twMerge } from "tailwind-merge";

function ProcedureSublist({ procedures, operatingRoom, showRemoved = true }) {
    const { otDay, isBusy } = useProcedureList();
    const [showAddForm, setShowAddForm] = useState(false);

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

    return (
        <div>
            <div className="text-xl">{operatingRoom?.name}</div>
            <ul className="gap-2 grid">
                <ReorderList
                    items={proceduresByRoom}
                    itemRender={(procedure) => (
                        <ProcedureItem procedure={procedure} />
                    )}
                    onChange={(newList) => {
                        console.log(newList);
                    }}
                />
                {showRemoved &&
                    removedProcedures.map((procedure, index) => (
                        <li
                            key={index}
                            className="select-none flex bg-gray-100 rounded-lg hover:shadow-md"
                        >
                            <div className="p-2 hidden md:block">
                                <span className="invisible">⠿</span>
                            </div>
                            <div className="grow">
                                <ProcedureItem procedure={procedure} />
                            </div>
                        </li>
                    ))}
                <li key="addItem">
                    {showAddForm && (
                        <div
                            className={twMerge(
                                "flex-auto bg-gray-100 rounded-lg"
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
                                    onClick={() => {
                                        setShowAddForm(false);
                                    }}
                                >
                                    <XIcon
                                        className=""
                                        width={16}
                                        height={16}
                                    />
                                </ToolBarButton>
                            </ToolBar>
                            <div className="p-2">
                                {/* <ProcedureEntryForm
                                    onSubmit={handleAddProcedure}
                                    onCancel={() => setShowAddForm(false)}
                                    date={dateItem.date}
                                    or={operatingRoom.name}
                                /> */}
                            </div>
                        </div>
                    )}
                    {!showAddForm && (
                        <div
                            className={twMerge(
                                "flex-auto bg-gray-100 rounded-lg"
                            )}
                        >
                            <ToolBarButton
                                title="Add OT Procedure"
                                disabled={otDay.disabled === 1 || isBusy()}
                                onClick={() => setShowAddForm(true)}
                            >
                                <PlusIcon width={16} height={16} />
                                <ToolBarButtonLabel>Add</ToolBarButtonLabel>
                            </ToolBarButton>
                        </div>
                    )}
                </li>
            </ul>
        </div>
    );
}

export default ProcedureSublist;
