/**
 * In-memory procedure code drafting for the procedure-codes page.
 *
 * A draft concept is never sent to PocketBase - it exists only in the
 * page's state, shaped exactly like a catalogue concept (see
 * nspc-catalogue.json) so it can be handed straight to
 * ProcedureCatalogueBrowser / ProcedureConceptDetail alongside the real
 * catalogue, plus two fields those components ignore:
 *
 *   isDraft    - true, so the page can tell it apart from the catalogue.
 *   facetIds   - the facetValueId behind each chosen facet term, since
 *                the catalogue concept shape only carries the display
 *                term (see src/lib/catalogue.js's toConcept). The CSV
 *                needs the ID; the browser components need the term.
 *
 * IDs are generated client-side by finding the highest existing number
 * for a prefix and counting up - the same scheme the seed CSVs already
 * use (NSX-00128, MTH-0047, ...). It only has to be locally unique for
 * the session: whoever turns these rows into a real migration reconciles
 * them against the CSVs at that point (see scripts/build-catalogue-seed.mjs).
 */

import { toCsv } from "./csv";

/** One entry per facet a concept can carry, tying together every name it
 * goes by: the key on `concept.facets` / `concept.facetIds`, the value of
 * `procedureFacetValues.facet`, the seed_procedures.csv columns, and the
 * ID prefix new facet values get. */
export const FACET_TYPES = [
    {
        key: "method",
        facetId: "method",
        idPrefix: "MTH",
        label: "Method",
        csvIdColumn: "method_id",
        csvTermColumn: "method",
        defaultSnomedAttribute: "Method",
    },
    {
        key: "procedureSite",
        facetId: "site",
        idPrefix: "SIT",
        label: "Procedure site",
        csvIdColumn: "site_id",
        csvTermColumn: "procedure_site",
        defaultSnomedAttribute: "Procedure site",
    },
    {
        key: "surgicalApproach",
        facetId: "approach",
        idPrefix: "APP",
        label: "Surgical approach",
        csvIdColumn: "approach_id",
        csvTermColumn: "surgical_approach",
        defaultSnomedAttribute: "Surgical approach",
    },
    {
        key: "device",
        facetId: "device",
        idPrefix: "DEV",
        label: "Device",
        csvIdColumn: "device_id",
        csvTermColumn: "device",
        defaultSnomedAttribute: "Using device",
    },
    {
        key: "morphology",
        facetId: "morphology",
        idPrefix: "MOR",
        label: "Morphology",
        csvIdColumn: "morphology_id",
        csvTermColumn: "morphology",
        defaultSnomedAttribute: "Associated morphology",
    },
    {
        key: "intent",
        facetId: "intent",
        idPrefix: "INT",
        label: "Default intent",
        csvIdColumn: "default_intent_id",
        // No term column of its own in seed_procedures.csv - unlike the
        // other facets, an intent's display term is never denormalised
        // onto the concept row, only its ID.
        csvTermColumn: null,
        defaultSnomedAttribute: "Has intent",
    },
];

export const FACET_TYPE_BY_KEY = Object.fromEntries(
    FACET_TYPES.map((t) => [t.key, t]),
);

/** The regions seed_spinal_levels.csv groups vertebrae/interspaces into. */
export const SPINAL_REGIONS = [
    "craniocervical",
    "cervical",
    "cervicothoracic",
    "thoracic",
    "thoracolumbar",
    "lumbar",
    "lumbosacral",
    "sacral",
];

const today = () => new Date().toISOString().slice(0, 10);

/** Next `PREFIX-00042`-style ID after the highest one already in use. */
function nextSequentialId(prefix, digits, existingIds) {
    const pattern = new RegExp(`^${prefix}-(\\d+)$`);
    let max = 0;
    for (const id of existingIds) {
        const match = pattern.exec(id);
        if (match) max = Math.max(max, parseInt(match[1], 10));
    }
    return `${prefix}-${String(max + 1).padStart(digits, "0")}`;
}

/** Next concept ID, considering both the live catalogue and this session's drafts. */
export function nextConceptId(catalogueConcepts, draftConcepts) {
    return nextSequentialId("NSX", 5, [
        ...catalogueConcepts.map((c) => c.conceptId),
        ...draftConcepts.map((c) => c.conceptId),
    ]);
}

/** Next facet value ID for one facet type, considering PocketBase's rows and this session's drafts. */
export function nextFacetValueId(facetKey, existingFacetValues, draftFacetValues) {
    const type = FACET_TYPE_BY_KEY[facetKey];
    const ids = [...existingFacetValues, ...draftFacetValues]
        .filter((f) => f.facet === type.facetId)
        .map((f) => f.facetValueId);
    return nextSequentialId(type.idPrefix, 4, ids);
}

