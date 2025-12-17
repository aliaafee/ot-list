import { useMemo, useState } from "react";
import { PlusIcon } from "lucide-react";

import ReorderList from "./reorder-list";
import ProcedureItem from "./procedure-item";
import { useProcedureList } from "@/contexts/procedure-list-context";
import { ToolBarButton, ToolBarButtonLabel } from "./toolbar";
import { twMerge } from "tailwind-merge";
import MoveProcedureModal from "@/modals/move-procedure-modal";
import ProcedureAdder from "./procedure-adder";
import { useSearchParams } from "react-router";

/**
 * ProcedureSublist - Display and manage procedures for a specific operating room
 *
 * @param {Array} procedures - Array of all procedures for the day
 * @param {Object} operatingRoom - Operating room object to filter procedures
 * @param {boolean} showRemoved - Whether to show removed procedures (default: true)
 */
function ProcedureSublist({ procedures, operatingRoom, showRemoved = true }) {
    const { otDay, isBusy, updateProcedures, setSelected } = useProcedureList();
    const [showAddForm, setShowAddForm] = useState(false);
    const [procedureToMove, setProcedureToMove] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();

    const selectedProcedureId = searchParams.get("procedureId");

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

    const handleChangeOrder = (newList) => {
        updateProcedures(newList);
    };

    const handleMoveUp = (item) => {
        const itemToMoveIndex = proceduresByRoom.findIndex(
            (row) => row.id === item.id
        );

        if (proceduresByRoom[itemToMoveIndex].order <= 1) {
            return;
        }

        const rowsToUpdate = [];

        rowsToUpdate.push({
            id: proceduresByRoom[itemToMoveIndex].id,
            order: proceduresByRoom[itemToMoveIndex].order - 1,
        });

        const previousItemIndex = proceduresByRoom.findIndex(
            (row) => row.order === proceduresByRoom[itemToMoveIndex].order - 1
        );

        if (previousItemIndex !== -1) {
            rowsToUpdate.push({
                id: proceduresByRoom[previousItemIndex].id,
                order: proceduresByRoom[itemToMoveIndex].order,
            });
        }

        updateProcedures(rowsToUpdate);
    };

    const handleMoveDown = (item) => {
        console.log("down", item);
        const itemToMoveIndex = proceduresByRoom.findIndex(
            (row) => row.id === item.id
        );

        if (
            proceduresByRoom[itemToMoveIndex].order === proceduresByRoom.length
        ) {
            return;
        }

        const rowsToUpdate = [];

        rowsToUpdate.push({
            id: proceduresByRoom[itemToMoveIndex].id,
            order: proceduresByRoom[itemToMoveIndex].order + 1,
        });

        const previousItemIndex = proceduresByRoom.findIndex(
            (row) => row.order === proceduresByRoom[itemToMoveIndex].order + 1
        );

        if (previousItemIndex !== -1) {
            rowsToUpdate.push({
                id: proceduresByRoom[previousItemIndex].id,
                order: proceduresByRoom[itemToMoveIndex].order,
            });
        }

        updateProcedures(rowsToUpdate);
    };

    const handleMoveDate = (itemToMove) => {
        console.log("move", itemToMove);
        setProcedureToMove(itemToMove);
    };

    const handleRemove = (item) => {
        const itemToRemoveIndex = proceduresByRoom.findIndex(
            (row) => row.id === item.id
        );
        if (itemToRemoveIndex === -1) {
            return;
        }
        const itemToRemove = proceduresByRoom[itemToRemoveIndex];
        const updatedItem = {
            id: itemToRemove.id,
            order: -1,
            removed: true,
        };
        // select the rows that need to have order updated
        const rowsToUpdate = proceduresByRoom
            .filter((row) => row.order > itemToRemove.order)
            .map((row) => ({
                id: row.id,
                order: row.order - 1,
            }));

        if (selectedProcedureId === item.id) {
            setSelected(null);
        }

        updateProcedures([updatedItem, ...rowsToUpdate]);
    };

    const handleRestore = (item) => {
        console.log("Restore", item);
        if (item === null) {
            return;
        }

        let nextOrder = 1;
        if (proceduresByRoom && proceduresByRoom.length > 0) {
            nextOrder = proceduresByRoom[proceduresByRoom.length - 1].order + 1;
        }

        const updatedItem = {
            id: item.id,
            order: nextOrder,
            removed: false,
        };

        updateProcedures([updatedItem]);
    };

    return (
        <div>
            <div className="font-medium mt-2">{operatingRoom?.name}</div>
            <div className="grid">
                <ReorderList
                    items={proceduresByRoom}
                    itemRender={(procedure) => (
                        <ProcedureItem
                            procedure={procedure}
                            onMoveUp={handleMoveUp}
                            onMoveDown={handleMoveDown}
                            onRemove={handleRemove}
                            onMoveDate={handleMoveDate}
                        />
                    )}
                    itemClassName="group select-none flex bg-gray-100 rounded-lg hover:bg-blue-200 mt-2 has-[.selected]:ring-2 ring-blue-300 has-[.selected]:bg-blue-300"
                    onChange={handleChangeOrder}
                    disabled={isBusy()}
                />
                <ul>
                    {showRemoved &&
                        removedProcedures.map((procedure, index) => (
                            <li
                                key={index}
                                className="select-none flex bg-gray-100 rounded-lg hover:bg-blue-200 mt-2 has-[.selected]:ring-2 ring-blue-300 has-[.selected]:bg-blue-300"
                            >
                                <div className="p-2 hidden md:block">
                                    <span className="invisible">⠿</span>
                                </div>
                                <div className="grow">
                                    <ProcedureItem
                                        procedure={procedure}
                                        onRestore={handleRestore}
                                        onMoveDate={handleMoveDate}
                                    />
                                </div>
                            </li>
                        ))}
                </ul>
                <div>
                    {showAddForm && (
                        <ProcedureAdder
                            operatingRoom={operatingRoom}
                            proceduresByRoom={proceduresByRoom}
                            onClose={() => setShowAddForm(false)}
                            onAfterSave={() => setShowAddForm(false)}
                        />
                    )}
                    {procedureToMove !== null && (
                        <MoveProcedureModal
                            onCancel={() => setProcedureToMove(null)}
                            onSuccess={() => setProcedureToMove(null)}
                            itemToMove={procedureToMove}
                            operatingRoom={operatingRoom}
                            proceduresByRoom={proceduresByRoom}
                        />
                    )}
                    {!showAddForm && (
                        <div
                            className={twMerge(
                                "flex-auto bg-gray-100 rounded-lg mt-2"
                            )}
                        >
                            <ToolBarButton
                                title="Add OT Procedure"
                                disabled={otDay.disabled || isBusy()}
                                onClick={() => setShowAddForm(true)}
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
