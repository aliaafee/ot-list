/**
 * Where the procedure code catalogue comes from.
 *
 * Three sources, in order of preference: the database, a localStorage cache of
 * it, and the copy bundled into the build at `src/data` (written by
 * scripts/procedure-codes.js when a catalogue version is published). All three
 * hand back the same record shape, so nothing downstream needs to know which
 * one answered.
 *
 * The catalogue is a few hundred kilobytes that only changes when a new version
 * is published, so it is cached rather than refetched on every visit. Four
 * things keep that cache from going stale:
 *
 *   1. A fingerprint. Before serving the cache we ask the server for each
 *      collection's record count and newest `updated` timestamp - two tiny
 *      requests. Any seed migration, edit or rollback changes one of them, so a
 *      mismatch refetches. This is the check that actually catches changes.
 *   2. The bundled release. A cache written by an older build is discarded, so
 *      deploying a client always starts from fresh data.
 *   3. A schema number, bumped when the cached shape changes below.
 *   4. A max age, so the cache cannot outlive a fingerprint check that somehow
 *      keeps passing.
 *
 * The cache is also scoped to the backend it came from, so a dev build pointed
 * at another server never reads one environment's catalogue into another.
 */

import bundledCatalogue from "@/data/nspc-catalogue.json";
import bundledRelease from "@/data/catalogue-release.json";
import bundledLevels from "@/data/spinal-levels.json";
import { backendUrl, pb } from "@/lib/pb";

// Written by scripts/procedure-codes.js when a catalogue version is published.
export const CATALOGUE_RELEASE = bundledRelease.release;

export function fetchBundledCatalogue() {
    return {
        concepts: bundledCatalogue,
        levels: bundledLevels,
    };
}

// The facet relations and the synonym rows, flattened by toConcept below.
const CONCEPT_EXPAND = [
    "method",
    "procedureSite",
    "surgicalApproach",
    "device",
    "morphology",
    "defaultIntent",
    "procedureConceptSynonyms_via_concept",
].join(",");

const CACHE_KEY = "ot-list.catalogue";

// Bump when the cached record shape changes, to drop entries written by an
// older version of this file.
const CACHE_SCHEMA = 1;

const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** PocketBase stores dates as "2026-08-07 00:00:00.000Z"; the app wants days. */
function toDay(value) {
    if (!value) return null;
    return String(value).slice(0, 10);
}

/** Text fields come back as "" where the catalogue json uses null. */
function orNull(value) {
    return value === "" || value === undefined ? null : value;
}

/**
 * The concept's facet relations, flattened back to display terms.
 *
 * Facets are stored relationally so a term is defined once and can be mapped
 * to SNOMED once. Everything above this file wants the terms, so the shape it
 * gets is the same as the bundled snapshot's.
 */
function toFacets(record) {
    const term = (field) => record.expand?.[field]?.term ?? null;
    return {
        method: term("method"),
        procedureSite: term("procedureSite"),
        surgicalApproach: term("surgicalApproach"),
        device: term("device"),
        morphology: term("morphology"),
        intent: term("defaultIntent"),
    };
}

function toSynonyms(record) {
    return (record.expand?.procedureConceptSynonyms_via_concept ?? []).map(
        (synonym) => ({
            term: synonym.term,
            language: synonym.language,
            isAbbreviation: synonym.isAbbreviation === true,
            active: synonym.active === true,
        }),
    );
}

/**
 * Projects a procedureConcepts record onto the shape of the bundled json, so
 * cached, fetched and bundled concepts are interchangeable everywhere else.
 */
function toConcept(record) {
    return {
        conceptId: record.conceptId,
        fsn: record.fsn,
        preferredTerm: record.preferredTerm,
        subspecialty: record.subspecialty ?? "",
        facets: toFacets(record),
        lateralityApplicable: record.lateralityApplicable === true,
        revisionApplicable: record.revisionApplicable === true,
        levelApplicable: record.levelApplicable === true,
        levelKind: orNull(record.levelKind),
        levelRegions: record.levelRegions ?? [],
        active: record.active === true,
        inactivationReason: orNull(record.inactivationReason),
        replacedBy: orNull(record.replacedBy),
        effectiveFrom: toDay(record.effectiveFrom),
        catalogueRelease: record.catalogueRelease ?? "",
        synonyms: toSynonyms(record),
    };
}

/** The same projection for spinalLevels records. */
function toLevel(record) {
    return {
        spinalLevelId: record.spinalLevelId,
        kind: record.kind,
        code: record.code,
        longName: record.longName ?? "",
        region: record.region ?? "",
        ordinal: record.ordinal,
        active: record.active === true,
        effectiveFrom: toDay(record.effectiveFrom),
    };
}

