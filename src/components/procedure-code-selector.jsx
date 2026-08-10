import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, FolderTree, SearchIcon, XIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";

import FormField from "@/components/form-field";
import ProcedureCodeBrowserModal from "@/modals/procedure-code-browser-modal";
import { useCatalogue } from "@/contexts/catalogue-context";
import {
    ALL_POST_COORDINATION_FIELDS,
    FACET_LABELS,
    INTENT_OPTIONS,
    LATERALITY_OPTIONS,
    LEVEL_KIND_LABELS,
    PRIORITY_OPTIONS,
    REVISION_OPTIONS,
    displayText,
    isCoded,
} from "@/lib/nspc";

/**
 * SpinalLevelPicker - the `spinal_levels` post-coordination slot.
 *
 * An ordered set, not a single value: a two-level ACDF is one coded
 * procedure with two levels attached, which is why "single level" /
 * "multilevel" catalogue entries do not exist. The count is derived from
 * the selection and never stored.
 *
 * @param {Object} value - The coded procedure value being edited.
 * @param {function} onChange - Called with the new ordered level codes.
 * @param {boolean} disabled - Disables every chip.
 */
function SpinalLevelPicker({ value, onChange, disabled, className }) {
    const catalogue = useCatalogue();
    const [showAll, setShowAll] = useState(false);

    const kind = value.levelKind;
    const selected = value.spinalLevels ?? [];
    const inRegion = catalogue.levelsFor(value, showAll);

    // A level can be selected and then fall outside the region filter -
    // via the search query, by switching to another concept of the same
    // kind, or by narrowing after picking. It still has to render, or it
    // becomes impossible to deselect. Recomputed every render rather than
    // memoised: 52 levels is nothing, and the dependency list needed to
    // memoise it correctly is the exact thing that goes stale.
    const inRegionCodes = new Set(inRegion.map((l) => l.code));
    const strays = catalogue.levels.filter(
        (l) =>
            l.kind === kind &&
            selected.includes(l.code) &&
            !inRegionCodes.has(l.code),
    );
    const options = [...inRegion, ...strays].sort(
        (a, b) => a.ordinal - b.ordinal,
    );

    const hasHiddenLevels = options.length < catalogue.levelCount(kind);

    const toggle = (code) => {
        const next = selected.includes(code)
            ? selected.filter((c) => c !== code)
            : [...selected, code];
        onChange(catalogue.sortLevels(next, kind));
    };

    return (
        <div className={twMerge("p-1", className)}>
            <div className="flex items-baseline justify-between gap-2">
                <label className="text-xs text-gray-700">
                    Spinal level{" "}
                    <span className="text-gray-400">
                        ({LEVEL_KIND_LABELS[kind] ?? kind})
                    </span>
                </label>
                {hasHiddenLevels && !disabled && (
                    <button
                        type="button"
                        onClick={() => setShowAll((s) => !s)}
                        className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                    >
                        {showAll ? "Show usual levels" : "Show all levels"}
                    </button>
                )}
            </div>

            <div className="mt-1.5 flex flex-wrap gap-1">
                {options.map((level) => {
                    const isSelected = selected.includes(level.code);
                    return (
                        <button
                            key={level.spinalLevelId}
                            type="button"
                            title={level.longName}
                            aria-pressed={isSelected}
                            disabled={disabled}
                            onClick={() => toggle(level.code)}
                            className={twMerge(
                                "rounded px-2 py-0.5 text-xs font-mono ring-1 ring-inset cursor-pointer",
                                "ring-gray-300 text-gray-700 hover:bg-gray-100",
                                isSelected &&
                                    "bg-blue-600 text-white ring-blue-600 hover:bg-blue-600",
                                disabled && "cursor-not-allowed opacity-50",
                            )}
                        >
                            {level.code}
                        </button>
                    );
                })}
            </div>

            <p className="mt-1.5 text-[11px] text-gray-500">
                {selected.length === 0
                    ? "No level recorded."
                    : `${selected.join(", ")} · ${selected.length} level${selected.length === 1 ? "" : "s"}`}
            </p>
        </div>
    );
}

