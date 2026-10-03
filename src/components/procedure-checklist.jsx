import { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import {
    TriangleAlertIcon,
    MessageSquarePlusIcon,
    PlusIcon,
    TrashIcon,
    RefreshCwIcon,
    UserRoundXIcon,
    UserRoundPenIcon,
} from "lucide-react";
import { twMerge } from "tailwind-merge";

import Collapsible from "./collapsible";
import AddChecklistItemModal from "@/modals/add-checklist-item-modal";
import EditPatientModal from "@/modals/edit-patient-modal";
import { pb } from "@/lib/pb";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useProcedureList } from "@/contexts/procedure-list-context";
import { formatDateTime } from "@/utils/dates";
import {
    GROUP_LABEL,
    PATIENT_FACT_LABEL,
    SEX_LABEL,
    describeCriteria,
    patientChanges,
    withGroupHeadings,
} from "@/lib/checklists";

function capitalise(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "12 Mar 2009", "Female", or "not recorded" - one side of a change. */
function describePatientValue(field, value) {
    if (!value) return "not recorded";
    if (field === "dateOfBirth") return dayjs(value).format("DD MMM YYYY");
    return SEX_LABEL[value] || value;
}

/** "2 items added, 1 no longer applies" - what a rebuild did, or "no changes". */
function describeRebuild({ added, removed, madeInapplicable, restored }) {
    const plural = (n, word) => `${n} item${n === 1 ? "" : "s"} ${word}`;
    const parts = [];
    if (added) parts.push(plural(added, "added"));
    if (removed) parts.push(plural(removed, "removed"));
    if (madeInapplicable) {
        parts.push(
            `${madeInapplicable} no longer ${madeInapplicable === 1 ? "applies" : "apply"}`,
        );
    }
    if (restored) parts.push(plural(restored, "restored"));
    return parts.length ? parts.join(", ") : "no changes";
}

/**
 * ProcedureChecklist - the checklist assembled for a procedure
 *
 * Items are generated server-side from templates when the procedure is added
 * and whenever its codes, day or patient change (specs/checklists/README.md).
 * This component renders them, records ticks and comments, and says when the
 * checklist may be short: a date of birth or sex it needed was not recorded,
 * or the patient's details have changed since it was built.
 *
 * Renders its own collapsible section, because the summary carries a count of
 * the items still outstanding and that count comes from the data this
 * component loads.
 *
 * @param {Object} props - Component props
 * @param {Object} props.procedure - Procedure whose checklist to show, with
 *   `patient` and `procedureDay` expanded
 * @param {string} [props.className] - Optional classes for the section
 * @param {boolean} [props.defaultOpen=false] - Whether it starts expanded
 * @param {number} [props.focusKey=0] - Open the checklist and scroll to it
 *   whenever this changes to a non-zero value, including on mount
 * @returns {JSX.Element} A collapsible checklist
 */
function ProcedureChecklist({
    procedure,
    className = "",
    defaultOpen = false,
    focusKey = 0,
}) {
    const procedureId = procedure?.id;
    const sectionRef = useRef(null);

    // Held here rather than left to Collapsible, so a request to focus can
    // open it again after it has been closed. Adjusted during render when the
    // key changes, so it opens in the same pass rather than after a flash.
    const [open, setOpen] = useState(defaultOpen || !!focusKey);
    const [seenFocusKey, setSeenFocusKey] = useState(focusKey);
    if (focusKey !== seenFocusKey) {
        setSeenFocusKey(focusKey);
        if (focusKey) setOpen(true);
    }

    // Asked for from an outstanding-items alert. Brings the heading to the
    // top; the items fill in below it as they load.
    useEffect(() => {
        if (!focusKey) return;
        sectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }, [focusKey]);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [commentingId, setCommentingId] = useState(null);
    const [commentDraft, setCommentDraft] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [rebuilding, setRebuilding] = useState(false);
    const [editingPatient, setEditingPatient] = useState(false);

    // Ticking and commenting are both doctor/admin only, enforced again in the
    // route - this just keeps the controls out of a receptionist's way.
    const { canEdit } = useAuth();
    const { showToast } = useProcedureList();

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

    // The rebuilt rows arrive through the subscription above, and the
    // refreshed basis through the procedure list's, so nothing is refetched
    // here.
    const rebuild = async () => {
        setRebuilding(true);
        try {
            const result = await api.rebuildChecklist(procedureId);
            showToast(`Checklist rebuilt: ${describeRebuild(result)}`);
        } catch (error) {
            console.error("Failed to rebuild checklist:", error);
            showToast(error?.message || "Failed to rebuild checklist", "error");
        } finally {
            setRebuilding(false);
        }
    };

    // A comment does not make an item done: "awaiting cross-match" against an
    // outstanding item is still outstanding, and that is the point of it.
    const outstanding = items.filter(
        (i) => i.required && i.applicable && !i.checked,
    ).length;

    const rows = withGroupHeadings(items);

    // Both patient notices are for today and future procedures only. A past
    // procedure's checklist records what was asked on the day, and neither a
    // patient edit nor a rebuild will change it - spec section 8.1. Same
    // cut-off as the server's: the day's date against today's.
    const dayDate = procedure?.expand?.procedureDay?.date;
    const isPast =
        !!dayDate &&
        String(dayDate).slice(0, 10) < dayjs().format("YYYY-MM-DD");

    const canRebuild = !isPast && !procedure?.removed;

    const changed = isPast
        ? []
        : patientChanges(
              procedure?.checklistPatientBasis,
              procedure?.expand?.patient,
          );
    // When the details changed, only that notice shows: it is the one with an
    // action, and the rebuild brings the missing-facts notice back if it
    // still applies.
    const missing =
        isPast || changed.length ? [] : procedure?.checklistMissingFacts || [];

    return (
        <Collapsible
            ref={sectionRef}
            // Clears the sticky header, as the list rows do.
            className={twMerge("scroll-mt-28 lg:scroll-mt-12", className)}
            summaryClassName="text-sm font-semibold"
            open={open}
            onOpenChange={setOpen}
            summary={
                <>
                    Checklist
                    {outstanding > 0 && (
                        <span className="ml-2 flex items-center gap-1 font-normal text-xs text-red-600">
                            <TriangleAlertIcon size={14} aria-hidden="true" />
                            {outstanding} of {items.length} incomplete
                        </span>
                    )}
                    {/* The count covers only items that exist, so a short
                        list must not read as "nothing to do". */}
                    {changed.length > 0 && (
                        <span className="ml-2 flex items-center gap-1 font-normal text-xs text-amber-700">
                            <UserRoundPenIcon size={14} aria-hidden="true" />
                            Patient details changed
                        </span>
                    )}
                    {missing.length > 0 && (
                        <span className="ml-2 flex items-center gap-1 font-normal text-xs text-amber-700">
                            <UserRoundXIcon size={14} aria-hidden="true" />
                            Items left out
                        </span>
                    )}
                </>
            }
        >
            {changed.length > 0 && (
                <div className="ml-4 mb-2 bg-amber-50 border border-amber-400 rounded-md p-2 text-xs text-amber-800">
                    <div className="font-semibold">
                        Patient details have changed since this checklist was
                        built
                    </div>
                    <ul className="mt-0.5">
                        {changed.map((change) => (
                            <li key={change.field}>
                                {change.field === "dateOfBirth"
                                    ? "Date of birth"
                                    : "Sex"}
                                :{" "}
                                {describePatientValue(change.field, change.from)}{" "}
                                →{" "}
                                {describePatientValue(change.field, change.to)}
                            </li>
                        ))}
                    </ul>
                    {canEdit ? (
                        <button
                            type="button"
                            className="mt-1 flex items-center gap-1 text-blue-700 hover:bg-amber-100 rounded px-1 py-0.5 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                            disabled={rebuilding}
                            onClick={rebuild}
                        >
                            <RefreshCwIcon
                                size={14}
                                className={rebuilding ? "animate-spin" : ""}
                            />
                            {rebuilding
                                ? "Rebuilding..."
                                : "Rebuild checklist"}
                        </button>
                    ) : (
                        <div className="mt-0.5 text-amber-700">
                            Items may be missing or no longer apply until a
                            doctor rebuilds it.
                        </div>
                    )}
                </div>
            )}

            {missing.length > 0 && (
                <div className="ml-4 mb-2 bg-amber-50 border border-amber-400 rounded-md p-2 text-xs text-amber-800">
                    <span className="font-semibold">
                        {capitalise(
                            missing
                                .map((f) => PATIENT_FACT_LABEL[f] || f)
                                .join(" and "),
                        )}{" "}
                        not recorded:
                    </span>{" "}
                    {missing.length > 1 ? "age- and sex" : missing[0]}
                    -specific items have been left out.
                    {canEdit && !!procedure?.expand?.patient && (
                        <button
                            type="button"
                            className="ml-1 text-blue-700 underline cursor-pointer"
                            onClick={() => setEditingPatient(true)}
                        >
                            Edit patient
                        </button>
                    )}
                </div>
            )}

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
                                        {/* Why it is on this patient's list
                                            and not another's. */}
                                        {!!describeCriteria(
                                            row.item.sourceCriteria,
                                        ) && (
                                            <span className="text-xs text-gray-400">
                                                {describeCriteria(
                                                    row.item.sourceCriteria,
                                                )}
                                            </span>
                                        )}
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
                <div className="ml-3 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <button
                        type="button"
                        className="flex items-center gap-1 text-blue-600 hover:bg-blue-100 rounded px-1 py-0.5 cursor-pointer"
                        onClick={() => setShowAdd(true)}
                    >
                        <PlusIcon size={14} />
                        Add an item for this procedure
                    </button>
                    {/* For a checklist that predates the templates, or to
                        pick up a template edit. Today and future procedures
                        only, as the route enforces; the changed-details
                        notice carries its own. */}
                    {canRebuild && changed.length === 0 && (
                        <button
                            type="button"
                            className="flex items-center gap-1 text-blue-600 hover:bg-blue-100 rounded px-1 py-0.5 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                            title="Rebuild from the current templates. Ticks, notes and added items are kept."
                            disabled={rebuilding}
                            onClick={rebuild}
                        >
                            <RefreshCwIcon
                                size={14}
                                className={rebuilding ? "animate-spin" : ""}
                            />
                            {rebuilding ? "Rebuilding..." : "Rebuild checklist"}
                        </button>
                    )}
                </div>
            )}

            {showAdd && (
                <AddChecklistItemModal
                    procedureId={procedureId}
                    onCancel={() => setShowAdd(false)}
                    onSuccess={appendItem}
                />
            )}

            {/* The patient and this procedure both come back through the
                procedure list's subscriptions, so saving is enough: entering
                the missing value rebuilds the checklist server-side and the
                notice clears when the procedure record updates. */}
            {editingPatient && (
                <EditPatientModal
                    patient={procedure?.expand?.patient}
                    onCancel={() => setEditingPatient(false)}
                    onSuccess={() => setEditingPatient(false)}
                />
            )}
        </Collapsible>
    );
}

export default ProcedureChecklist;
