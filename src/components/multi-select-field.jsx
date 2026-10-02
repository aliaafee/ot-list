import { useMemo, useState } from "react";

import SearchBox from "@/components/search-box";
import ModalWindow from "@/modals/modal-window";

/** Fewer options than this are all on screen at once, so no search box */
const SEARCH_THRESHOLD = 10;

/**
 * MultiSelectField - chips for what is chosen, and a modal to change it.
 *
 * Extracted from the table cell it started life in, so that the same picker
 * serves a table row and a form. The alternative was a second implementation
 * of the checkbox list, which would drift from this one.
 *
 * Renders no wrapper of its own: the caller supplies the cell or the labelled
 * field around it.
 *
 * @param {string} label - What is being chosen, named in the modal
 * @param {Array} options - [{ value, label, keywords }] to choose from;
 *   `keywords` is optional extra text the search matches but does not show
 * @param {Array} value - The chosen values
 * @param {function} onChange - Called with the new array of values
 * @param {boolean} [disabled] - Leaves the chips, drops the way to change them
 * @param {string} [emptyLabel] - Stands in for the chips when none are chosen
 */
function MultiSelectField({
    label,
    options = [],
    value,
    onChange,
    disabled = false,
    emptyLabel = "",
}) {
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [search, setSearch] = useState("");

    const valueLabelMap = useMemo(() => {
        const map = {};
        options.forEach((option) => {
            map[option.value] = option.label;
        });
        return map;
    }, [options]);

    // Every typed word has to appear in the label or the keywords, in any
    // order, so "fusion lumbar" finds "Lumbar interbody fusion". Only what is
    // listed is narrowed: a ticked option that the search hides stays ticked.
    const visibleOptions = useMemo(() => {
        const words = search.toLowerCase().split(/\s+/).filter(Boolean);
        if (!words.length) return options;
        return options.filter((option) => {
            const text = [
                option.label ?? option.value,
                ...(option.keywords ?? []),
            ]
                .join(" | ")
                .toLowerCase();
            return words.every((word) => text.includes(word));
        });
    }, [options, search]);

    const chosen = value || [];

    return (
        <>
            {chosen.map((val) => (
                <span
                    key={val}
                    className="inline-block bg-gray-400 text-xs px-2 py-1 rounded-full mr-1 mb-1"
                >
                    {valueLabelMap[val] || val}
                </span>
            ))}
            {!chosen.length && !!emptyLabel && (
                <span className="text-sm text-gray-500">{emptyLabel}</span>
            )}
            {!disabled && (
                <>
                    <button
                        className="ml-2 text-sm text-blue-600 underline cursor-pointer"
                        onClick={() => {
                            setSelectedItems(chosen);
                            setSearch("");
                            setShowEditModal(true);
                        }}
                    >
                        Edit
                    </button>
                    {showEditModal && (
                        <ModalWindow
                            title="Add Items"
                            okLabel="Add"
                            onOk={() => {
                                onChange(selectedItems);
                                setShowEditModal(false);
                            }}
                            onCancel={() => setShowEditModal(false)}
                        >
                            <div className="flex flex-col gap-2">
                                <p>
                                    Add items to the <strong>{label}</strong>{" "}
                                    field.
                                </p>
                                <p>Select from the options below:</p>
                                {options.length >= SEARCH_THRESHOLD && (
                                    <SearchBox
                                        value={search}
                                        onChange={setSearch}
                                        placeholder={`Search ${label}`}
                                        aria-label={`Search ${label}`}
                                    />
                                )}
                                {!!search.trim() &&
                                    visibleOptions.length === 0 && (
                                        <p
                                            role="status"
                                            className="text-sm text-gray-500 mb-2 ml-2"
                                        >
                                            No options match "{search.trim()}".
                                        </p>
                                    )}
                                <p className="flex flex-col gap-2 max-h-60 overflow-y-auto border border-gray-200 rounded-sm bg-white p-2">
                                    {visibleOptions.map((option) => (
                                        <span
                                            className="flex gap-2"
                                            key={option.value}
                                        >
                                            <input
                                                type="checkbox"
                                                id={`option-${option.value}`}
                                                name={option.value}
                                                checked={selectedItems.includes(
                                                    option.value,
                                                )}
                                                onChange={(e) => {
                                                    setSelectedItems((prev) =>
                                                        e.target.checked
                                                            ? [
                                                                  ...prev,
                                                                  option.value,
                                                              ]
                                                            : prev.filter(
                                                                  (item) =>
                                                                      item !==
                                                                      option.value,
                                                              ),
                                                    );
                                                }}
                                            />
                                            {option.label}
                                        </span>
                                    ))}
                                </p>
                                <p className="">Selected Items:</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedItems.map((val) => (
                                        <span
                                            key={val}
                                            className="inline-block bg-gray-400 text-xs px-2 py-1 rounded-full"
                                        >
                                            {valueLabelMap[val] || val}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </ModalWindow>
                    )}
                </>
            )}
        </>
    );
}

export default MultiSelectField;
