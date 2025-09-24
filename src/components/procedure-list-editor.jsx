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

function ProcedureListEditor({ procedureDayId, className, showDaysList }) {
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
            console.log(day);
            setOtDay(day);

            const proceduresList = await pb
                .collection("procedures")
                .getFullList({
                    filter: `procedureDay = "${procedureDayId}"`,
                    sort: "+order",
                    expand: "patient,addedBy,otList,procedureDay",
                });
            setProcedures(proceduresList);
            console.log(proceduresList);
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

    if (loading) {
        return <div className={twMerge(className)}>Loading...</div>;
    }

    if (error) {
        return <div className={twMerge(className)}>{error}</div>;
    }

    if (!!!otDay) {
        return <div className={twMerge(className)}></div>;
    }

    return (
        <div className={twMerge(className)}>
            <ToolBar className="bg-gray-200 mb-4">
                <ToolBarButton
                    title="OT Dates"
                    disabled={false}
                    onClick={showDaysList}
                    className="lg:hidden"
                >
                    <ChevronLeftIcon width={16} height={16} />
                    <ToolBarButtonLabel>OT Date List</ToolBarButtonLabel>
                </ToolBarButton>
                <ToolBarButton
                    title="Print OT List"
                    disabled={otDay.disabled}
                    // onClick={handlePrint}
                >
                    <PrinterIcon width={16} height={16} />
                    <ToolBarButtonLabel>Print</ToolBarButtonLabel>
                </ToolBarButton>
                <div className="flex-grow"></div>
                {!otDay.disabled ? (
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
                )}
            </ToolBar>
            <div className="mb-4 print:hidden">
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
        </div>
    );
}

export default ProcedureListEditor;
