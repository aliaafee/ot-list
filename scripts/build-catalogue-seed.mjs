/**
 * Builds everything downstream of the NSPC spec CSVs.
 *
 * The CSVs under specs/procedure_coding_system are the source of truth.
 * Two artefacts are generated from them, and neither should be edited by
 * hand:
 *
 *   pb/pb_migrations/..._seed_procedure_catalogue.js
 *       Seeds the PocketBase catalogue collections. PocketBase is the
 *       runtime source of truth - the catalogue can be revised there
 *       without redeploying the app.
 *
 *   src/data/nspc-catalogue.json, src/data/spinal-levels.json
 *       A build-time snapshot the client starts from so type-ahead works
 *       on first paint and survives a failed fetch. Refreshed from
 *       PocketBase at runtime; see src/lib/catalogue.js.
 *
 * Both come from the same CSVs in the same run, so they cannot drift.
 *
 * Usage: node scripts/build-catalogue-seed.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SPEC_DIR = join(ROOT, "specs", "procedure_coding_system");
const OUT = join(
    ROOT,
    "pb",
    "pb_migrations",
    "1786089800_seed_procedure_catalogue.js",
);
const OUT_CATALOGUE = join(ROOT, "src", "data", "nspc-catalogue.json");
const OUT_LEVELS = join(ROOT, "src", "data", "spinal-levels.json");

/**
 * Minimal RFC 4180 parser. The seed CSVs quote any field containing a
 * comma - `level_regions` holds "craniocervical,cervical,thoracic" - so
 * splitting on commas silently corrupts every row after that column.
 */
function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (quoted) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    quoted = false;
                }
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') {
            quoted = true;
        } else if (char === ",") {
            row.push(field);
            field = "";
        } else if (char === "\n") {
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else if (char !== "\r") {
            field += char;
        }
    }

    // A file not ending in a newline still has a final row pending.
    if (field !== "" || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows.filter((r) => r.some((c) => c !== ""));
}

/** Parse a CSV into objects keyed by its header row. */
function readCsv(name) {
    const rows = parseCsv(readFileSync(join(SPEC_DIR, name), "utf8"));
    const [header, ...body] = rows;
    return body.map((cells) =>
        Object.fromEntries(header.map((key, i) => [key, cells[i] ?? ""])),
    );
}

/** CSV carries booleans as 0/1 integers. */
const bool = (v) => v === "1";

/** Empty CSV cells mean SQL NULL, not the empty string. */
const orNull = (v) => (v === "" ? null : v);

// ---------------------------------------------------------------------

const facetValues = readCsv("seed_facet_values.csv").map((r) => ({
    facetValueId: r.facet_value_id,
    facet: r.facet_id,
    term: r.term,
    snomedAttribute: r.snomed_attribute,
    active: bool(r.active),
    effectiveFrom: r.effective_from,
}));

const spinalLevels = readCsv("seed_spinal_levels.csv").map((r) => ({
    spinalLevelId: r.spinal_level_id,
    kind: r.kind,
    code: r.code,
    longName: r.long_name,
    region: r.region,
    ordinal: Number(r.ordinal),
    active: bool(r.active),
    effectiveFrom: r.effective_from,
}));

const concepts = readCsv("seed_procedures.csv").map((r) => ({
    conceptId: r.concept_id,
    fsn: r.fsn,
    preferredTerm: r.preferred_term,
    subspecialty: r.subspecialty,
    // Facet columns are stored as relations, so only the ID travels; the
    // term column beside it in the CSV is redundant once related.
    method: orNull(r.method_id),
    procedureSite: orNull(r.site_id),
    surgicalApproach: orNull(r.approach_id),
    device: orNull(r.device_id),
    morphology: orNull(r.morphology_id),
    defaultIntent: orNull(r.default_intent_id),
    lateralityApplicable: bool(r.laterality_applicable),
    revisionApplicable: bool(r.revision_applicable),
    levelApplicable: bool(r.level_applicable),
    levelKind: orNull(r.level_kind),
    levelRegions: r.level_regions === "" ? [] : r.level_regions.split(","),
    active: bool(r.active),
    inactivationReason: orNull(r.inactivation_reason),
    replacedBy: orNull(r.replaced_by),
    effectiveFrom: r.effective_from,
    effectiveTo: orNull(r.effective_to),
    catalogueRelease: r.catalogue_release,
}));

