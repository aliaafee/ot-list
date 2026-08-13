import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { twMerge } from "tailwind-merge";

import ProcedureConceptDetail from "./procedure-concept-detail";
import {
    buildProcedureTree,
    matchesProcedureFilter,
    SUBSPECIALTY_LABELS,
} from "@/lib/nspc";

/**
 * ProcedureCatalogueBrowser - the collapsible subspecialty -> procedure
 * site -> concept tree, with a free-text filter and a detail card for
 * whichever concept is selected.
 *
 * Extracted from ProcedureCodeBrowserModal so it can be reused verbatim
 * both inside that modal and, full-page, on the procedure-codes page -
 * this component owns the filter text and the expand/collapse state, the
 * caller only owns which concept is selected.
 *
 * @param {Object[]} concepts - Catalogue-shaped concepts to browse.
 * @param {string|null} selectedConceptId - Controlled selection.
 * @param {function} onSelectedConceptIdChange - Called with a conceptId
 *   when a row is clicked.
 * @param {function} onConfirm - Called with the concept on double-click,
 *   e.g. to confirm a picker selection immediately.
 * @param {string} initialExpandConceptId - Concept ID to open the tree to
 *   on mount, e.g. the value currently being edited.
 * @param {function} renderConceptBadge - (concept) => ReactNode, an
 *   optional badge rendered beside a row's ID, e.g. "Draft".
 * @param {boolean} showDetail - Whether to render the detail card for the
 *   selection below the tree (default true).
 * @param {boolean} includeInactive - Whether retired concepts appear in
 *   the tree (default false, i.e. only codes that may still be chosen).
 * @param {string} listClassName - Additional classes for the tree's
 *   scroll container, e.g. to change its max height.
 */
export default function ProcedureCatalogueBrowser({
    concepts,
    selectedConceptId = null,
    onSelectedConceptIdChange = () => {},
    onConfirm = () => {},
    initialExpandConceptId = null,
    renderConceptBadge = null,
    showDetail = true,
    includeInactive = false,
    className = "",
    listClassName = "",
}) {
    const tree = useMemo(
        () => buildProcedureTree(concepts, { includeInactive }),
        [concepts, includeInactive],
    );

    const initialConcept = useMemo(
        () =>
            concepts.find((c) => c.conceptId === initialExpandConceptId) ??
            null,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const [filterText, setFilterText] = useState("");
    const [expanded, setExpanded] = useState(() => {
        if (!initialConcept) return new Set();
        const site = initialConcept.facets?.procedureSite || "Other";
        return new Set([
            initialConcept.subspecialty,
            `${initialConcept.subspecialty}::${site}`,
        ]);
    });

    const selectedConcept =
        concepts.find((c) => c.conceptId === selectedConceptId) ?? null;

    const filterLower = filterText.trim().toLowerCase();
    const filtering = filterLower !== "";

    // Filtering narrows the tree to matching concepts and forces every
    // group that still has a match open, without touching manual
    // expand/collapse state - clearing the filter restores it.
    const visibleTree = useMemo(() => {
        if (!filtering) return tree;
        return tree
            .map(({ subspecialty, sites }) => {
                const filteredSites = sites
                    .map(({ site, concepts: siteConcepts }) => ({
                        site,
                        concepts: siteConcepts.filter((c) =>
                            matchesProcedureFilter(c, filterLower),
                        ),
                    }))
                    .filter(({ concepts: c }) => c.length > 0);
                return {
                    subspecialty,
                    sites: filteredSites,
                    count: filteredSites.reduce(
                        (n, s) => n + s.concepts.length,
                        0,
                    ),
                };
            })
            .filter(({ sites }) => sites.length > 0);
    }, [tree, filtering, filterLower]);

    const isExpanded = (key) => filtering || expanded.has(key);

    const toggle = (key) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    return (
        <div className={twMerge("space-y-3", className)}>
            <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter by name, formal term or abbreviation"
                className="text-sm py-1.5 px-2 rounded-md bg-white w-full border border-gray-300"
                autoFocus
            />

            <div
                className={twMerge(
                    "border border-gray-300 rounded-md max-h-96 overflow-y-auto bg-white",
                    listClassName,
                )}
            >
                {visibleTree.length === 0 && (
                    <p className="p-4 text-sm text-center text-gray-500">
                        No procedure codes match "{filterText}".
                    </p>
                )}
                {visibleTree.map(({ subspecialty, sites, count }) => (
                    <div
                        key={subspecialty}
                        className="border-b border-gray-100 last:border-b-0"
                    >
                        <button
                            type="button"
                            onClick={() => toggle(subspecialty)}
                            className="w-full flex items-center gap-1.5 px-2 py-2 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50 cursor-pointer"
                        >
                            {isExpanded(subspecialty) ? (
                                <ChevronDown
                                    width={14}
                                    height={14}
                                    className="text-gray-400 shrink-0"
                                />
                            ) : (
                                <ChevronRight
                                    width={14}
                                    height={14}
                                    className="text-gray-400 shrink-0"
                                />
                            )}
                            <span className="grow">
                                {SUBSPECIALTY_LABELS[subspecialty] ??
                                    subspecialty}
                            </span>
                            <span className="text-xs font-normal text-gray-400">
                                {count}
                            </span>
                        </button>

                        {isExpanded(subspecialty) &&
                            sites.map(({ site, concepts: siteConcepts }) => {
                                const siteKey = `${subspecialty}::${site}`;
                                return (
                                    <div key={siteKey} className="pl-4">
                                        <button
                                            type="button"
                                            onClick={() => toggle(siteKey)}
                                            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
                                        >
                                            {isExpanded(siteKey) ? (
                                                <ChevronDown
                                                    width={12}
                                                    height={12}
                                                    className="text-gray-400 shrink-0"
                                                />
                                            ) : (
                                                <ChevronRight
                                                    width={12}
                                                    height={12}
                                                    className="text-gray-400 shrink-0"
                                                />
                                            )}
                                            <span className="grow">
                                                {site}
                                            </span>
                                            <span className="text-[11px] font-normal text-gray-400">
                                                {siteConcepts.length}
                                            </span>
                                        </button>

                                        {isExpanded(siteKey) && (
                                            <ul className="pl-4 pb-1">
                                                {siteConcepts.map(
                                                    (concept) => (
                                                        <li
                                                            key={
                                                                concept.conceptId
                                                            }
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    onSelectedConceptIdChange(
                                                                        concept.conceptId,
                                                                    )
                                                                }
                                                                onDoubleClick={() =>
                                                                    onConfirm(
                                                                        concept,
                                                                    )
                                                                }
                                                                className={twMerge(
                                                                    "w-full flex items-baseline justify-between gap-2 rounded px-2 py-1.5 text-left cursor-pointer",
                                                                    selectedConceptId ===
                                                                        concept.conceptId
                                                                        ? "bg-blue-50"
                                                                        : "hover:bg-gray-50",
                                                                )}
                                                            >
                                                                <span className="text-sm text-gray-900 flex items-center gap-1.5">
                                                                    {
                                                                        concept.preferredTerm
                                                                    }
                                                                    {renderConceptBadge?.(
                                                                        concept,
                                                                    )}
                                                                </span>
                                                                <span className="text-[11px] font-mono text-gray-400 shrink-0">
                                                                    {
                                                                        concept.conceptId
                                                                    }
                                                                </span>
                                                            </button>
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                ))}
            </div>

            {showDetail && selectedConcept && (
                <ProcedureConceptDetail concept={selectedConcept} />
            )}
        </div>
    );
}
