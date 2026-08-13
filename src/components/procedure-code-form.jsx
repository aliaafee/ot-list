import { useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";

import FormField from "@/components/form-field";
import SynonymEditor from "@/components/synonym-editor";
import {
    FACET_TYPES,
    SPINAL_REGIONS,
    buildDraftFacetValue,
} from "@/lib/procedure-code-draft";
import { LEVEL_KIND_LABELS, SUBSPECIALTY_LABELS, SUBSPECIALTY_ORDER } from "@/lib/nspc";

/**
 * FacetSelect - picks (or creates) the facet value behind one of a
 * concept's six facet slots.
 *
 * A plain <select> of existing values, plus an inline "add new value"
 * row: the concept CSV needs the facetValueId, not just the term (see
 * lib/procedure-code-draft.js), so picking has to carry both.
 */
function FacetSelect({
    type,
    facetIds,
    onChange,
    existingFacetValues,
    draftFacetValues,
    onCreateFacetValue,
}) {
    const [adding, setAdding] = useState(false);
    const [newTerm, setNewTerm] = useState("");

    const options = [...existingFacetValues, ...draftFacetValues]
        .filter((f) => f.facet === type.facetId)
        .sort((a, b) => a.term.localeCompare(b.term));

    const selectedId = facetIds[type.key] ?? "";

    const handleSelect = (e) => {
        const value = e.target.value;
        if (value === "__new__") {
            setAdding(true);
            return;
        }
        const chosen = options.find((f) => f.facetValueId === value);
        onChange(type.key, chosen?.facetValueId ?? null, chosen?.term ?? null);
    };

    const confirmAdd = () => {
        const term = newTerm.trim();
        if (!term) return;
        const created = buildDraftFacetValue(
            type.key,
            term,
            existingFacetValues,
            draftFacetValues,
        );
        onCreateFacetValue(created);
        onChange(type.key, created.facetValueId, created.term);
        setNewTerm("");
        setAdding(false);
    };

    return (
        <div className="flex flex-col">
            <label className="text-xs text-left text-gray-700">
                {type.label}
            </label>
            {!adding ? (
                <select
                    value={selectedId ?? ""}
                    onChange={handleSelect}
                    className="w-full rounded p-1 bg-white border border-gray-200"
                >
                    <option value="">Not applicable</option>
                    {options.map((f) => (
                        <option key={f.facetValueId} value={f.facetValueId}>
                            {f.term}
                        </option>
                    ))}
                    <option value="__new__">+ Add new {type.label.toLowerCase()}…</option>
                </select>
            ) : (
                <div className="flex gap-1">
                    <input
                        type="text"
                        autoFocus
                        value={newTerm}
                        onChange={(e) => setNewTerm(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                confirmAdd();
                            }
                            if (e.key === "Escape") {
                                setAdding(false);
                                setNewTerm("");
                            }
                        }}
                        placeholder={`New ${type.label.toLowerCase()} term`}
                        className="w-full rounded p-1 bg-white border border-gray-200"
                    />
                    <button
                        type="button"
                        onClick={confirmAdd}
                        title="Add"
                        className="rounded bg-blue-600 text-white px-2 hover:bg-blue-500 cursor-pointer shrink-0"
                    >
                        <PlusIcon width={14} height={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setAdding(false);
                            setNewTerm("");
                        }}
                        title="Cancel"
                        className="rounded border border-gray-300 px-2 text-gray-500 hover:bg-gray-50 cursor-pointer shrink-0"
                    >
                        <XIcon width={14} height={14} />
                    </button>
                </div>
            )}
        </div>
    );
}

/**
 * ProcedureCodeForm - fields for one draft procedure code.
 *
 * Everything here maps directly onto a row of seed_procedures.csv /
 * seed_synonyms.csv (see lib/procedure-code-draft.js) - the concept it
 * edits is held by the caller (the procedure-codes page), never
 * persisted, so this is a controlled form with no submit of its own.
 *
 * @param {Object} concept - The draft concept being edited.
 * @param {function} onChange - Called with the updated draft concept.
 * @param {Object} errors - Field name -> message, from validateDraftConcept.
 * @param {Object[]} existingFacetValues - Facet values already in PocketBase.
 * @param {Object[]} draftFacetValues - Facet values created this session.
 * @param {function} onCreateFacetValue - Called with a new facet value row
 *   to add to draftFacetValues.
 */