/** A new facet value row, ready to add to draftFacetValues state. */
export function buildDraftFacetValue(facetKey, term, existingFacetValues, draftFacetValues) {
    const type = FACET_TYPE_BY_KEY[facetKey];
    return {
        facetValueId: nextFacetValueId(facetKey, existingFacetValues, draftFacetValues),
        facet: type.facetId,
        term: term.trim(),
        snomedAttribute: type.defaultSnomedAttribute,
        active: true,
        effectiveFrom: today(),
    };
}

/** A blank draft concept, catalogue-shaped plus `isDraft`/`facetIds`. */
export function blankDraftConcept(conceptId) {
    return {
        isDraft: true,
        conceptId,
        fsn: "",
        preferredTerm: "",
        subspecialty: "",
        facets: {
            method: null,
            procedureSite: null,
            surgicalApproach: null,
            device: null,
            morphology: null,
            intent: null,
        },
        facetIds: {
            method: null,
            procedureSite: null,
            surgicalApproach: null,
            device: null,
            morphology: null,
            intent: null,
        },
        lateralityApplicable: true,
        revisionApplicable: true,
        levelApplicable: false,
        levelKind: null,
        levelRegions: [],
        active: true,
        inactivationReason: null,
        replacedBy: null,
        effectiveFrom: today(),
        catalogueRelease: "",
        synonyms: [],
    };
}

// ---------------------------------------------------------------------
// Retirement
//
// A concept is never deleted or edited into something else - it is
// retired in place, so every operative note coded against it still
// resolves (spec section 2, "identifiers are permanent"). Retiring one
// changes only the lifecycle columns of the row it already has in
// seed_procedures.csv; see buildRetirementsCsv for why that is exported
// on its own rather than as a whole concept row.
// ---------------------------------------------------------------------

/** The values `procedureConcepts.inactivationReason` accepts. */
export const INACTIVATION_REASONS = [
    { value: "duplicate", label: "Duplicate - the same procedure twice" },
    { value: "ambiguous", label: "Ambiguous - means more than one thing" },
    { value: "erroneous", label: "Erroneous - clinically wrong" },
    { value: "outdated", label: "Outdated - no longer performed" },
];

/** A blank retirement, ready to fill in for an existing concept. */
export function blankRetirement(catalogueRelease = "") {
    return {
        inactivationReason: "",
        replacedBy: "",
        effectiveTo: today(),
        catalogueRelease,
    };
}

export function validateRetirement(retirement) {
    const errors = {};
    if (!retirement.inactivationReason) {
        errors.inactivationReason = "Required - why it is being retired.";
    }
    if (!retirement.effectiveTo) errors.effectiveTo = "Required.";
    if (!retirement.catalogueRelease.trim()) {
        errors.catalogueRelease = "Required - the release this ships in.";
    }
    return errors;
}

/** True when every retirement in hand is complete enough to export. */
export function retirementsAreValid(retirements) {
    return retirements.every(
        (r) => Object.keys(validateRetirement(r)).length === 0,
    );
}

/** Required fields the seed CSVs and the migration builder both expect. */
export function validateDraftConcept(concept) {
    const errors = {};
    if (!/^NSX-\d{5}$/.test(concept.conceptId)) {
        errors.conceptId = "Must look like NSX-00129.";
    }
    if (!concept.fsn.trim()) errors.fsn = "Required.";
    if (!concept.preferredTerm.trim()) errors.preferredTerm = "Required.";
    if (!concept.subspecialty.trim()) errors.subspecialty = "Required.";
    if (!concept.catalogueRelease.trim()) {
        errors.catalogueRelease = "Required - the release this ships in.";
    }
    if (!concept.effectiveFrom) errors.effectiveFrom = "Required.";
    if (concept.levelApplicable && !concept.levelKind) {
        errors.levelKind = "Required when levels apply.";
    }
    return errors;
}

// ---------------------------------------------------------------------
// CSV export - column order and names match specs/procedure_coding_system
// exactly, so a downloaded file can be appended straight onto the real
// seed CSV before running scripts/build-catalogue-seed.mjs.
// ---------------------------------------------------------------------

const bool01 = (value) => (value ? "1" : "0");

