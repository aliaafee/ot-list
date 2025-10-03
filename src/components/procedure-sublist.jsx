import { useMemo, useState } from "react";

import ReorderList from "./reorder-list";
import ProcedureItem from "./procedure-item";

function ProcedureSublist({ procedures, operatingRoom, showRemoved = true }) {
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
                    onChange={() => {}}
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
            </ul>
        </div>
    );
}

export default ProcedureSublist;
