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
import { OtListColours } from "@/utils/colours";

const otDaysCollectionOptions = {
    sort: "+date",
    expand: "otList",
};

/**
 * OtDaysEditor - Sidebar component for viewing and managing OT days by department
 *
 * @param {string} selectedDayId - ID of currently selected OT day
 * @param {function} onSelectDay - Callback when an OT day is selected
 * @param {string} className - Additional CSS classes for the container
 */
function OtDaysEditor({ selectedDayId, onSelectDay, className }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [otLists, setOtLists] = useState([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [selectedOtList, setSelectedOtList] = useState(null);
    const [showAll, setShowAll] = useState(false);
    const [otDaysList, dispatchOtDaysList] = useReducer(OtDaysReducer, null);
    const [showAddDates, setShowAddDates] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const pageSize = 50;

    useEffect(() => {
        (async () => {
            try {
                const depts = await pb.collection("departments").getFullList();
                setDepartments(depts);
                if (depts.length > 0) {
                    setSelectedDepartmentId(depts[0].id);
                }
            } catch (e) {
                console.log(e);
            }
        })();
    }, []);

    const loadMorePages = async () => {
        if (currentPage >= totalPages || loadingMore || !selectedDepartmentId)
            return;

        setLoadingMore(true);
        try {
            const collectionName = showAll ? "otDays" : "upcomingOtDays";
            const nextPage = currentPage + 1;

            const result = await pb
                .collection(collectionName)
                .getList(nextPage, pageSize, {
                    ...otDaysCollectionOptions,
                    filter: pb.filter("otList.department = {:departmentId}", {
                        departmentId: selectedDepartmentId,
                    }),
                });

            dispatchOtDaysList({
                type: "ADD_DAYS",
                payload: result.items,
            });
            setCurrentPage(nextPage);
        } catch (e) {
            console.log(e);
            setError(e.message);
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        if (!selectedDepartmentId) {
            setOtLists([]);
            dispatchOtDaysList({ type: "SET_LIST", payload: [] });
            return;
        }

        (async () => {
            console.log("fetch otDays for department", selectedDepartmentId);
            setLoading(true);
            setCurrentPage(1);
            dispatchOtDaysList({ type: "SET_LIST", payload: [] });
            try {
                const lists = await pb.collection("otLists").getFullList({
                    filter: pb.filter("department = {:departmentId}", {
                        departmentId: selectedDepartmentId,
                    }),
                });
                setOtLists(lists);
                setSelectedOtList(null);
                console.log("otLists", lists);

                const collectionName = showAll ? "otDays" : "upcomingOtDays";

                const result = await pb
                    .collection(collectionName)
                    .getList(1, pageSize, {
                        ...otDaysCollectionOptions,
                        filter: pb.filter(
                            "otList.department = {:departmentId}",
                            {
                                departmentId: selectedDepartmentId,
                            }
                        ),
                    });
                dispatchOtDaysList({ type: "SET_LIST", payload: result.items });
                setTotalPages(result.totalPages);
                console.log("otDays", result.items);
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
    }, [showAll, selectedDepartmentId]);

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
            <div className="flex p-1 space-x-2 items-center ">
                <select
                    onChange={(e) => {
                        const deptId = e.target.value || null;
                        setSelectedDepartmentId(deptId);
                        setSelectedOtList(null);
                    }}
                    value={selectedDepartmentId || ""}
                    className="grow p-1"
                >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                            {dept.name}
                        </option>
                    ))}
                </select>
            </div>
            <ToolBar className="sticky top-0 bg-gray-200 grid grid-cols-1">
                {
                    <ToolBarPill
                        items={[
                            ...otLists.map((otList, index) => ({
                                value: otList.id,
                                label: otList.name,
                                color:
                                    OtListColours[otList.colour ?? ""] ||
                                    "bg-gray-300",
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
                <>
                    <OtDaysList
                        otDays={otDaysList?.otDays}
                        selectedDayId={selectedDayId}
                        onSelectDay={onSelectDay}
                        selectedOtList={selectedOtList}
                        loadMorePages={loadMorePages}
                        loadMorePagesDisabled={currentPage >= totalPages}
                        loadingMore={loadingMore}
                    />
                </>
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
