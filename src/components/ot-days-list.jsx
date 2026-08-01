import dayjs from "dayjs";
import { useMemo } from "react";
import { twMerge } from "tailwind-merge";
import { Link } from "react-router";
import Button from "@/components/button";
import { useTreeKeyboardNav } from "@/hooks/use-tree-keyboard-nav";
import OtListMarker from "./ot-list-marker";

function OtDaysList({
    otDays = [],
    selectedDayId = null,
    onSelectDay = (otDay) => {},
    selectedOtList = null,
    loadMorePages = () => {},
    loadMorePagesDisabled = false,
    loadingMore = false,
}) {
    const groupDaysByMonth = (datesList) => {
        return datesList
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .reduce((acc, otDay) => {
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
            (row) => row.otList === selectedOtList,
        );

        return groupDaysByMonth(daysByList);
    }, [otDays, selectedOtList]);

    const treeNav = useTreeKeyboardNav();

    if (otDays.length === 0) {
        return <div className="p-1 pl-4">No days found.</div>;
    }

    return (
        <ul
            ref={treeNav.ref}
            onKeyDown={treeNav.onKeyDown}
            className="flex flex-col overflow-y-auto overscroll-contain grow"
        >
            {Object.keys(daysByMonth).map((month, index) => (
                <li key={index} className=" text-gray-700">
                    <div className="font-semibold p-1 mt-3 overflow-clip whitespace-nowrap">
                        {dayjs(month).format("MMMM YYYY")}
                    </div>
                    <ul className="flex flex-col">
                        {daysByMonth[month]
                            .sort((a, b) => new Date(a.date) - new Date(b.date))
                            .map((otDay, subIndex) => (
                                <li key={subIndex}>
                                    <Link
                                        to={`/lists/${otDay.id}`}
                                        data-tree-item
                                        aria-current={
                                            selectedDayId === otDay.id
                                                ? "true"
                                                : undefined
                                        }
                                        className={twMerge(
                                            "flex w-full hover:bg-blue-200 cursor-pointer p-1 pl-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600",
                                            selectedDayId === otDay.id
                                                ? "bg-blue-300 hover:bg-blue-300"
                                                : "bg-transparent",
                                            otDay?.disabled && "text-red-600",
                                            otDay?.disabled &&
                                                selectedDayId === otDay.id &&
                                                "text-red-700",
                                        )}
                                        onClick={() => onSelectDay(otDay.id)}
                                    >
                                        <span className="flex overflow-clip grow">
                                            <span className="overflow-clip whitespace-nowrap min-w-12">
                                                {dayjs(otDay.date).format(
                                                    "ddd",
                                                )}
                                                ,{" "}
                                            </span>
                                            <span className="col-span-2 text-ellipsis whitespace-nowrap grow">
                                                {dayjs(otDay.date).format(
                                                    "DD MMMM",
                                                )}
                                            </span>

                                            <span className="overflow-clip whitespace-nowrap">
                                                <OtListMarker
                                                    otList={
                                                        otDay?.expand?.otList
                                                    }
                                                />
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        {index === Object.keys(daysByMonth).length - 1 && (
                            <li className="p-2 text-center mb-6">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={loadMorePages}
                                    disabled={loadMorePagesDisabled}
                                    loading={loadingMore}
                                    // A disabled button cannot take focus, so
                                    // keep it out of the arrow key order
                                    data-tree-item={
                                        loadMorePagesDisabled ? undefined : true
                                    }
                                >
                                    {loadMorePagesDisabled
                                        ? "No more dates"
                                        : "Load more dates"}
                                </Button>
                            </li>
                        )}
                    </ul>
                </li>
            ))}
        </ul>
    );
}

export default OtDaysList;
