import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { twMerge } from "tailwind-merge";
import {
    CalendarCheckIcon,
    CalendarOffIcon,
    ChevronLeftIcon,
    PrinterIcon,
} from "lucide-react";

import { ToolBar, ToolBarButton, ToolBarButtonLabel } from "./toolbar";
import ProcedureSublist from "./procedure-sublist";
import { useProcedureList } from "@/contexts/procedure-list-context";
import DisableOtDayModal from "@/modals/disable-ot-day-modal";
import BodyLayout from "./body-layout";

function ProcedureListEditor({
    procedureDayId,
    className,
    handleShowDaysList,
}) {
    const {
        proceduresList,
        otDay,
        loading,
        error,
        loadProcedures,
        subscribeProcedures,
    } = useProcedureList();

    const [showDisable, setShowDisable] = useState(false);

    useEffect(() => {
        loadProcedures(procedureDayId);

        const unsubscribe = subscribeProcedures(procedureDayId);

        return unsubscribe;
    }, [procedureDayId]);

    const ProcedureToolBar = () => (
        <ToolBar>
            <ToolBarButton
                title="OT Dates"
                disabled={false}
                onClick={handleShowDaysList}
                className="lg:hidden"
            >
                <ChevronLeftIcon width={16} height={16} />
                <ToolBarButtonLabel>OT Date List</ToolBarButtonLabel>
            </ToolBarButton>
            <ToolBarButton
                title="Print OT List"
                disabled={otDay ? otDay?.disabled : true}
                // onClick={handlePrint}
            >
                <PrinterIcon width={16} height={16} />
                <ToolBarButtonLabel>Print</ToolBarButtonLabel>
            </ToolBarButton>
            <div className="flex-grow"></div>
            {otDay &&
                (!otDay?.disabled ? (
                    <ToolBarButton
                        title="Disable"
                        onClick={() => {
                            setShowDisable(true);
                        }}
                    >
                        <CalendarOffIcon width={16} height={16} />
                        <ToolBarButtonLabel className="hidden sm:inline">
                            Disable
                        </ToolBarButtonLabel>
                    </ToolBarButton>
                ) : (
                    <ToolBarButton
                        title="Enable"
                        onClick={() => {
                            setShowDisable(true);
                        }}
                    >
                        <CalendarCheckIcon width={16} height={16} />
                        <ToolBarButtonLabel className="hidden sm:inline">
                            Enable
                        </ToolBarButtonLabel>
                    </ToolBarButton>
                ))}
        </ToolBar>
    );

    if (loading) {
        return (
            <BodyLayout className={className} header={<ProcedureToolBar />}>
                Loading...
            </BodyLayout>
        );
    }

    if (error) {
        return (
            <BodyLayout className={className} header={<ProcedureToolBar />}>
                {error}
            </BodyLayout>
        );
    }

    if (!!!otDay) {
        return (
            <BodyLayout className={className} header={<ProcedureToolBar />}>
                <></>
            </BodyLayout>
        );
    }

    return (
        <BodyLayout className={className} header={<ProcedureToolBar />}>
            <div className="mb-2">
                <span
                    className={twMerge(
                        "text-xl",
                        !!otDay.disabled && "text-red-400"
                    )}
                >
                    {dayjs(otDay.date).format("dddd, DD MMM YYYY ")} -{" "}
                    {otDay.expand.otList.name}
                </span>
                {!!otDay.disabled && (
                    <span className="italic ml-2">
                        {otDay.remarks || "No OT for this date"}
                    </span>
                )}
            </div>
            <div className="flex text-sm">
                <div className="px-2 hidden md:inline">
                    <span className="invisible">⠿</span>
                </div>
                <div className="grow flex-auto pl-2 pr-2 grid grid-cols-8 lg:grid-cols-12 font-bold gap-1">
                    <div className="col-span-1 overflow-clip overflow-ellipsis">
                        #
                    </div>
                    <div className="col-span-2 lg:col-span-1 overflow-clip overflow-ellipsis">
                        NID
                    </div>
                    <div className="col-span-2 lg:col-span-3 overflow-clip overflow-ellipsis">
                        Name
                    </div>
                    <div className="col-span-1 hidden lg:inline overflow-clip overflow-ellipsis">
                        Age / Sex
                    </div>
                    <div className="col-span-3 hidden lg:inline overflow-clip overflow-ellipsis">
                        Diagnosis
                    </div>
                    <div className="col-span-3 overflow-clip overflow-ellipsis">
                        Procedure
                    </div>
                </div>
            </div>
            <ul>
                {otDay.expand.otList.expand.operatingRooms.map(
                    (operatingRoom, index) => (
                        <li key={index}>
                            <ProcedureSublist
                                procedures={proceduresList.procedures}
                                operatingRoom={operatingRoom}
                            />
                        </li>
                    )
                )}
            </ul>
            {showDisable && (
                <DisableOtDayModal
                    onCancel={() => setShowDisable(false)}
                    onSuccess={() => setShowDisable(false)}
                />
            )}
        </BodyLayout>
    );
}

export default ProcedureListEditor;
