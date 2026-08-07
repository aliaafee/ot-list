import { pb } from "@/lib/pb";
import { isCoded, renderLevels } from "@/lib/nspc";

/**
 * Reading and writing the `procedureCodes` child collection.
 *
 * Coding is additive and optional: a procedure with no code is a normal,
 * valid record, and `procedures.procedure` remains the free-text field it
 * always was. That is why these writes run after the procedure itself has
 * saved rather than inside its transaction - a failed code write leaves an
 * uncoded procedure, which is a state the system already handles, instead
 * of failing the whole save.
 */

const EXPAND = "concept,spinalLevels,intentOverride";

/**
 * Turns a stored `procedureCodes` record back into the shape the selector
 * edits.
 *
 * The concept's descriptive half - facets, applicability flags - comes
 * from the catalogue the client already holds rather than from six nested
 * expands per row. Only what the record itself owns is read off it: the
 * qualifiers, and the snapshots, which record what was true at coding
 * time and must never be refreshed from the current catalogue.
 *
 * @param {Object} record - The `procedureCodes` record, expanded.
 * @param {function} findConcept - Looks a concept up by its NSPC id.
 */
export function toSelectorValue(record, findConcept) {
    const conceptId = record.expand?.concept?.conceptId;
    if (!conceptId) return null;

    // The catalogue can legitimately not have it - a concept retired in a
    // later release, or a code written by a newer client. The snapshot is
    // there for exactly this, so fall back to it rather than dropping the
    // code from the form.
    const concept = findConcept(conceptId);

    // Levels are a relation, but the selector works in level codes - and
    // PocketBase preserves the stored order, which is the cranio-caudal
    // sequence written at save time.
    const levels = (record.expand?.spinalLevels ?? []).map((l) => l.code);

    return {
        procedureCodeId: record.id,
        conceptId,
        fsn: concept?.fsn ?? record.displayTermSnapshot,
        preferredTerm: concept?.preferredTerm ?? record.displayTermSnapshot,
        displayTermSnapshot: record.displayTermSnapshot,
        subspecialty: concept?.subspecialty ?? "",
        facets: concept?.facets ?? {},
        lateralityApplicable: concept?.lateralityApplicable ?? false,
        revisionApplicable: concept?.revisionApplicable ?? false,
        levelApplicable: concept?.levelApplicable ?? false,
        levelKind: concept?.levelKind ?? null,
        levelRegions: concept?.levelRegions ?? [],
        catalogueRelease: record.catalogueRelease,
        laterality: record.laterality ?? "",
        priority: record.priority ?? "",
        revisionStatus: record.revisionStatus ?? "primary",
        stagedSequence: record.stagedSequence ?? "",
        intentOverride: record.expand?.intentOverride?.term ?? "",
        spinalLevels: levels,
    };
}

/**
 * Resolve catalogue business identifiers to PocketBase record ids.
 * Cached for the session: the catalogue is reference data, and these
 * mappings only change when a release is applied.
 */
const idCache = { concepts: null, levels: null, intents: null };

async function conceptIdMap() {
    if (!idCache.concepts) {
        const records = await pb
            .collection("procedureConcepts")
            .getFullList({ fields: "id,conceptId" });
        idCache.concepts = new Map(records.map((r) => [r.conceptId, r.id]));
    }
    return idCache.concepts;
}

/** Levels are keyed by "kind:code" - "L4" is a vertebra, never an interspace. */
async function levelIdMap() {
    if (!idCache.levels) {
        const records = await pb
            .collection("spinalLevels")
            .getFullList({ fields: "id,kind,code" });
        idCache.levels = new Map(
            records.map((r) => [`${r.kind}:${r.code}`, r.id]),
        );
    }
    return idCache.levels;
}

async function intentIdMap() {
    if (!idCache.intents) {
        const records = await pb
            .collection("procedureFacetValues")
            .getFullList({ filter: 'facet = "intent"', fields: "id,term" });
        idCache.intents = new Map(records.map((r) => [r.term, r.id]));
    }
    return idCache.intents;
}

/** Build the record body for a coded value. */
async function toRecordBody(procedureId, value) {
    const [concepts, levels, intents] = await Promise.all([
        conceptIdMap(),
        levelIdMap(),
        intentIdMap(),
    ]);

    const conceptRecordId = concepts.get(value.conceptId);
    if (!conceptRecordId) {
        throw new Error(`Unknown procedure concept: ${value.conceptId}`);
    }

    // Drop any level the vocabulary doesn't recognise rather than failing
    // the save - the relation would reject it anyway, and losing a level
    // is better than losing the whole code.
    const levelIds = (value.spinalLevels ?? [])
        .map((code) => levels.get(`${value.levelKind}:${code}`))
        .filter(Boolean);

    return {
        procedure: procedureId,
        concept: conceptRecordId,
        isPrimary: true,
        laterality: value.laterality || "",
        priority: value.priority || "",
        revisionStatus: value.revisionStatus || "primary",
        // An empty numeric field must be null, not "" - PocketBase rejects
        // the empty string for a number.
        stagedSequence:
            value.stagedSequence === "" || value.stagedSequence == null
                ? null
                : Number(value.stagedSequence),
        intentOverride: value.intentOverride
            ? (intents.get(value.intentOverride) ?? "")
            : "",
        spinalLevels: levelIds,
        // Snapshots, per NSPC spec section 6: what the operative note
        // prints, frozen at coding time.
        displayTermSnapshot: value.displayTermSnapshot || value.preferredTerm,
        spinalLevelsSnapshot: renderLevels(value.spinalLevels),
        catalogueRelease: value.catalogueRelease,
        needsReview: false,
    };
}

/**
 * Make the stored code for a procedure match `value`.
 *
 * Creates, updates or clears as needed, so callers can hand over whatever
 * the form currently holds without tracking what was there before. Only
 * the single primary code is managed here; combined cases needing a
 * second concept are supported by the schema but not yet by this form.
 *
 * @param {string} procedureId - The parent `procedures` record id.
 * @param {Object|string|null} value - The selector's current value.
 * @param {Object|null} existing - The `procedureCodes` record already
 *   stored for this procedure, if any.
 */
export async function saveProcedureCode(procedureId, value, existing = null) {
    const existingId = existing?.id ?? value?.procedureCodeId ?? null;

    // Free text or cleared: any code that was there no longer applies.
    if (!isCoded(value)) {
        if (existingId) await pb.collection("procedureCodes").delete(existingId);
        return null;
    }

    const body = await toRecordBody(procedureId, value);

    if (existingId) {
        return await pb
            .collection("procedureCodes")
            .update(existingId, body, { expand: EXPAND });
    }

    return await pb
        .collection("procedureCodes")
        .create(body, { expand: EXPAND });
}

/** The primary stored code for a procedure, in selector shape. */
export async function loadProcedureCode(procedureId, findConcept) {
    const records = await pb.collection("procedureCodes").getFullList({
        filter: pb.filter("procedure = {:id}", { id: procedureId }),
        expand: EXPAND,
    });
    if (records.length === 0) return null;
    return toSelectorValue(records[0], findConcept);
}
