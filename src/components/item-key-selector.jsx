import { useEffect, useId, useMemo, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

import SearchBox from "@/components/search-box";

/** How many suggestions the dropdown lists at most */
const MAX_RESULTS = 30;

/** Lower-case words of a key or label, hyphens and spaces alike */
const wordsOf = (text) =>
    (text || "")
        .toLowerCase()
        .split(/[\s\-_]+/)
        .filter(Boolean);

/**
 * Rank a suggestion against the typed words, or null when it does not match.
 * Every word has to appear in the key or the label; a hit on the key ranks
 * above one only on the label, and a key that starts with the query first.
 */
const rank = (suggestion, query, words) => {
    const key = suggestion.itemKey.toLowerCase();
    const label = (suggestion.label || "").toLowerCase();
    if (!words.every((word) => key.includes(word) || label.includes(word))) {
        return null;
    }
    if (key === query) return 0;
    if (key.startsWith(query)) return 1;
    if (words.every((word) => key.includes(word))) return 2;
    return 3;
};

/**
 * ItemKeySelector - a free-text item key box that suggests the keys already
 * used by other templates.
 *
 * A key is what lets a more specific template override an item (spec section
 * 4), so `consent-signed` and `signed-consent` are two items, not one. Showing
 * what exists while typing is how near-duplicates are headed off. Any text is
 * still accepted: a new item needs a new key.
 *
 * Modelled on ProcedureCodeSelector's combobox, without the catalogue.
 *
 * @param {string} value - The typed key
 * @param {function} onChange - Called with the new text
 * @param {function} onSelect - Called with the chosen { itemKey, label }
 * @param {Array} suggestions - [{ itemKey, label, templates }] to offer
 * @param {boolean} [disabled] - Whether the box is disabled
 * @param {string} [className] - Additional CSS classes for the container
 */
function ItemKeySelector({
    value,
    onChange,
    onSelect,
    suggestions = [],
    disabled = false,
    className = "",
}) {
    const containerRef = useRef(null);
    const listRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(-1);

    const baseId = useId();
    const listboxId = `${baseId}-listbox`;
    const optionId = (index) => `${baseId}-option-${index}`;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!containerRef.current?.contains(event.target)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const results = useMemo(() => {
        const query = value.trim().toLowerCase();
        if (!query) return suggestions.slice(0, MAX_RESULTS);

        const words = wordsOf(query);
        return suggestions
            .map((suggestion) => ({
                suggestion,
                score: rank(suggestion, query, words),
            }))
            .filter((row) => row.score !== null)
            .sort(
                (a, b) =>
                    a.score - b.score ||
                    a.suggestion.itemKey.localeCompare(b.suggestion.itemKey),
            )
            .slice(0, MAX_RESULTS)
            .map((row) => row.suggestion);
    }, [value, suggestions]);

    useEffect(() => {
        if (highlight < 0) return;
        listRef.current?.children[highlight]?.scrollIntoView({
            block: "nearest",
        });
    }, [highlight]);

    const handleSelect = (suggestion) => {
        setOpen(false);
        setHighlight(-1);
        onSelect?.(suggestion);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Escape") {
            setOpen(false);
            setHighlight(-1);
            return;
        }

        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!open) {
                setOpen(true);
                return;
            }
            if (results.length === 0) return;

            const step = e.key === "ArrowDown" ? 1 : -1;
            setHighlight((prev) => {
                const next = prev + step;
                if (next < 0) return results.length - 1;
                return next >= results.length ? 0 : next;
            });
            return;
        }

        // Enter picks the highlighted key, or keeps the typed one.
        if (e.key === "Enter" && open) {
            e.preventDefault();
            if (highlight >= 0 && results[highlight]) {
                handleSelect(results[highlight]);
            } else {
                setOpen(false);
            }
        }
    };

    const showList = open && !disabled;
    const hasListbox = showList && results.length > 0;

    return (
        <div className={twMerge("flex flex-col", className)} ref={containerRef}>
            <SearchBox
                name="itemKey"
                value={value}
                placeholder="item-key"
                onChange={(text) => {
                    setOpen(true);
                    setHighlight(-1);
                    onChange?.(text);
                }}
                onClear={() => {
                    setOpen(true);
                    setHighlight(-1);
                }}
                inputClassName="text-sm py-1 font-mono border-gray-300"
                disabled={disabled}
                onFocus={() => setOpen(true)}
                onKeyDown={handleKeyDown}
                role="combobox"
                aria-label="Item key"
                aria-expanded={hasListbox}
                aria-controls={hasListbox ? listboxId : undefined}
                aria-activedescendant={
                    hasListbox && highlight >= 0 && results[highlight]
                        ? optionId(highlight)
                        : undefined
                }
                aria-autocomplete="list"
            >
                {showList && (
                    <div className="absolute z-10 mt-1 w-80 border border-gray-300 rounded-md bg-white shadow-lg max-h-60 overflow-y-auto">
                        {results.length === 0 ? (
                            <div
                                role="status"
                                className="px-2 py-3 text-xs text-gray-500"
                            >
                                {suggestions.length === 0
                                    ? "No keys in use yet - the key you type will be new."
                                    : "No existing key matches - the key you type will be new."}
                            </div>
                        ) : (
                            <div
                                ref={listRef}
                                id={listboxId}
                                role="listbox"
                                aria-label="Existing item keys"
                            >
                                {results.map((item, index) => (
                                    <div
                                        key={item.itemKey}
                                        id={optionId(index)}
                                        role="option"
                                        aria-selected={item.itemKey === value}
                                        onClick={() => handleSelect(item)}
                                        onMouseEnter={() => setHighlight(index)}
                                        className={twMerge(
                                            "w-full text-left px-2 py-1 cursor-pointer",
                                            item.itemKey === value &&
                                                "bg-gray-100",
                                            index === highlight && "bg-blue-50",
                                        )}
                                    >
                                        <div className="text-sm font-mono">
                                            {item.itemKey}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {item.label}
                                            {item.templates > 1 &&
                                                ` · in ${item.templates} templates`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </SearchBox>
        </div>
    );
}

export default ItemKeySelector;
