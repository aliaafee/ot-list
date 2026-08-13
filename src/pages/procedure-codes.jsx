import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, DownloadIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

import BodyLayout from "@/components/body-layout";
import Button from "@/components/button";
import { ToolBar, ToolBarButtonLabel, ToolBarLink, ToolBarPill } from "@/components/toolbar";
import ConceptRetirementForm from "@/components/concept-retirement-form";
import ProcedureCatalogueBrowser from "@/components/procedure-catalogue-browser";
import ProcedureConceptDetail from "@/components/procedure-concept-detail";
import ProcedureCodeForm from "@/components/procedure-code-form";
import SynonymEditor from "@/components/synonym-editor";
import { useCatalogue } from "@/contexts/catalogue-context";
import { pb } from "@/lib/pb";
import { downloadTextFile } from "@/lib/csv";
import {
    blankDraftConcept,
    blankRetirement,
    buildFacetValuesCsv,
    buildProceduresCsv,
    buildRetirementsCsv,
    buildSynonymsCsv,
    nextConceptId,
    validateDraftConcept,
    validateRetirement,
} from "@/lib/procedure-code-draft";

/**
 * ProcedureCodes - browse the NSPC catalogue, and draft new procedure
 * codes for a future catalogue release.
 *
 * Drafting never touches PocketBase: a new code lives only in this page's
 * state until it's downloaded as seed CSV rows (matching the format under
 * specs/procedure_coding_system) for a developer to append and run
 * through scripts/build-catalogue-seed.mjs, which is what actually turns
 * them into a migration. Reloading the page loses anything not yet
 * downloaded, same as any other unsaved form.
 */
