import { pb } from "@/lib/pb";
import { isCoded, renderLevels, UNCODED_CONCEPT_ID } from "@/lib/nspc";

/**
 * Reading the `procedureCodes` child collection, and building the rows
 * written to it.
 *
 * Every procedure has one: a coded concept, or the `NSX-00000` sentinel
 * carrying the text the surgeon typed, flagged `needsReview`. "Uncoded"
 * is a value in the data rather than a missing row, so the custodian's
 * backlog can be queried and counted instead of inferred from what isn't
 * there.
 *
 * This row is where a procedure's name lives - `procedures.procedure` is
 * no longer written, and holds only the names of records that predate the
 * coding system. That is why nothing here writes: coding was once
 * additive, saved after the procedure and allowed to fail on its own, but
 * a failure now means a procedure with no name. The bodies built here are
 * carried into the same transaction as the procedure by the save
 * endpoints in pb_hooks/transactions.pb.js.
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
 * @param {Object} record - The `procedureCodes` record, expanded. May be
 *   null/undefined - a procedure whose code row hasn't loaded yet, or has
 *   none - in which case this returns null.
 * @param {function} findConcept - Looks a concept up by its NSPC id.
 */
export function toSelectorValue(record, findConcept) {
    const conceptId = record?.expand?.concept?.conceptId;
    if (!conceptId) return null;

    // A sentinel row carries no catalogue selection to restore - only
    // text, which the form has already read off the same row via
    // `procedureName`. Handing it back here would give one string two
    // owners that can disagree.
    if (conceptId === UNCODED_CONCEPT_ID) return null;

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

/** conceptId -> { id, catalogueRelease }. */
async function conceptIdMap() {
    if (!idCache.concepts) {
        const records = await pb
            .collection("procedureConcepts")
            .getFullList({ fields: "id,conceptId,catalogueRelease" });
        idCache.concepts = new Map(
            records.map((r) => [
                r.conceptId,
                { id: r.id, catalogueRelease: r.catalogueRelease },
            ]),
        );
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

/**
 * Build the record body for free text: the sentinel concept, the typed
 * text kept verbatim, and the review flag that puts it in the custodian's
 * queue. No post-coordination - laterality or a spinal level on a
 * procedure nobody has identified would be a qualifier with nothing to
 * qualify.
 */
async function toUncodedRecordBody(text) {
    const concepts = await conceptIdMap();
    const sentinel = concepts.get(UNCODED_CONCEPT_ID);
    if (!sentinel) {
        throw new Error(
            `Uncoded sentinel ${UNCODED_CONCEPT_ID} missing from the catalogue`,
        );
    }

    return {
        concept: sentinel.id,
        isPrimary: true,
        laterality: "",
        priority: "",
        revisionStatus: "primary",
        stagedSequence: null,
        intentOverride: "",
        spinalLevels: [],
        // The one copy this row keeps. It has to be the snapshot rather
        // than `note`, because the snapshot is what anything rendering a
        // code prints - and it must not print "Uncoded procedure" where
        // the surgeon wrote a procedure name. The custodian reads the
        // same field when working the queue.
        displayTermSnapshot: text,
        spinalLevelsSnapshot: "",
        catalogueRelease: sentinel.catalogueRelease,
        needsReview: true,
    };
}

/** Build the record body for a coded value. */
async function toRecordBody(value) {
    const [concepts, levels, intents] = await Promise.all([
        conceptIdMap(),
        levelIdMap(),
        intentIdMap(),
    ]);

    const concept = concepts.get(value.conceptId);
    if (!concept) {
        throw new Error(`Unknown procedure concept: ${value.conceptId}`);
    }

    // Drop any level the vocabulary doesn't recognise rather than failing
    // the save - the relation would reject it anyway, and losing a level
    // is better than losing the whole code.
    const levelIds = (value.spinalLevels ?? [])
        .map((code) => levels.get(`${value.levelKind}:${code}`))
        .filter(Boolean);

    return {
        concept: concept.id,
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
 * Turn the selector's value into the `procedureCodes` body to store for
 * it, resolving catalogue identifiers to record ids on the way.
 *
 * This builds the row but does not write it. The name of a procedure now
 * lives on this row and nowhere else, so it cannot be written after the
 * procedure in a second request that might fail on its own - the save
 * endpoints carry the body into the same transaction as the procedure.
 * The `procedure` relation is left for the server to set, since on an add
 * the parent does not exist yet.
 *
 * Returns null when there is nothing to store, which the endpoints treat
 * as "remove any row that is there".
 *
 * @param {Object|string|null} value - The selector's current value:
 *   a coded object, the free text typed instead, or null.
 */
export async function buildProcedureCodeBody(value) {
    if (isCoded(value)) return await toRecordBody(value);

    const text = typeof value === "string" ? value.trim() : "";
    if (text === "") return null;

    return await toUncodedRecordBody(text);
}

/**
 * The primary stored code for a procedure, in selector shape. Null both
 * when nothing is stored and when what is stored is the uncoded sentinel;
 * either way the form has no catalogue selection to restore.
 */
export async function loadProcedureCode(procedureId, findConcept) {
    const records = await pb.collection("procedureCodes").getFullList({
        filter: pb.filter("procedure = {:id}", { id: procedureId }),
        expand: EXPAND,
    });
    if (records.length === 0) return null;
    return toSelectorValue(records[0], findConcept);
}
