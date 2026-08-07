import { pb } from "@/lib/pb";

import bundledCatalogue from "@/data/nspc-catalogue.json";
import bundledLevels from "@/data/spinal-levels.json";

/**
 * NSPC catalogue access.
 *
 * PocketBase holds the catalogue, so it can be revised without
 * redeploying the app. But type-ahead has to work on the very first
 * keystroke, and a picker that shows nothing because a fetch is in
 * flight - or failed - is worse than a slightly stale one. So:
 *
 *   1. start from the snapshot bundled at build time,
 *   2. use a cached copy from a previous session if there is one,
 *   3. fetch in the background and swap in whatever comes back.
 *
 * Every layer produces the same shape, the one `nspc-catalogue.json`
 * documents, so nothing downstream has to know which it got.
 */

const CACHE_KEY = "nspc-catalogue-v1";

/** Facet relations are expanded, then flattened to their display terms. */
const FACET_EXPANDS = [
    "method",
    "procedureSite",
    "surgicalApproach",
    "device",
    "morphology",
    "defaultIntent",
];

const EXPAND = [
    ...FACET_EXPANDS,
    "replacedBy",
    "procedureConceptSynonyms_via_concept",
].join(",");

/** Map one PocketBase concept record onto the bundled-snapshot shape. */
function toConcept(record) {
    const term = (field) => record.expand?.[field]?.term ?? null;

    return {
        conceptId: record.conceptId,
        fsn: record.fsn,
        preferredTerm: record.preferredTerm,
        subspecialty: record.subspecialty,
        facets: {
            method: term("method"),
            procedureSite: term("procedureSite"),
            surgicalApproach: term("surgicalApproach"),
            device: term("device"),
            morphology: term("morphology"),
            intent: term("defaultIntent"),
        },
        lateralityApplicable: record.lateralityApplicable,
        revisionApplicable: record.revisionApplicable,
        levelApplicable: record.levelApplicable,
        levelKind: record.levelKind || null,
        levelRegions: record.levelRegions ?? [],
        active: record.active,
        inactivationReason: record.inactivationReason || null,
        // The relation stores PocketBase's own record id; downstream code
        // resolves replacement chains by conceptId, so expand it back.
        replacedBy: record.expand?.replacedBy?.conceptId ?? null,
        effectiveFrom: record.effectiveFrom,
        catalogueRelease: record.catalogueRelease,
        synonyms: (
            record.expand?.procedureConceptSynonyms_via_concept ?? []
        ).map((s) => ({
            term: s.term,
            language: s.language,
            isAbbreviation: s.isAbbreviation,
            active: s.active,
        })),
    };
}

function toLevel(record) {
    return {
        spinalLevelId: record.spinalLevelId,
        kind: record.kind,
        code: record.code,
        longName: record.longName,
        region: record.region,
        ordinal: record.ordinal,
        active: record.active,
        effectiveFrom: record.effectiveFrom,
    };
}

/** The build-time snapshot. Always available, never fails. */
export function bundledSnapshot() {
    return { concepts: bundledCatalogue, levels: bundledLevels };
}

/**
 * Last successful fetch, if any. Returns null rather than throwing when
 * storage is unavailable or holds something unparseable - a bad cache
 * should degrade to the bundled snapshot, not break the picker.
 */
export function readCache() {
    try {
        const raw = window.localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.concepts?.length || !parsed?.levels?.length) return null;
        return parsed;
    } catch {
        return null;
    }
}

function writeCache(payload) {
    try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
        // Quota or private mode - the fetch still succeeded for this
        // session, it just won't be there for the next one.
    }
}

/**
 * Fetch the catalogue from PocketBase. Requires an authenticated
 * session; the collections are readable by any signed-in user.
 */
export async function fetchCatalogue() {
    const [conceptRecords, levelRecords] = await Promise.all([
        pb.collection("procedureConcepts").getFullList({
            expand: EXPAND,
            sort: "conceptId",
        }),
        pb.collection("spinalLevels").getFullList({ sort: "kind,ordinal" }),
    ]);

    const payload = {
        concepts: conceptRecords.map(toConcept),
        levels: levelRecords.map(toLevel),
    };

    writeCache(payload);
    return payload;
}