const synonyms = readCsv("seed_synonyms.csv").map((r) => ({
    concept: r.concept_id,
    term: r.term,
    language: r.language,
    isAbbreviation: bool(r.is_abbreviation),
    active: bool(r.active),
    effectiveFrom: r.effective_from,
}));

// ---------------------------------------------------------------------
// Referential checks. These run here rather than in the migration
// because a broken reference should stop the build, not half-apply
// against a live database.
// ---------------------------------------------------------------------

const facetIds = new Set(facetValues.map((f) => f.facetValueId));
const conceptIds = new Set(concepts.map((c) => c.conceptId));
const problems = [];

const FACET_FIELDS = [
    "method",
    "procedureSite",
    "surgicalApproach",
    "device",
    "morphology",
    "defaultIntent",
];

for (const concept of concepts) {
    for (const field of FACET_FIELDS) {
        const id = concept[field];
        if (id && !facetIds.has(id)) {
            problems.push(`${concept.conceptId}: unknown ${field} "${id}"`);
        }
    }
    if (concept.replacedBy && !conceptIds.has(concept.replacedBy)) {
        problems.push(
            `${concept.conceptId}: replacedBy unknown "${concept.replacedBy}"`,
        );
    }
    // Mirrors the schema.sql CHECK: a concept taking a level must say
    // which vocabulary, and one that doesn't must not claim one.
    if (concept.levelApplicable !== (concept.levelKind !== null)) {
        problems.push(
            `${concept.conceptId}: levelApplicable/levelKind disagree`,
        );
    }
}

for (const synonym of synonyms) {
    if (!conceptIds.has(synonym.concept)) {
        problems.push(`synonym "${synonym.term}": unknown ${synonym.concept}`);
    }
}

if (problems.length > 0) {
    console.error("Seed validation failed:");
    for (const p of problems) console.error("  -", p);
    process.exit(1);
}

// `subspecialty` is a closed select on procedureConcepts, so the CSV can
// introduce a value the column will reject - which is a migration that
// fails halfway, not a validation message. The vocabulary travels with
// the seed and is reconciled before the rows that need it are written.
const subspecialties = [...new Set(concepts.map((c) => c.subspecialty))];

const seed = { facetValues, spinalLevels, concepts, synonyms, subspecialties };

// ---------------------------------------------------------------------
// Client snapshot. Facets are flattened back to their display terms
// here: the app renders and groups by term, and resolving six relations
// per concept on every read buys nothing once the data is denormalised
// into a bundled file. PocketBase keeps the relations; this is a
// read-only projection of them.
// ---------------------------------------------------------------------

const facetTerm = Object.fromEntries(
    facetValues.map((f) => [f.facetValueId, f.term]),
);
const synonymsByConcept = new Map();
for (const synonym of synonyms) {
    if (!synonymsByConcept.has(synonym.concept)) {
        synonymsByConcept.set(synonym.concept, []);
    }
    synonymsByConcept.get(synonym.concept).push({
        term: synonym.term,
        language: synonym.language,
        isAbbreviation: synonym.isAbbreviation,
        active: synonym.active,
    });
}

const clientCatalogue = concepts.map((c) => ({
    conceptId: c.conceptId,
    fsn: c.fsn,
    preferredTerm: c.preferredTerm,
    subspecialty: c.subspecialty,
    facets: {
        method: facetTerm[c.method] ?? null,
        procedureSite: facetTerm[c.procedureSite] ?? null,
        surgicalApproach: facetTerm[c.surgicalApproach] ?? null,
        device: facetTerm[c.device] ?? null,
        morphology: facetTerm[c.morphology] ?? null,
        intent: facetTerm[c.defaultIntent] ?? null,
    },
    lateralityApplicable: c.lateralityApplicable,
    revisionApplicable: c.revisionApplicable,
    levelApplicable: c.levelApplicable,
    levelKind: c.levelKind,
    levelRegions: c.levelRegions,
    active: c.active,
    // Empty across the board in v2026.1 - the first release retires
    // nothing. Carried anyway so the client can follow a replacement
    // chain the day one exists, rather than needing a shape change then.
    inactivationReason: c.inactivationReason,
    replacedBy: c.replacedBy,
    effectiveFrom: c.effectiveFrom,
    catalogueRelease: c.catalogueRelease,
    synonyms: synonymsByConcept.get(c.conceptId) ?? [],
}));

