import dayjs from "dayjs";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { twMerge } from "tailwind-merge";

import { pb } from "@/lib/pb";
import { insertDayInOrder, isInMonth } from "@/utils/ot-days";
import OtListMarker from "./ot-list-marker";
import { ChevronRightIcon } from "lucide-react";

function DayItem({ day, isSelected, onSelect }) {
    const ref = useRef(null);

    useEffect(() => {
        if (isSelected && ref.current) {
            ref.current.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "nearest",
            });
        }
    }, [isSelected]);

    return (
        <li
            ref={ref}
            className={twMerge(
                "flex items-center p-1 gap-2 pl-12 cursor-pointer hover:bg-blue-200",
                isSelected && "bg-blue-300 hover:bg-blue-300",
                day?.disabled && "text-red-600",
                day?.disabled && isSelected && "text-red-700",
            )}
            onClick={() => onSelect(day)}
        >
            <span className="flex overflow-clip grow">
                <span className="overflow-clip whitespace-nowrap min-w-12">
                    {dayjs(day.date).format("ddd")},{" "}
                </span>
                <span className="col-span-2 text-ellipsis whitespace-nowrap grow">
                    {dayjs(day.date).format("DD MMMM")}
                </span>
                <span className="overflow-clip whitespace-nowrap">
                    <OtListMarker otList={day.expand?.otList} />
                </span>
            </span>
        </li>
    );
}

function MonthItem({
    monthData,
    isSelected,
    onSelect,
    days,
    loadingDays,
    selectedDayId,
    onSelectDay,
    filteredDays,
}) {
    const ref = useRef(null);

    // The selected day scrolls itself into view, so don't fight it. While the
    // days are still loading we can't tell yet whether it belongs to this
    // month, so hold off, the effect below runs again once loading settles.
    const skipScroll = useRef(false);
    skipScroll.current =
        !!selectedDayId &&
        (loadingDays || filteredDays.some((d) => d.id === selectedDayId));

    useEffect(() => {
        if (isSelected && !skipScroll.current && ref.current) {
            ref.current.scrollIntoView({
                behavior: "smooth",
                block: "start",
                inline: "nearest",
            });
        }
    }, [isSelected, loadingDays]);

    return (
        <li ref={ref} className="flex flex-col">
            <div
                className={twMerge(
                    "flex items-center p-1 gap-2 pl-8 cursor-pointer hover:bg-gray-300",
                    isSelected && "bg-gray-300 font-semibold",
                )}
                onClick={() => onSelect(monthData.month)}
            >
                <ChevronRightIcon
                    width={16}
                    height={16}
                    className={twMerge(
                        "transition-transform",
                        isSelected && "rotate-90",
                    )}
                />
                {dayjs()
                    .month(monthData.month - 1)
                    .format("MMMM")}{" "}
                {isSelected && monthData.year}
            </div>
            {isSelected && (
                <ul>
                    {loadingDays ? (
                        <li className="p-1 pl-12">Loading days...</li>
                    ) : filteredDays.length === 0 ? (
                        <li className="p-1 pl-12">
                            {days.length === 0
                                ? "No days found."
                                : "No days for this OT list."}
                        </li>
                    ) : (
                        filteredDays.map((d) => (
                            <DayItem
                                key={d.id}
                                day={d}
                                isSelected={selectedDayId === d.id}
                                onSelect={onSelectDay}
                            />
                        ))
                    )}
                </ul>
            )}
        </li>
    );
}

function YearItem({
    yearData,
    isSelected,
    onSelect,
    months,
    loadingMonths,
    month,
    onChangeMonth,
    days,
    loadingDays,
    selectedDayId,
    onSelectDay,
    filteredDays,
}) {
    const ref = useRef(null);

    // An open month scrolls itself into view, so only the bare year needs
    // scrolling. Kept out of the deps so that collapsing a month, which sets
    // the month back to null, doesn't drag the year up with it.
    const skipScroll = useRef(false);
    skipScroll.current = month !== null;

    useEffect(() => {
        if (isSelected && !skipScroll.current && ref.current) {
            ref.current.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }
    }, [isSelected, loadingMonths]);

    return (
        <li ref={ref} className="flex flex-col">
            <div
                className={twMerge(
                    "flex items-center p-1 gap-2 pl-4 cursor-pointer hover:bg-gray-300",
                    isSelected && "bg-gray-300",
                )}
                onClick={() => onSelect(yearData.year)}
            >
                <ChevronRightIcon
                    width={16}
                    height={16}
                    className={twMerge(
                        "transition-transform",
                        isSelected && "rotate-90",
                    )}
                />
                <span className="font-semibold">{yearData.year}</span>
            </div>
            {isSelected && (
                <ul>
                    {loadingMonths ? (
                        <li className="p-1 pl-8">Loading months...</li>
                    ) : (
                        months.map((m) => (
                            <MonthItem
                                key={m.id}
                                monthData={m}
                                isSelected={month === m.month}
                                onSelect={onChangeMonth}
                                days={days}
                                loadingDays={loadingDays}
                                selectedDayId={selectedDayId}
                                onSelectDay={onSelectDay}
                                filteredDays={filteredDays}
                            />
                        ))
                    )}
                </ul>
            )}
        </li>
    );
}