/**
 * Cheap change detector: the number of records and the newest `updated` in a
 * collection. Additions, edits and deletions all move one of the two.
 */
async function fingerprintCollection(name) {
    const page = await pb.collection(name).getList(1, 1, {
        sort: "-updated",
        fields: "updated",
    });
    return {
        count: page.totalItems,
        updated: page.items[0]?.updated ?? "",
    };
}

/**
 * Fingerprints every collection a concept is assembled from, not just the
 * concepts themselves: a reworded facet term or an added synonym changes what
 * the catalogue reads like without touching any concept row's `updated`.
 */
async function fingerprintCatalogue() {
    const [concepts, levels, facets, synonyms] = await Promise.all([
        fingerprintCollection("procedureConcepts"),
        fingerprintCollection("spinalLevels"),
        fingerprintCollection("procedureFacetValues"),
        fingerprintCollection("procedureConceptSynonyms"),
    ]);
    return { concepts, levels, facets, synonyms };
}

function sameFingerprint(a, b) {
    const parts = ["concepts", "levels", "facets", "synonyms"];
    return parts.every(
        (part) =>
            a?.[part]?.count === b?.[part]?.count &&
            a?.[part]?.updated === b?.[part]?.updated,
    );
}

/**
 * Reads the cache, rejecting anything written by another build, another
 * backend, an older shape, or too long ago. Returns null when there is
 * nothing usable.
 */
function readCache() {
    let entry;
    try {
        const raw = window.localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        entry = JSON.parse(raw);
    } catch {
        // Unreadable or corrupt (private mode, quota, a half-written entry).
        clearCatalogueCache();
        return null;
    }

    const usable =
        entry?.schema === CACHE_SCHEMA &&
        entry.release === CATALOGUE_RELEASE &&
        entry.backend === (backendUrl ?? "") &&
        Array.isArray(entry.concepts) &&
        Array.isArray(entry.levels) &&
        Date.now() - entry.fetchedAt < CACHE_MAX_AGE_MS;

    if (!usable) {
        clearCatalogueCache();
        return null;
    }
    return entry;
}

function writeCache(data, fingerprint) {
    try {
        window.localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
                schema: CACHE_SCHEMA,
                release: CATALOGUE_RELEASE,
                backend: backendUrl ?? "",
                fetchedAt: Date.now(),
                fingerprint,
                concepts: data.concepts,
                levels: data.levels,
            }),
        );
    } catch {
        // Out of quota or storage unavailable. Caching is an optimisation, so
        // drop whatever is there and carry on with the data we already have.
        clearCatalogueCache();
    }
}

export function clearCatalogueCache() {
    try {
        window.localStorage.removeItem(CACHE_KEY);
    } catch {
        // Storage unavailable; nothing to clear.
    }
}

async function fetchFromServer() {
    const [concepts, levels] = await Promise.all([
        pb.collection("procedureConcepts").getFullList({
            sort: "conceptId",
            expand: CONCEPT_EXPAND,
        }),
        pb.collection("spinalLevels").getFullList({ sort: "spinalLevelId" }),
    ]);
    return {
        concepts: concepts.map(toConcept),
        levels: levels.map(toLevel),
    };
}

async function loadCatalogue(force) {
    const cached = force ? null : readCache();

    try {
        const fingerprint = await fingerprintCatalogue();

        // Collections exist but have never been seeded. Serve the bundled copy
        // rather than an empty picker, and cache nothing - the seed migration
        // has yet to run.
        if (fingerprint.concepts.count === 0) {
            return fetchBundledCatalogue();
        }

        if (cached && sameFingerprint(cached.fingerprint, fingerprint)) {
            return { concepts: cached.concepts, levels: cached.levels };
        }

        const fresh = await fetchFromServer();
        writeCache(fresh, fingerprint);
        return fresh;
    } catch (error) {
        if (cached) {
            console.warn("Catalogue refresh failed, using cached copy", error);
            return { concepts: cached.concepts, levels: cached.levels };
        }
        console.warn("Catalogue fetch failed, using bundled copy", error);
        return fetchBundledCatalogue();
    }
}

// Collapses overlapping loads into one, so a remount (or React's development
// double effect) does not fetch the whole catalogue twice.
let inflight = null;

/**
 * Loads the catalogue, preferring the cache but only while the server agrees
 * it is current. Falls back to the cache and then to the bundled copy when the
 * server cannot be reached, so the picker keeps working offline.
 */
export async function fetchCatalogue({ force = false } = {}) {
    if (inflight && !force) return inflight;

    const load = loadCatalogue(force).finally(() => {
        if (inflight === load) inflight = null;
    });
    inflight = load;

    return load;
}
