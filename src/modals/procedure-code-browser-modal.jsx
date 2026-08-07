import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown, FolderTree } from "lucide-react";
import { twMerge } from "tailwind-merge";

import ModalWindow from "./modal-window";
import { useCatalogue } from "@/contexts/catalogue-context";
import {
    FACET_LABELS,
    SUBSPECIALTY_LABELS,
    SUBSPECIALTY_ORDER,
} from "@/lib/nspc";

/**
 * Groups the catalogue into subspecialty -> procedure site -> concepts.
 *
 * There is no explicit hierarchy table: identifiers are opaque and encode
 * nothing, so the browser's three levels are derived from fields every
 * concept already carries. Nothing extra to keep in sync.
 */
function buildTree(concepts) {
    const bySubspecialty = new Map();

    for (const concept of concepts) {
        if (!concept.active) continue;

        const site = concept.facets?.procedureSite || "Other";
        if (!bySubspecialty.has(concept.subspecialty)) {
            bySubspecialty.set(concept.subspecialty, new Map());
        }
        const bySite = bySubspecialty.get(concept.subspecialty);
        if (!bySite.has(site)) bySite.set(site, []);
        bySite.get(site).push(concept);
    }

    // Anything the catalogue grows that the fixed order doesn't know
    // about still renders, just at the end.
    const order = [
        ...SUBSPECIALTY_ORDER,
        ...[...bySubspecialty.keys()].filter(
            (key) => !SUBSPECIALTY_ORDER.includes(key),
        ),
    ];

    return order
        .filter((key) => bySubspecialty.has(key))
        .map((subspecialty) => {
            const sites = [...bySubspecialty.get(subspecialty).entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([site, siteConcepts]) => ({
                    site,
                    concepts: [...siteConcepts].sort((a, b) =>
                        a.preferredTerm.localeCompare(b.preferredTerm),
                    ),
                }));
            const count = sites.reduce((n, s) => n + s.concepts.length, 0);
            return { subspecialty, sites, count };
        });
}

/** True when a concept matches a free-text filter (name, FSN, synonyms). */
function matchesFilter(concept, filterLower) {
    if (!filterLower) return true;
    if (concept.preferredTerm.toLowerCase().includes(filterLower)) return true;
    if (concept.fsn.toLowerCase().includes(filterLower)) return true;
    return concept.synonyms.some(
        (s) => s.active && s.term.toLowerCase().includes(filterLower),
    );
}

/**
 * ProcedureCodeBrowserModal - browse the NSPC catalogue as a collapsible
 * subspecialty -> procedure site -> concept tree, for cases where a
 * surgeon knows where a procedure lives but not what to type.
 *
 * Selection follows the same pick-then-confirm pattern as
 * PatientSearchModal: clicking a concept highlights it, "Select" confirms.
 *
 * @param {function} onSelect - Called with the chosen catalogue concept.
 * @param {function} onCancel - Called when the modal is dismissed.
 * @param {string} initialConceptId - Concept ID to preselect and open the
 *   tree to, e.g. the currently coded value being edited.
 */
export default function ProcedureCodeBrowserModal({
    onSelect,
    onCancel,
    initialConceptId = null,
}) {
    const { concepts } = useCatalogue();

    const tree = useMemo(() => buildTree(concepts), [concepts]);

    const initialConcept = useMemo(
        () => concepts.find((c) => c.conceptId === initialConceptId) ?? null,
        [concepts, initialConceptId],
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
    const [selectedConcept, setSelectedConcept] = useState(initialConcept);

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
                            matchesFilter(c, filterLower),
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

    const selectedFacetChips = selectedConcept
        ? Object.entries(selectedConcept.facets ?? {}).filter(
              ([, term]) => !!term,
          )
        : [];

    const handleConfirm = () => {
        if (selectedConcept) onSelect(selectedConcept);
    };

    return (
        <ModalWindow
            title="Browse procedure codes"
            icon={<FolderTree width={20} height={20} />}
            iconColor="bg-blue-100 text-blue-600"
            okLabel="Select"
            okColor="bg-blue-600 hover:bg-blue-500"
            onOk={handleConfirm}
            onCancel={onCancel}
            okDisabled={!selectedConcept}
            large={true}
        >
            <div className="space-y-3">
                <input
                    type="text"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    placeholder="Filter by name, formal term or abbreviation"
                    className="text-sm py-1.5 px-2 rounded-md bg-white w-full border border-gray-300"
                    autoFocus
                />

                <div className="border border-gray-300 rounded-md max-h-96 overflow-y-auto bg-white">
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
                                sites.map(
                                    ({ site, concepts: siteConcepts }) => {
                                        const siteKey = `${subspecialty}::${site}`;
                                        return (
                                            <div
                                                key={siteKey}
                                                className="pl-4"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        toggle(siteKey)
                                                    }
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
                                                                            setSelectedConcept(
                                                                                concept,
                                                                            )
                                                                        }
                                                                        onDoubleClick={() =>
                                                                            onSelect(
                                                                                concept,
                                                                            )
                                                                        }
                                                                        className={twMerge(
                                                                            "w-full flex items-baseline justify-between gap-2 rounded px-2 py-1.5 text-left cursor-pointer",
                                                                            selectedConcept?.conceptId ===
                                                                                concept.conceptId
                                                                                ? "bg-blue-50"
                                                                                : "hover:bg-gray-50",
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
                                                                </li>
                                                            ),
                                                        )}
                                                    </ul>
                                                )}
                                            </div>
                                        );
                                    },
                                )}
                        </div>
                    ))}
                </div>

                {selectedConcept && (
                    <div className="border border-blue-200 bg-blue-50 rounded-md p-2">
                        <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-medium text-gray-900">
                                {selectedConcept.preferredTerm}
                            </span>
                            <span className="text-[11px] font-mono text-blue-700 shrink-0">
                                {selectedConcept.conceptId} ·{" "}
                                {selectedConcept.catalogueRelease}
                            </span>
                        </div>
                        <div className="text-xs text-gray-600">
                            {selectedConcept.fsn}
                        </div>
                        {selectedFacetChips.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                                {selectedFacetChips.map(([facetKey, term]) => (
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
        </ModalWindow>
    );
}
