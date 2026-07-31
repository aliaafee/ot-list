import dayjs from "dayjs";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { twMerge } from "tailwind-merge";

import { pb } from "@/lib/pb";
import OtListMarker from "./ot-list-marker";

function DayItem({ day, isSelected, onSelect }) {
    return (
        <li
            className={twMerge(
                "flex items-center p-1 gap-2 pl-12 cursor-pointer hover:bg-blue-200",
                isSelected && "bg-blue-300 hover:bg-blue-300",
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
    return (
        <li className="flex flex-col">
            <div
                className={twMerge(
                    "flex items-center p-1 gap-2 pl-8 cursor-pointer hover:bg-gray-300",
                    isSelected && "bg-gray-300 font-semibold",
                )}
                onClick={() => onSelect(monthData.month)}
            >
                {dayjs()
                    .month(monthData.month - 1)
                    .format("MMMM")}
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
    return (
        <li className="flex flex-col">
            <div
                className={twMerge(
                    "flex items-center p-1 gap-2 pl-4 cursor-pointer hover:bg-gray-300",
                    isSelected && "bg-gray-300",
                )}
                onClick={() => onSelect(yearData.year)}
            >
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
        onSelectDay(day);
        navigate(`/lists/${day.id}`);
    };

    useEffect(() => {
        const fetchYears = async () => {
            setLoadingYears(true);
            try {
                const result = await pb.collection("otDayYears").getFullList({
                    sort: "year",
                });
                setYears(result);
            } catch (error) {
                console.error("Error fetching OT day years:", error);
            } finally {
                setLoadingYears(false);
            }
        };
        fetchYears();
    }, []);

    useEffect(() => {
        setMonths([]);
        setDays([]);
        const fetchMonths = async () => {
            if (year) {
                setLoadingMonths(true);
                try {
                    const result = await pb
                        .collection("otDayMonths")
                        .getFullList({
                            filter: pb.filter("year = {:year}", { year }),
                            sort: "month",
                        });
                    setMonths(result);
                } catch (error) {
                    console.error("Error fetching OT day months:", error);
                } finally {
                    setLoadingMonths(false);
                }
            }
        };
        fetchMonths();
    }, [year]);

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
