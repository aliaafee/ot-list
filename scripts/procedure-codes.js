/**
 * Procedure code catalogue version manager.
 *
 * Every release of the procedure code catalogue lives in its own folder under
 * specs/procedure_codes (for example specs/procedure_codes/v2026.1). A release
 * is a full copy of the previous one plus that release's changes, so nothing is
 * ever deleted: retired codes stay in the file with active=false, and a code
 * that supersedes another is named in the old code's replacedBy.
 *
 * Usage:
 *   node scripts/procedure-codes.js list
 *   node scripts/procedure-codes.js new <version> [--from <version>]
 *   node scripts/procedure-codes.js publish [<version>] [--dry-run] [--stamp]
 *
 * `new` starts a release by copying the latest one into a new folder.
 * `publish` validates the release against its predecessor, writes a PocketBase
 * migration that seeds only what changed, and copies the release's json files
 * into src/data so a rebuilt client bundles the same catalogue.
 */

import {
    copyFileSync,
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    writeFileSync,
} from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const specsDir = join(projectRoot, "specs", "procedure_codes");
const migrationsDir = join(projectRoot, "pb", "pb_migrations");
const dataDir = join(projectRoot, "src", "data");

const CATALOGUE_FILE = "nspc-catalogue.json";
const LEVELS_FILE = "spinal-levels.json";
const FACETS_FILE = "facet-values.json";
const RELEASE_FILE = "catalogue-release.json";

// A concept's facets are relations to the shared vocabulary, so the catalogue
// names a term and the vocabulary file says which facet value that is. The
// key is the concept's relation field; the value is the facet the term must
// be drawn from.
const CONCEPT_FACETS = {
    method: "method",
    procedureSite: "site",
    surgicalApproach: "approach",
    device: "device",
    morphology: "morphology",
    defaultIntent: "intent",
};

// Which key in the catalogue json each relation reads its term from.
const FACET_SOURCE_KEYS = {
    method: "method",
    procedureSite: "procedureSite",
    surgicalApproach: "surgicalApproach",
    device: "device",
    morphology: "morphology",
    defaultIntent: "intent",
};

// The fields written to PocketBase, in collection order. Anything else in the
// json files is spec-only and never reaches the database.
const CONCEPT_FIELDS = {
    conceptId: "text",
    fsn: "text",
    preferredTerm: "text",
    subspecialty: "text",
    lateralityApplicable: "bool",
    revisionApplicable: "bool",
    levelApplicable: "bool",
    levelKind: "text",
    levelRegions: "json",
    active: "bool",
    inactivationReason: "text",
    replacedBy: "text",
    effectiveFrom: "date",
    catalogueRelease: "text",
};

const FACET_VALUE_FIELDS = {
    facetValueId: "text",
    facet: "text",
    term: "text",
    snomedAttribute: "text",
    active: "bool",
    effectiveFrom: "date",
};

const SYNONYM_FIELDS = {
    term: "text",
    language: "text",
    isAbbreviation: "bool",
    active: "bool",
};

