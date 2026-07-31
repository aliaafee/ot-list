import dayjs from "dayjs";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { twMerge } from "tailwind-merge";

import { pb } from "@/lib/pb";
import OtListMarker from "./ot-list-marker";

function OtDaysBrowser({
    selectedDayId = null,
    onSelectDay = (day) => {},
    year,
    onChangeYear = (year) => {},
    month,
    onChangeMonth = (month) => {},
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
                console.log("otDayYears", result);
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
        const fetchMonths = async () => {
            if (year) {
                setLoadingMonths(true);
                try {
                    const months = await pb
                        .collection("otDayMonths")
                        .getFullList({
                            filter: pb.filter("year = {:year}", {
                                year: year,
                            }),
                            sort: "month",
                        });
                    console.log("otDayMonths", months);
                    setMonths(months);
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
        const fetchDays = async () => {
            if (year && month) {
                setLoadingDays(true);
                try {
                    const start = `${year}-${String(month).padStart(2, "0")}-01 00:00:00`;
                    const nextMonth =
                        month === 12
                            ? `${year + 1}-01-01 00:00:00`
                            : `${year}-${String(month + 1).padStart(2, "0")}-01 00:00:00`;

                    console.log("Fetching days from", start, "to", nextMonth);

                    const days = await pb.collection("otDays").getFullList({
                        filter: pb.filter("date >= {:start} && date < {:end}", {
                            start,
                            end: nextMonth,
                        }),
                        sort: "date",
                        expand: "otList",
                    });
                    console.log("otDays", days);
                    setDays(days);
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
                <li>Loading years...</li>
            ) : (
                years.map((y) => (
                    <li key={y.id} className={twMerge("flex flex-col")}>
                        <div
                            className={twMerge(
                                "flex items-center p-1 gap-2 pl-4 cursor-pointer hover:bg-gray-300",
                                year === y.year && "bg-gray-300",
                            )}
                            onClick={() => {
                                setMonths([]);
                                setDays([]);
                                onChangeYear(y.year);
                            }}
                        >
                            <span className="font-semibold">{y.year}</span>
                        </div>
                        {year === y.year && (
                            <ul>
                                {loadingMonths ? (
                                    <li className="p-1 pl-8">
                                        Loading months...
                                    </li>
                                ) : (
                                    months.map((m) => (
                                        <li
                                            key={m.id}
                                            className={twMerge("flex flex-col")}
                                        >
                                            <div
                                                className={twMerge(
                                                    "flex items-center p-1 gap-2 pl-8 cursor-pointer hover:bg-gray-300",
                                                    month === m.month &&
                                                        "bg-gray-300 font-semibold",
                                                )}
                                                onClick={() => {
                                                    setDays([]);
                                                    onChangeMonth(m.month);
                                                }}
                                            >
                                                {dayjs()
                                                    .month(m.month - 1)
                                                    .format("MMMM")}
                                            </div>
                                            {month === m.month && (
                                                <ul>
                                                    {loadingDays ? (
                                                        <li className="p-1 pl-12">
                                                            Loading days...
                                                        </li>
                                                    ) : filteredDays.length ===
                                                      0 ? (
                                                        <li className="p-1 pl-12">
                                                            No days found.
                                                        </li>
                                                    ) : (
                                                        filteredDays.map(
                                                            (d) => (
                                                                <li
                                                                    key={d.id}
                                                                    className={twMerge(
                                                                        "flex items-center p-1 gap-2 pl-12 cursor-pointer hover:bg-blue-200",
                                                                        selectedDayId ===
                                                                            d.id &&
                                                                            "bg-blue-300 hover:bg-blue-300",
                                                                    )}
                                                                    onClick={() =>
                                                                        handleSelectDay(
                                                                            d,
                                                                        )
                                                                    }
                                                                >
                                                                    <span className="flex overflow-clip grow">
                                                                        <span className="overflow-clip whitespace-nowrap min-w-12">
                                                                            {dayjs(
                                                                                d.date,
                                                                            ).format(
                                                                                "ddd",
                                                                            )}

                                                                            ,{" "}
                                                                        </span>
                                                                        <span className="col-span-2 text-ellipsis whitespace-nowrap grow">
                                                                            {dayjs(
                                                                                d.date,
                                                                            ).format(
                                                                                "DD MMMM",
                                                                            )}
                                                                        </span>

                                                                        <span className="overflow-clip whitespace-nowrap">
                                                                            <OtListMarker
                                                                                otList={
                                                                                    d
                                                                                        .expand
                                                                                        .otList
                                                                                }
                                                                            />
                                                                        </span>
                                                                    </span>
                                                                </li>
                                                            ),
                                                        )
                                                    )}
                                                </ul>
                                            )}
                                        </li>
                                    ))
                                )}
                            </ul>
                        )}
                    </li>
                ))
            )}
        </ul>
    );
}

export default OtDaysBrowser;
