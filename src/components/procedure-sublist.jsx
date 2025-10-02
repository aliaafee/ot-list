import { useMemo } from "react";
import ReorderList from "./reorder-list";
import ProcedureItem from "./procedure-item";

function ProcedureSublist({ procedures, operatingRoom }) {
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
                    <ProcedureItem procedure={procedure} />
                )}
                onChange={() => {}}
            />
        </div>
    );
}

export default ProcedureSublist;