const LEVEL_FIELDS = {
    spinalLevelId: "text",
    kind: "text",
    code: "text",
    longName: "text",
    region: "text",
    ordinal: "number",
    active: "bool",
    effectiveFrom: "date",
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function fail(message) {
    console.error(`Error: ${message}`);
    process.exit(1);
}

/** Sorts v2026.1, v2026.2, v2027.1 ... by their numeric parts. */
function compareVersions(a, b) {
    const parts = (v) => (v.match(/\d+/g) ?? []).map(Number);
    const left = parts(a);
    const right = parts(b);
    for (let i = 0; i < Math.max(left.length, right.length); i++) {
        const diff = (left[i] ?? 0) - (right[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return a.localeCompare(b);
}

function listVersions() {
    if (!existsSync(specsDir)) return [];
    return readdirSync(specsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort(compareVersions);
}

function readJsonArray(path, label) {
    if (!existsSync(path)) fail(`${label} not found at ${path}`);
    let parsed;
    try {
        parsed = JSON.parse(readFileSync(path, "utf-8"));
    } catch (error) {
        fail(`${label} is not valid json: ${error.message}`);
    }
    if (!Array.isArray(parsed)) fail(`${label} must contain a json array`);
    return parsed;
}

function readVersion(version) {
    const dir = join(specsDir, version);
    if (!existsSync(dir)) {
        fail(`no such version: specs/procedure_codes/${version}`);
    }
    return {
        concepts: readJsonArray(
            join(dir, CATALOGUE_FILE),
            `${version}/${CATALOGUE_FILE}`,
        ),
        levels: readJsonArray(
            join(dir, LEVELS_FILE),
            `${version}/${LEVELS_FILE}`,
        ),
        facetValues: readJsonArray(
            join(dir, FACETS_FILE),
            `${version}/${FACETS_FILE}`,
        ),
    };
}

/** Looks a facet term up by the facet it belongs to: index[facet][term]. */
function buildFacetIndex(facetValues) {
    const index = {};
    for (const value of facetValues) {
        index[value.facet] ??= {};
        index[value.facet][value.term] = value.facetValueId;
    }
    return index;
}

/** PocketBase date fields want a full timestamp; the spec files carry dates. */
function normalizeDate(value) {
    if (value === null || value === undefined || value === "") return "";
    const text = String(value);
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text} 00:00:00.000Z` : text;
}

/** Projects a spec record onto the collection fields, in a stable key order. */
function normalizeRecord(raw, fields, label) {
    const out = {};
    for (const [name, type] of Object.entries(fields)) {
        const value = raw[name];
        if (type === "text") {
            out[name] =
                value === null || value === undefined ? "" : String(value);
        } else if (type === "bool") {
            out[name] = value === true;
        } else if (type === "number") {
            if (typeof value !== "number") {
                fail(`${label}: field "${name}" must be a number`);
            }
            out[name] = value;
        } else if (type === "date") {
            out[name] = normalizeDate(value);
        } else {
            out[name] = value === undefined ? null : value;
        }
    }
    return out;
}

/**
 * A concept as the migration will write it: the scalar columns, the facet
 * relations as vocabulary ids, and the synonyms that become child rows.
 *
 * Facets are resolved here rather than in the migration so an unknown term is
 * caught while publishing, when it can still be fixed, instead of failing
 * against a database.
 */
function normalizeConcept(raw, facetIndex) {
    const facets = {};
    for (const [field, facet] of Object.entries(CONCEPT_FACETS)) {
        const term = raw.facets?.[FACET_SOURCE_KEYS[field]];
        facets[field] = term ? (facetIndex[facet]?.[term] ?? null) : "";
    }

    return {
        // Lifted out of `fields` so the diff can key on it.
        conceptId: raw.conceptId,
        fields: normalizeRecord(raw, CONCEPT_FIELDS, raw.conceptId),
        facets,
        synonyms: (raw.synonyms ?? []).map((synonym) =>
            normalizeRecord(synonym, SYNONYM_FIELDS, raw.conceptId),
        ),
    };
}

/** Key-sorted stringify, so a reordered json file does not read as a change. */
function stableStringify(value) {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(",")}]`;
    }
    const pairs = Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${pairs.join(",")}}`;
}

/**
 * Compares the previous release to this one and returns one entry per changed
 * record: { key, prev, next }. prev is null for records this release adds,
 * which is what lets the generated migration roll itself back.
 */
function diffRecords(previous, current, keyField) {
    const before = new Map(
        previous.map((record) => [record[keyField], record]),
    );
    const changes = [];
    for (const record of current) {
        const key = record[keyField];
        const old = before.get(key) ?? null;
        if (old && stableStringify(old) === stableStringify(record)) continue;
        changes.push({ key, prev: old, next: record });
    }
    return changes;
}

// ---------------------------------------------------------------------------
// validation
// ---------------------------------------------------------------------------

/**
 * Enforces the rules the catalogue depends on: ids are unique and permanent,
 * retirement is one way, and replacements point at something real.
 */
function validate(version, previous, current, options) {
    const errors = [];
    const warnings = [];

    // The facet vocabulary, first: a concept's facets are checked against it.
    const facetValueIds = new Set();
    const knownFacets = new Set(Object.values(CONCEPT_FACETS));
    for (const value of current.facetValues) {
        const id = value.facetValueId;
        if (!id) {
            errors.push("a facet value is missing facetValueId");
            continue;
        }
        if (facetValueIds.has(id)) {
            errors.push(`duplicate facetValueId ${id}`);
        }
        facetValueIds.add(id);

        if (!value.term) errors.push(`${id}: missing term`);
        if (!knownFacets.has(value.facet)) {
            errors.push(
                `${id}: facet "${value.facet}" is not one of ${[...knownFacets].join(", ")}`,
            );
        }
    }

    const facetIndex = buildFacetIndex(current.facetValues);
    const seenTerms = new Set();
    for (const value of current.facetValues) {
        const key = `${value.facet}:${value.term}`;
        if (seenTerms.has(key)) {
            errors.push(
                `facet ${value.facet} lists the term "${value.term}" twice`,
            );
        }
        seenTerms.add(key);
    }

    // A facet value is referenced by id, so dropping one orphans every concept
    // pointing at it. Retire with active=false instead, as with concepts.
    for (const value of previous.facetValues ?? []) {
        if (!facetValueIds.has(value.facetValueId)) {
            errors.push(
                `${value.facetValueId} is missing from ${version}; retire facet values with active=false instead of deleting them`,
            );
        }
    }

    // Every facet term a concept names has to exist in the vocabulary - this
    // is what makes the facets a controlled vocabulary rather than free text.
    for (const concept of current.concepts) {
        for (const [field, facet] of Object.entries(CONCEPT_FACETS)) {
            const term = concept.facets?.[FACET_SOURCE_KEYS[field]];
            if (term && !facetIndex[facet]?.[term]) {
                errors.push(
                    `${concept.conceptId}: ${field} "${term}" is not in the ${facet} vocabulary`,
                );
            }
        }
        for (const synonym of concept.synonyms ?? []) {
            if (!synonym.term) {
                errors.push(`${concept.conceptId}: a synonym has no term`);
            }
        }
    }

    const conceptIds = new Set();
    for (const concept of current.concepts) {
        const id = concept.conceptId;
        if (!id) {
            errors.push("a concept is missing conceptId");
            continue;
        }
        if (conceptIds.has(id)) errors.push(`duplicate conceptId ${id}`);
        conceptIds.add(id);

        if (!concept.fsn) errors.push(`${id}: missing fsn`);
        if (!concept.preferredTerm) errors.push(`${id}: missing preferredTerm`);
        if (concept.levelApplicable === true && !concept.levelKind) {
            errors.push(
                `${id}: levelApplicable is true but levelKind is unset`,
            );
        }
        if (concept.levelApplicable !== true && concept.levelKind) {
            warnings.push(
                `${id}: levelKind is set but levelApplicable is not true`,
            );
        }
        if (concept.active === false && !concept.inactivationReason) {
            warnings.push(`${id}: retired without an inactivationReason`);
        }
        if (concept.replacedBy && concept.active !== false) {
            errors.push(
                `${id}: replacedBy is set on a code that is still active`,
            );
        }
    }

    const knownRegions = new Set(current.levels.map((level) => level.region));
    for (const concept of current.concepts) {
        for (const region of concept.levelRegions ?? []) {
            if (!knownRegions.has(region)) {
                warnings.push(
                    `${concept.conceptId}: levelRegions names "${region}", which no spinal level uses`,
                );
            }
        }
    }

    // replacedBy must resolve to a real code, and the chain must terminate.
    const byId = new Map(current.concepts.map((c) => [c.conceptId, c]));
    for (const concept of current.concepts) {
        const chain = new Set([concept.conceptId]);
        let cursor = concept.replacedBy;
        while (cursor) {
            if (!byId.has(cursor)) {
                errors.push(
                    `${concept.conceptId}: replacedBy points at unknown code ${cursor}`,
                );
                break;
            }
            if (chain.has(cursor)) {
                errors.push(
                    `${concept.conceptId}: replacedBy chain loops back on itself`,
                );
                break;
            }
            chain.add(cursor);
            cursor = byId.get(cursor).replacedBy;
        }
    }

    const levelIds = new Set();
    for (const level of current.levels) {
        const id = level.spinalLevelId;
        if (!id) {
            errors.push("a spinal level is missing spinalLevelId");
            continue;
        }
        if (levelIds.has(id)) errors.push(`duplicate spinalLevelId ${id}`);
        levelIds.add(id);

        if (!level.code) errors.push(`${id}: missing code`);
        if (!["vertebra", "interspace"].includes(level.kind)) {
            errors.push(`${id}: kind must be "vertebra" or "interspace"`);
        }
    }

    // Nothing is ever dropped from the catalogue, and nothing comes back.
    for (const concept of previous.concepts) {
        const now = byId.get(concept.conceptId);
        if (!now) {
            errors.push(
                `${concept.conceptId} is missing from ${version}; retire codes with active=false instead of deleting them`,
            );
            continue;
        }
        if (
            concept.active === false &&
            now.active === true &&
            !options.allowReactivate
        ) {
            errors.push(
                `${concept.conceptId} was retired in an earlier release and cannot be reactivated (pass --allow-reactivate to override)`,
            );
        }
    }
    for (const level of previous.levels) {
        if (!levelIds.has(level.spinalLevelId)) {
            errors.push(
                `${level.spinalLevelId} is missing from ${version}; retire levels with active=false instead of deleting them`,
            );
        }
    }

    return { errors, warnings };
}

// ---------------------------------------------------------------------------
// migration
// ---------------------------------------------------------------------------

function migrationSlug(version) {
    return version.replace(/[^a-zA-Z0-9]+/g, "_");
}

function findMigration(version) {
    const suffix = `_seeded_procedureCodes_${migrationSlug(version)}.js`;
    return readdirSync(migrationsDir).find((name) => name.endsWith(suffix));
}

/** PocketBase applies migrations in filename order, so stay after the last. */
function nextMigrationTimestamp() {
    const existing = readdirSync(migrationsDir)
        .map((name) => Number(name.split("_")[0]))
        .filter((value) => Number.isFinite(value));
    const latest = existing.length > 0 ? Math.max(...existing) : 0;
    return Math.max(Math.floor(Date.now() / 1000), latest + 1);
}

function renderMigration(
    version,
    conceptChanges,
    levelChanges,
    facetValueChanges,
) {
    return `/// <reference path="../pb_data/types.d.ts" />

// Seeds the ${version} procedure code catalogue.
//
// Generated by scripts/procedure-codes.js from specs/procedure_codes/${version}.
// Do not edit by hand: change the spec files and publish a new version instead.
//
// Each entry carries the values this release writes ("next") and the values the
// record held in the previous release ("prev", null when this release adds it),
// so the migration can be rolled back exactly.
//
// A concept's facets are relations, so they travel as facetValueIds and are
// resolved to records here. Its synonyms are child rows, replaced as a set:
// the catalogue always states a concept's whole synonym list.

const CATALOGUE_RELEASE = "${version}";

const FACET_VALUE_CHANGES = ${JSON.stringify(facetValueChanges, null, 2)};

const LEVEL_CHANGES = ${JSON.stringify(levelChanges, null, 2)};

const CONCEPT_CHANGES = ${JSON.stringify(conceptChanges, null, 2)};

function applyChanges(app, collectionName, keyField, changes, direction) {
  const collection = app.findCollectionByNameOrId(collectionName);

  for (const change of changes) {
    const values = direction === "up" ? change.next : change.prev;

    let record = null;
    try {
      record = app.findFirstRecordByData(collectionName, keyField, change.key);
    } catch (err) {
      record = null;
    }

    if (values === null) {
      // This release introduced the record, so rolling back removes it.
      if (record !== null) {
        app.delete(record);
      }
      continue;
    }

    if (record === null) {
      record = new Record(collection);
    }
    for (const field in values) {
      record.set(field, values[field]);
    }
    app.save(record);
  }
}

/** The facet value record a facetValueId names. */
function facetRecordId(app, facetValueId) {
  if (!facetValueId) {
    return "";
  }
  try {
    return app.findFirstRecordByData(
      "procedureFacetValues",
      "facetValueId",
      facetValueId,
    ).id;
  } catch (err) {
    throw new Error("Unknown facet value: " + facetValueId);
  }
}

function applyConcepts(app, changes, direction) {
  const collection = app.findCollectionByNameOrId("procedureConcepts");
  const synonymCollection = app.findCollectionByNameOrId(
    "procedureConceptSynonyms",
  );

  for (const change of changes) {
    const values = direction === "up" ? change.next : change.prev;

    let record = null;
    try {
      record = app.findFirstRecordByData(
        "procedureConcepts",
        "conceptId",
        change.key,
      );
    } catch (err) {
      record = null;
    }

    if (values === null) {
      // This release introduced the concept; its synonyms cascade with it.
      if (record !== null) {
        app.delete(record);
      }
      continue;
    }

    if (record === null) {
      record = new Record(collection);
    }
    for (const field in values.fields) {
      record.set(field, values.fields[field]);
    }
    for (const field in values.facets) {
      record.set(field, facetRecordId(app, values.facets[field]));
    }
    app.save(record);

    const existing = app.findRecordsByFilter(
      "procedureConceptSynonyms",
      "concept = {:concept}",
      "",
      0,
      0,
      { concept: record.id },
    );
    for (const synonym of existing) {
      app.delete(synonym);
    }
    for (const synonym of values.synonyms) {
      const row = new Record(synonymCollection);
      row.set("concept", record.id);
      for (const field in synonym) {
        row.set(field, synonym[field]);
      }
      app.save(row);
    }
  }
}

migrate(
  (app) => {
    // Facet values first: the concepts point at them.
    applyChanges(
      app,
      "procedureFacetValues",
      "facetValueId",
      FACET_VALUE_CHANGES,
      "up",
    );
    applyChanges(app, "spinalLevels", "spinalLevelId", LEVEL_CHANGES, "up");
    applyConcepts(app, CONCEPT_CHANGES, "up");
    console.log(
      "seeded procedure codes " +
        CATALOGUE_RELEASE +
        ": " +
        CONCEPT_CHANGES.length +
        " concept(s), " +
        FACET_VALUE_CHANGES.length +
        " facet value(s), " +
        LEVEL_CHANGES.length +
        " spinal level(s)",
    );
  },
  (app) => {
    // Concepts first: they are what points at the facet values.
    applyConcepts(app, CONCEPT_CHANGES, "down");
    applyChanges(app, "spinalLevels", "spinalLevelId", LEVEL_CHANGES, "down");
    applyChanges(
      app,
      "procedureFacetValues",
      "facetValueId",
      FACET_VALUE_CHANGES,
      "down",
    );
  },
);
`;
}

// ---------------------------------------------------------------------------
// commands
// ---------------------------------------------------------------------------

function commandList() {
    const versions = listVersions();
    if (versions.length === 0) {
        console.log("No catalogue versions in specs/procedure_codes.");
        return;
    }
    for (const version of versions) {
        const { concepts, levels } = readVersion(version);
        const retired = concepts.filter((c) => c.active === false).length;
        const migration = findMigration(version);
        console.log(
            `${version.padEnd(10)} ${String(concepts.length).padStart(5)} concepts ` +
                `(${retired} retired) ${String(levels.length).padStart(4)} levels  ` +
                (migration ? migration : "not published"),
        );
    }
}

function commandNew(version, from) {
    if (!version) {
        fail(
            "usage: node scripts/procedure-codes.js new <version> [--from <version>]",
        );
    }

    const versions = listVersions();
    const source = from ?? versions[versions.length - 1];
    const target = join(specsDir, version);

    if (existsSync(target)) {
        fail(`specs/procedure_codes/${version} already exists`);
    }
    if (source && compareVersions(version, source) <= 0) {
        fail(
            `${version} does not sort after ${source}; pick a later version name`,
        );
    }

    mkdirSync(target, { recursive: true });
    for (const file of [CATALOGUE_FILE, LEVELS_FILE, FACETS_FILE]) {
        if (source) {
            copyFileSync(join(specsDir, source, file), join(target, file));
        } else {
            writeFileSync(join(target, file), "[]\n");
        }
    }
    console.log(
        source
            ? `Created specs/procedure_codes/${version} as a copy of ${source}.`
            : `Created empty specs/procedure_codes/${version}.`,
    );
    console.log("");
    console.log("Next:");
    console.log(
        `  1. Edit the json files in specs/procedure_codes/${version}:`,
    );
    console.log(
        "     - append new codes, never repurpose a released conceptId",
    );
    console.log(
        "     - add any new facet term to facet-values.json first, with the",
    );
    console.log("       next id for its facet; a term not listed there fails");
    console.log(
        "     - retire codes with active=false plus inactivationReason,",
    );
    console.log("       and replacedBy when a new code takes over");
    console.log(
        `     - set "catalogueRelease": "${version}" on every code you touch`,
    );
    console.log(`  2. node scripts/procedure-codes.js publish ${version}`);
}

function commandPublish(version, options) {
    const versions = listVersions();
    if (versions.length === 0)
        fail("no catalogue versions in specs/procedure_codes");

    const target = version ?? versions[versions.length - 1];
    const index = versions.indexOf(target);
    if (index === -1) fail(`no such version: specs/procedure_codes/${target}`);

    const previousVersion = index > 0 ? versions[index - 1] : null;
    const previous = previousVersion
        ? readVersion(previousVersion)
        : { concepts: [], levels: [], facetValues: [] };
    const current = readVersion(target);

    console.log(
        `Publishing ${target}` +
            (previousVersion
                ? ` (changes since ${previousVersion})`
                : " (first release)"),
    );

    const { errors, warnings } = validate(target, previous, current, options);
    for (const warning of warnings) console.warn(`  warning: ${warning}`);
    if (errors.length > 0) {
        for (const error of errors) console.error(`  error: ${error}`);
        fail(`${target} failed validation; nothing was written`);
    }

    const previousFacets = buildFacetIndex(previous.facetValues ?? []);
    const currentFacets = buildFacetIndex(current.facetValues);

    const facetValueChanges = diffRecords(
        (previous.facetValues ?? []).map((f) =>
            normalizeRecord(f, FACET_VALUE_FIELDS, f.facetValueId),
        ),
        current.facetValues.map((f) =>
            normalizeRecord(f, FACET_VALUE_FIELDS, f.facetValueId),
        ),
        "facetValueId",
    );
    const conceptChanges = diffRecords(
        previous.concepts.map((c) => normalizeConcept(c, previousFacets)),
        current.concepts.map((c) => normalizeConcept(c, currentFacets)),
        "conceptId",
    );
    const levelChanges = diffRecords(
        previous.levels.map((l) =>
            normalizeRecord(l, LEVEL_FIELDS, l.spinalLevelId),
        ),
        current.levels.map((l) =>
            normalizeRecord(l, LEVEL_FIELDS, l.spinalLevelId),
        ),
        "spinalLevelId",
    );

    // Every changed code must name the release that changed it, so the
    // catalogueRelease column stays a usable audit trail.
    const unstamped = conceptChanges
        .filter((change) => change.next.fields.catalogueRelease !== target)
        .map((change) => change.key);
    if (unstamped.length > 0) {
        if (options.stamp) {
            stampRelease(target, unstamped);
            commandPublish(target, { ...options, stamp: false });
            return;
        }
        for (const id of unstamped) {
            console.error(
                `  error: ${id} changed but its catalogueRelease is not ${target}`,
            );
        }
        fail(
            "re-run with --stamp to set catalogueRelease on the changed codes",
        );
    }

    const added = conceptChanges.filter((c) => c.prev === null).length;
    const retired = conceptChanges.filter(
        (c) => c.prev !== null && c.prev.fields.active && !c.next.fields.active,
    ).length;
    console.log(
        `  concepts: ${conceptChanges.length} changed (${added} new, ${retired} retired)`,
    );
    console.log(`  facet values: ${facetValueChanges.length} changed`);
    console.log(`  spinal levels: ${levelChanges.length} changed`);

    if (
        conceptChanges.length === 0 &&
        levelChanges.length === 0 &&
        facetValueChanges.length === 0
    ) {
        console.log(
            "Nothing changed since the previous release; nothing to publish.",
        );
        return;
    }

    const existing = findMigration(target);
    if (existing) {
        fail(
            `${target} is already published as pb/pb_migrations/${existing}; ` +
                "delete that file first if you need to regenerate it",
        );
    }

    const migrationName = `${nextMigrationTimestamp()}_seeded_procedureCodes_${migrationSlug(target)}.js`;

    if (options.dryRun) {
        console.log("");
        console.log("Dry run, nothing written. Would have written:");
        console.log(`  pb/pb_migrations/${migrationName}`);
        console.log(`  src/data/${CATALOGUE_FILE}`);
        console.log(`  src/data/${LEVELS_FILE}`);
        console.log(`  src/data/${RELEASE_FILE}`);
        return;
    }

    writeFileSync(
        join(migrationsDir, migrationName),
        renderMigration(
            target,
            conceptChanges,
            levelChanges,
            facetValueChanges,
        ),
    );
    console.log(`  wrote pb/pb_migrations/${migrationName}`);

    mkdirSync(dataDir, { recursive: true });
    for (const file of [CATALOGUE_FILE, LEVELS_FILE]) {
        copyFileSync(join(specsDir, target, file), join(dataDir, file));
        console.log(`  wrote src/data/${file}`);
    }
    const release = {
        release: target,
        publishedAt: new Date().toISOString().slice(0, 10),
        concepts: current.concepts.length,
        spinalLevels: current.levels.length,
    };
    writeFileSync(
        join(dataDir, RELEASE_FILE),
        `${JSON.stringify(release, null, 4)}\n`,
    );
    console.log(`  wrote src/data/${RELEASE_FILE}`);

    console.log("");
    console.log(
        "Next: npm run build, and restart PocketBase to apply the migration.",
    );
}

/** Rewrites the release's catalogue file, stamping catalogueRelease on ids. */
function stampRelease(version, conceptIds) {
    const path = join(specsDir, version, CATALOGUE_FILE);
    const concepts = JSON.parse(readFileSync(path, "utf-8"));
    const ids = new Set(conceptIds);
    for (const concept of concepts) {
        if (ids.has(concept.conceptId)) concept.catalogueRelease = version;
    }
    writeFileSync(path, `${JSON.stringify(concepts, null, 4)}\n`);
    console.log(`  stamped catalogueRelease=${version} on ${ids.size} code(s)`);
}

// ---------------------------------------------------------------------------

function main() {
    const argv = process.argv.slice(2);
    const command = argv[0];
    const positional = argv.slice(1).filter((arg) => !arg.startsWith("--"));
    const flag = (name) => argv.includes(`--${name}`);
    const option = (name) => {
        const at = argv.indexOf(`--${name}`);
        return at === -1 ? undefined : argv[at + 1];
    };

    if (command === "list") {
        commandList();
    } else if (command === "new") {
        commandNew(positional[0], option("from"));
    } else if (command === "publish") {
        commandPublish(positional[0], {
            dryRun: flag("dry-run"),
            stamp: flag("stamp"),
            allowReactivate: flag("allow-reactivate"),
        });
    } else {
        console.log("Usage:");
        console.log("  node scripts/procedure-codes.js list");
        console.log(
            "  node scripts/procedure-codes.js new <version> [--from <version>]",
        );
        console.log(
            "  node scripts/procedure-codes.js publish [<version>] [--dry-run] [--stamp]",
        );
        process.exit(command ? 1 : 0);
    }
}

main();
