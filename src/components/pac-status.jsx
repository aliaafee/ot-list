import { formatDate } from "@/utils/dates";
import { ArrowRight, PlusIcon } from "lucide-react";
import { useState, useEffect, Fragment } from "react";
import { twMerge } from "tailwind-merge";
import AddPacStatusModal from "@/modals/add-pac-status-modal";
import { pb } from "@/lib/pb";
import { getStatusColor } from "@/utils/colours";

/**
 * Small compact PAC status indicator
 * Displays a condensed badge showing the current PAC (Pre-Anesthetic Clearance) status
 *
 * @param {Object} props - Component props
 * @param {string} props.status - The PAC status value (e.g., "cleared", "inreview", "referred", "unfit")
 * @param {string} [props.className] - Optional additional CSS classes to apply
 * @returns {JSX.Element} A compact status badge
 */
export function PacStatusSmall({ status, className }) {
    /**
     * Convert status value to display label
     * @param {string} status - The PAC status value
     * @returns {string} Human-readable label for the status
     */
    const getStatusLabel = (status) => {
        if (!status) return "N/A";
        switch (status.toLowerCase()) {
            case "cleared":
                return "Cleared";
            case "inreview":
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
                "rounded-sm px-2 py-0.5 text-xs overflow-hidden",
                getStatusColor(status),
                className,
            )}
            title={`PAC: ${status || "Unknown"}`}
        >
            {getStatusLabel(status)}
        </span>
    );
}

/**
 * Full PAC status display with timeline
 * Shows the complete history of PAC statuses for a procedure with dates and transitions.
 * Includes real-time updates via PocketBase subscriptions and allows adding new statuses.
 *
 * @param {Object} props - Component props
 * @param {string} props.procedureId - The ID of the procedure to display PAC statuses for
 * @param {string} [props.className] - Optional additional CSS classes to apply
 * @param {boolean} [props.showLabel=true] - Whether to show the "PAC Status" label above the timeline
 * @returns {JSX.Element} A timeline view of PAC status history with add functionality
 */
export function PacStatus({ procedureId, className, showLabel = true }) {
    const [statuses, setStatuses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    const appendStatus = (status) => {
        setStatuses((prev) => {
            if (prev.some((s) => s.id === status.id)) {
                return prev; // Status already exists, do not add
            }
            return [...prev, status];
        });
    };

    useEffect(() => {
        if (!procedureId) return;

        const filter = pb.filter("procedure = {:procedureId}", {
            procedureId: procedureId,
        });

        let cancelled = false;
        let unsubscribe;

        const fetchPacStatuses = async () => {
            setLoading(true);
            try {
                const records = await pb
                    .collection("procedurePacStatuses")
                    .getList(1, 50, { filter, sort: "+created" });
                if (cancelled) return;
                setStatuses(records.items);
            } catch (error) {
                if (cancelled) return;
                console.error("Failed to fetch PAC statuses:", error);
                setStatuses([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchPacStatuses();

        const handleEvent = (e) => {
            if (e.record.procedure !== procedureId) return;

            if (e.action === "create") {
                appendStatus(e.record);
            } else if (e.action === "update") {
                setStatuses((prev) =>
                    prev.map((s) => (s.id === e.record.id ? e.record : s)),
                );
            } else if (e.action === "delete") {
                setStatuses((prev) => prev.filter((s) => s.id !== e.record.id));
            }
        };

        // Subscribe to real-time updates.
        //
        // The filter is passed to subscribe as well as to the fetch above, and
        // it is what makes switching procedures work. Selecting another
        // procedure unmounts this component and mounts a new one in the same
        // commit, so the old subscription is dropped and the new one created
        // together. PocketBase builds its subscription key from the topic plus
        // these options and decides whether to re-attach its event listeners by
        // comparing only the set of keys against the one it last sent. Without
        // the filter both subscriptions share the key "procedurePacStatuses/*",
        // the set looks unchanged, and the new listener is registered but never
        // attached to the event source, so no events arrive. Including the
        // procedure in the filter gives each one a distinct key, and also means
        // the server only sends events for this procedure.
        (async () => {
            try {
                const off = await pb
                    .collection("procedurePacStatuses")
                    .subscribe("*", handleEvent, { filter });
                if (cancelled) {
                    off();
                    return;
                }
                unsubscribe = off;
            } catch (error) {
                console.error("Error subscribing to PAC statuses:", error);
            }
        })();

        return () => {
            cancelled = true;
            if (unsubscribe) unsubscribe();
        };
    }, [procedureId]);

    /**
     * Convert status value to full display text
     * @param {string} status - The PAC status value
     * @returns {string} Full text description of the status
     */
    const getStatusText = (status) => {
        if (!status) return "N/A";
        switch (status.toLowerCase()) {
            case "cleared":
                return "Cleared";
            case "inreview":
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
            <div className={twMerge("flex flex-col flex-wrap", className)}>
                {showLabel && (
                    <span className="text-xs text-gray-700">PAC Status</span>
                )}

                <div className="flex gap-1 flex-wrap p-1 items-start bg-white rounded-sm">
                    <div className="flex flex-col items-center">
                        <div className="inline-flex items-center px-3 py-1 rounded-lg text-sm border bg-gray-200 border-gray-200 hover:bg-gray-400 hover:border-gray-400 cursor-pointer animate-pulse">
                            Loading...
                        </div>
                        <span className="text-xs text-gray-500">&nbsp;</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={twMerge("flex flex-col flex-wrap", className)}>
            {showLabel && (
                <div className="text-xs text-gray-700">PAC Status</div>
            )}
            <div className="flex gap-1 flex-wrap p-1 items-start bg-white rounded-sm">
                {statuses.map((item) => (
                    <Fragment key={item.id}>
                        <div className="flex flex-col items-center">
                            <span
                                className={twMerge(
                                    "inline-flex items-center px-3 py-1 rounded-lg text-sm border",
                                    getStatusColor(item.pacStatus),
                                )}
                            >
                                {getStatusText(item.pacStatus)}
                            </span>

                            <span className="text-xs text-gray-500">
                                {formatDate(item.created)}
                            </span>
                        </div>
                        <div className="flex items-center">
                            <ArrowRight
                                width={16}
                                height={16}
                                className="mt-2"
                            />
                        </div>
                    </Fragment>
                ))}

                <div className="flex flex-col items-center" key="add-button">
                    <div
                        className="inline-flex items-center pl-2 pr-3 py-1 rounded-lg text-sm border bg-gray-200 border-gray-200 hover:bg-gray-400 hover:border-gray-400 cursor-pointer"
                        onClick={() => setShowAddModal(true)}
                    >
                        <PlusIcon width={16} height={16} className="mr-1" />
                        Add
                    </div>
                    <span className="text-xs text-gray-500">&nbsp;</span>
                </div>
            </div>

            {showAddModal && (
                <AddPacStatusModal
                    procedureId={procedureId}
                    onCancel={() => setShowAddModal(false)}
                    onSuccess={(newStatusItem) => {
                        appendStatus(newStatusItem);
                        setShowAddModal(false);
                    }}
                />
            )}
        </div>
    );
}
