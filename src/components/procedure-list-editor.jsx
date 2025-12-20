import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import dayjs from "dayjs";
import { twMerge } from "tailwind-merge";
import {
    CalendarCheckIcon,
    CalendarOffIcon,
    ChevronLeftIcon,
    EyeClosedIcon,
    EyeIcon,
    PrinterIcon,
} from "lucide-react";

import {
    ToolBar,
    ToolBarButton,
    ToolBarButtonLabel,
    ToolBarLink,
} from "./toolbar";
import ProcedureSublist from "./procedure-sublist";
import { useProcedureList } from "@/contexts/procedure-list-context";
import DisableOtDayModal from "@/modals/disable-ot-day-modal";
import BodyLayout from "./body-layout";

/**
 * ProcedureListEditor - Main editor for viewing and managing procedures for an OT day
 *
 * @param {string} procedureDayId - ID of the OT day to display procedures for
 * @param {string} className - Additional CSS classes for the container
 * @param {function} handleShowDaysList - Callback to show the days list sidebar
 */
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
    const [searchParams, setSearchParams] = useSearchParams();

    const showRemoved = searchParams.get("showRemoved") === "true";

    const handleToggleShowRemoved = () => {
        const params = new URLSearchParams(searchParams);
        if (showRemoved) {
            params.delete("showRemoved");
        } else {
            params.set("showRemoved", "true");
        }
        setSearchParams(params);
    };

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
            <ToolBarLink
                title="Print OT List"
                disabled={otDay ? otDay?.disabled : true}
                to="print"
                target={"_blank"}
            >
                <PrinterIcon width={16} height={16} />
                <ToolBarButtonLabel>Print</ToolBarButtonLabel>
            </ToolBarLink>
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
            <ToolBarButton
                title={
                    showRemoved
                        ? "Hide Removed Procedures"
                        : "Show Removed Procedures"
                }
                disabled={false}
                onClick={handleToggleShowRemoved}
            >
                {showRemoved ? (
                    <>
                        <EyeIcon width={16} height={16} />
                    </>
                ) : (
                    <>
                        <EyeClosedIcon width={16} height={16} />
                    </>
                )}
            </ToolBarButton>
        </ToolBar>
    );

    const TableHeader = ({ className }) => (
        <div className={twMerge("flex text-sm", className)}>
            <div className="px-2 hidden md:inline">
                <span className="invisible">⠿</span>
            </div>
            <div className="grow flex-auto pl-2 pr-2 grid grid-cols-8 lg:grid-cols-12 gap-1 uppercase font-medium text-gray-500 text-xs">
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
    );

    if (loading) {
        return (
            <BodyLayout className={className} header={<ProcedureToolBar />}>
                <div className="animate-pulse">
                    <div className="mb-2">
                        <div className="h-7 bg-gray-100 rounded-lg w-80 mb-4"></div>
                    </div>
                    <TableHeader className={"text-gray-100"} />
                    <div className="mb-2">
                        <div className="h-7 bg-gray-100 rounded-lg w-60"></div>
                    </div>
                    <div className="bg-gray-100 rounded-lg h-7 mb-2"></div>
                    <div className="bg-gray-100 rounded-lg h-7 mb-2"></div>
                    <div className="bg-gray-100 rounded-lg h-7 mb-2"></div>
                    <div className="mb-2">
                        <div className="h-7 bg-gray-100 rounded-lg w-60"></div>
                    </div>
                    <div className="bg-gray-100 rounded-lg h-7 mb-2"></div>
                    <div className="bg-gray-100 rounded-lg h-7 mb-2"></div>
                    <div className="bg-gray-100 rounded-lg h-7 mb-2"></div>
                </div>
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
            <TableHeader />
            <ul>
                {otDay.expand.otList.expand.operatingRooms.map(
                    (operatingRoom, index) => (
                        <li key={index}>
                            <ProcedureSublist
                                procedures={proceduresList.procedures}
                                operatingRoom={operatingRoom}
                                showRemoved={showRemoved}
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
