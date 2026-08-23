import { useEffect, useMemo, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

import { useCatalogue } from "@/contexts/catalogue-context";
import SearchBox from "@/components/search-box";

// TODO: replace with codes fetched from the backend
const SAMPLE_CODES = [
    { code: "0DTJ4ZZ", description: "Laparoscopic cholecystectomy" },
    { code: "0DTJ0ZZ", description: "Open cholecystectomy" },
    { code: "0DBJ4ZZ", description: "Laparoscopic appendectomy" },
    { code: "0DTU0ZZ", description: "Open appendectomy" },
    { code: "0YQ50ZZ", description: "Inguinal hernia repair, open" },
    { code: "0YQ54ZZ", description: "Inguinal hernia repair, laparoscopic" },
    { code: "0SRC0J9", description: "Total knee replacement, right" },
    { code: "0SRD0J9", description: "Total knee replacement, left" },
    { code: "0UT90ZZ", description: "Total abdominal hysterectomy" },
    { code: "10D00Z1", description: "Lower segment caesarean section" },
    { code: "08RJ3JZ", description: "Cataract extraction with IOL, right" },
    { code: "08RK3JZ", description: "Cataract extraction with IOL, left" },
    { code: "0CTP0ZZ", description: "Tonsillectomy" },
    { code: "0W9G3ZZ", description: "Drainage of abscess, percutaneous" },
];

export const UNCODED_CODE = "0000";

/** Value used while the entered text does not match a known procedure code */
export const uncodedProcedure = (text) => ({
    code: UNCODED_CODE,
    description: "uncoded",
    freeText: text,
});

/** Text shown in the search box for a given value */
const textOf = (value) => {
    if (!value?.code) {
        return "";
    }
    return value.code === UNCODED_CODE
        ? (value.freeText ?? "")
        : (value.description ?? "");
};

/**
 * ProcedureCodeSelector - Searchable procedure code picker
 *
 * Behaves like FormField: `onChange` is called with a change event carrying
 * `name` and a code object as `value`. Picking a result emits that code, e.g.
 * `{ code: "0CTP0ZZ", description: "Tonsillectomy" }`. Text that matches no
 * code is kept as `{ code: "0000", description: "uncoded", freeText: "..." }`,
 * and an empty box emits null. The box shows the description, with the code
 * shown as subtext beneath it.
 *
 * @param {string} label - Label text for the field
 * @param {string} name - Name attribute reported back through onChange
 * @param {Object} value - Currently selected code object, or null
 * @param {function} onChange - Change handler function, receives a change event
 * @param {boolean} error - Whether the field has an error
 * @param {string} errorMessage - Error message to display
 * @param {string} className - Additional CSS classes for the container
 * @param {string} inputClassName - Additional CSS classes for the input element
 * @param {boolean} disabled - Whether the input is disabled
 * @param {string} placeholder - Placeholder text for the input
 */
export default function ProcedureCodeSelector({
    label = "",
    name = "procedureCode",
    value = null,
    onChange,
    error = false,
    errorMessage = "",
    className = "",
    inputClassName = "",
    disabled = false,
    placeholder = "",
}) {
    const { search } = useCatalogue();

    const containerRef = useRef(null);
    const listRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(-1);

    const query = textOf(value);
    const isCoded = !!value?.code && value.code !== UNCODED_CODE;

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
        const searchQuery = query.trim().toLowerCase();

        // Nothing to search yet, the hint is shown instead
        if (!searchQuery) {
            return [];
        }

        return search(searchQuery);
    }, [query, isCoded]);

    useEffect(() => {
        setHighlight(-1);
    }, [query]);

    useEffect(() => {
        if (highlight < 0) {
            return;
        }

        listRef.current?.children[highlight]?.scrollIntoView({
            block: "nearest",
        });
    }, [highlight]);

    const emitChange = (newValue) => {
        onChange?.({ target: { name, value: newValue } });
    };

    const handleQueryChange = (newQuery) => {
        setOpen(true);
        emitChange(!newQuery ? null : uncodedProcedure(newQuery));
    };

    const handleClear = () => {
        setOpen(true);
        emitChange(null);
    };

    const handleSelect = (item) => {
        setOpen(false);
        setHighlight(-1);
        emitChange(item);
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

            if (results.length === 0) {
                return;
            }

            const step = e.key === "ArrowDown" ? 1 : -1;
            setHighlight((prev) => {
                const next = prev + step;
                if (next < 0) {
                    return results.length - 1;
                }
                return next >= results.length ? 0 : next;
            });
            return;
        }

        if (e.key === "Enter" && open && highlight >= 0) {
            e.preventDefault();
            handleSelect(results[highlight]);
        }
    };

    return (
        <div className={twMerge("flex flex-col", className)} ref={containerRef}>
            <SearchBox
                label={label}
                name={name}
                value={query}
                onChange={handleQueryChange}
                onClear={handleClear}
                placeholder={!!placeholder ? placeholder : label}
                inputClassName={inputClassName}
                error={error}
                errorMessage={errorMessage}
                disabled={disabled}
                onFocus={() => setOpen(true)}
                onKeyDown={handleKeyDown}
            >
                {open && !disabled && (
                    <div
                        ref={listRef}
                        role="listbox"
                        className="absolute z-10 mt-1 w-full border border-gray-300 rounded-md bg-white shadow-lg max-h-60 overflow-y-auto"
                    >
                        {!query.trim() ? (
                            <div className="px-2 py-3 text-xs text-gray-500">
                                Type a procedure name, formal term or
                                abbreviation to search the NSPC catalogue, or
                                just type freely if it isn&apos;t coded yet.
                            </div>
                        ) : results.length === 0 ? (
                            <div className="px-2 py-3 text-xs text-gray-500">
                                No matching catalogue entry - the text you've
                                typed will be used as-is.
                            </div>
                        ) : (
                            results.map((item, index) => (
                                <button
                                    type="button"
                                    key={item.code}
                                    role="option"
                                    aria-selected={value?.code === item.code}
                                    onClick={() => handleSelect(item)}
                                    onMouseEnter={() => setHighlight(index)}
                                    className={twMerge(
                                        "w-full text-left px-2 py-1",
                                        value?.code === item.code &&
                                            "bg-gray-100",
                                        index === highlight && "bg-blue-50",
                                    )}
                                >
                                    <div className="text-sm">
                                        {item.description}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {item.code}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </SearchBox>
            {!errorMessage && !!value?.code && (
                <p
                    className={twMerge(
                        "text-xs text-gray-500",
                        !isCoded && "text-amber-600",
                    )}
                >
                    {isCoded ? value.code : value.description}
                </p>
            )}
        </div>
    );
}
