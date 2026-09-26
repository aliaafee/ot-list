import { useEffect, useState } from "react";
import { PlusIcon, TrashIcon } from "lucide-react";

import ReorderList from "@/components/reorder-list";
import { pb } from "@/lib/pb";
import { GROUPS, ITEM_KEY_PATTERN } from "@/lib/checklists";

/**
 * ChecklistTemplateItems - the items of one checklist template
 *
 * Ordering runs per group rather than over the whole list, because `position`
 * is only ever compared within a group (spec section 4) - one list spanning
 * groups would produce an order that means nothing. Moving an item between
 * groups is a change to `group`, not a drag across headings.
 *
 * @param {Object} props - Component props
 * @param {Object} props.template - The template whose items to edit
 * @param {function} props.onChanged - Called after any write, so the page can
 *   tell the preview it is showing older data
 * @returns {JSX.Element} The item editor for a template
 */
function ChecklistTemplateItems({ template, onChanged = () => {} }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);
    const [error, setError] = useState("");
    const [draft, setDraft] = useState({
        itemKey: "",
        label: "",
        group: "preop",
        required: true,
    });

    useEffect(() => {
        if (!template) return;

        let ignore = false;
        (async () => {
            try {
                const records = await pb
                    .collection("checklistTemplateItems")
                    .getFullList({
                        filter: pb.filter("template = {:template}", {
                            template: template.id,
                        }),
                        sort: "+position",
                    });
                if (ignore) return;
                setItems(records);
                setError("");
            } catch (err) {
                if (ignore) return;
                console.error("Error loading template items:", err);
                setError("Failed to load items.");
            } finally {
                if (!ignore) setLoading(false);
            }
        })();

        return () => {
            ignore = true;
        };
    }, [template, reloadKey]);

    const reload = () => {
        setReloadKey((key) => key + 1);
        onChanged();
    };

    const addItem = async () => {
        setError("");
        const itemKey = draft.itemKey.trim();
        const label = draft.label.trim();

        if (!itemKey || !label) {
            setError("An item needs a key and a label.");
            return;
        }
        if (!ITEM_KEY_PATTERN.test(itemKey)) {
            setError(
                "Key must be lower-case words separated by hyphens, e.g. consent-signed.",
            );
            return;
        }
        if (items.some((item) => item.itemKey === itemKey)) {
            setError(`This template already has an item keyed ${itemKey}.`);
            return;
        }

        const inGroup = items.filter((item) => item.group === draft.group);
        try {
            await pb.collection("checklistTemplateItems").create({
                template: template.id,
                itemKey,
                label,
                hint: "",
                required: draft.required,
                group: draft.group,
                position: inGroup.length,
            });
            setDraft({ ...draft, itemKey: "", label: "" });
            reload();
        } catch (err) {
            console.error("Error adding item:", err);
            setError(err?.message || "Failed to add item.");
        }
    };

    const removeItem = async (id) => {
        try {
            await pb.collection("checklistTemplateItems").delete(id);
            reload();
        } catch (err) {
            console.error("Error deleting item:", err);
            setError("Failed to delete item.");
        }
    };

    const moveGroup = async (item, group) => {
        const inGroup = items.filter(
            (other) => other.group === group && other.id !== item.id,
        );
        try {
            await pb
                .collection("checklistTemplateItems")
                .update(item.id, { group, position: inGroup.length });
            reload();
        } catch (err) {
            console.error("Error moving item:", err);
            setError("Failed to move item.");
        }
    };

    // ReorderList hands back orders normalised 0..n-1, which is exactly what
    // `position` means inside a group.
    const reorder = async (updated) => {
        try {
            await Promise.all(
                updated.map((row) =>
                    pb
                        .collection("checklistTemplateItems")
                        .update(row.id, { position: row.order }),
                ),
            );
            reload();
        } catch (err) {
            console.error("Error reordering items:", err);
            setError("Failed to save the new order.");
        }
    };

    if (!template) {
        return (
            <div className="text-sm text-gray-500 py-4">
                Select a template to edit its items.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {!!error && (
                <div className="bg-red-400/20 rounded-md p-2 text-sm">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="text-sm text-gray-500">Loading items...</div>
            ) : (
                GROUPS.map((group) => {
                    const inGroup = items
                        .filter((item) => item.group === group.value)
                        .map((item) => ({ ...item, order: item.position }));

                    return (
                        <div key={group.value}>
                            <div className="text-xs font-semibold text-gray-500 mt-2">
                                {group.label}
                            </div>
                            {inGroup.length === 0 ? (
                                <div className="text-xs text-gray-400 py-1">
                                    No items
                                </div>
                            ) : (
                                <ReorderList
                                    items={inGroup}
                                    onChange={reorder}
                                    itemClassName="bg-white rounded-md border border-gray-200"
                                    itemRender={(item) => (
                                        <div className="flex items-center gap-2 w-full text-sm py-1 pr-2">
                                            <span className="font-mono text-xs text-gray-500 shrink-0">
                                                {item.itemKey}
                                            </span>
                                            <span className="grow">
                                                {item.label}
                                            </span>
                                            {!item.required && (
                                                <span className="text-xs text-gray-500">
                                                    advisory
                                                </span>
                                            )}
                                            <select
                                                className="text-xs border border-gray-300 rounded bg-white"
                                                value={item.group}
                                                title="Move to another group"
                                                onChange={(e) =>
                                                    moveGroup(
                                                        item,
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                {GROUPS.map((option) => (
                                                    <option
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                className="text-red-600 hover:bg-red-100 rounded p-1 cursor-pointer"
                                                title="Delete item"
                                                onClick={() =>
                                                    removeItem(item.id)
                                                }
                                            >
                                                <TrashIcon size={14} />
                                            </button>
                                        </div>
                                    )}
                                />
                            )}
                        </div>
                    );
                })
            )}

            <div className="flex flex-wrap items-center gap-2 mt-3 p-2 bg-gray-100 rounded-md">
                <input
                    className="text-sm py-1 px-2 rounded border border-gray-300 bg-white font-mono w-48"
                    placeholder="item-key"
                    value={draft.itemKey}
                    onChange={(e) =>
                        setDraft({ ...draft, itemKey: e.target.value })
                    }
                />
                <input
                    className="text-sm py-1 px-2 rounded border border-gray-300 bg-white grow min-w-48"
                    placeholder="Label shown on the checklist"
                    value={draft.label}
                    onChange={(e) =>
                        setDraft({ ...draft, label: e.target.value })
                    }
                />
                <select
                    className="text-sm py-1 px-2 rounded border border-gray-300 bg-white"
                    value={draft.group}
                    onChange={(e) =>
                        setDraft({ ...draft, group: e.target.value })
                    }
                >
                    {GROUPS.map((group) => (
                        <option key={group.value} value={group.value}>
                            {group.label}
                        </option>
                    ))}
                </select>
                <label className="text-sm flex items-center gap-1 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={draft.required}
                        onChange={(e) =>
                            setDraft({ ...draft, required: e.target.checked })
                        }
                    />
                    Required
                </label>
                <button
                    type="button"
                    className="flex items-center gap-1 text-sm px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
                    onClick={addItem}
                >
                    <PlusIcon size={14} />
                    Add
                </button>
            </div>
        </div>
    );
}

export default ChecklistTemplateItems;
