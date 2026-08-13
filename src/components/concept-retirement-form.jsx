import { twMerge } from "tailwind-merge";

import FormField from "@/components/form-field";
import { INACTIVATION_REASONS } from "@/lib/procedure-code-draft";

/**
 * ConceptRetirementForm - retire one existing catalogue concept.
 *
 * Retiring is the only way a code ever leaves the catalogue: identifiers
 * are permanent, so a concept that turns out to be wrong, duplicated or
 * obsolete is marked inactive and pointed at its successor, never
 * deleted and never edited into meaning something else (NSPC spec
 * section 2). Every operative note already coded against it has to keep
 * resolving.
 *
 * Like the rest of the procedure-codes page this is in memory only - it
 * produces the lifecycle columns a developer applies to the concept's
 * existing seed_procedures.csv row, nothing here writes to PocketBase.
 *
 * @param {Object} concept - The catalogue concept being retired.
 * @param {Object|null} retirement - The pending retirement, or null when
 *   the concept is not being retired.
 * @param {Object[]} successors - Concepts offerable as `replacedBy`.
 * @param {Object} errors - Field name -> message, from validateRetirement.
 * @param {function} onStart - Called to begin retiring this concept.
 * @param {function} onChange - Called with the updated retirement.
 * @param {function} onCancel - Called to drop the pending retirement.
 */
export default function ConceptRetirementForm({
    concept,
    retirement,
    successors = [],
    errors = {},
    onStart,
    onChange,
    onCancel,
    className = "",
}) {
    if (!retirement) {
        return (
            <div className={twMerge("flex justify-end", className)}>
                <button
                    type="button"
                    onClick={onStart}
                    className="text-xs text-red-600 hover:underline cursor-pointer"
                >
                    Retire this code…
                </button>
            </div>
        );
    }

    const set = (patch) => onChange({ ...retirement, ...patch });

    return (
        <div
            className={twMerge(
                "rounded-md border border-red-200 bg-red-50/60 p-2",
                className,
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-gray-600">
                    Retiring{" "}
                    <span className="font-mono">{concept.conceptId}</span> - it
                    stays in the catalogue and keeps resolving, the pickers
                    just stop offering it.
                </p>
                <button
                    type="button"
                    onClick={onCancel}
                    className="shrink-0 text-xs text-blue-600 hover:underline cursor-pointer"
                >
                    Keep active
                </button>
            </div>

            <div className="mt-1.5 grid grid-cols-1 gap-2 md:grid-cols-4">
                <FormField
                    label="Reason"
                    name="inactivationReason"
                    type="select"
                    value={retirement.inactivationReason}
                    onChange={(e) =>
                        set({ inactivationReason: e.target.value })
                    }
                    error={!!errors.inactivationReason}
                    errorMessage={errors.inactivationReason}
                >
                    <option value="">Choose a reason…</option>
                    {INACTIVATION_REASONS.map((reason) => (
                        <option key={reason.value} value={reason.value}>
                            {reason.label}
                        </option>
                    ))}
                </FormField>

                {/* Optional: a code retired as outdated may have no
                    successor at all. One that was a duplicate or was
                    re-meant must point at the code that took over, or
                    historical records resolve to a dead end. */}
                <FormField
                    label="Replaced by"
                    name="replacedBy"
                    type="select"
                    value={retirement.replacedBy}
                    onChange={(e) => set({ replacedBy: e.target.value })}
                    className="md:col-span-2"
                    error={!!errors.replacedBy}
                    errorMessage={errors.replacedBy}
                >
                    <option value="">Nothing - no successor</option>
                    {successors.map((c) => (
                        <option key={c.conceptId} value={c.conceptId}>
                            {c.preferredTerm} ({c.conceptId})
                            {c.isDraft ? " - draft" : ""}
                        </option>
                    ))}
                </FormField>

                <FormField
                    label="Effective to"
                    name="effectiveTo"
                    type="date"
                    value={retirement.effectiveTo}
                    onChange={(e) => set({ effectiveTo: e.target.value })}
                    error={!!errors.effectiveTo}
                    errorMessage={errors.effectiveTo}
                />

                <FormField
                    label="Catalogue release"
                    name="catalogueRelease"
                    placeholder="e.g. v2026.3"
                    value={retirement.catalogueRelease}
                    onChange={(e) =>
                        set({ catalogueRelease: e.target.value })
                    }
                    error={!!errors.catalogueRelease}
                    errorMessage={errors.catalogueRelease}
                />
            </div>

            {successors.find((c) => c.conceptId === retirement.replacedBy)
                ?.isDraft && (
                <p className="mt-1.5 text-xs text-amber-700">
                    The successor is a draft - its row has to go into
                    seed_procedures.csv in the same release, or the build
                    will reject the reference.
                </p>
            )}
        </div>
    );
}