writeFileSync(OUT_CATALOGUE, JSON.stringify(clientCatalogue, null, 4) + "\n");
writeFileSync(OUT_LEVELS, JSON.stringify(spinalLevels, null, 4) + "\n");

// ---------------------------------------------------------------------
// Emit the PocketBase seed migration with the data embedded.
//
// Embedded rather than read at runtime so the migration is self-contained
// and needs no filesystem access from PocketBase's JS VM. It upserts on
// the business identifiers (conceptId, facetValueId, spinalLevelId)
// rather than inserting blindly, so re-running it against an already
// seeded database applies a catalogue release instead of duplicating it.
// ---------------------------------------------------------------------

const migration = `/// <reference path="../pb_data/types.d.ts" />

// GENERATED by scripts/build-catalogue-seed.mjs - do not edit by hand.
// Source of truth: specs/procedure_coding_system/seed_*.csv
//
// Regenerate with: node scripts/build-catalogue-seed.mjs
//
// Upserts keyed on the NSPC business identifiers, so this is safe to
// re-run. For a new catalogue release, regenerate this file under a new
// timestamp: already-applied migrations never re-run on their own.

const SEED = ${JSON.stringify(seed)};

/** PocketBase date fields want a full timestamp, the CSVs carry a day. */
function asDate(day) {
    return day ? day + " 00:00:00.000Z" : "";
}

/** Load a whole collection into a { businessId: record } map. */
function indexBy(app, collectionName, keyField) {
    const map = {};
    for (const record of app.findAllRecords(collectionName)) {
        map[record.get(keyField)] = record;
    }
    return map;
}

/**
 * Add any missing options to a select field, keeping the ones already
 * there. Widening only: a value this seed no longer uses may still be on
 * records written by an earlier release, and removing it would make them
 * invalid on next save.
 */
function widenSelect(app, collectionName, fieldName, values) {
    const collection = app.findCollectionByNameOrId(collectionName);
    const field = collection.fields.getByName(fieldName);

    const merged = [];
    for (let i = 0; i < field.values.length; i++) {
        merged.push(field.values[i]);
    }

    let added = false;
    for (const value of values) {
        if (merged.indexOf(value) === -1) {
            merged.push(value);
            added = true;
        }
    }
    if (!added) return;

    field.values = merged;
    app.save(collection);
}

/** Find-or-create by business key, apply changes, save. */
function upsert(app, collectionName, index, keyField, keyValue, apply) {
    let record = index[keyValue];
    if (!record) {
        record = new Record(app.findCollectionByNameOrId(collectionName));
        record.set(keyField, keyValue);
        index[keyValue] = record;
    }
    apply(record);
    app.save(record);
    return record;
}

migrate(
    (app) => {
        // --- facet values -------------------------------------------
        const facetIndex = indexBy(
            app,
            "procedureFacetValues",
            "facetValueId",
        );
        for (const row of SEED.facetValues) {
            upsert(
                app,
                "procedureFacetValues",
                facetIndex,
                "facetValueId",
                row.facetValueId,
                (r) => {
                    r.set("facet", row.facet);
                    r.set("term", row.term);
                    r.set("snomedAttribute", row.snomedAttribute);
                    r.set("active", row.active);
                    r.set("effectiveFrom", asDate(row.effectiveFrom));
                },
            );
        }

        // --- spinal levels ------------------------------------------
        const levelIndex = indexBy(app, "spinalLevels", "spinalLevelId");
        for (const row of SEED.spinalLevels) {
            upsert(
                app,
                "spinalLevels",
                levelIndex,
                "spinalLevelId",
                row.spinalLevelId,
                (r) => {
                    r.set("kind", row.kind);
                    r.set("code", row.code);
                    r.set("longName", row.longName);
                    r.set("region", row.region);
                    r.set("ordinal", row.ordinal);
                    r.set("active", row.active);
                    r.set("effectiveFrom", asDate(row.effectiveFrom));
                },
            );
        }

        // --- concepts -----------------------------------------------
        // The subspecialty vocabulary has to be widened before any row
        // using a new value is written, or the first such row fails and
        // takes the migration with it.
        widenSelect(
            app,
            "procedureConcepts",
            "subspecialty",
            SEED.subspecialties,
        );

        // Facet relations resolve here; replacedBy cannot, because it
        // may point at a concept later in the list. It gets a second
        // pass once every row exists.
        const conceptIndex = indexBy(app, "procedureConcepts", "conceptId");
        const facetRef = (facetValueId) =>
            facetValueId ? facetIndex[facetValueId].id : "";

        for (const row of SEED.concepts) {
            upsert(
                app,
                "procedureConcepts",
                conceptIndex,
                "conceptId",
                row.conceptId,
                (r) => {
                    r.set("fsn", row.fsn);
                    r.set("preferredTerm", row.preferredTerm);
                    r.set("subspecialty", row.subspecialty);
                    r.set("method", facetRef(row.method));
                    r.set("procedureSite", facetRef(row.procedureSite));
                    r.set("surgicalApproach", facetRef(row.surgicalApproach));
                    r.set("device", facetRef(row.device));
                    r.set("morphology", facetRef(row.morphology));
                    r.set("defaultIntent", facetRef(row.defaultIntent));
                    r.set("lateralityApplicable", row.lateralityApplicable);
                    r.set("revisionApplicable", row.revisionApplicable);
                    r.set("levelApplicable", row.levelApplicable);
                    r.set("levelKind", row.levelKind ?? "");
                    r.set("levelRegions", row.levelRegions);
                    r.set("active", row.active);
                    r.set("inactivationReason", row.inactivationReason ?? "");
                    r.set("effectiveFrom", asDate(row.effectiveFrom));
                    r.set("effectiveTo", asDate(row.effectiveTo));
                    r.set("catalogueRelease", row.catalogueRelease);
                },
            );
        }

        // --- replacement chains -------------------------------------
        for (const row of SEED.concepts) {
            if (!row.replacedBy) continue;
            const record = conceptIndex[row.conceptId];
            record.set("replacedBy", conceptIndex[row.replacedBy].id);
            app.save(record);
        }

        // --- synonyms -----------------------------------------------
        // Replaced wholesale per concept rather than upserted: a synonym
        // has no stable identifier of its own, and a release that drops
        // one should not leave it behind.
        for (const row of SEED.concepts) {
            const conceptRecordId = conceptIndex[row.conceptId].id;
            const stale = app.findRecordsByFilter(
                "procedureConceptSynonyms",
                "concept = {:concept}",
                "",
                0,
                0,
                { concept: conceptRecordId },
            );
            for (const record of stale) app.delete(record);
        }

        const synonymCollection = app.findCollectionByNameOrId(
            "procedureConceptSynonyms",
        );
        for (const row of SEED.synonyms) {
            const record = new Record(synonymCollection);
            record.set("concept", conceptIndex[row.concept].id);
            record.set("term", row.term);
            record.set("language", row.language);
            record.set("isAbbreviation", row.isAbbreviation);
            record.set("active", row.active);
            record.set("effectiveFrom", asDate(row.effectiveFrom));
            app.save(record);
        }

        return null;
    },
    (app) => {
        // Remove only what this seed introduced. Concepts go first -
        // their synonyms cascade with them. A concept still referenced
        // by a procedureCodes row will refuse to delete, which is the
        // intended safety net rather than an error to work around.
        const purge = (collectionName, keyField, rows, keyOf) => {
            for (const row of rows) {
                let record;
                try {
                    record = app.findFirstRecordByFilter(
                        collectionName,
                        keyField + " = {:id}",
                        { id: keyOf(row) },
                    );
                } catch {
                    continue; // Never seeded, or already removed.
                }
                app.delete(record);
            }
        };

        purge(
            "procedureConcepts",
            "conceptId",
            SEED.concepts,
            (r) => r.conceptId,
        );
        purge(
            "spinalLevels",
            "spinalLevelId",
            SEED.spinalLevels,
            (r) => r.spinalLevelId,
        );
        purge(
            "procedureFacetValues",
            "facetValueId",
            SEED.facetValues,
            (r) => r.facetValueId,
        );
        return null;
    },
);
`;

writeFileSync(OUT, migration);

console.log(
    `facet values  ${facetValues.length}\n` +
        `spinal levels ${spinalLevels.length}\n` +
        `concepts      ${concepts.length}\n` +
        `synonyms      ${synonyms.length}\n` +
        `\nWrote:\n  ${OUT}\n  ${OUT_CATALOGUE}\n  ${OUT_LEVELS}`,
);
