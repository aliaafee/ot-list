import dayjs from "dayjs";
import { useMemo } from "react";
import { twMerge } from "tailwind-merge";
import { Link } from "react-router";
import { OtListColours } from "@/utils/colours";

function OtListMarker({ otList }) {
    return (
        <span
            className={twMerge(
                "text-xs py-0.5 px-1 ml-2 rounded-sm text-white",
                "bg-gray-500",
                OtListColours[otList.colour]
            )}
        >
            {otList.name}
        </span>
    );
}

function OtDaysList({
    otDays = [],
    selectedDayId = null,
    onSelectDay = (otDay) => {},
    selectedOtList = null,
}) {
    const groupDaysByMonth = (datesList) => {
        return datesList.reduce((acc, otDay) => {
            const month = dayjs(otDay.date).format("YYYY-MM");
            if (!acc[month]) {
                acc[month] = [];
            }
            acc[month].push(otDay);
            return acc;
        }, {});
    };

    const daysByMonth = useMemo(() => {
        if (selectedOtList === null) {
            return groupDaysByMonth(otDays);
        }

        const daysByList = otDays.filter(
            (row) => row.otList === selectedOtList
        );

        return groupDaysByMonth(daysByList);
    }, [otDays, selectedOtList]);

    if (otDays.length === 0) {
        return <div className="p-1 pl-4 italic">No dates.</div>;
    }

    return (
        <ul className="flex flex-col overflow-y-auto overscroll-contain grow">
            {Object.keys(daysByMonth).map((month, index) => (
                <li key={index} className=" text-gray-700">
                    <div className="font-semibold p-1 mt-3 overflow-clip whitespace-nowrap">
                        {dayjs(month).format("MMMM YYYY")}
                    </div>
                    <ul className="flex flex-col">
                        {daysByMonth[month]
                            .sort((a, b) => new Date(a.date) - new Date(b.date))
                            .map((otDay, subIndex) => (
                                <li
                                    key={subIndex}
                                    className={twMerge(
                                        "hover:bg-gray-300 cursor-pointer p-1 pl-4",
                                        selectedDayId === otDay.id
                                            ? "bg-gray-400 hover:bg-gray-400"
                                            : "bg-transparent",
                                        otDay?.disabled && "text-red-600",
                                        otDay?.disabled &&
                                            selectedDayId === otDay.id &&
                                            "text-red-700"
                                    )}
                                    onClick={() => onSelectDay(otDay.id)}
                                >
                                    <Link to={`/lists/${otDay.id}`}>
                                        <span className="flex overflow-clip">
                                            <span className="overflow-clip whitespace-nowrap min-w-12">
                                                {dayjs(otDay.date).format(
                                                    "ddd"
                                                )}
                                                ,{" "}
                                            </span>
                                            <span className="col-span-2 overflow-ellipsis whitespace-nowrap grow">
                                                {dayjs(otDay.date).format(
                                                    "DD MMMM"
                                                )}
                                            </span>

                                            {!!!selectedOtList && (
                                                <span className="overflow-clip whitespace-nowrap">
                                                    <OtListMarker
                                                        otList={
                                                            otDay.expand.otList
                                                        }
                                                    />
                                                </span>
                                            )}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                    </ul>
                </li>
            ))}
        </ul>
    );
}

export default OtDaysList;