/**
 * ProcedureCodeSelector - search-and-select picker for the NSPC catalogue,
 * usable as a drop-in replacement for a plain text "procedure" field.
 *
 * Type-ahead searches fully specified names, preferred terms and
 * synonyms (abbreviations and department jargon). `value`/`onChange` work
 * in two modes so this can sit directly in front of a free-text backend
 * field without requiring a catalogue match:
 *
 *   - Free text: `value` is a plain string (or empty/null). Every
 *     keystroke calls `onChange(text)` immediately, exactly like a plain
 *     `<input>` - nothing here is lost if the department's vocabulary
 *     doesn't have the concept yet.
 *   - Coded: `value` is the object built by the catalogue's `buildValue`,
 *     produced by picking a suggestion from the dropdown. Typing again
 *     after a coded selection reverts to free-text mode for that
 *     keystroke onward, which is intentional - the visible text and the
 *     emitted value never disagree.
 *
 * @param {string|Object|null} value - Current value; see modes above.
 * @param {function} onChange - Called with a string (free text), the
 *   coded object (selection), or null (cleared).
 * @param {string} label - Optional label rendered above the field.
 * @param {boolean} error - Whether to render the field in an error state.
 * @param {string} errorMessage - Error message shown under the field.
 * @param {string} className - Additional classes for the outer container.
 * @param {boolean} disabled - Disables input and controls.
 * @param {boolean} showPostCoordination - Show post-coordination controls
 *   once a concept is selected (default true). Turn off when the caller
 *   has nowhere to persist any of them.
 * @param {string[]} postCoordinationFields - Which post-coordination
 *   fields to render: any of "priority", "laterality", "revisionStatus",
 *   "stagedSequence", "intentOverride", "spinalLevels" (default all).
 *   "spinalLevels" additionally only renders for concepts whose
 *   `levelApplicable` is set - it never appears on a cranial procedure.
 */
