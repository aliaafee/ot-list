import { useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import { ChevronRightIcon, ChevronDownIcon } from "lucide-react";

import { FACET_LABELS, LEVEL_KIND_LABELS } from "@/lib/procedure-catalogue";
import { UNCODED_CONCEPT_ID } from "@/lib/procedure-codes";

/** "peripheral-nerve" -> "Peripheral nerve". */
const titleCase = (value) =>
    (value || "Other")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

/** Every field a filter query is matched against. */
const conceptHaystack = (concept) =>
    [
        concept.preferredTerm,
        concept.fsn,
        concept.conceptId,
        concept.subspecialty,
        ...(concept.synonyms ?? []).map((synonym) => synonym.term),
    ]
        .join(" ␟ ")
        .toLowerCase();

/**
 * The browsable catalogue as `subspecialty -> site -> concepts`.
 *
 * The uncoded sentinel and retired concepts are left out: the sentinel is
 * assigned, never chosen (spec section 8), and a retired code can no longer be
 * picked. Everything is ordered for reading - groups alphabetically, concepts
 * by preferred term.
 */
function buildTree(concepts) {
    const bySubspecialty = new Map();

    for (const concept of concepts) {
        if (!concept.active || concept.conceptId === UNCODED_CONCEPT_ID) {
            continue;
        }

        const subspecialty = concept.subspecialty || "other";
        const site = concept.facets?.procedureSite || "Other";

        if (!bySubspecialty.has(subspecialty)) {
            bySubspecialty.set(subspecialty, new Map());
        }
        const bySite = bySubspecialty.get(subspecialty);
        if (!bySite.has(site)) {
            bySite.set(site, []);
        }
        bySite.get(site).push(concept);
    }

    return [...bySubspecialty.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([subspecialty, bySite]) => {
            const sites = [...bySite.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([site, siteConcepts]) => ({
                    site,
                    concepts: [...siteConcepts].sort((a, b) =>
                        a.preferredTerm.localeCompare(b.preferredTerm),
                    ),
                }));
            return {
                subspecialty,
                sites,
                count: sites.reduce((n, s) => n + s.concepts.length, 0),
            };
        });
}

/**
 * The FSN, facets, applicability and synonyms for a concept, rendered inline
 * under its row in the tree once it is selected.
 */
function ConceptDetail({ concept }) {
    if (!concept) return null;

    const facetChips = Object.entries(concept.facets ?? {}).filter(
        ([, term]) => !!term,
    );

    const takes = [
        concept.lateralityApplicable && "Laterality",
        concept.revisionApplicable && "Revision status",
        concept.levelApplicable &&
            `Spinal level (${LEVEL_KIND_LABELS[concept.levelKind] ?? concept.levelKind})`,
    ].filter(Boolean);

    const synonyms = (concept.synonyms ?? []).filter((s) => s.active);

    return (
        <div className="px-2 pb-2 pt-1">
            <div className="text-xs text-gray-600">{concept.fsn}</div>

            {facetChips.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                    {facetChips.map(([facetKey, term]) => (
                        <span
                            key={facetKey}
                            className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-700 ring-1 ring-inset ring-blue-200"
                        >
                            <span className="text-blue-500">
                                {FACET_LABELS[facetKey] ?? facetKey}:
                            </span>
                            {term}
                        </span>
                    ))}
                </div>
            )}

            {takes.length > 0 && (
                <p className="mt-2 text-[11px] text-gray-500">
                    Records: {takes.join(" · ")}
                </p>
            )}

            {synonyms.length > 0 && (
                <p className="mt-1 text-[11px] text-gray-500">
                    Also known as:{" "}
                    {synonyms.map((synonym) => synonym.term).join(", ")}
                </p>
            )}
        </div>
    );
}

/**
 * ProcedureCodeBrowser - the collapsible subspecialty -> site -> concept tree,
 * with a free-text filter and a detail card for whichever concept is selected.
 *
 * Owns the filter text and the expand/collapse state; the caller owns which
 * concept is selected, so the same component can drive the picker's browse
 * modal and, later, a full-page catalogue view.
 *
 * @param {Object[]} concepts - Catalogue-shaped concepts to browse.
 * @param {string|null} selectedConceptId - Controlled selection.
 * @param {function} onSelectedConceptIdChange - Called with a conceptId when a
 *   row is clicked.
 * @param {function} onConfirm - Called with the concept on double-click, e.g.
 *   to confirm a picker selection immediately.
 * @param {string} initialConceptId - Concept to open the tree to on mount.
 * @param {boolean} showDetail - Render the detail card below the tree (default
 *   true).
 * @param {string} className - Extra classes for the outer container.
 * @param {string} listClassName - Extra classes for the tree's scroll box, e.g.
 *   to change its height.
 */
