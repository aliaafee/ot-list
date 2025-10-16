import { useEffect, useReducer, useState } from "react";
import { PlusIcon } from "lucide-react";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
dayjs.extend(isSameOrAfter);

import { pb } from "@/lib/pb";
import {
    ToolBar,
    ToolBarPill,
    ToolBarButton,
    ToolBarButtonLabel,
} from "./toolbar";
import OtDaysList from "@/components/ot-days-list";
import AddDatesModal from "@/modals/add-dates-modal";
import { twMerge } from "tailwind-merge";
import OtDaysReducer from "@/reducers/ot-days-reducer";

const otDaysCollectionOptions = {
    sort: "+date",
    expand: "otList",
};

function OtDaysEditor({ selectedDayId, onSelectDay, className }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [otLists, setOtLists] = useState([]);
    const [selectedOtList, setSelectedOtList] = useState(null);
    const [showAll, setShowAll] = useState(false);
    const [otDaysList, dispatchOtDaysList] = useReducer(OtDaysReducer, null);
    const [showAddDates, setShowAddDates] = useState(false);

    useEffect(() => {
        const collectionName = showAll ? "otDays" : "upcomingOtDays";

        (async () => {
            setLoading(true);
            dispatchOtDaysList({ type: "SET_LIST", payload: [] });
            try {
                const lists = await pb.collection("otLists").getFullList();
                setOtLists(lists);
                console.log("otLists", lists);

                const collectionName = showAll ? "otDays" : "upcomingOtDays";

                const days = await pb.collection(collectionName).getFullList({
                    ...otDaysCollectionOptions,
                });
                dispatchOtDaysList({ type: "SET_LIST", payload: days });
                console.log("otDays", days);
            } catch (e) {
                console.log(e);
                setError(e.message);
            } finally {
                setLoading(false);
            }
        })();

        console.log("subscribe", "otDays");
        pb.collection("otDays").subscribe(
            "*",
            function (e) {
                console.log(e.action);
                console.log(e.record);
                if (e.action === "update") {
                    dispatchOtDaysList({
                        type: "UPDATE_DAY",
                        payload: e.record,
                    });
                    return;
                }
                if (e.action === "create") {
                    if (
                        !showAll &&
                        dayjs(e.record.date).isSameOrAfter(dayjs(), "day")
                    ) {
                        dispatchOtDaysList({
                            type: "ADD_DAY",
                            payload: e.record,
                        });
                        return;
                    } else {
                        if (showAll) {
                            dispatchOtDaysList({
                                type: "ADD_DAY",
                                payload: e.record,
                            });
                            return;
                        }
                    }
                }
            },
            {
                ...otDaysCollectionOptions,
            }
        );

        return () => {
            console.log("unsubscribe", "otDays");
            pb.collection("otDays").unsubscribe("*");
        };
    }, [showAll]);

    if (error) {
        return <div className={twMerge("bg-gray-200", className)}>{error}</div>;
    }

    return (
        <div
            className={twMerge(
                "bg-gray-200 overflow-hidden flex flex-col",
                className
            )}
        >
            <ToolBar className="sticky top-0 bg-gray-200 grid grid-cols-1">
                {
                    <ToolBarPill
                        items={[
                            ...otLists.map((otList, index) => ({
                                value: otList.id,
                                label: otList.name,
                                color: "bg-gray-300",
                            })),
                            {
                                value: null,
                                label: "All Lists",
                                color: "bg-gray-300",
                            },
                        ]}
                        value={selectedOtList}
                        setValue={(value) => setSelectedOtList(value)}
                        className="grid grid-cols-2"
                        disabled={loading}
                    />
                }
                <ToolBarPill
                    items={[
                        {
                            value: false,
                            label: "Upcoming",
                            color: "bg-gray-300",
                        },
                        { value: true, label: "All", color: "bg-gray-300" },
                    ]}
                    value={showAll}
                    setValue={(value) => setShowAll(value)}
                    className="grid grid-cols-2"
                    disabled={loading}
                />

                <ToolBarButton
                    title="Add OT Dates"
                    onClick={() => setShowAddDates(true)}
                    className="bg-gray-300"
                    disabled={loading}
                >
                    <PlusIcon className="" width={16} height={16} />
                    <ToolBarButtonLabel>Add</ToolBarButtonLabel>
                </ToolBarButton>
            </ToolBar>

            {loading ? (
                <div className="p-2">Loading...</div>
            ) : (
                <OtDaysList
                    otDays={otDaysList?.otDays}
                    selectedDayId={selectedDayId}
                    onSelectDay={onSelectDay}
                    selectedOtList={selectedOtList}
                />
            )}

            {!!showAddDates && (
                <AddDatesModal
                    otLists={otLists}
                    onCancel={() => setShowAddDates(false)}
                    onSuccess={() => {
                        setShowAddDates(false);
                    }}
                    initialOtList={selectedOtList}
                />
            )}
        </div>
    );
}

export default OtDaysEditor;
