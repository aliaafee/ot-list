import { useEffect, useReducer, useState } from "react";
import { PlusIcon } from "lucide-react";

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

function OtDaysEditor({ selectedDayId, onSelectDay, className }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [otLists, setOtLists] = useState([]);
    const [selectedOtList, setSelectedOtList] = useState(null);
    const [showAll, setShowAll] = useState(false);
    const [otDaysList, dispatchOtDaysList] = useReducer(OtDaysReducer, null);
    const [showAddDates, setShowAddDates] = useState(false);

    const loadData = async () => {
        setLoading(true);
        dispatchOtDaysList({ type: "SET_LIST", payload: [] });
        try {
            const lists = await pb.collection("otLists").getFullList();
            setOtLists(lists);
            console.log("otLists", lists);

            const collectionName = showAll ? "otDays" : "upcomingOtDays";

            const days = await pb.collection(collectionName).getFullList({
                sort: "+date",
                expand: "otList",
            });
            dispatchOtDaysList({ type: "SET_LIST", payload: days });
            console.log("otDays", days);
        } catch (e) {
            console.log(e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
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
                        loadData();
                    }}
                    initialOtList={selectedOtList}
                />
            )}
        </div>
    );
}

export default OtDaysEditor;