function ProcedureCodes() {
    const catalogue = useCatalogue();

    const [tab, setTab] = useState("browse");
    const [selectedConceptId, setSelectedConceptId] = useState(null);

    const [existingFacetValues, setExistingFacetValues] = useState([]);
    const [facetValuesError, setFacetValuesError] = useState(null);

    const [draftConcepts, setDraftConcepts] = useState([]);
    const [draftFacetValues, setDraftFacetValues] = useState([]);
    const [draft, setDraft] = useState(() =>
        blankDraftConcept(nextConceptId(catalogue.concepts, [])),
    );
    const [editingIndex, setEditingIndex] = useState(null);
    const [errors, setErrors] = useState({});

    // Synonym edits for EXISTING catalogue concepts, keyed by conceptId.
    // Unlike draftConcepts (whole new codes), these never need a
    // seed_procedures.csv row - the concept already has one in the spec
    // CSVs, and a release migration wholesale-replaces a concept's
    // synonyms from whatever's in seed_synonyms.csv for it (see
    // catalogue-release.migration.js), so a developer just needs the
    // corrected full list to paste in. In memory only, same as drafts.
    const [synonymEdits, setSynonymEdits] = useState({});

    // Retirements of EXISTING catalogue concepts, keyed by conceptId. A
    // code is never deleted or re-meant - it is inactivated in place and
    // pointed at its successor, so every procedure already coded against
    // it still resolves (spec section 2). Like synonymEdits this needs
    // no seed_procedures.csv row of its own: the concept already has
    // one, and retiring it only changes that row's lifecycle columns
    // (see buildRetirementsCsv). In memory only, same as drafts.
    const [retirements, setRetirements] = useState({});

    useEffect(() => {
        // Any authenticated user can read facet values (see the migration's
        // CATALOGUE_READ rule) - only writes are admin-gated, and nothing
        // here writes. A failed fetch just means "+ Add new value" is the
        // only way to fill a facet slot instead of picking an existing one.
        pb.collection("procedureFacetValues")
            .getFullList({ sort: "facet,term" })
            .then(setExistingFacetValues)
            .catch((e) => setFacetValuesError(e));
    }, []);

    // Catalogue concepts with any pending synonym edits and retirements
    // applied, so the browser's tree, the detail card and this page's
    // counts all reflect what's about to be exported rather than what
    // PocketBase last returned.
    const allConcepts = useMemo(() => {
        const edited = catalogue.concepts.map((c) => {
            const retirement = retirements[c.conceptId];
            if (!retirement && !synonymEdits[c.conceptId]) return c;
            return {
                ...c,
                ...(synonymEdits[c.conceptId] && {
                    synonyms: synonymEdits[c.conceptId],
                }),
                ...(retirement && {
                    active: false,
                    inactivationReason: retirement.inactivationReason,
                    replacedBy: retirement.replacedBy || null,
                    effectiveTo: retirement.effectiveTo,
                    catalogueRelease:
                        retirement.catalogueRelease || c.catalogueRelease,
                }),
            };
        });
        return [...edited, ...draftConcepts];
    }, [catalogue.concepts, draftConcepts, synonymEdits, retirements]);

    const selectedConcept =
        allConcepts.find((c) => c.conceptId === selectedConceptId) ?? null;

    // Flat, export-shaped, and validated on every render rather than at
    // download time: an incomplete retirement has to be visible while
    // it's being filled in, not discovered when the download does
    // nothing.
    const retirementList = useMemo(
        () =>
            Object.entries(retirements).map(([conceptId, retirement]) => ({
                conceptId,
                ...retirement,
            })),
        [retirements],
    );

    const retirementErrors = useMemo(() => {
        const byConcept = {};
        for (const retirement of retirementList) {
            const errors = validateRetirement(retirement);
            if (Object.keys(errors).length > 0) {
                byConcept[retirement.conceptId] = errors;
            }
        }
        return byConcept;
    }, [retirementList]);

    const incompleteRetirements = Object.keys(retirementErrors).length;

    // What a retiring concept may be replaced by: anything still active,
    // including this session's drafts - "mint the replacement, then
    // retire the original pointing at it" is the usual shape of a
    // corrective release. Concepts already being retired are excluded,
    // since `active` is false for them in allConcepts.
    const successorOptions = useMemo(
        () =>
            allConcepts
                .filter(
                    (c) =>
                        c.active && c.conceptId !== selectedConcept?.conceptId,
                )
                .sort((a, b) => a.preferredTerm.localeCompare(b.preferredTerm)),
        [allConcepts, selectedConcept],
    );

    const startRetirement = (conceptId) =>
        setRetirements((prev) => ({
            ...prev,
            [conceptId]: blankRetirement(catalogue.release),
        }));

    const updateRetirement = (conceptId, retirement) =>
        setRetirements((prev) => ({ ...prev, [conceptId]: retirement }));

    const cancelRetirement = (conceptId) =>
        setRetirements((prev) => {
            const next = { ...prev };
            delete next[conceptId];
            return next;
        });

    const updateSynonyms = (conceptId, synonyms) =>
        setSynonymEdits((prev) => ({ ...prev, [conceptId]: synonyms }));

    const revertSynonyms = (conceptId) =>
        setSynonymEdits((prev) => {
            const next = { ...prev };
            delete next[conceptId];
            return next;
        });

    const startNewDraft = () => {
        setDraft(blankDraftConcept(nextConceptId(catalogue.concepts, draftConcepts)));
        setEditingIndex(null);
        setErrors({});
        setTab("new");
    };

    const editDraft = (index) => {
        setDraft(draftConcepts[index]);
        setEditingIndex(index);
        setErrors({});
        setTab("new");
    };

    const removeDraft = (index) => {
        setDraftConcepts((prev) => prev.filter((_, i) => i !== index));
        if (editingIndex === index) startNewDraft();
    };

    const saveDraft = () => {
        const validationErrors = validateDraftConcept(draft);
        // A concept ID collision (two drafts, or a draft that now matches
        // something a background catalogue refresh picked up) would
        // silently overwrite one entry with another in every CSV built
        // from draftConcepts, so it's checked here rather than left to be
        // noticed downstream.
        const duplicate = draftConcepts.some(
            (c, i) => c.conceptId === draft.conceptId && i !== editingIndex,
        );
        if (
            !duplicate &&
            catalogue.concepts.some((c) => c.conceptId === draft.conceptId)
        ) {
            validationErrors.conceptId = "Already used by the live catalogue.";
        } else if (duplicate) {
            validationErrors.conceptId = "Already used by another draft.";
        }

        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        if (editingIndex === null) {
            setDraftConcepts((prev) => [...prev, draft]);
        } else {
            setDraftConcepts((prev) =>
                prev.map((c, i) => (i === editingIndex ? draft : c)),
            );
        }
        startNewDraft();
        setTab("drafts");
    };

    const handleDownload = () => {
        const stamp = new Date().toISOString().slice(0, 10);

        if (draftConcepts.length > 0) {
            downloadTextFile(
                `seed_procedures.${stamp}.csv`,
                buildProceduresCsv(draftConcepts),
            );
        }

        // Synonym rows come from both brand-new draft concepts and
        // existing ones whose synonyms were edited in place - an edited
        // concept has no procedures.csv row of its own (see the
        // synonymEdits comment above), it just needs its full,
        // corrected synonym list.
        const editedConcepts = Object.entries(synonymEdits).map(
            ([conceptId, synonyms]) => ({
                conceptId,
                effectiveFrom:
                    catalogue.findById(conceptId)?.effectiveFrom ?? stamp,
                synonyms,
            }),
        );
        const synonymSources = [...draftConcepts, ...editedConcepts];
        if (synonymSources.length > 0) {
            downloadTextFile(
                `seed_synonyms.${stamp}.csv`,
                buildSynonymsCsv(synonymSources),
            );
        }

        if (draftFacetValues.length > 0) {
            downloadTextFile(
                `seed_facet_values.${stamp}.csv`,
                buildFacetValuesCsv(draftFacetValues),
            );
        }

        // Not a seed file - these are edits to rows seed_procedures.csv
        // already has, hence the different name (see buildRetirementsCsv).
        if (retirementList.length > 0) {
            downloadTextFile(
                `retire_procedures.${stamp}.csv`,
                buildRetirementsCsv(retirementList),
            );
        }
    };

    const Tools = () => (
        <ToolBar className="justify-between w-full">
            <ToolBarLink title="Home" to="/">
                <ChevronLeft width={16} height={16} />
                <ToolBarButtonLabel>Home</ToolBarButtonLabel>
            </ToolBarLink>
            <ToolBarPill
                items={[
                    { value: "browse", label: "Browse", color: "bg-gray-300" },
                    { value: "new", label: "New code", color: "bg-gray-300" },
                    {
                        value: "drafts",
                        label: `Drafts (${draftConcepts.length})`,
                        color: "bg-gray-300",
                    },
                ]}
                value={tab}
                setValue={setTab}
            />
        </ToolBar>
    );

    return (
        <BodyLayout header={<Tools />}>
            <div className="mb-4 flex items-baseline justify-between gap-2">
                <h1 className="text-xl">Procedure codes</h1>
                <div className="flex flex-col items-end">
                    <Button
                        size="sm"
                        variant="secondary"
                        disabled={
                            incompleteRetirements > 0 ||
                            (draftConcepts.length === 0 &&
                                draftFacetValues.length === 0 &&
                                retirementList.length === 0 &&
                                Object.keys(synonymEdits).length === 0)
                        }
                        onClick={handleDownload}
                    >
                        <DownloadIcon
                            width={14}
                            height={14}
                            className="mr-1.5"
                        />
                        Download seed CSVs
                    </Button>
                    {incompleteRetirements > 0 && (
                        <p className="mt-1 text-xs text-red-600">
                            {incompleteRetirements} retirement
                            {incompleteRetirements === 1 ? " is" : "s are"}{" "}
                            incomplete.
                        </p>
                    )}
                </div>
            </div>

            {tab === "browse" && (
                <>
                    <p className="mb-2 text-xs text-gray-500">
                        {catalogue.concepts.length} catalogue concepts
                        {draftConcepts.length > 0 &&
                            ` · ${draftConcepts.length} draft (not saved)`}
                        {retirementList.length > 0 &&
                            ` · ${retirementList.length} being retired`}
                        {" · release "}
                        {catalogue.release || "—"}
                    </p>
                    <ProcedureCatalogueBrowser
                        concepts={allConcepts}
                        selectedConceptId={selectedConceptId}
                        onSelectedConceptIdChange={setSelectedConceptId}
                        onConfirm={(concept) =>
                            setSelectedConceptId(concept.conceptId)
                        }
                        // Retired codes stay in the tree here, unlike in
                        // the picker: this is where they are retired, and
                        // one that vanished the moment it was marked
                        // could not be reviewed or undone.
                        includeInactive
                        renderConceptBadge={(concept) => {
                            if (concept.isDraft) {
                                return (
                                    <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0 text-[10px] font-medium text-amber-700">
                                        Draft
                                    </span>
                                );
                            }
                            if (retirements[concept.conceptId]) {
                                return (
                                    <span className="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0 text-[10px] font-medium text-red-700">
                                        Retiring
                                    </span>
                                );
                            }
                            if (!concept.active) {
                                return (
                                    <span className="inline-flex items-center rounded-full bg-gray-200 px-1.5 py-0 text-[10px] font-medium text-gray-600">
                                        Retired
                                    </span>
                                );
                            }
                            if (synonymEdits[concept.conceptId]) {
                                return (
                                    <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0 text-[10px] font-medium text-blue-700">
                                        Edited
                                    </span>
                                );
                            }
                            return null;
                        }}
                        listClassName="max-h-[32rem]"
                    />

                    {selectedConcept && !selectedConcept.isDraft && (
                        <div className="mt-3 border border-gray-200 rounded-md p-2 bg-gray-50">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-500">
                                    Editing synonyms for{" "}
                                    <span className="font-mono">
                                        {selectedConcept.conceptId}
                                    </span>{" "}
                                    - in memory only, not saved.
                                </p>
                                {synonymEdits[selectedConcept.conceptId] && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            revertSynonyms(
                                                selectedConcept.conceptId,
                                            )
                                        }
                                        className="shrink-0 text-xs text-blue-600 hover:underline cursor-pointer"
                                    >
                                        Reset to catalogue
                                    </button>
                                )}
                            </div>
                            <SynonymEditor
                                synonyms={selectedConcept.synonyms}
                                onChange={(synonyms) =>
                                    updateSynonyms(
                                        selectedConcept.conceptId,
                                        synonyms,
                                    )
                                }
                                className="mt-1.5"
                            />

                            {/* A concept an earlier release already
                                retired has nothing to retire. */}
                            {(selectedConcept.active ||
                                retirements[selectedConcept.conceptId]) && (
                                <ConceptRetirementForm
                                    concept={selectedConcept}
                                    retirement={
                                        retirements[
                                            selectedConcept.conceptId
                                        ] ?? null
                                    }
                                    successors={successorOptions}
                                    errors={
                                        retirementErrors[
                                            selectedConcept.conceptId
                                        ] ?? {}
                                    }
                                    onStart={() =>
                                        startRetirement(
                                            selectedConcept.conceptId,
                                        )
                                    }
                                    onChange={(retirement) =>
                                        updateRetirement(
                                            selectedConcept.conceptId,
                                            retirement,
                                        )
                                    }
                                    onCancel={() =>
                                        cancelRetirement(
                                            selectedConcept.conceptId,
                                        )
                                    }
                                    className="mt-2"
                                />
                            )}
                        </div>
                    )}
                </>
            )}

            {tab === "new" && (
                <div className="space-y-3">
                    {facetValuesError && (
                        <div className="bg-red-400/20 rounded-md p-2 text-sm">
                            Couldn't load existing facet values - you can
                            still add new ones by typing them in below.
                        </div>
                    )}
                    <ProcedureCodeForm
                        concept={draft}
                        onChange={setDraft}
                        errors={errors}
                        existingFacetValues={existingFacetValues}
                        draftFacetValues={draftFacetValues}
                        onCreateFacetValue={(created) =>
                            setDraftFacetValues((prev) => [...prev, created])
                        }
                    />

                    <div>
                        <p className="mb-1 text-xs text-gray-500">Preview</p>
                        <ProcedureConceptDetail
                            concept={draft}
                            badge={
                                <span className="rounded-full bg-amber-100 px-1.5 py-0 text-[10px] font-medium text-amber-700">
                                    Draft
                                </span>
                            }
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        {editingIndex !== null && (
                            <Button variant="secondary" onClick={startNewDraft}>
                                Cancel edit
                            </Button>
                        )}
                        <Button onClick={saveDraft}>
                            <PlusIcon width={14} height={14} className="mr-1.5" />
                            {editingIndex === null
                                ? "Add to drafts"
                                : "Save changes"}
                        </Button>
                    </div>
                </div>
            )}

            {tab === "drafts" && (
                <div className="space-y-2">
                    {draftConcepts.length === 0 &&
                    Object.keys(synonymEdits).length === 0 &&
                    retirementList.length === 0 &&
                    draftFacetValues.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                            No draft procedure codes yet.{" "}
                            <button
                                type="button"
                                onClick={startNewDraft}
                                className="text-blue-600 hover:underline cursor-pointer"
                            >
                                Create one
                            </button>
                            .
                        </div>
                    ) : draftConcepts.length === 0 ? null : (
                        draftConcepts.map((concept, index) => (
                            <div
                                key={concept.conceptId}
                                className="flex items-start gap-2"
                            >
                                <div className="grow">
                                    <ProcedureConceptDetail concept={concept} />
                                </div>
                                <div className="flex flex-col gap-1 pt-1">
                                    <button
                                        type="button"
                                        title="Edit"
                                        onClick={() => editDraft(index)}
                                        className="text-gray-400 hover:text-blue-600 cursor-pointer"
                                    >
                                        <PencilIcon width={16} height={16} />
                                    </button>
                                    <button
                                        type="button"
                                        title="Remove"
                                        onClick={() => removeDraft(index)}
                                        className="text-gray-400 hover:text-red-600 cursor-pointer"
                                    >
                                        <Trash2Icon width={16} height={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                    {Object.keys(synonymEdits).length > 0 && (
                        <div className="mt-4">
                            <p className="mb-1 text-xs text-gray-500">
                                Synonym edits (existing codes, not saved)
                            </p>
                            <div className="space-y-1">
                                {Object.entries(synonymEdits).map(
                                    ([conceptId, synonyms]) => {
                                        const concept =
                                            catalogue.findById(conceptId);
                                        return (
                                            <div
                                                key={conceptId}
                                                className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-2 py-1.5"
                                            >
                                                <div className="text-sm">
                                                    <span className="mr-1.5 font-mono text-xs text-gray-400">
                                                        {conceptId}
                                                    </span>
                                                    {concept?.preferredTerm ??
                                                        "Unknown concept"}
                                                    <span className="ml-1.5 text-xs text-gray-400">
                                                        · {synonyms.length}{" "}
                                                        synonym
                                                        {synonyms.length === 1
                                                            ? ""
                                                            : "s"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedConceptId(
                                                                conceptId,
                                                            );
                                                            setTab("browse");
                                                        }}
                                                        className="text-xs text-blue-600 hover:underline cursor-pointer"
                                                    >
                                                        View
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title="Discard edits"
                                                        onClick={() =>
                                                            revertSynonyms(
                                                                conceptId,
                                                            )
                                                        }
                                                        className="text-gray-400 hover:text-red-600 cursor-pointer"
                                                    >
                                                        <Trash2Icon
                                                            width={14}
                                                            height={14}
                                                        />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    },
                                )}
                            </div>
                        </div>
                    )}
                    {retirementList.length > 0 && (
                        <div className="mt-4">
                            <p className="mb-1 text-xs text-gray-500">
                                Retirements (existing codes, not saved) -
                                downloaded as columns to apply to their
                                rows in seed_procedures.csv, not as new
                                rows
                            </p>
                            <div className="space-y-1">
                                {retirementList.map((retirement) => {
                                    const concept = catalogue.findById(
                                        retirement.conceptId,
                                    );
                                    const errors =
                                        retirementErrors[retirement.conceptId];
                                    return (
                                        <div
                                            key={retirement.conceptId}
                                            className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-2 py-1.5"
                                        >
                                            <div className="text-sm">
                                                <span className="mr-1.5 font-mono text-xs text-gray-400">
                                                    {retirement.conceptId}
                                                </span>
                                                {concept?.preferredTerm ??
                                                    "Unknown concept"}
                                                <span className="ml-1.5 text-xs text-gray-400">
                                                    ·{" "}
                                                    {retirement.inactivationReason ||
                                                        "no reason"}
                                                    {retirement.replacedBy &&
                                                        ` · → ${retirement.replacedBy}`}
                                                </span>
                                                {errors && (
                                                    <span className="ml-1.5 text-xs text-red-600">
                                                        · incomplete
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedConceptId(
                                                            retirement.conceptId,
                                                        );
                                                        setTab("browse");
                                                    }}
                                                    className="text-xs text-blue-600 hover:underline cursor-pointer"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    type="button"
                                                    title="Keep active"
                                                    onClick={() =>
                                                        cancelRetirement(
                                                            retirement.conceptId,
                                                        )
                                                    }
                                                    className="text-gray-400 hover:text-red-600 cursor-pointer"
                                                >
                                                    <Trash2Icon
                                                        width={14}
                                                        height={14}
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {draftFacetValues.length > 0 && (
                        <div className="mt-4">
                            <p className="mb-1 text-xs text-gray-500">
                                New facet values created along the way
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {draftFacetValues.map((f) => (
                                    <span
                                        key={f.facetValueId}
                                        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700 ring-1 ring-inset ring-gray-300"
                                    >
                                        <span className="font-mono text-gray-400">
                                            {f.facetValueId}
                                        </span>
                                        {f.term}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </BodyLayout>
    );
}

export default ProcedureCodes;
