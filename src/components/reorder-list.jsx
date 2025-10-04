import React, { useMemo, useRef } from "react";
import { twMerge } from "tailwind-merge";

/**
 * Controlled DnD list (Tailwind-styled)
 * @param {Object[]} items - [{id, order, label}]
 * @param {(nextItems: Object[]) => void} onChange - updated array (orders normalized 0..n-1)
 * @param {(item: Object) => React.ReactNode} itemRender - optional custom renderer
 */
export default function ReorderList({
    items,
    onChange,
    itemRender,
    disabled = false,
    itemClassName,
}) {
    const dragIdRef = useRef(null);

    const ordered = useMemo(
        () => [...items].sort((a, b) => a.order - b.order),
        [items]
    );

    const handleDragStart = (e, id) => {
        dragIdRef.current = id;
        e.dataTransfer.setData("text/plain", String(id));
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e, overId) => {
        e.preventDefault();
        const draggedId =
            dragIdRef.current ?? e.dataTransfer.getData("text/plain");
        if (!draggedId || draggedId === overId) return;

        const fromIndex = ordered.findIndex(
            (it) => String(it.id) === String(draggedId)
        );
        const toIndex = ordered.findIndex(
            (it) => String(it.id) === String(overId)
        );
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

        const next = [...ordered];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);

        const normalized = next.map((it, idx) => ({
            ...it,
            order: idx + 1,
        }));

        const onlyChanged = normalized.filter((it) => {
            const originalOrder = items
                .filter((oit) => oit.id === it.id)
                .at(0).order;
            if (originalOrder === it.order) {
                return false;
            }
            return true;
        });
        onChange(onlyChanged);
        dragIdRef.current = null;
    };

    const handleDragEnd = () => {
        dragIdRef.current = null;
    };

    return (
        <ul
            role="listbox"
            aria-label="Reorder list"
            className="grid p-0 m-0 list-none"
        >
            {ordered.map((item) => (
                <li
                    key={item.id}
                    draggable={!!!disabled}
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, item.id)}
                    onDragEnd={handleDragEnd}
                    role="option"
                    aria-grabbed={dragIdRef.current === item.id}
                    className={twMerge("group flex select-none", itemClassName)}
                >
                    {itemRender ? (
                        <>
                            <div
                                className={twMerge(
                                    "p-2 hidden md:block",
                                    !!!disabled && "cursor-grab"
                                )}
                            >
                                <span
                                    className={twMerge(
                                        "invisible group-hover:visible",
                                        !!disabled && "text-gray-500"
                                    )}
                                >
                                    ⠿
                                </span>
                            </div>
                            <div
                                className="grow"
                                draggable
                                onDragStart={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                            >
                                {itemRender(item)}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500">#{item.order}</span>
                            <span className="font-medium">{item.label}</span>
                            <span className="ml-auto inline-flex items-center text-xs text-gray-400">
                                ⠿
                            </span>
                        </div>
                    )}
                </li>
            ))}
        </ul>
    );
}
