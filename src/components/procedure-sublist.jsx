import { useMemo } from "react";

function ProcedureSublist({ procedures, operatingRoomId }) {
    console.log(operatingRoomId);
    console.log(procedures);
    const proceduresByRoom = useMemo(
        () =>
            procedures
                .filter(
                    (procedure) => procedure.operatingRoom === operatingRoomId
                )
                .sort((a, b) => a.order - b.order),
        [procedures, operatingRoomId]
    );
    return (
        <ol>
            {proceduresByRoom.map((item, index) => (
                <li key={index}>{item.id}</li>
            ))}
        </ol>
    );
}

export default ProcedureSublist;
