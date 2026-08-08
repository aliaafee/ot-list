/**
 * Builds everything downstream of the NSPC spec CSVs.
 *
 * The CSVs under specs/procedure_coding_system are the source of truth.
 * Two artefacts are generated from them, and neither should be edited by
 * hand:
 *
 *   pb/pb_migrations/..._procedure_coding_system.js
 *       The whole coding system: collections, seed data, the backfill of
 *       existing procedures and the removal of the old free-text column.
 *       Its shape lives in scripts/templates/, which is ordinary readable
 *       JS; this script only injects the CSV data into it. PocketBase is
 *       the runtime source of truth - the catalogue can be revised there
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

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SPEC_DIR = join(ROOT, "specs", "procedure_coding_system");
const TEMPLATE_DIR = join(ROOT, "scripts", "templates");
const MIGRATIONS_DIR = join(ROOT, "pb", "pb_migrations");
const SEED_MARKER = "/*__SEED__*/ null";

// The bootstrap migration: creates the collections, seeds them, backfills
// existing procedures and drops the old free-text column. It runs once,
// on a database that has never had the coding system, and cannot run
// twice - creating a collection that already exists is an error.
const BOOTSTRAP = {
    out: join(MIGRATIONS_DIR, "1786089600_procedure_coding_system.js"),
    template: join(TEMPLATE_DIR, "procedure-coding-system.migration.js"),
};

// Every later change to the catalogue is a release: seed-only, against
// collections that already exist, under its own new timestamp. An applied
// migration never re-runs, so editing the bootstrap would move the repo
// without moving any database that has already run it.
//
//   node scripts/build-catalogue-seed.mjs --release 1786500000_catalogue_v2026_2
//
const releaseArg = (() => {
    const i = process.argv.indexOf("--release");
    if (i === -1) return null;
    const name = process.argv[i + 1];
    if (!name || name.startsWith("--")) {
        console.error(
            "--release needs a migration filename, e.g.\n" +
                "  --release 1786500000_catalogue_v2026_2",
        );
        process.exit(1);
    }
    return name.endsWith(".js") ? name : name + ".js";
})();

const { out: OUT, template: TEMPLATE } = releaseArg
    ? {
          out: join(MIGRATIONS_DIR, releaseArg),
          template: join(TEMPLATE_DIR, "catalogue-release.migration.js"),
      }
    : BOOTSTRAP;
const OUT_CATALOGUE = join(ROOT, "src", "data", "nspc-catalogue.json");
const OUT_LEVELS = join(ROOT, "src", "data", "spinal-levels.json");

/**
 * Refuse to rewrite a migration the local database has already run.
 *
 * An applied migration never re-runs, so editing one in place is a silent
 * no-op against every database that already has it: the CSVs, the bundled
 * snapshot and the file on disk all move on, and the database quietly
 * does not. That has happened once already - a regenerated release file
 * left a database short of a whole batch of concepts with nothing to
 * indicate it.
 *
 * Only advisory. A checkout with no `pb_data` (CI, a fresh clone) has
 * nothing to check against and builds normally.
 */
async function assertMigrationNotApplied() {
    const db = join(ROOT, "pb", "pb_data", "data.db");
    if (!existsSync(db)) return;

    let DatabaseSync;
    try {
        ({ DatabaseSync } = await import("node:sqlite"));
    } catch {
        return; // Older Node without node:sqlite - skip rather than fail.
    }

    let applied = false;
    try {
        const handle = new DatabaseSync(db, { readOnly: true });
        applied = !!handle
            .prepare("SELECT 1 FROM _migrations WHERE file = ?")
            .get(basename(OUT));
        handle.close();
    } catch {
        return; // Locked by a running server, or no _migrations table yet.
    }

    if (applied) {
        console.error(
            `\n${basename(OUT)} has already been applied to pb/pb_data.\n\n` +
                `Rewriting it would change the repo without changing any\n` +
                `database that has run it. Publish the change as a new\n` +
                `release instead, and leave this file alone:\n\n` +
                `  node scripts/build-catalogue-seed.mjs --release ` +
                `${Math.floor(Date.now() / 1000)}_catalogue_vYYYY_N\n`,
        );
        process.exit(1);
    }
}

await assertMigrationNotApplied();

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
// Emit the migration: the template with the CSV data injected.
//
// The data is embedded rather than read at runtime so the migration is
// self-contained and needs no filesystem access from PocketBase's JS VM.
// The template is a plain .js file rather than a string in this script,
// so the migration stays readable, lintable and diffable as the code it
// becomes - the alternative is a 400-line string literal nothing can
// check.
// ---------------------------------------------------------------------

const template = readFileSync(TEMPLATE, "utf8");
if (!template.includes(SEED_MARKER)) {
    console.error(`Template has no ${SEED_MARKER} placeholder: ${TEMPLATE}`);
    process.exit(1);
}

writeFileSync(OUT, template.replace(SEED_MARKER, JSON.stringify(seed)));

console.log(
    `facet values  ${facetValues.length}\n` +
        `spinal levels ${spinalLevels.length}\n` +
        `concepts      ${concepts.length}\n` +
        `synonyms      ${synonyms.length}\n` +
        `\nWrote:\n  ${OUT}\n  ${OUT_CATALOGUE}\n  ${OUT_LEVELS}`,
);