const PROCEDURES_CSV_HEADERS = [
    "concept_id",
    "fsn",
    "preferred_term",
    "subspecialty",
    "method_id",
    "method",
    "site_id",
    "procedure_site",
    "approach_id",
    "surgical_approach",
    "device_id",
    "device",
    "morphology_id",
    "morphology",
    "default_intent_id",
    "laterality_applicable",
    "revision_applicable",
    "level_applicable",
    "level_kind",
    "level_regions",
    "active",
    "inactivation_reason",
    "replaced_by",
    "effective_from",
    "effective_to",
    "catalogue_release",
];

export function buildProceduresCsv(draftConcepts) {
    const rows = draftConcepts.map((c) => {
        const row = {
            concept_id: c.conceptId,
            fsn: c.fsn,
            preferred_term: c.preferredTerm,
            subspecialty: c.subspecialty,
            laterality_applicable: bool01(c.lateralityApplicable),
            revision_applicable: bool01(c.revisionApplicable),
            level_applicable: bool01(c.levelApplicable),
            level_kind: c.levelKind ?? "",
            level_regions: (c.levelRegions ?? []).join(","),
            active: bool01(c.active),
            inactivation_reason: c.inactivationReason ?? "",
            replaced_by: c.replacedBy ?? "",
            effective_from: c.effectiveFrom,
            effective_to: c.effectiveTo ?? "",
            catalogue_release: c.catalogueRelease,
        };
        // Facet columns are driven off FACET_TYPES rather than spelled out
        // here, so the CSV column set can't drift from the six facet
        // slots a concept actually carries.
        for (const type of FACET_TYPES) {
            row[type.csvIdColumn] = c.facetIds?.[type.key] ?? "";
            if (type.csvTermColumn) {
                row[type.csvTermColumn] = c.facets?.[type.key] ?? "";
            }
        }
        return row;
    });
    return toCsv(PROCEDURES_CSV_HEADERS, rows);
}

const FACET_VALUES_CSV_HEADERS = [
    "facet_value_id",
    "facet_id",
    "term",
    "snomed_attribute",
    "active",
    "effective_from",
    "target_code",
    "correlation",
];

export function buildFacetValuesCsv(draftFacetValues) {
    const rows = draftFacetValues.map((f) => ({
        facet_value_id: f.facetValueId,
        facet_id: f.facet,
        term: f.term,
        snomed_attribute: f.snomedAttribute ?? "",
        active: bool01(f.active),
        effective_from: f.effectiveFrom,
        target_code: "",
        correlation: "",
    }));
    return toCsv(FACET_VALUES_CSV_HEADERS, rows);
}

const SYNONYMS_CSV_HEADERS = [
    "concept_id",
    "term",
    "language",
    "is_abbreviation",
    "active",
    "effective_from",
];

export function buildSynonymsCsv(draftConcepts) {
    const rows = [];
    for (const concept of draftConcepts) {
        for (const synonym of concept.synonyms ?? []) {
            rows.push({
                concept_id: concept.conceptId,
                term: synonym.term,
                language: synonym.language || "en",
                is_abbreviation: bool01(synonym.isAbbreviation),
                active: bool01(synonym.active !== false),
                effective_from: synonym.effectiveFrom || concept.effectiveFrom,
            });
        }
    }
    return toCsv(SYNONYMS_CSV_HEADERS, rows);
}

const RETIREMENTS_CSV_HEADERS = [
    "concept_id",
    "active",
    "inactivation_reason",
    "replaced_by",
    "effective_to",
    "catalogue_release",
];

/**
 * Retirements as the columns to change, not as whole concept rows.
 *
 * Unlike a new code - which is a row to append to seed_procedures.csv -
 * a retired concept already has a row there, and concept_id is its
 * business key: appending a second row for it would leave the file with
 * two, and the release migration upserting one over the other in
 * whatever order they happen to sit. So this exports the lifecycle
 * columns to set on the row that already exists, and nothing else.
 *
 * It could not be a full row in any case: the client only ever sees a
 * facet's display term, never the facetValueId the CSV carries (see
 * src/lib/catalogue.js), so a row reconstructed here would silently
 * blank all six facet columns.
 *
 * @param {Object[]} retirements - `{ conceptId, inactivationReason,
 *   replacedBy, effectiveTo, catalogueRelease }`.
 */
export function buildRetirementsCsv(retirements) {
    const rows = retirements.map((r) => ({
        concept_id: r.conceptId,
        active: "0",
        inactivation_reason: r.inactivationReason,
        replaced_by: r.replacedBy ?? "",
        effective_to: r.effectiveTo,
        catalogue_release: r.catalogueRelease,
    }));
    return toCsv(RETIREMENTS_CSV_HEADERS, rows);
}
