import { formatDate, formatTime } from "@/utils/dates";
import { ArrowRight, PlusIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { twMerge } from "tailwind-merge";
import AddPacStatusModal from "@/modals/add-pac-status-modal";
// import { pb } from "@/lib/pb";

/**
 * Small compact PAC status indicator
 */
export function PacStatusSmall({ status, className }) {
    const getStatusColor = (status) => {
        if (!status) return "bg-gray-transparent";
        switch (status.toLowerCase()) {
            case "cleared":
                return "bg-green-500 text-white";
            case "in-review":
                return "bg-blue-500 text-white";
            case "referred":
                return "bg-yellow-500 text-white";
            case "unfit":
                return "bg-red-500 text-white";
            default:
                return "bg-gray-400 text-white";
        }
    };

    const getStatusLabel = (status) => {
        if (!status) return "N/A";
        switch (status.toLowerCase()) {
            case "cleared":
                return "Cleared";
            case "in-review":
                return "Review";
            case "referred":
                return "Referred";
            case "unfit":
                return "Unfit";
            default:
                return "N/A";
        }
    };

    return (
        <span
            className={twMerge(
                "rounded-e-full rounded-l-full px-3 py-0.5 text-xs overflow-hidden",
                getStatusColor(status),
                className
            )}
            title={`PAC: ${status || "Unknown"}`}
        >
            {getStatusLabel(status)}
        </span>
    );
}

/**
 * Full PAC status display with timeline
 */
export function PacStatus({ procedureId, className, showLabel = true }) {
    const [statuses, setStatuses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        if (!procedureId) return;

        const fetchPacStatuses = async () => {
            setLoading(true);
            try {
                // TODO: Replace with actual PocketBase query
                // const records = await pb.collection("pacStatuses").getList(1, 50, {
                //   filter: `procedure = "${procedureId}"`,
                //   sort: "+time",
                // });
                // setStatuses(records.items);

                // Placeholder mock data
                const mockStatuses = [
                    {
                        id: "1",
                        status: "in-review",
                        time: new Date().toISOString(),
                    },
                    {
                        id: "2",
                        status: "referred",
                        time: new Date(Date.now() - 86400000).toISOString(),
                    },
                    {
                        id: "3",
                        status: "referred",
                        time: new Date(Date.now() - 86400000).toISOString(),
                    },
                    {
                        id: "4",
                        status: "referred",
                        time: new Date(Date.now() - 86400000).toISOString(),
                    },
                    {
                        id: "5",
                        status: "referred",
                        time: new Date(Date.now() - 86400000).toISOString(),
                    },
                    {
                        id: "6",
                        status: "referred",
                        time: new Date(Date.now() - 86400000).toISOString(),
                    },
                ];
                setStatuses([]);
            } catch (error) {
                console.error("Failed to fetch PAC statuses:", error);
                setStatuses([]);
            } finally {
                setLoading(false);
            }
        };

        fetchPacStatuses();
    }, [procedureId]);

    const getStatusColor = (status) => {
        if (!status) return "bg-gray-100 text-gray-800 border-gray-300";
        switch (status.toLowerCase()) {
            case "cleared":
                return "bg-green-100 text-green-800 border-green-300";
            case "in-review":
                return "bg-blue-100 text-blue-800 border-blue-300";
            case "referred":
                return "bg-yellow-100 text-yellow-800 border-yellow-300";
            case "unfit":
                return "bg-red-100 text-red-800 border-red-300";
            default:
                return "bg-gray-100 text-gray-600 border-gray-300";
        }
    };

    const getStatusText = (status) => {
        if (!status) return "N/A";
        switch (status.toLowerCase()) {
            case "cleared":
                return "Cleared";
            case "in-review":
                return "In Review";
            case "referred":
                return "Referred";
            case "unfit":
                return "Unfit";
            default:
                return "Unknown";
        }
    };

    if (loading) {
        return (
            <div
                className={twMerge("inline-flex items-center gap-2", className)}
            >
                {showLabel && (
                    <span className="text-sm font-medium text-gray-700">
                        PAC:
                    </span>
                )}
                <span className="text-sm text-gray-500">Loading...</span>
            </div>
        );
    }

    return (
        <div className={twMerge("flex gap-2 flex-wrap", className)}>
            {showLabel && (
                <div className="text-xs text-gray-700">PAC Status</div>
            )}
            <div className="flex gap-1 flex-wrap p-1 items-start">
                {statuses.map((item) => (
                    <>
                        <div
                            key={item.id}
                            className="flex flex-col items-center "
                        >
                            <span className="flex items-center gap-2">
                                <span
                                    className={twMerge(
                                        "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border",
                                        getStatusColor(item.status)
                                    )}
                                >
                                    {getStatusText(item.status)}
                                </span>
                            </span>
                            <span className="text-xs text-gray-500">
                                {formatDate(item.time)}
                            </span>
                            {/* <span className="text-xs text-gray-500">
                                {formatTime(item.time)}
                            </span> */}
                        </div>
                        <div
                            key={`arrow-${item.id}`}
                            className="flex items-center"
                        >
                            <ArrowRight
                                width={16}
                                height={16}
                                className="mt-2"
                            />
                        </div>
                    </>
                ))}
                <div
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border bg-gray-400 border-gray-400 cursor-pointer hover:bg-gray-500 transition-colors"
                    onClick={() => setShowAddModal(true)}
                >
                    <PlusIcon width={16} height={16} className="mr-1" />
                    Add
                </div>
            </div>

            {showAddModal && (
                <AddPacStatusModal
                    procedureId={procedureId}
                    onCancel={() => setShowAddModal(false)}
                    onSuccess={(newStatusItem) => {
                        setStatuses([...statuses, newStatusItem]);
                        setShowAddModal(false);
                    }}
                />
            )}
        </div>
    );
}
