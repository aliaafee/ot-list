import { useState, useEffect } from "react";
import {
    TriangleAlertIcon,
    MessageSquarePlusIcon,
    PlusIcon,
    TrashIcon,
} from "lucide-react";
import { twMerge } from "tailwind-merge";

import Collapsible from "./collapsible";
import AddChecklistItemModal from "@/modals/add-checklist-item-modal";
import { pb } from "@/lib/pb";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { formatDateTime } from "@/utils/dates";
import { GROUP_LABEL, withGroupHeadings } from "@/lib/checklists";

/**
 * ProcedureChecklist - the checklist assembled for a procedure
 *
 * Items are generated server-side from templates when the procedure is added
 * and whenever its codes change (specs/checklists/README.md). This component
 * only renders them and records ticks and comments.
 *
 * Renders its own collapsible section, because the summary carries a count of
 * the items still outstanding and that count comes from the data this
 * component loads.
 *
 * @param {Object} props - Component props
 * @param {string} props.procedureId - Procedure whose checklist to show
 * @param {string} [props.className] - Optional classes for the section
 * @param {boolean} [props.defaultOpen=false] - Whether it starts expanded
 * @returns {JSX.Element} A collapsible checklist
 */
function ProcedureChecklist({
    procedureId,
    className = "",
    defaultOpen = false,
}) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [commentingId, setCommentingId] = useState(null);
    const [commentDraft, setCommentDraft] = useState("");
    const [showAdd, setShowAdd] = useState(false);

    // Ticking and commenting are both doctor/admin only, enforced again in the
    // route - this just keeps the controls out of a receptionist's way.
    const { canEdit } = useAuth();

    useEffect(() => {
        if (!procedureId) return;

        const filter = pb.filter("procedure = {:procedureId}", {
            procedureId: procedureId,
        });

        let cancelled = false;
        let unsubscribe;

        const fetchItems = async () => {
            setLoading(true);
            try {
                const records = await pb
                    .collection("procedureChecklistItems")
                    .getFullList({
                        filter,
                        sort: "+position",
                        expand: "commentBy,checkedBy",
                    });
                if (cancelled) return;
                setItems(records);
            } catch (error) {
                if (cancelled) return;
                console.error("Failed to fetch checklist:", error);
                setItems([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchItems();

        const handleEvent = (e) => {
            if (e.record.procedure !== procedureId) return;

            if (e.action === "create") {
                setItems((prev) =>
                    prev.some((i) => i.id === e.record.id)
                        ? prev
                        : [...prev, e.record].sort(
                              (a, b) => a.position - b.position,
                          ),
                );
            } else if (e.action === "update") {
                setItems((prev) =>
                    prev
                        .map((i) => (i.id === e.record.id ? e.record : i))
                        .sort((a, b) => a.position - b.position),
                );
            } else if (e.action === "delete") {
                setItems((prev) => prev.filter((i) => i.id !== e.record.id));
            }
        };

        // The filter is passed to subscribe as well as to the fetch, and it is
        // what makes switching procedures work. Selecting another procedure
        // unmounts this component and mounts a new one in the same commit;
        // without the filter both subscriptions share the key
        // "procedureChecklistItems/*", PocketBase sees an unchanged key set and
        // skips re-attaching its listeners, and the new one never fires.
        (async () => {
            try {
                const off = await pb
                    .collection("procedureChecklistItems")
                    .subscribe("*", handleEvent, {
                        filter,
                        expand: "commentBy,checkedBy",
                    });
                if (cancelled) {
                    off();
                    return;
                }
                unsubscribe = off;
            } catch (error) {
                console.error("Error subscribing to checklist:", error);
            }
        })();

        return () => {
            cancelled = true;
            if (unsubscribe) unsubscribe();
        };
    }, [procedureId]);

    /** Optimistically patch one row, then send. */
    const update = async (item, changes, optimistic) => {
        const before = items;
        setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, ...optimistic } : i)),
        );
        try {
            await api.setChecklistItem(item.id, changes);
        } catch (error) {
            console.error("Failed to update checklist item:", error);
            setItems(before);
        }
    };

    const toggleItem = (item) =>
        update(item, { checked: !item.checked }, { checked: !item.checked });

    const saveComment = async (item) => {
        const comment = commentDraft.trim();
        setCommentingId(null);
        if (comment === (item.comment || "")) return;
        await update(item, { comment }, { comment });
    };

    const appendItem = (created) => {
        setItems((prev) =>
            prev.some((i) => i.id === created.id)
                ? prev
                : [...prev, created].sort((a, b) => a.position - b.position),
        );
        setShowAdd(false);
    };

    const removeCustomItem = async (item) => {
        const before = items;
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        try {
            await api.removeChecklistItem(item.id);
        } catch (error) {
            console.error("Failed to remove checklist item:", error);
            setItems(before);
        }
    };

    // A comment does not make an item done: "awaiting cross-match" against an
    // outstanding item is still outstanding, and that is the point of it.
    const outstanding = items.filter(
        (i) => i.required && i.applicable && !i.checked,
    ).length;

    const rows = withGroupHeadings(items);

    return (
        <Collapsible
            className={className}
            summaryClassName="text-sm font-semibold"
            defaultOpen={defaultOpen}
            summary={
                <>
                    Checklist
                    {outstanding > 0 && (
                        <span className="ml-2 flex items-center gap-1 font-normal text-xs text-red-600">
                            <TriangleAlertIcon size={14} aria-hidden="true" />
                            {outstanding} of {items.length} incomplete
                        </span>
                    )}
                </>
            }
        >
            {loading ? (
                <div className="text-xs text-gray-500 py-2 ml-4">
                    Loading checklist...
                </div>
            ) : items.length === 0 ? (
                <div className="text-xs text-gray-500 py-2 ml-4">
                    No checklist items
                </div>
            ) : (
                <ul className="flex flex-col py-1 ml-4">
                    {rows.map((row) =>
                        row.heading ? (
                            <li
                                key={row.key}
                                className="text-sm font-semibold text-gray-500 mt-2 first:mt-0"
                            >
                                {GROUP_LABEL[row.heading] || row.heading}
                            </li>
                        ) : (
                            <li key={row.key} className="py-0.5">
                                <div className="flex items-center gap-2">
                                    <label
                                        className={twMerge(
                                            "flex items-center gap-2",
                                            canEdit
                                                ? "cursor-pointer"
                                                : "cursor-default",
                                        )}
                                    >
                                        <input
                                            type="checkbox"
                                            className={
                                                canEdit
                                                    ? "cursor-pointer"
                                                    : "cursor-default"
                                            }
                                            checked={!!row.item.checked}
                                            disabled={
                                                !canEdit || !row.item.applicable
                                            }
                                            onChange={() =>
                                                toggleItem(row.item)
                                            }
                                        />
                                        <span
                                            className={twMerge(
                                                !row.item.applicable &&
                                                    "line-through text-gray-400",
                                                row.item.checked &&
                                                    "line-through text-gray-500",
                                                !row.item.required &&
                                                    "text-gray-600",
                                            )}
                                            title={
                                                row.item.applicable
                                                    ? row.item.hint || undefined
                                                    : "No longer applies to this procedure"
                                            }
                                        >
                                            {row.item.label}
                                        </span>
                                    </label>
                                    {canEdit &&
                                        commentingId !== row.item.id && (
                                            <button
                                                type="button"
                                                className="text-gray-400 hover:text-blue-600 cursor-pointer shrink-0"
                                                title="Add a note"
                                                onClick={() => {
                                                    setCommentingId(
                                                        row.item.id,
                                                    );
                                                    setCommentDraft(
                                                        row.item.comment || "",
                                                    );
                                                }}
                                            >
                                                <MessageSquarePlusIcon
                                                    size={14}
                                                />
                                            </button>
                                        )}
                                    {canEdit && row.item.custom && (
                                        <button
                                            type="button"
                                            className="text-gray-400 hover:text-red-600 cursor-pointer shrink-0"
                                            title="Remove this custom item"
                                            onClick={() =>
                                                removeCustomItem(row.item)
                                            }
                                        >
                                            <TrashIcon size={14} />
                                        </button>
                                    )}
                                </div>

                                {commentingId === row.item.id ? (
                                    <input
                                        autoFocus
                                        type="text"
                                        className="ml-6 mt-1 text-xs py-0.5 px-1 rounded border border-gray-300 bg-white w-full max-w-md"
                                        placeholder="Note, e.g. awaiting cross-match"
                                        value={commentDraft}
                                        onChange={(e) =>
                                            setCommentDraft(e.target.value)
                                        }
                                        onBlur={() => saveComment(row.item)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                saveComment(row.item);
                                            } else if (e.key === "Escape") {
                                                setCommentingId(null);
                                            }
                                        }}
                                    />
                                ) : (
                                    !!row.item.comment && (
                                        <div className="ml-6 text-xs text-gray-600">
                                            {row.item.comment}
                                            <span className="text-gray-400">
                                                {" — "}
                                                {row.item.expand?.commentBy
                                                    ?.name || "Unknown"}
                                                {row.item.commentAt
                                                    ? `, ${formatDateTime(row.item.commentAt)}`
                                                    : ""}
                                            </span>
                                        </div>
                                    )
                                )}
                            </li>
                        ),
                    )}
                </ul>
            )}

            {/* Outside the list, so an empty checklist can still be added to.
                The form itself is a modal rather than an inline row: on a
                phone an inline row of input, select and two buttons wraps into
                an unusable stack. */}
            {canEdit && (
                <button
                    type="button"
                    className="ml-3 mt-2 flex items-center gap-1 text-blue-600 hover:bg-blue-100 rounded px-1 py-0.5 cursor-pointer"
                    onClick={() => setShowAdd(true)}
                >
                    <PlusIcon size={14} />
                    Add an item for this procedure
                </button>
            )}

            {showAdd && (
                <AddChecklistItemModal
                    procedureId={procedureId}
                    onCancel={() => setShowAdd(false)}
                    onSuccess={appendItem}
                />
            )}
        </Collapsible>
    );
}

export default ProcedureChecklist;