export default function ProcedureCodeSelector({
    value,
    onChange,
    label = "",
    error = false,
    errorMessage = "",
    className = "",
    disabled = false,
    showPostCoordination = true,
    postCoordinationFields = ALL_POST_COORDINATION_FIELDS,
}) {
    const catalogue = useCatalogue();
    const [query, setQuery] = useState(displayText(value));
    const [open, setOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [showBrowser, setShowBrowser] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    const { results, queryLevel } = useMemo(
        () => catalogue.search(query),
        [catalogue, query],
    );

    // Keep the input text in sync when the value changes from outside
    // (e.g. the caller resets the form, or loads a different record).
    // Syncing on every keystroke would be redundant but harmless here,
    // since onChange always carries exactly what's already in `query`.
    const syncKey = isCoded(value) ? value.conceptId : (value ?? "");
    useEffect(() => {
        setQuery(displayText(value));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syncKey]);

    useEffect(() => {
        setHighlightedIndex(0);
    }, [query]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!containerRef.current?.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (concept) => {
        // A level typed into the query pre-fills the slot, but only when
        // it is the kind this procedure takes and a real level: "L4-L5"
        // means nothing to a vertebroplasty, and "C8-T1" means nothing
        // to anyone.
        const typed = concept.levelApplicable
            ? queryLevel?.[concept.levelKind]
            : null;
        const prefill =
            typed && catalogue.levelOrdinal(concept.levelKind, typed)
                ? [typed]
                : undefined;

        onChange(catalogue.buildValue(concept, value, prefill));
        setQuery(concept.preferredTerm);
        setOpen(false);
        inputRef.current?.blur();
    };

    // A pick from the browser modal isn't derived from anything typed, so
    // (unlike handleSelect) there's no query-level to prefill from.
    const handleBrowserSelect = (concept) => {
        onChange(catalogue.buildValue(concept, value));
        setQuery(concept.preferredTerm);
        setShowBrowser(false);
        setOpen(false);
    };

    const handleClear = () => {
        onChange(null);
        setQuery("");
        inputRef.current?.focus();
        setOpen(true);
    };

    const handleQueryChange = (e) => {
        const text = e.target.value;
        setQuery(text);
        setOpen(true);
        // Typing over a coded selection means the user is looking for
        // something else - fall back to free text immediately rather
        // than leaving a stale concept ID attached to text that no
        // longer matches it.
        onChange(text);
    };

    const handleKeyDown = (e) => {
        // Escape always closes, regardless of whether there are results
        // to navigate - otherwise a query with zero matches traps focus
        // with an open (if empty) dropdown that Escape can't dismiss.
        if (e.key === "Escape") {
            setOpen(false);
            return;
        }

        if (!open || results.length === 0) {
            if (e.key === "ArrowDown") setOpen(true);
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const concept = results[highlightedIndex];
            if (concept) handleSelect(concept);
        }
    };

    const updatePostCoordination = (patch) => {
        if (!isCoded(value)) return;
        onChange({ ...value, ...patch });
    };

    const coded = isCoded(value);
    const facetChips = coded
        ? Object.entries(value.facets ?? {}).filter(([, term]) => !!term)
        : [];

    return (
        <div
            className={twMerge("flex flex-col gap-1", className)}
            ref={containerRef}
        >
            {!!label && (
                <label
                    className={twMerge(
                        "text-xs opacity-0 text-left text-gray-700",
                        !!query && "opacity-100",
                    )}
                >
                    {label}
                </label>
            )}

            <div className="bg-white rounded border border-gray-200 flex flex-col divide-y divide-gray-200">
                <div className="relative">
                    <div
                        className={twMerge(
                            "flex items-center gap-1 rounded p-1 bg-white",
                            !!error && "border border-red-500 bg-red-50",
                            coded && "rounded-b-none",
                        )}
                    >
                        <SearchIcon
                            width={16}
                            height={16}
                            className="ml-1 text-gray-400 shrink-0"
                        />
                        <input
                            ref={inputRef}
                            type="text"
                            role="combobox"
                            aria-expanded={open}
                            aria-autocomplete="list"
                            autoComplete="off"
                            disabled={disabled}
                            value={query}
                            onChange={handleQueryChange}
                            onFocus={() => setOpen(true)}
                            onBlur={() => setOpen(false)}
                            onKeyDown={handleKeyDown}
                            placeholder="Procedure (search NSPC catalogue - e.g. crani, VP shunt, C5-C6 ACDF)"
                            className="w-full outline-none bg-transparent disabled:text-gray-400"
                        />
                        {!disabled && (
                            <button
                                type="button"
                                title="Browse procedure codes"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setShowBrowser(true)}
                                className="mr-1 text-gray-400 hover:text-gray-700 shrink-0 cursor-pointer"
                            >
                                <FolderTree width={16} height={16} />
                            </button>
                        )}
                        {!!query && !disabled && (
                            <button
                                type="button"
                                title="Clear"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={handleClear}
                                className="mr-1 text-gray-400 hover:text-gray-700 shrink-0 cursor-pointer"
                            >
                                <XIcon width={16} height={16} />
                            </button>
                        )}
                    </div>

                    {open && !disabled && (
                        <div className="absolute z-20 mt-1 w-full rounded-md bg-white shadow-lg ring-1 ring-gray-300 overflow-hidden">
                            {query.trim() === "" && (
                                <p className="p-3 text-xs text-gray-500">
                                    Type a procedure name, formal term or
                                    abbreviation to search the NSPC catalogue,
                                    or just type freely if it isn't coded yet.
                                </p>
                            )}
                            {query.trim() !== "" && results.length === 0 && (
                                <p className="p-3 text-xs text-gray-500">
                                    No matching catalogue entry - the text
                                    you've typed will be used as-is.
                                </p>
                            )}
                            {results.length > 0 && (
                                <ul
                                    role="listbox"
                                    className="max-h-80 overflow-y-auto divide-y divide-gray-100"
                                >
                                    {results.map((concept, index) => (
                                        <li
                                            key={concept.conceptId}
                                            role="option"
                                            aria-selected={
                                                index === highlightedIndex
                                            }
                                        >
                                            <button
                                                type="button"
                                                onMouseDown={(e) =>
                                                    e.preventDefault()
                                                }
                                                onClick={() =>
                                                    handleSelect(concept)
                                                }
                                                onMouseEnter={() =>
                                                    setHighlightedIndex(index)
                                                }
                                                className={twMerge(
                                                    "w-full text-left px-3 py-2 cursor-pointer",
                                                    index ===
                                                        highlightedIndex &&
                                                        "bg-blue-50",
                                                )}
                                            >
                                                <div className="flex items-baseline justify-between gap-2">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {concept.preferredTerm}
                                                    </span>
                                                    <span className="text-[11px] font-mono text-gray-400 shrink-0">
                                                        {concept.conceptId}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {concept.fsn}
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
                {!!errorMessage && (
                    <p className="text-xs text-red-500">{errorMessage}</p>
                )}

                {coded &&
                    showPostCoordination &&
                    postCoordinationFields.includes("spinalLevels") &&
                    value.levelApplicable && (
                        <SpinalLevelPicker
                            value={value}
                            onChange={(levels) =>
                                updatePostCoordination({ spinalLevels: levels })
                            }
                            disabled={disabled}
                            className=""
                        />
                    )}

                {coded && showPostCoordination && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 pl-7">
                        {postCoordinationFields.includes("laterality") && (
                            <FormField
                                label="Laterality (side)"
                                name="laterality"
                                type="select"
                                value={value.laterality}
                                onChange={(e) =>
                                    updatePostCoordination({
                                        laterality: e.target.value,
                                    })
                                }
                                disabled={
                                    disabled || !value.lateralityApplicable
                                }
                            >
                                <option value="">Select</option>
                                {LATERALITY_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </FormField>
                        )}

                        {postCoordinationFields.includes("revisionStatus") && (
                            <FormField
                                label="Revision status"
                                name="revisionStatus"
                                type="select"
                                value={value.revisionStatus}
                                onChange={(e) =>
                                    updatePostCoordination({
                                        revisionStatus: e.target.value,
                                    })
                                }
                                disabled={disabled || !value.revisionApplicable}
                            >
                                {REVISION_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </FormField>
                        )}

                        {postCoordinationFields.includes("stagedSequence") && (
                            <FormField
                                label="Staged sequence"
                                name="stagedSequence"
                                type="number"
                                placeholder="n/a"
                                value={value.stagedSequence}
                                onChange={(e) =>
                                    updatePostCoordination({
                                        stagedSequence: e.target.value,
                                    })
                                }
                                disabled={disabled}
                            />
                        )}

                        {postCoordinationFields.includes("intentOverride") && (
                            <FormField
                                label="Intent override"
                                name="intentOverride"
                                type="select"
                                className="col-span-2 sm:col-span-1"
                                value={value.intentOverride}
                                onChange={(e) =>
                                    updatePostCoordination({
                                        intentOverride: e.target.value,
                                    })
                                }
                                disabled={disabled}
                            >
                                <option value="">
                                    {value.facets?.intent
                                        ? `Default (${value.facets.intent})`
                                        : "Default"}
                                </option>
                                {INTENT_OPTIONS.map((intent) => (
                                    <option key={intent} value={intent}>
                                        {intent}
                                    </option>
                                ))}
                            </FormField>
                        )}

                        {postCoordinationFields.includes("priority") && (
                            <FormField
                                label="Priority (urgency)"
                                name="priority"
                                type="select"
                                value={value.priority}
                                onChange={(e) =>
                                    updatePostCoordination({
                                        priority: e.target.value,
                                    })
                                }
                                disabled={disabled}
                            >
                                <option value="">Select</option>
                                {PRIORITY_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </FormField>
                        )}
                    </div>
                )}

                {coded && (
                    <div className="p-1 rounded-b">
                        <button
                            type="button"
                            onClick={() => setShowDetails((prev) => !prev)}
                            className="flex w-full items-center gap-1 text-left cursor-pointer"
                        >
                            <ChevronRight
                                className={twMerge(
                                    "h-3 w-3 shrink-0 text-blue-700 transition-transform",
                                    showDetails && "rotate-90",
                                )}
                            />
                            <span className="text-xs font-mono text-blue-700">
                                {value.conceptId} · {value.catalogueRelease}
                            </span>
                        </button>
                        {showDetails && (
                            <div className="mt-1 pl-4">
                                <div className="text-xs text-gray-600">
                                    {value.fsn}
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

            {showBrowser && (
                <ProcedureCodeBrowserModal
                    initialConceptId={coded ? value.conceptId : null}
                    onSelect={handleBrowserSelect}
                    onCancel={() => setShowBrowser(false)}
                />
            )}
        </div>
    );
}
