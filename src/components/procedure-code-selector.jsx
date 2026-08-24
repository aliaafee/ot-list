import { useEffect, useMemo, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

import { useCatalogue } from "@/contexts/catalogue-context";
import SearchBox from "@/components/search-box";
import { ChevronRightIcon } from "lucide-react";
import { FACET_LABELS } from "@/lib/procedure-catalogue";

/** Concept id of the catalogue's "not represented here" sentinel */
const UNCODED_CONCEPT_ID = "NSX-00000";

/** Value used while the entered text does not match a known procedure code */
const uncodedConcept = () => ({
    conceptId: UNCODED_CONCEPT_ID,
    fsn: "Procedure not represented in the catalogue (procedure)",
    preferredTerm: "Uncoded procedure",
    subspecialty: "uncoded",
    facets: {
        method: null,
        procedureSite: null,
        surgicalApproach: null,
        device: null,
        morphology: null,
        intent: null,
    },
    lateralityApplicable: false,
    revisionApplicable: false,
    levelApplicable: false,
    levelKind: null,
    levelRegions: [],
    active: true,
    inactivationReason: null,
    replacedBy: null,
    effectiveFrom: "2026-08-07",
    catalogueRelease: "v2026.1",
    synonyms: [],
});

/** Whether a value carries a real catalogue concept rather than free text */
const isCodedValue = (value) =>
    !!value?.concept && value.concept.conceptId !== UNCODED_CONCEPT_ID;

/** Text shown in the search box for a given value */
const textOf = (value) => {
    if (!value) {
        return "";
    }
    return isCodedValue(value)
        ? (value.concept.preferredTerm ?? "")
        : (value.freeText ?? "");
};

/**
 * ProcedureCodeSelector - Searchable procedure code picker
 *
 * Behaves like FormField: `onChange` is called with a change event carrying
 * `name` and a value object as `value`. Picking a result emits the catalogue
 * concept, e.g. `{ concept: { conceptId: "NSX-00001", ... }, freeText: "" }`.
 * Text that matches no code is kept against the uncoded sentinel concept as
 * `{ concept: { conceptId: "NSX-00000", ... }, freeText: "..." }`, and an
 * empty box emits null. The box shows the preferred term for a coded value,
 * with the concept id shown as subtext beneath it.
 *
 * @param {string} label - Label text for the field
 * @param {string} name - Name attribute reported back through onChange
 * @param {Object} value - Currently selected value object, or null
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
    const [codeDetails, setCodeDetails] = useState(false);

    const query = textOf(value);
    const isCoded = isCodedValue(value);

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
        const searchQuery = query.trim();

        // Nothing to search yet, the hint is shown instead
        if (!searchQuery) {
            return [];
        }

        // The uncoded sentinel is a real catalogue entry, but it is what we
        // fall back to on our own - it must never be offered as a match.
        return search(searchQuery).filter(
            (concept) => concept.conceptId !== UNCODED_CONCEPT_ID,
        );
    }, [query, search]);

    useEffect(() => {
        if (highlight < 0) {
            return;
        }

        listRef.current?.children[highlight]?.scrollIntoView({
            block: "nearest",
        });
    }, [highlight]);

    const buildValue = (concept, freeText) => {
        return {
            concept: concept,
            freeText: freeText,
        };
    };

    const emitChange = (newValue) => {
        onChange?.({ target: { name, value: newValue } });
    };

    const handleQueryChange = (newQuery) => {
        setOpen(true);
        // Results are about to change, so the old index no longer points at
        // the row the user was on.
        setHighlight(-1);
        emitChange(!newQuery ? null : buildValue(uncodedConcept(), newQuery));
    };

    // SearchBox already reports the emptied box through onChange, so this only
    // has to put the dropdown back to its initial state.
    const handleClear = () => {
        setOpen(true);
        setHighlight(-1);
    };

    const handleSelect = (selectedConcept) => {
        setOpen(false);
        setHighlight(-1);
        emitChange(buildValue(selectedConcept, ""));
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

        // The field lives inside a form, so Enter has to be swallowed while the
        // dropdown is open - it either picks the highlighted result or accepts
        // the typed text, but it never submits.
        if (e.key === "Enter" && open) {
            e.preventDefault();

            if (highlight >= 0 && results[highlight]) {
                handleSelect(results[highlight]);
            } else {
                setOpen(false);
            }
        }
    };

    const facetChips = isCoded
        ? Object.entries(value?.concept?.facets ?? {}).filter(
              ([, term]) => !!term,
          )
        : [];

    return (
        <div
            className={twMerge("flex flex-col ", className)}
            ref={containerRef}
        >
            <SearchBox
                label={label}
                name={name}
                value={query}
                onChange={handleQueryChange}
                onClear={handleClear}
                placeholder={placeholder || label}
                inputClassName={twMerge(
                    isCoded && "rounded-b-none",
                    inputClassName,
                )}
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
                                No matching catalogue entry - the text
                                you&apos;ve typed will be used as-is.
                            </div>
                        ) : (
                            results.map((item, index) => (
                                <button
                                    type="button"
                                    key={item.conceptId}
                                    role="option"
                                    aria-selected={
                                        value?.concept?.conceptId ===
                                        item.conceptId
                                    }
                                    onClick={() => handleSelect(item)}
                                    onMouseEnter={() => setHighlight(index)}
                                    className={twMerge(
                                        "w-full text-left px-2 py-1",
                                        value?.concept?.conceptId ===
                                            item.conceptId && "bg-gray-100",
                                        index === highlight && "bg-blue-50",
                                    )}
                                >
                                    <div className="text-sm">
                                        {item.preferredTerm}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </SearchBox>
            {isCoded && (
                <div className="px-1 py-0.5 text-xs  bg-white rounded-b border-gray-200 border-b border-r border-l flex flex-col">
                    <button
                        type="button"
                        className="flex items-center gap-1 cursor-pointer font-mono"
                        onClick={() => setCodeDetails((prev) => !prev)}
                    >
                        <ChevronRightIcon
                            className={twMerge(
                                "h-3 w-3 shrink-0 text-blue-700 transition-transform",
                                codeDetails && "rotate-90",
                            )}
                        />
                        {value?.concept?.conceptId} -{" "}
                        {value?.concept?.catalogueRelease}
                    </button>
                    {codeDetails && (
                        <div className="px-1 py-0.5">
                            <div className="text-xs text-gray-600">
                                {value?.concept?.fsn}
                            </div>
                            {facetChips.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {facetChips.map(([facetKey, term]) => (
                                        <span
                                            key={facetKey}
                                            className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-700 ring-1 ring-inset ring-blue-200"
                                        >
                                            <span className="text-blue-500">
                                                {FACET_LABELS[facetKey] ??
                                                    facetKey}
                                                :
                                            </span>
                                            {term}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
