import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { CalendarArrowDownIcon, FastForward } from "lucide-react";

import ModalWindow from "./modal-window";
import FormField from "@/components/form-field";
import { useProcedureList } from "@/contexts/procedure-list-context";

function MoveProcedureModal({
    onCancel = () => {},
    onSuccess = () => {},
    itemToMove,
    operatingRoom,
    proceduresByRoom,
}) {
    const {
        otDay,
        updateProcedures,
        proceduresList,
        setSelected,
        getProcedures,
    } = useProcedureList();

    const [newOtDayId, setNewOtDayId] = useState("");
    const [moving, setMoving] = useState(false);
    const [error, setError] = useState("");

    const handleMoveProcedure = async () => {
        const newOtDay =
            otDay.expand.otList.expand.upcomingOtDays_via_otList.find(
                (d) => d.id === newOtDayId
            );

        if (itemToMove.procedureDay === newOtDay.id) {
            onSuccess();
            return; // No change in date
        }

        setMoving(true);
        let nextOrder = 1;
        try {
            const moveListData = await getProcedures(
                newOtDay.id,
                operatingRoom.id
            );
            console.log("moveList", moveListData);
            if (moveListData && moveListData.length > 0) {
                console.log(moveListData[moveListData.length - 1]);
                nextOrder = moveListData[moveListData.length - 1].order + 1;
            }
        } catch (e) {
            console.log(e);
            setError(e.message);
            setMoving(false);
            return;
        }

        console.log("nextOrder", nextOrder);

        const updatedItem = {
            id: itemToMove.id,
            procedureDay: newOtDay.id,
            order: nextOrder,
            removed: false,
        };
        if (proceduresList.selected === itemToMove.id) {
            setSelected(null);
        }

        if (itemToMove.order < 0) {
            updateProcedures([updatedItem]);
        } else {
            const rowsToUpdate = proceduresByRoom
                .filter((row) => row.order > itemToMove.order)
                .map((row) => ({
                    id: row.id,
                    order: row.order - 1,
                }));
            updateProcedures([updatedItem, ...rowsToUpdate]);
        }

        setMoving(false);
        onSuccess();
    };

    return (
        <ModalWindow
            title="Move Procedure"
            okLabel="Move"
            onOk={handleMoveProcedure}
            onCancel={onCancel}
            icon={<CalendarArrowDownIcon width={24} height={24} />}
            iconColor="bg-blue-100 text-blue-600"
            okColor="bg-blue-600 hover:bg-blue-500"
            loading={moving}
        >
            <p className="mb-2">
                {itemToMove.expand.patient.nid} {itemToMove.expand.patient.name}{" "}
                planned for {itemToMove.procedure} on{" "}
                {dayjs(itemToMove.procedure_date).format("DD MMM YYYY")}
            </p>
            <p className="mb-2">Move the selected procedure to another date?</p>
            <form>
                <FormField
                    label=""
                    name="newDate"
                    value={newOtDayId}
                    onChange={(e) => setNewOtDayId(e.target.value)}
                    type="select"
                >
                    <option value="">Select a new date</option>
                    {otDay.expand.otList.expand.upcomingOtDays_via_otList.map(
                        (day) => (
                            <option key={day.id} value={day.id}>
                                {dayjs(day.date).format("ddd, DD MMM YYYY")}
                            </option>
                        )
                    )}
                </FormField>
            </form>
            {!!error && (
                <div className="bg-red-400/20 rounded-md mt-2 py-1 px-2">
                    Failed to move procedure. {error}
                </div>
            )}
        </ModalWindow>
    );
}

export default MoveProcedureModal;
