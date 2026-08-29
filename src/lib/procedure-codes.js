/**
 * The procedure code list, as it travels between the picker and the API.
 *
 * The picker works with a rich value per entry - the full catalogue concept,
 * the text typed for a procedure the catalogue does not cover, and a bag of
 * post-coordination qualifiers. The database stores one `procedureCodes`
 * record per entry, with the concept and the spinal levels as relations.
 * `toProcedureCodesPayload` and `fromProcedureCodeRecords` are the
 * translation, and they are inverses of each other: what the editor loads is
 * what the picker would have produced. `describeProcedureCode` renders a
 * stored entry as a line of text, for the read-only views.
 *
 * Concepts and levels travel as catalogue ids ("NSX-00001", "C5-C6") rather
 * than record ids, because catalogue ids are what the client has - it reads
 * the catalogue from `catalogue-source`, which never sees a record id. The
 * server resolves them.
 */

import {
    LATERALITY_OPTIONS,
    PRIORITY_OPTIONS,
    REVISION_OPTIONS,
} from "@/lib/procedure-catalogue";

/** Concept id of the catalogue's "not represented here" sentinel. */
export const UNCODED_CONCEPT_ID = "NSX-00000";

/**
 * Whether a picker entry holds anything worth saving.
 *
 * FormListField pads an empty list with blank rows and appends `""` when the
 * add control is used, so the list routinely carries entries the user never
 * filled in. Those are not codes and must not reach the server.
 */
export function isFilledCode(entry) {
    if (!entry || typeof entry !== "object") return false;
    return !!entry.concept || !!entry.freeText?.trim();
}

/** The picker's entries, as the API expects them. Blank rows are dropped. */
export function toProcedureCodesPayload(entries) {
    return (entries ?? []).filter(isFilledCode).map((entry, index) => {
        const post = entry.postCoordination ?? {};
        return {
            conceptId: entry.concept?.conceptId ?? UNCODED_CONCEPT_ID,
            freeText: entry.freeText ?? "",
            position: index,
            laterality: post.laterality ?? "",
            revisionStatus: post.revisionStatus ?? "",
            priority: post.priority ?? "",
            intentOverride: post.intentOverride ?? "",
            stagedSequence: post.stagedSequence ?? null,
            spinalLevels: post.spinalLevels ?? [],
        };
    });
}

/**
 * Stored `procedureCodes` records, as the picker expects them.
 *
 * `conceptById` comes from the catalogue context: the stored record names its
 * concept by id, but the picker needs the whole concept to know which
 * qualifiers apply, and the catalogue is already loaded client side.
 */
export function fromProcedureCodeRecords(records, conceptById) {
    return [...(records ?? [])]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((record) => {
            const post = {};
            if (record.laterality) post.laterality = record.laterality;
            if (record.revisionStatus)
                post.revisionStatus = record.revisionStatus;
            if (record.priority) post.priority = record.priority;
            if (record.intentOverride)
                post.intentOverride = record.intentOverride;
            // An unset number field reads back as 0, and staging starts at 1,
            // so 0 means "no staged sequence" rather than a real value.
            if (record.stagedSequence)
                post.stagedSequence = record.stagedSequence;

            const levels = (record.expand?.spinalLevels ?? []).map(
                (level) => level.code,
            );
            if (levels.length) post.spinalLevels = levels;

            const conceptId = record.expand?.concept?.conceptId;

            return {
                concept: conceptById?.(conceptId) ?? null,
                freeText: record.freeText ?? "",
                // Undefined rather than an empty object, matching what the
                // picker emits for a selection carrying no qualifiers.
                postCoordination: Object.keys(post).length ? post : undefined,
            };
        });
}

/** The stored code records hanging off an expanded procedure, if any. */
export function procedureCodeRecordsOf(procedure) {
    return procedure?.expand?.procedureCodes_via_procedure ?? [];
}

/** The wording the picker uses for a qualifier, so both agree. */
function labelOf(options, value) {
    return options.find((option) => option.value === value)?.label ?? value;
}

/**
 * One stored code as a single line, for read-only display.
 *
 * Reads `displayTerm` rather than the concept's current wording: that column
 * was stamped when the procedure was coded, so an old procedure still prints
 * the way it was recorded even after a later catalogue release rewords the
 * concept. It falls back to the free text of an uncoded entry, then to the
 * expanded concept, so a row written before that stamping still reads.
 */
export function describeProcedureCode(record) {
    const term =
        record?.displayTerm ||
        record?.freeText ||
        record?.expand?.concept?.preferredTerm ||
        "";

    const qualifiers = [];
    if (record?.laterality) {
        qualifiers.push(labelOf(LATERALITY_OPTIONS, record.laterality));
    }
    for (const level of record?.expand?.spinalLevels ?? []) {
        qualifiers.push(level.code);
    }
    if (record?.revisionStatus) {
        qualifiers.push(labelOf(REVISION_OPTIONS, record.revisionStatus));
    }
    if (record?.priority) {
        qualifiers.push(labelOf(PRIORITY_OPTIONS, record.priority));
    }
    if (record?.stagedSequence) {
        qualifiers.push(`Stage ${record.stagedSequence}`);
    }

    return qualifiers.length ? `${term} (${qualifiers.join(", ")})` : term;
}

/** Every stored code on a procedure, as display lines. */
export function describeProcedureCodes(procedure) {
    return [...procedureCodeRecordsOf(procedure)]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map(describeProcedureCode);
}