export default function ProcedureCodeBrowser({
    concepts,
    selectedConceptId = null,
    onSelectedConceptIdChange = () => {},
    onConfirm = () => {},
    initialConceptId = null,
    showDetail = true,
    className = "",
    listClassName = "",
}) {
    const tree = useMemo(() => buildTree(concepts), [concepts]);

    const [filterText, setFilterText] = useState("");
    const [expanded, setExpanded] = useState(() => {
        const concept = concepts.find((c) => c.conceptId === initialConceptId);
        if (!concept || concept.conceptId === UNCODED_CONCEPT_ID) {
            return new Set();
        }
        const subspecialty = concept.subspecialty || "other";
        const site = concept.facets?.procedureSite || "Other";
        return new Set([subspecialty, `${subspecialty}::${site}`]);
    });

    const query = filterText.trim().toLowerCase();
    const filtering = query !== "";

    // Filtering narrows the tree to matching concepts and opens every group
    // that still has one, without disturbing manual expand/collapse - clearing
    // the box restores it.
    const visibleTree = useMemo(() => {
        if (!filtering) return tree;
        return tree
            .map(({ subspecialty, sites }) => {
                const filteredSites = sites
                    .map(({ site, concepts: siteConcepts }) => ({
                        site,
                        concepts: siteConcepts.filter((c) =>
                            conceptHaystack(c).includes(query),
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
    }, [tree, filtering, query]);

    const isExpanded = (key) => filtering || expanded.has(key);

    const toggle = (key) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });

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
                        {filtering
                            ? `No procedure codes match "${filterText}".`
                            : "The catalogue is empty."}
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
                                <ChevronDownIcon
                                    width={14}
                                    height={14}
                                    className="text-gray-400 shrink-0"
                                />
                            ) : (
                                <ChevronRightIcon
                                    width={14}
                                    height={14}
                                    className="text-gray-400 shrink-0"
                                />
                            )}
                            <span className="grow">
                                {titleCase(subspecialty)}
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
                                                <ChevronDownIcon
                                                    width={12}
                                                    height={12}
                                                    className="text-gray-400 shrink-0"
                                                />
                                            ) : (
                                                <ChevronRightIcon
                                                    width={12}
                                                    height={12}
                                                    className="text-gray-400 shrink-0"
                                                />
                                            )}
                                            <span className="grow">{site}</span>
                                            <span className="text-[11px] font-normal text-gray-400">
                                                {siteConcepts.length}
                                            </span>
                                        </button>

                                        {isExpanded(siteKey) && (
                                            <ul className="pl-4 pb-1">
                                                {siteConcepts.map((concept) => {
                                                    const isSelected =
                                                        selectedConceptId ===
                                                        concept.conceptId;
                                                    return (
                                                        <li
                                                            key={
                                                                concept.conceptId
                                                            }
                                                            className={twMerge(
                                                                "rounded",
                                                                isSelected &&
                                                                    "bg-blue-50",
                                                            )}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    onSelectedConceptIdChange(
                                                                        isSelected
                                                                            ? null
                                                                            : concept.conceptId,
                                                                    )
                                                                }
                                                                onDoubleClick={() =>
                                                                    onConfirm(
                                                                        concept,
                                                                    )
                                                                }
                                                                aria-expanded={
                                                                    isSelected
                                                                }
                                                                className={twMerge(
                                                                    "w-full flex items-baseline justify-between gap-2 rounded px-2 py-1.5 text-left cursor-pointer",
                                                                    !isSelected &&
                                                                        "hover:bg-gray-50",
                                                                )}
                                                            >
                                                                <span className="text-sm text-gray-900">
                                                                    {
                                                                        concept.preferredTerm
                                                                    }
                                                                </span>
                                                                <span className="text-[11px] font-mono text-gray-400 shrink-0">
                                                                    {
                                                                        concept.conceptId
                                                                    }
                                                                </span>
                                                            </button>
                                                            {showDetail &&
                                                                isSelected && (
                                                                    <ConceptDetail
                                                                        concept={
                                                                            concept
                                                                        }
                                                                    />
                                                                )}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                ))}
            </div>
        </div>
    );
}
