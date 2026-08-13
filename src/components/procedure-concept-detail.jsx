import { twMerge } from "tailwind-merge";

import { FACET_LABELS } from "@/lib/nspc";

/**
 * ProcedureConceptDetail - the blue detail card for a catalogue concept.
 *
 * Extracted from ProcedureCodeBrowserModal so the same card renders a
 * selection there, in the procedure-codes page's browse tab, and as the
 * live preview of a not-yet-saved draft concept while it's being built.
 *
 * A retired concept renders in grey rather than blue, with its reason
 * and successor: the card is the only place a stored code is shown once
 * the pickers have stopped offering it, so "this is no longer a code you
 * may choose" has to be visible on the card itself.
 *
 * @param {Object} concept - A catalogue-shaped concept (conceptId, fsn,
 *   preferredTerm, facets, catalogueRelease, ...).
 * @param {ReactNode} badge - Optional extra content rendered next to the
 *   concept ID, e.g. a "Draft" tag.
 */
export default function ProcedureConceptDetail({ concept, badge = null }) {
    if (!concept) return null;

    const facetChips = Object.entries(concept.facets ?? {}).filter(
        ([, term]) => !!term,
    );
    const retired = concept.active === false;

    return (
        <div
            className={twMerge(
                "border rounded-md p-2",
                retired
                    ? "border-gray-300 bg-gray-100"
                    : "border-blue-200 bg-blue-50",
            )}
        >
            <div className="flex items-baseline justify-between gap-2">
                <span
                    className={twMerge(
                        "text-sm font-medium text-gray-900",
                        retired && "text-gray-500 line-through",
                    )}
                >
                    {concept.preferredTerm}
                </span>
                <span
                    className={twMerge(
                        "flex items-center gap-1.5 text-[11px] font-mono shrink-0",
                        retired ? "text-gray-500" : "text-blue-700",
                    )}
                >
                    {concept.conceptId} · {concept.catalogueRelease}
                    {badge}
                </span>
            </div>
            <div className="text-xs text-gray-600">{concept.fsn}</div>
            {retired && (
                <div className="mt-1 text-xs text-gray-600">
                    <span className="font-medium text-gray-700">Retired</span>
                    {concept.inactivationReason && ` · ${concept.inactivationReason}`}
                    {concept.effectiveTo && ` · to ${concept.effectiveTo}`}
                    {concept.replacedBy && (
                        <>
                            {" · replaced by "}
                            <span className="font-mono">
                                {concept.replacedBy}
                            </span>
                        </>
                    )}
                </div>
            )}
            {facetChips.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                    {facetChips.map(([facetKey, term]) => (
                        <span
                            key={facetKey}
                            className={twMerge(
                                "inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-700 ring-1 ring-inset",
                                retired
                                    ? "ring-gray-300"
                                    : "ring-blue-200",
                            )}
                        >
                            <span
                                className={
                                    retired ? "text-gray-400" : "text-blue-500"
                                }
                            >
                                {FACET_LABELS[facetKey] ?? facetKey}:
                            </span>
                            {term}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
