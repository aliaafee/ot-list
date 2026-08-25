import { useEffect, useId, useMemo, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

import { useCatalogue } from "@/contexts/catalogue-context";
import SearchBox from "@/components/search-box";
import { ChevronRightIcon, TriangleAlertIcon } from "lucide-react";
import {
    FACET_LABELS,
    LATERALITY_OPTIONS,
    LEVEL_KIND_LABELS,
    PRIORITY_OPTIONS,
    REVISION_OPTIONS,
    spannedInterspaces,
    spannedVertebrae,
} from "@/lib/procedure-catalogue";
import FormField from "./form-field";

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

/** The level code a query qualifier names, if this concept can take it. */
const levelCodesFor = (concept, queryLevel, levels) => {
    if (!queryLevel || !concept.levelApplicable) {
        return [];
    }

    // The vocabulary is the authority - a level can parse cleanly and still
    // name nothing this catalogue release knows.
    const known = (code, kind) =>
        levels.some((l) => l.kind === kind && l.code === code && l.active);

    if (concept.levelKind === "interspace") {
        // A bare vertebra has no answer here: L4 lies between two
        // interspaces, and neither is the one that was meant.
        if (!queryLevel.interspace) {
            return [];
        }

        // "C5-C6" resolves to itself, "L2-L5" to the three interspaces those
        // four bodies enclose.
        return spannedInterspaces(levels, queryLevel.interspace);
    }

    if (concept.levelKind === "vertebra") {
        const code = queryLevel.vertebra;
        if (code) {
            return known(code, "vertebra") ? [code] : [];
        }

        // A span typed at a concept that records vertebrae is not a mismatch
        // to discard - "L4-L5 laminectomy" means the laminae of L4 and L5,
        // and "L2-L5 fusion" every body across those four - so it expands to
        // everything it covers.
        return spannedVertebrae(levels, queryLevel.interspace);
    }

    return [];
};

/**
 * The value a picked concept becomes.
 *
 * Qualifiers the surgeon already typed - the "Right" and "L4-L5" of
 * "Right L4-L5 TFESI" - pre-fill the slots they belong in instead of being
 * dropped on selection. Only slots the concept actually declares are filled:
 * a side on a concept that is not sided is not a default, it is a wrong
 * answer the user would have to notice to correct.
 */
const buildValueFromConcept = (
    concept,
    queryLevel,
    queryLaterality,
    levels,
) => {
    const postCoordination = {};

    if (queryLaterality && concept.lateralityApplicable) {
        postCoordination.laterality = queryLaterality;
    }

    const levelCodes = levelCodesFor(concept, queryLevel, levels);
    if (levelCodes.length) {
        postCoordination.spinalLevels = levelCodes;
    }

    return {
        concept,
        freeText: "",
        // Undefined rather than an empty object, so a selection carrying no
        // qualifiers stays exactly what it was before any of this existed.
        postCoordination: Object.keys(postCoordination).length
            ? postCoordination
            : undefined,
    };
};

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
    const labelId = useId();

    const kind = value?.concept?.levelKind;
    const selected = value?.postCoordination?.spinalLevels ?? [];
    const inRegion = catalogue.levelsFor(value?.concept, showAll);

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

    // `showAll` has to keep the toggle rendered on its own account: once every
    // level is on screen there is nothing hidden left to count, and testing
    // the count alone would unmount the only way back to the narrowed list.
    const hasHiddenLevels =
        showAll || options.length < catalogue.levelCount(kind);

    const toggle = (code) => {
        const next = selected.includes(code)
            ? selected.filter((c) => c !== code)
            : [...selected, code];
        onChange(catalogue.sortLevels(next, kind));
    };

    return (
        <div className={twMerge("p-1", className)}>
            <div className="flex items-baseline justify-between gap-2">
                {/* Not a <label>: this names a group of toggle buttons, not
                    a single form control, so it is referenced by id instead. */}
                <span id={labelId} className="text-xs text-gray-700">
                    Spinal level{" "}
                    <span className="text-gray-400">
                        ({LEVEL_KIND_LABELS[kind] ?? kind})
                    </span>
                </span>
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

            <div
                role="group"
                aria-labelledby={labelId}
                className="mt-1.5 flex flex-wrap gap-1"
            >
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

            {/* Toggling a chip only changes this line, so it has to announce
                itself - the chip's own pressed state is not the whole story. */}
            <p aria-live="polite" className="mt-1.5 text-[11px] text-gray-500">
                {selected.length === 0
                    ? "No level recorded."
                    : `${selected.join(", ")} · ${selected.length} level${selected.length === 1 ? "" : "s"}`}
            </p>
        </div>
    );
}

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
    const { search, levels } = useCatalogue();

    const containerRef = useRef(null);
    const listRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(-1);
    const [codeDetails, setCodeDetails] = useState(false);

    const baseId = useId();
    const listboxId = `${baseId}-listbox`;
    const errorId = `${baseId}-error`;
    const optionId = (conceptId) => `${baseId}-option-${conceptId}`;

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

    const { results, queryLevel, queryLaterality } = useMemo(() => {
        const searchQuery = query.trim();

        // Nothing to search yet, the hint is shown instead
        if (!searchQuery) {
            return { results: [], queryLevel: null, queryLaterality: null };
        }

        return search(searchQuery);
    }, [query, search]);

    useEffect(() => {
        if (highlight < 0) {
            return;
        }

        listRef.current?.children[highlight]?.scrollIntoView({
            block: "nearest",
        });
    }, [highlight]);

    const buildValue = (concept, freeText, postCoordination) => {
        return {
            concept: concept,
            freeText: freeText,
            postCoordination: postCoordination,
        };
    };

    const updatePostCoordination = (patch) => {
        const newValue = {
            ...value,
            postCoordination: { ...value?.postCoordination, ...patch },
        };

        emitChange(newValue);
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
        // The qualifiers belong to the query that produced this result, so
        // they have to be read here - selecting replaces the query with the
        // concept's own term and they are gone on the next render.
        emitChange(
            buildValueFromConcept(
                selectedConcept,
                queryLevel,
                queryLaterality,
                levels,
            ),
        );
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

    // The popup is only really open when it is also rendered - the ARIA state
    // on the input has to agree with what is on screen.
    const showList = open && !disabled;

    // The listbox element itself only exists when there are results; the hint
    // and no-match notes are not options. aria-expanded and aria-controls both
    // describe that listbox, so they follow it rather than the popup.
    const hasListbox = showList && results.length > 0;

    // Free text the catalogue did not match. Distinct from an empty box:
    // there is a value, it just is not a code.
    const isUncoded = !!value?.concept && !isCoded;

    // The bordered panel below the input only earns its borders when it has
    // something in it.
    const hasPanel = !!value?.concept;

    const facetChips = isCoded
        ? Object.entries(value?.concept?.facets ?? {}).filter(
              ([, term]) => !!term,
          )
        : [];

    return (
        <div className={twMerge("flex flex-col", className)} ref={containerRef}>
            <SearchBox
                label={label}
                name={name}
                value={query}
                onChange={handleQueryChange}
                onClear={handleClear}
                placeholder={placeholder || label}
                inputClassName={twMerge(
                    hasPanel && "rounded-b-none",
                    inputClassName,
                )}
                error={error}
                disabled={disabled}
                onFocus={() => setOpen(true)}
                onKeyDown={handleKeyDown}
                role="combobox"
                // The message is rendered in the panel below, not by SearchBox,
                // so the input has to be pointed at where it actually ended up.
                aria-describedby={errorMessage ? errorId : undefined}
                aria-expanded={hasListbox}
                aria-controls={hasListbox ? listboxId : undefined}
                aria-activedescendant={
                    hasListbox && highlight >= 0 && results[highlight]
                        ? optionId(results[highlight].conceptId)
                        : undefined
                }
                aria-autocomplete="list"
            >
                {showList && (
                    <div className="absolute z-10 mt-1 w-full border border-gray-300 rounded-md bg-white shadow-lg max-h-60 overflow-y-auto">
                        {/* The hint and the no-match note sit outside the
                            listbox on purpose: a listbox may only contain
                            options, and role="status" is what makes them
                            announce as they appear. */}
                        {!query.trim() ? (
                            <div
                                role="status"
                                className="px-2 py-3 text-xs text-gray-500"
                            >
                                Type a procedure name, formal term or
                                abbreviation to search the NSPC catalogue, or
                                just type freely if it isn&apos;t coded yet.
                            </div>
                        ) : results.length === 0 ? (
                            <div
                                role="status"
                                className="px-2 py-3 text-xs text-gray-500"
                            >
                                No matching catalogue entry - the text
                                you&apos;ve typed will be used as-is.
                            </div>
                        ) : (
                            <div
                                ref={listRef}
                                id={listboxId}
                                role="listbox"
                                aria-label={label || "Procedure code results"}
                            >
                                {results.map((item, index) => (
                                    // A div, not a button: in the combobox pattern
                                    // focus never leaves the input, and a button
                                    // here would put every result in the tab order.
                                    // The keyboard path is handleKeyDown plus
                                    // aria-activedescendant.
                                    <div
                                        key={item.conceptId}
                                        id={optionId(item.conceptId)}
                                        role="option"
                                        aria-selected={
                                            value?.concept?.conceptId ===
                                            item.conceptId
                                        }
                                        onClick={() => handleSelect(item)}
                                        onMouseEnter={() => setHighlight(index)}
                                        className={twMerge(
                                            "w-full text-left px-2 py-1 cursor-pointer",
                                            value?.concept?.conceptId ===
                                                item.conceptId && "bg-gray-100",
                                            index === highlight && "bg-blue-50",
                                        )}
                                    >
                                        <div className="text-sm">
                                            {item.preferredTerm}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {item.fsn}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </SearchBox>
            {hasPanel && (
                <div className="bg-white rounded-b border-gray-200 border-b border-r border-l flex flex-col divide-y divide-gray-200">
                    {isUncoded && (
                        <div
                            role="status"
                            className="flex items-center gap-1 px-1 py-0.5 text-xs text-amber-600"
                        >
                            <TriangleAlertIcon
                                className="h-3 w-3 shrink-0"
                                aria-hidden="true"
                            />
                            Uncoded procedure - the text will be used as-is.
                        </div>
                    )}
                    {isCoded && value?.concept?.levelApplicable && (
                        <SpinalLevelPicker
                            value={value}
                            onChange={(levels) =>
                                updatePostCoordination({ spinalLevels: levels })
                            }
                            disabled={disabled}
                        />
                    )}
                    {isCoded && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1">
                            {value?.concept?.lateralityApplicable && (
                                <FormField
                                    label="Laterality (side)"
                                    name="laterality"
                                    type="select"
                                    value={
                                        value?.postCoordination?.laterality ??
                                        ""
                                    }
                                    onChange={(e) =>
                                        updatePostCoordination({
                                            laterality: e.target.value,
                                        })
                                    }
                                    disabled={disabled}
                                >
                                    <option value="">Select</option>
                                    {LATERALITY_OPTIONS.map((opt) => (
                                        <option
                                            key={opt.value}
                                            value={opt.value}
                                        >
                                            {opt.label}
                                        </option>
                                    ))}
                                </FormField>
                            )}

                            {value?.concept?.revisionApplicable && (
                                <FormField
                                    label="Revision status"
                                    name="revisionStatus"
                                    type="select"
                                    value={
                                        value?.postCoordination
                                            ?.revisionStatus ?? ""
                                    }
                                    onChange={(e) =>
                                        updatePostCoordination({
                                            revisionStatus: e.target.value,
                                        })
                                    }
                                    disabled={disabled}
                                >
                                    {/* Without this the browser would show
                                        "Primary" while nothing was recorded -
                                        the one default a surgical record must
                                        not invent on the user's behalf. */}
                                    <option value="">Select</option>
                                    {REVISION_OPTIONS.map((opt) => (
                                        <option
                                            key={opt.value}
                                            value={opt.value}
                                        >
                                            {opt.label}
                                        </option>
                                    ))}
                                </FormField>
                            )}

                            <FormField
                                label="Priority (urgency)"
                                name="priority"
                                type="select"
                                value={value?.postCoordination?.priority ?? ""}
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
                        </div>
                    )}
                    {isCoded && (
                        <div className="px-1 py-0.5 text-xs flex flex-col">
                            <button
                                type="button"
                                className="flex items-center gap-1 cursor-pointer font-mono text-gray-500"
                                onClick={() => setCodeDetails((prev) => !prev)}
                            >
                                <ChevronRightIcon
                                    className={twMerge(
                                        "h-3 w-3 shrink-0 transition-transform",
                                        codeDetails && "rotate-90",
                                    )}
                                />
                                {value?.concept?.conceptId} -{" "}
                                {value?.concept?.catalogueRelease}
                            </button>
                            {codeDetails && (
                                <div className="px-1 py-0.5">
                                    <div className="text-xs text-gray-500">
                                        {value?.concept?.fsn}
                                    </div>
                                    {facetChips.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {facetChips.map(
                                                ([facetKey, term]) => (
                                                    <span
                                                        key={facetKey}
                                                        className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-700 ring-1 ring-inset ring-blue-200"
                                                    >
                                                        <span className="text-blue-500">
                                                            {FACET_LABELS[
                                                                facetKey
                                                            ] ?? facetKey}
                                                            :
                                                        </span>
                                                        {term}
                                                    </span>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            {/* Outside the panel and after it, where FormField puts its own -
                a message about the field, not another row of its contents. */}
            {!!errorMessage && (
                <p id={errorId} className="text-xs text-red-500">
                    {errorMessage}
                </p>
            )}
        </div>
    );
}
