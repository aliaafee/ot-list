import CenterBox from "@/components/center-box";
import { LoadingSpinnerFull } from "@/components/loading-spinner";
import { useProcedureList } from "@/contexts/procedure-list-context";
import { age } from "@/utils/dates";
import dayjs from "dayjs";
import { useEffect, useMemo } from "react";
import { useParams } from "react-router";

function SubOtListPrint({ procedures, operatingRoom }) {
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

    if (!!!operatingRoom) {
        return <></>;
    }

    return (
        <>
            <tr key={operatingRoom?.name}>
                <td
                    className="border border-black p-1 text-center font-bold bg-red-400"
                    colSpan={13}
                >
                    {operatingRoom?.name}
                </td>
            </tr>
            {proceduresByRoom.length === 0 ? (
                <tr key={`${operatingRoom.id}-empty`}>
                    <td
                        className="border border-black p-1 font-italic"
                        colSpan={13}
                    >
                        No procedures
                    </td>
                </tr>
            ) : (
                proceduresByRoom.map((item, index) => (
                    <tr key={item.id}>
                        <td className="border border-black p-1">
                            {item.order}
                        </td>
                        <td className="border border-black p-1">{item.bed}</td>
                        <td className="border border-black p-1">
                            {item.expand.patient.nid}
                        </td>
                        <td className="border border-black p-1">
                            {item.expand.patient.name}
                        </td>
                        <td className="border border-black p-1 text-center">
                            {age(item.expand.patient.dateOfBirth)} /{" "}
                            {item.expand.patient.sex[0].toUpperCase()}
                        </td>
                        <td className="border border-black p-1">
                            {item.diagnosis}
                        </td>
                        <td className="border border-black p-1">
                            {item.procedure}
                        </td>
                        <td className="border border-black p-1">
                            Neurosurgery Team
                        </td>
                        <td className="border border-black p-1">
                            {item.comorbids}
                        </td>
                        <td className="border border-black p-1">
                            {item.requirements}
                        </td>
                        <td className="border border-black p-1">
                            {item.anesthesia}
                        </td>
                        <td className="border border-black p-1">
                            {item.expand.patient.phone}
                        </td>
                        <td className="border border-black p-1"></td>
                    </tr>
                ))
            )}
        </>
    );
}

function OtListPrint({}) {
    const { otDayId } = useParams();
    const {
        proceduresList,
        otDay,
        loading,
        error,
        loadProcedures,
        subscribeProcedures,
    } = useProcedureList();

    useEffect(() => {
        loadProcedures(otDayId);

        const unsubscribe = subscribeProcedures(otDayId);

        return unsubscribe;
    }, [otDayId]);

    console.log("yo");

    if (loading) {
        return <LoadingSpinnerFull />;
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <div className="w-full inline-block">
            <div className="text-center font-bold"></div>
            <div className="text-center font-bold">
                {otDay?.expand?.otList?.expand?.department?.description} - OT
                List
            </div>
            <div className="text-center">
                {dayjs(otDay?.date).format("dddd, DD MMM YYYY")} -{" "}
                {otDay?.expand?.otList?.description}
                {!!otDay?.disabled && (
                    <span className="italic ml-2">
                        - {otDay.remarks || "No OT for this date"}
                    </span>
                )}
            </div>
            <table className="w-full border-collapse text-xs table-auto">
                <thead>
                    <tr className="font-bold bg-gray-400">
                        <th className="border border-black p-1">#</th>
                        <th className="border border-black p-1">Bed</th>
                        <th className="border border-black p-1">NID</th>
                        <th className="border border-black p-1">Name</th>
                        <th className="border border-black p-1">Age / Sex</th>
                        <th className="border border-black p-1">Diagnosis</th>
                        <th className="border border-black p-1">Procedure</th>
                        <th className="border border-black p-1">Surgeon</th>
                        <th className="border border-black p-1">Comorbids</th>
                        <th className="border border-black p-1">
                            Special Requirements
                        </th>
                        <th className="border border-black p-1">Anes</th>
                        <th className="border border-black p-1">Phone</th>
                        <th className="border border-black p-1">OT Use Only</th>
                    </tr>
                </thead>
                <tbody>
                    {otDay?.expand.otList.expand.operatingRooms.map(
                        (operatingRoom, index) => (
                            <SubOtListPrint
                                procedures={proceduresList.procedures}
                                operatingRoom={operatingRoom}
                            />
                        )
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default OtListPrint;
