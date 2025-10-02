import { useMemo, useState } from "react";
import ReorderList from "./reorder-list";
import ProcedureItem from "./procedure-item";

function ProcedureSublist({ procedures, operatingRoom }) {
    const [selectedRowId, setSelectedRowId] = useState(null);

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
    return (
        <div>
            <div className="text-xl">{operatingRoom?.name}</div>
            <ReorderList
                items={proceduresByRoom}
                itemRender={(procedure) => (
                    <ProcedureItem
                        procedure={procedure}
                        selected={selectedRowId === procedure.id}
                        onSelect={(selected) =>
                            selected
                                ? setSelectedRowId(procedure.id)
                                : setSelectedRowId(null)
                        }
                    />
                )}
                onChange={() => {}}
            />
        </div>
    );
}

export default ProcedureSublist;