export default function ProcedureCodeForm({
    concept,
    onChange,
    errors = {},
    existingFacetValues,
    draftFacetValues,
    onCreateFacetValue,
}) {
    const set = (patch) => onChange({ ...concept, ...patch });

    const setFacet = (key, id, term) =>
        onChange({
            ...concept,
            facetIds: { ...concept.facetIds, [key]: id },
            facets: { ...concept.facets, [key]: term },
        });

    return (
        <form className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <FormField
                label="Concept ID"
                name="conceptId"
                value={concept.conceptId}
                onChange={(e) => set({ conceptId: e.target.value })}
                className="md:col-span-1"
                error={!!errors.conceptId}
                errorMessage={errors.conceptId}
            />
            <FormField
                label="Catalogue release"
                name="catalogueRelease"
                placeholder="e.g. v2026.3"
                value={concept.catalogueRelease}
                onChange={(e) => set({ catalogueRelease: e.target.value })}
                className="md:col-span-1"
                error={!!errors.catalogueRelease}
                errorMessage={errors.catalogueRelease}
            />
            <FormField
                label="Effective from"
                name="effectiveFrom"
                type="date"
                value={concept.effectiveFrom}
                onChange={(e) => set({ effectiveFrom: e.target.value })}
                className="md:col-span-1"
                error={!!errors.effectiveFrom}
                errorMessage={errors.effectiveFrom}
            />
            <FormField
                label="Status"
                name="active"
                type="select"
                value={concept.active ? "1" : "0"}
                onChange={(e) => set({ active: e.target.value === "1" })}
                className="md:col-span-1"
            >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
            </FormField>

            <FormField
                label="Fully specified name (FSN)"
                name="fsn"
                placeholder="e.g. Craniotomy and clipping of aneurysm (procedure)"
                value={concept.fsn}
                onChange={(e) => set({ fsn: e.target.value })}
                className="md:col-span-4"
                error={!!errors.fsn}
                errorMessage={errors.fsn}
            />
            <FormField
                label="Preferred term"
                name="preferredTerm"
                placeholder="e.g. Aneurysm clipping"
                value={concept.preferredTerm}
                onChange={(e) => set({ preferredTerm: e.target.value })}
                className="md:col-span-2"
                error={!!errors.preferredTerm}
                errorMessage={errors.preferredTerm}
            />
            <div className="flex flex-col md:col-span-2">
                <label className="text-xs text-left text-gray-700">
                    Subspecialty
                </label>
                <input
                    list="subspecialty-options"
                    value={concept.subspecialty}
                    onChange={(e) => set({ subspecialty: e.target.value })}
                    className={twMerge(
                        "w-full rounded p-1 bg-white border border-gray-200",
                        !!errors.subspecialty && "border-red-500 bg-red-50",
                    )}
                />
                <datalist id="subspecialty-options">
                    {SUBSPECIALTY_ORDER.map((key) => (
                        <option key={key} value={key}>
                            {SUBSPECIALTY_LABELS[key] ?? key}
                        </option>
                    ))}
                </datalist>
                {!!errors.subspecialty && (
                    <p className="text-xs text-red-500">
                        {errors.subspecialty}
                    </p>
                )}
            </div>

            {FACET_TYPES.map((type) => (
                <FacetSelect
                    key={type.key}
                    type={type}
                    facetIds={concept.facetIds}
                    onChange={setFacet}
                    existingFacetValues={existingFacetValues}
                    draftFacetValues={draftFacetValues}
                    onCreateFacetValue={onCreateFacetValue}
                />
            ))}

            <div className="md:col-span-4 flex flex-wrap gap-4 border-t border-gray-200 pt-2 mt-1">
                <label className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
                    <input
                        type="checkbox"
                        checked={concept.lateralityApplicable}
                        onChange={(e) =>
                            set({ lateralityApplicable: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Laterality applies
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
                    <input
                        type="checkbox"
                        checked={concept.revisionApplicable}
                        onChange={(e) =>
                            set({ revisionApplicable: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Revision status applies
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
                    <input
                        type="checkbox"
                        checked={concept.levelApplicable}
                        onChange={(e) =>
                            set({
                                levelApplicable: e.target.checked,
                                levelKind: e.target.checked
                                    ? (concept.levelKind ?? "interspace")
                                    : null,
                                levelRegions: e.target.checked
                                    ? concept.levelRegions
                                    : [],
                            })
                        }
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Spinal level applies
                </label>
            </div>

            {concept.levelApplicable && (
                <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <FormField
                        label="Level vocabulary"
                        name="levelKind"
                        type="select"
                        value={concept.levelKind ?? ""}
                        onChange={(e) => set({ levelKind: e.target.value })}
                        className="md:col-span-1"
                        error={!!errors.levelKind}
                        errorMessage={errors.levelKind}
                    >
                        {Object.entries(LEVEL_KIND_LABELS).map(
                            ([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ),
                        )}
                    </FormField>
                    <div className="md:col-span-3">
                        <label className="text-xs text-left text-gray-700">
                            Usual regions (picker hint, not a hard limit)
                        </label>
                        <div className="mt-1 flex flex-wrap gap-1">
                            {SPINAL_REGIONS.map((region) => {
                                const selected =
                                    concept.levelRegions.includes(region);
                                return (
                                    <button
                                        key={region}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() =>
                                            set({
                                                levelRegions: selected
                                                    ? concept.levelRegions.filter(
                                                          (r) => r !== region,
                                                      )
                                                    : [
                                                          ...concept.levelRegions,
                                                          region,
                                                      ],
                                            })
                                        }
                                        className={twMerge(
                                            "rounded px-2 py-0.5 text-xs ring-1 ring-inset cursor-pointer",
                                            "ring-gray-300 text-gray-700 hover:bg-gray-100",
                                            selected &&
                                                "bg-blue-600 text-white ring-blue-600 hover:bg-blue-600",
                                        )}
                                    >
                                        {region}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <SynonymEditor
                synonyms={concept.synonyms}
                onChange={(synonyms) => set({ synonyms })}
                className="md:col-span-4 border-t border-gray-200 pt-2 mt-1"
            />
        </form>
    );
}
