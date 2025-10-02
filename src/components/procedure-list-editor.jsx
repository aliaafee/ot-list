import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { twMerge } from "tailwind-merge";
import {
    CalendarCheckIcon,
    CalendarOffIcon,
    ChevronLeftIcon,
    PrinterIcon,
} from "lucide-react";

import { pb } from "@/lib/pb";
import {
    ToolBar,
    ToolBarPill,
    ToolBarButton,
    ToolBarButtonLabel,
} from "./toolbar";
import OtDaysList from "@/components/ot-days-list";
import AddDatesModal from "@/modals/add-dates-modal";
import { LoadingSpinnerFull } from "./loading-spinner";
import ErrorMessage from "@/modals/error-message";
import ProcedureSublist from "./procedure-sublist";

function ProcedureListEditor({
    procedureDayId,
    className,
    handleShowDaysList,
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [otDay, setOtDay] = useState(null);
    const [procedures, setProcedures] = useState([]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (!!!procedureDayId) {
                return;
            }
            const day = await pb.collection("otDays").getOne(procedureDayId, {
                expand: "otList,otList.operatingRooms",
            });
            setOtDay(day);
            console.log("otDay", day);

            const proceduresList = await pb
                .collection("procedures")
                .getFullList({
                    filter: `procedureDay = "${procedureDayId}"`,
                    sort: "+order",
                    expand: "patient,addedBy,procedureDay.otList,procedureDay",
                });
            setProcedures(proceduresList);
            console.log("procedures", proceduresList);
        } catch (e) {
            console.log(e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [procedureDayId]);

    const ProcedureToolBar = () => (
        <ToolBar className="bg-gray-200 fixed top-16 w-full lg:relative lg:top-0">
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
                            setDisableRemarks("");
                            setConfirmDisableDate(true);
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
                            setConfirmEnableDate(true);
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
            <div
                className={twMerge(
                    "flex flex-col overflow-hidden mt-8 lg:mt-0",
                    className
                )}
            >
                <ProcedureToolBar />
                <div className="bg-white grow overflow-y-auto p-4">
                    Loading...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div
                className={twMerge(
                    "flex flex-col overflow-hidden mt-8 lg:mt-0",
                    className
                )}
            >
                <ProcedureToolBar />
                <div className="bg-white grow overflow-y-auto p-4">{error}</div>
            </div>
        );
    }

    if (!!!otDay) {
        return (
            <div
                className={twMerge(
                    "flex flex-col overflow-hidden mt-8 lg:mt-0",
                    className
                )}
            >
                <ProcedureToolBar />
                <div className="bg-white grow overflow-y-auto p-4"></div>
            </div>
        );
    }

    return (
        <div
            className={twMerge(
                "flex flex-col overflow-hidden mt-8 lg:mt-0",
                className
            )}
        >
            <ProcedureToolBar />
            <div className="bg-white grow overflow-y-auto p-4">
                <div className="mb-2">
                    <span
                        className={twMerge(
                            "text-xl",
                            !!otDay.disabled && "text-red-400"
                        )}
                    >
                        {dayjs(otDay.date).format("dddd, DD MMM YYYY ")} -{" "}
                        {otDay.expand.otList.description}
                    </span>
                    {!!otDay.disabled && (
                        <span className="italic ml-2">
                            {otDay.remarks || "No OT for this date"}
                        </span>
                    )}
                </div>
                <div className="flex">
                    <div className="p-2 hidden md:block">
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
                                    procedures={procedures}
                                    operatingRoom={operatingRoom}
                                />
                            </li>
                        )
                    )}
                </ul>
            </div>
        </div>
    );
}

export default ProcedureListEditor;
