import dayjs from "dayjs";
import { useMemo } from "react";
import { twMerge } from "tailwind-merge";

function OtListMarker({ otList }) {
    return (
        <span
            className={twMerge(
                "text-xs py-0.5 px-1 ml-2 rounded-sm text-white",
                "bg-gray-500"
                // !!otList.colour ? `bg-${otList.colour}-400` : "bg-gray-500"
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
        return datesList.reduce((acc, dateItem) => {
            const month = dayjs(dateItem.date).format("YYYY-MM");
            if (!acc[month]) {
                acc[month] = [];
            }
            acc[month].push(dateItem);
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
        <ul className="flex flex-col">
            {Object.keys(daysByMonth).map((month, index) => (
                <li key={index} className=" text-gray-700">
                    <div className="font-semibold p-1 mt-3 overflow-clip whitespace-nowrap">
                        {dayjs(month).format("MMMM YYYY")}
                    </div>
                    <ul className="flex flex-col">
                        {daysByMonth[month]
                            .sort((a, b) => new Date(a.date) - new Date(b.date))
                            .map((dateItem, subIndex) => (
                                <li
                                    key={subIndex}
                                    className={twMerge(
                                        "hover:bg-gray-300 cursor-pointer p-1 pl-4",
                                        dateItem?.disabled === 1
                                            ? "text-red-400"
                                            : "text-black",
                                        selectedDayId === dateItem.id
                                            ? "bg-gray-400 hover:bg-gray-400"
                                            : "bg-transparent"
                                    )}
                                    onClick={() => onSelectDay(dateItem.id)}
                                >
                                    <span className="flex overflow-clip">
                                        <span className="overflow-clip whitespace-nowrap min-w-12">
                                            {dayjs(dateItem.date).format("ddd")}
                                            ,{" "}
                                        </span>
                                        <span className="col-span-2 overflow-ellipsis whitespace-nowrap  min-w-28">
                                            {dayjs(dateItem.date).format(
                                                "DD MMMM"
                                            )}
                                        </span>

                                        {!!!selectedOtList && (
                                            <span className="overflow-clip whitespace-nowrap">
                                                <OtListMarker
                                                    otList={
                                                        dateItem.expand.otList
                                                    }
                                                />
                                            </span>
                                        )}
                                    </span>
                                </li>
                            ))}
                    </ul>
                </li>
            ))}
        </ul>
    );
}

export default OtDaysList;