function OtDaysBrowser({
    selectedDayId = null,
    onSelectDay = () => {},
    year,
    onChangeYear = () => {},
    month,
    onChangeMonth = () => {},
    selectedOtList,
}) {
    const [loadingYears, setLoadingYears] = useState(false);
    const [years, setYears] = useState([]);
    const [loadingMonths, setLoadingMonths] = useState(false);
    const [months, setMonths] = useState([]);
    const [loadingDays, setLoadingDays] = useState(false);
    const [days, setDays] = useState([]);

    const navigate = useNavigate();

    const filteredDays = useMemo(
        () =>
            days.filter((day) => {
                if (selectedOtList) {
                    return day.otList === selectedOtList;
                }
                return true;
            }),
        [days, selectedOtList],
    );

    const handleSelectDay = (day) => {
        onSelectDay(day.id);
        navigate(`/lists/${day.id}`);
    };

    // A realtime refresh must not flip the loading flags, because those flags
    // are what drive the scroll-into-view effects above. Hence the silent mode.
    const fetchYears = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setLoadingYears(true);
        try {
            const result = await pb.collection("otDayYears").getFullList({
                sort: "year",
            });
            setYears(result);
        } catch (error) {
            console.error("Error fetching OT day years:", error);
        } finally {
            if (!silent) setLoadingYears(false);
        }
    }, []);

    // Takes the year as an argument rather than closing over it, so that the
    // callback stays stable and the subscription below is registered only once.
    const fetchMonths = useCallback(
        async (targetYear, { silent = false } = {}) => {
            if (!targetYear) return;
            if (!silent) setLoadingMonths(true);
            try {
                const result = await pb.collection("otDayMonths").getFullList({
                    filter: pb.filter("year = {:year}", { year: targetYear }),
                    sort: "month",
                });
                setMonths(result);
            } catch (error) {
                console.error("Error fetching OT day months:", error);
            } finally {
                if (!silent) setLoadingMonths(false);
            }
        },
        [],
    );

    useEffect(() => {
        fetchYears();
    }, [fetchYears]);

    useEffect(() => {
        setMonths([]);
        setDays([]);
        fetchMonths(year);
    }, [fetchMonths, year]);

    useEffect(() => {
        setDays([]);
        const fetchDays = async () => {
            if (year && month) {
                setLoadingDays(true);
                try {
                    const start = dayjs(`${year}-${month}-01`)
                        .startOf("month")
                        .format("YYYY-MM-DD HH:mm:ss");
                    const end = dayjs(`${year}-${month}-01`)
                        .add(1, "month")
                        .format("YYYY-MM-DD HH:mm:ss");

                    const result = await pb.collection("otDays").getFullList({
                        filter: pb.filter("date >= {:start} && date < {:end}", {
                            start,
                            end,
                        }),
                        sort: "date",
                        expand: "otList",
                    });
                    setDays(result);
                } catch (error) {
                    console.error("Error fetching OT days:", error);
                } finally {
                    setLoadingDays(false);
                }
            }
        };
        fetchDays();
    }, [year, month]);

    // The subscription is registered once for the life of the component, so
    // its handler reads what is currently open through this ref rather than
    // through a closure captured at subscribe time.
    const viewRef = useRef({});
    viewRef.current = { year, month, years, months };

    useEffect(() => {
        let cancelled = false;
        let unsubscribe = null;

        // Deliberately unfiltered: a day whose date moves out of the open
        // month has to be removed from the list, and a server side filter on
        // the date range would simply not deliver that event.
        const handleEvent = (e) => {
            const record = e.record;
            const { year, month, years, months } = viewRef.current;
            const deleted = e.action === "delete";

            if (year && month) {
                const belongsHere =
                    !deleted && isInMonth(record.date, year, month);

                setDays((prev) => {
                    const existing = prev.find((d) => d.id === record.id);
                    // Pull the day out and put it back in date order, so that
                    // an edited date moves it to its new place in the list.
                    const without = existing
                        ? prev.filter((d) => d.id !== record.id)
                        : prev;
                    if (!belongsHere) return without;
                    return insertDayInOrder(without, {
                        ...existing,
                        ...record,
                    });
                });
            }

            // The year and month lists are aggregates, so a day can add a
            // branch to the tree by being the first in a month, or empty one
            // by being the last. Neither is visible from the day list alone,
            // so refresh them unless this lands in a branch already on screen.
            const recordYear = dayjs(record.date).year();
            const recordMonth = dayjs(record.date).month() + 1;
            const knownBranch =
                years.some((y) => y.year === recordYear) &&
                (year !== recordYear ||
                    months.some((m) => m.month === recordMonth));

            if (deleted || !knownBranch) {
                fetchYears({ silent: true });
                if (year) fetchMonths(year, { silent: true });
            }
        };

        (async () => {
            try {
                const off = await pb
                    .collection("otDays")
                    .subscribe("*", handleEvent, { expand: "otList" });
                if (cancelled) {
                    off();
                    return;
                }
                unsubscribe = off;
            } catch (error) {
                console.error("Error subscribing to OT days:", error);
            }
        })();

        return () => {
            cancelled = true;
            if (unsubscribe) unsubscribe();
        };
    }, [fetchYears, fetchMonths]);

    return (
        <ul className="flex flex-col overflow-y-auto overscroll-contain grow">
            {loadingYears ? (
                <li className="p-1 pl-4">Loading years...</li>
            ) : (
                years.map((y) => (
                    <YearItem
                        key={y.id}
                        yearData={y}
                        isSelected={year === y.year}
                        onSelect={(newYear) => {
                            setMonths([]);
                            setDays([]);
                            onChangeYear(newYear);
                        }}
                        months={months}
                        loadingMonths={loadingMonths}
                        month={month}
                        onChangeMonth={(newMonth) => {
                            setDays([]);
                            onChangeMonth(newMonth);
                        }}
                        days={days}
                        loadingDays={loadingDays}
                        selectedDayId={selectedDayId}
                        onSelectDay={handleSelectDay}
                        filteredDays={filteredDays}
                    />
                ))
            )}
        </ul>
    );
}

export default OtDaysBrowser;
