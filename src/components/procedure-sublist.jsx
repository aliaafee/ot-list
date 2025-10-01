import { useMemo } from "react";
import ReorderList from "./reorder-list";

function ProcedureSublist({ procedures, operatingRoom }) {
    const proceduresByRoom = useMemo(
        () =>
            procedures
                .filter(
                    (procedure) => procedure.operatingRoom === operatingRoom?.id
                )
                .sort((a, b) => a.order - b.order),
        [procedures, operatingRoom]
    );
    return (
        <div>
            <div className="text-xl">{operatingRoom?.name}</div>
            <ReorderList
                items={proceduresByRoom}
                itemRender={(item) => <div>{item.id}</div>}
                onChange={() => {}}
            />
        </div>
    );
}

export default ProcedureSublist;
