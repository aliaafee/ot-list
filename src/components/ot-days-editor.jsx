import { useEffect, useState } from "react";
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
import { LoadingSpinnerFull } from "./loading-spinner";
import ErrorMessage from "@/modals/error-message";

function OtDaysEditor({ selectedDay, onSelectDay }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [otLists, setOtLists] = useState([]);
    const [selectedOtList, setSelectedOtList] = useState(null);
    const [showAll, setShowAll] = useState(false);
    const [otDays, setOtDays] = useState([]);
    const [showAddDates, setShowAddDates] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const lists = await pb.collection("otLists").getFullList();
            setOtLists(lists);
            console.log(lists);

            const days = await pb.collection("otDays").getFullList({
                sort: "+date",
                expand: "otList",
            });
            setOtDays(days);
            console.log(days);
            setLoading(false);
        } catch (e) {
            console.log(e);
            setError(e.message);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    if (loading) {
        return <LoadingSpinnerFull />;
    }

    if (error) {
        return <ErrorMessage message={error} />;
    }

    return (
        <div>
            <ToolBar className="sticky top-8 bg-gray-200 grid grid-cols-1">
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

            <OtDaysList
                otDays={otDays}
                selectedDay={selectedDay}
                onSelectDay={onSelectDay}
                selectedOtList={selectedOtList}
            />

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
