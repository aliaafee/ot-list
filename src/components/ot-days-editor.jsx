import { useEffect, useReducer, useRef, useState } from "react";
import { useNavigate } from "react-router";
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
import { LoadingSpinner } from "./loading-spinner";
import OtDaysBrowser from "./ot-days-browser";
import { useProcedureList } from "@/contexts/procedure-list-context";

const otDaysCollectionOptions = {
    sort: "+date",
    expand: "otList",
};

const departmentFilter = (departmentId) =>
    pb.filter("otList.department = {:departmentId}", { departmentId });

/**
 * OtDaysEditor - Sidebar component for viewing and managing OT days by department
 *
 * @param {string} selectedDayId - ID of currently selected OT day
 * @param {function} onSelectDay - Callback when an OT day is selected, receives the OT day ID
 * @param {string} className - Additional CSS classes for the container
 */
function OtDaysEditor({ selectedDayId, onSelectDay, className }) {
    const { otDay } = useProcedureList();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [listError, setListError] = useState("");
    const [otLists, setOtLists] = useState([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [selectedOtList, setSelectedOtList] = useState(null);
    const [showAll, setShowAll] = useState(false);
    const [otDaysList, dispatchOtDaysList] = useReducer(OtDaysReducer, {
        otDays: [],
    });
    const [showAddDates, setShowAddDates] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loadingList, setLoadingList] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const [browserSelectedYear, setBrowserSelectedYear] = useState(null);
    const [browserSelectedMonth, setBrowserSelectedMonth] = useState(null);

    // Read inside async callbacks to tell whether the department they were
    // started for is still the current one.
    const departmentIdRef = useRef(null);
    departmentIdRef.current = selectedDepartmentId;

    const navigate = useNavigate();
    const pageSize = 50;

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const depts = await pb.collection("departments").getFullList();
                setDepartments(depts);
                if (depts.length > 0) {
                    setSelectedDepartmentId(depts[0].id);
                }
            } catch (e) {
                console.error(e);
                setError(e.message);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const loadMorePages = async () => {
        if (currentPage >= totalPages || loadingMore || !selectedDepartmentId)
            return;

        const departmentId = selectedDepartmentId;
        setLoadingMore(true);
        setListError("");
        try {
            const nextPage = currentPage + 1;

            const result = await pb
                .collection("upcomingOtDays")
                .getList(nextPage, pageSize, {
                    ...otDaysCollectionOptions,
                    filter: departmentFilter(departmentId),
                });

            // The department may have been switched while the page loaded
            if (departmentId !== departmentIdRef.current) return;

            dispatchOtDaysList({
                type: "ADD_DAYS",
                payload: result.items,
            });
            setCurrentPage(nextPage);
        } catch (e) {
            console.error(e);
            setListError(e.message);
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

        // Guards every state update below, so that a request still in flight
        // when the department changes cannot overwrite the newer department.
        let cancelled = false;

        (async () => {
            setLoadingList(true);
            setListError("");
            setCurrentPage(1);
            setTotalPages(1);
            dispatchOtDaysList({ type: "SET_LIST", payload: [] });
            try {
                const lists = await pb.collection("otLists").getFullList({
                    filter: pb.filter("department = {:departmentId}", {
                        departmentId: selectedDepartmentId,
                    }),
                });
                if (cancelled) return;
                setOtLists(lists);

                const result = await pb
                    .collection("upcomingOtDays")
                    .getList(1, pageSize, {
                        ...otDaysCollectionOptions,
                        filter: departmentFilter(selectedDepartmentId),
                    });
                if (cancelled) return;
                dispatchOtDaysList({ type: "SET_LIST", payload: result.items });
                setTotalPages(result.totalPages);
            } catch (e) {
                if (cancelled) return;
                console.error(e);
                setListError(e.message);
            } finally {
                if (!cancelled) setLoadingList(false);
            }
        })();

        // subscribe() resolves to its own unsubscribe function. Holding on to
        // it, rather than unsubscribing by topic, keeps a fast department
        // switch from tearing down a subscription that has not registered yet.
        let unsubscribe = null;

        (async () => {
            try {
                const off = await pb.collection("otDays").subscribe(
                    "*",
                    (e) => {
                        if (e.action === "delete") {
                            dispatchOtDaysList({
                                type: "REMOVE_DAY",
                                payload: e.record,
                            });
                            return;
                        }
                        if (e.action === "update") {
                            dispatchOtDaysList({
                                type: "UPDATE_DAY",
                                payload: e.record,
                            });
                            return;
                        }
                        if (
                            e.action === "create" &&
                            dayjs(e.record.date).isSameOrAfter(dayjs(), "day")
                        ) {
                            dispatchOtDaysList({
                                type: "ADD_DAY",
                                payload: e.record,
                            });
                        }
                    },
                    {
                        expand: otDaysCollectionOptions.expand,
                        filter: departmentFilter(selectedDepartmentId),
                    },
                );
                if (cancelled) {
                    off();
                    return;
                }
                unsubscribe = off;
            } catch (e) {
                console.error(e);
            }
        })();

        return () => {
            cancelled = true;
            if (unsubscribe) unsubscribe();
        };
    }, [selectedDepartmentId]);

    const handleShowAllToggle = (value) => {
        if (value) {
            setShowAll(true);
            setBrowserSelectedYear(otDay ? dayjs(otDay.date).year() : null);
            setBrowserSelectedMonth(
                otDay ? dayjs(otDay.date).month() + 1 : null,
            );
            return;
        }
        setShowAll(false);
    };

    if (loading) {
        return <LoadingSpinner className={twMerge("bg-gray-200", className)} />;
    }

    if (error) {
        return <div className={twMerge("bg-gray-200", className)}>{error}</div>;
    }

    return (
        <div
            className={twMerge(
                "bg-gray-200 overflow-hidden flex flex-col",
                className,
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
                <ToolBarPill
                    items={[
                        ...otLists.map((otList) => ({
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
                    setValue={setSelectedOtList}
                    className="grid grid-cols-2"
                />
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
                    setValue={handleShowAllToggle}
                    className="grid grid-cols-2"
                />

                <ToolBarButton
                    title="Add OT Dates"
                    onClick={() => setShowAddDates(true)}
                    className="bg-gray-300"
                >
                    <PlusIcon className="" width={16} height={16} />
                    <ToolBarButtonLabel>Add</ToolBarButtonLabel>
                </ToolBarButton>
            </ToolBar>

            {!!listError && (
                <div role="alert" className="p-1 text-sm text-red-700">
                    {listError}
                </div>
            )}

            {showAll ? (
                <OtDaysBrowser
                    selectedDayId={selectedDayId}
                    onSelectDay={onSelectDay}
                    selectedOtList={selectedOtList}
                    year={browserSelectedYear}
                    onChangeYear={(year) => {
                        if (browserSelectedYear === year) {
                            setBrowserSelectedYear(null);
                            setBrowserSelectedMonth(null);
                            return;
                        }
                        setBrowserSelectedYear(year);
                        setBrowserSelectedMonth(null);
                    }}
                    month={browserSelectedMonth}
                    onChangeMonth={(month) => {
                        if (browserSelectedMonth === month) {
                            setBrowserSelectedMonth(null);
                            return;
                        }
                        setBrowserSelectedMonth(month);
                    }}
                />
            ) : loadingList ? (
                <LoadingSpinner className={twMerge("bg-gray-200", className)} />
            ) : (
                <OtDaysList
                    otDays={otDaysList.otDays}
                    selectedDayId={selectedDayId}
                    onSelectDay={onSelectDay}
                    selectedOtList={selectedOtList}
                    loadMorePages={loadMorePages}
                    loadMorePagesDisabled={currentPage >= totalPages}
                    loadingMore={loadingMore}
                />
            )}

            {showAddDates && (
                <AddDatesModal
                    otLists={otLists}
                    onClose={() => setShowAddDates(false)}
                    onSuccess={(addedDates) => {
                        addedDates.forEach((date) => {
                            dispatchOtDaysList({
                                type: "ADD_DAY",
                                payload: date,
                            });
                        });

                        setShowAddDates(false);
                        if (addedDates && addedDates.length === 1) {
                            onSelectDay(addedDates[0].id);
                            navigate(`/lists/${addedDates[0].id}`);
                        }
                    }}
                    initialOtList={selectedOtList}
                />
            )}
        </div>
    );
}

export default OtDaysEditor;
