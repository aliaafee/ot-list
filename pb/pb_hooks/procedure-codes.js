/// <reference path="../pb_data/types.d.ts" />

/**
 * Writing a procedure's coded procedures.
 *
 * Lives in its own module because a hook handler runs in its own scope and
 * cannot see functions defined alongside it in the .pb.js file - shared code
 * has to be require()d from inside the handler.
 */

/** Concept id of the catalogue's "not represented here" sentinel. */
const UNCODED_CONCEPT_ID = "NSX-00000";

/** Everything a procedure needs expanded to render in the list. */
const PROCEDURE_EXPAND = [
    "patient",
    "addedBy",
    "procedureDay",
    "creator",
    "updater",
    "procedureCodes_via_procedure.concept",
    "procedureCodes_via_procedure.spinalLevels",
];

/**
 * Replaces a procedure's coded procedures with the list the client sent.
 *
 * The picker always sends the whole list, so the stored rows are replaced
 * wholesale rather than diffed - `position` shifts whenever an entry is added
 * or removed, so a diff would be mostly rewrites anyway.
 *
 * Concepts and spinal levels arrive as catalogue ids ("NSX-00001", "C5-C6"),
 * which is all the client has, and are resolved to records here. An id the
 * catalogue does not know is an error rather than a silently dropped code.
 *
 * `displayTerm` and `catalogueRelease` are stamped from the concept as it
 * reads today, so an old procedure keeps printing the way it was coded even
 * after a later catalogue release rewords or retires that concept.
 */
function syncProcedureCodes(txApp, procedureRecord, codes) {
    if (!Array.isArray(codes)) {
        throw new BadRequestError("procedure.procedureCodes must be an array");
    }

    const existing = txApp.findRecordsByFilter(
        "procedureCodes",
        "procedure = {:procedure}",
        "",
        0,
        0,
        { procedure: procedureRecord.id },
    );
    existing.forEach((record) => txApp.delete(record));

    const collection = txApp.findCollectionByNameOrId("procedureCodes");

    codes.forEach((code, index) => {
        let concept;
        try {
            concept = txApp.findFirstRecordByData(
                "procedureConcepts",
                "conceptId",
                code.conceptId,
            );
        } catch (err) {
            throw new BadRequestError(
                `Unknown procedure concept: ${code.conceptId}`,
            );
        }

        // A level code is only unique within a kind, so the concept says
        // which kind of level it takes.
        const levelKind = concept.getString("levelKind");
        const levelIds = (code.spinalLevels || []).map((levelCode) => {
            let level;
            try {
                level = txApp.findFirstRecordByFilter(
                    "spinalLevels",
                    "kind = {:kind} && code = {:code}",
                    { kind: levelKind, code: levelCode },
                );
            } catch (err) {
                throw new BadRequestError(
                    `Unknown ${levelKind || "spinal"} level: ${levelCode}`,
                );
            }
            return level.id;
        });

        const isUncoded = code.conceptId === UNCODED_CONCEPT_ID;

        const record = new Record(collection);
        record.set("procedure", procedureRecord.id);
        record.set("concept", concept.id);
        record.set("freeText", code.freeText || "");
        record.set(
            "position",
            typeof code.position === "number" ? code.position : index,
        );
        record.set("laterality", code.laterality || "");
        record.set("revisionStatus", code.revisionStatus || "");
        record.set("priority", code.priority || "");
        record.set("intentOverride", code.intentOverride || "");
        if (code.stagedSequence !== null && code.stagedSequence !== undefined) {
            record.set("stagedSequence", code.stagedSequence);
        }
        record.set("spinalLevels", levelIds);
        record.set("catalogueRelease", concept.getString("catalogueRelease"));
        record.set(
            "displayTerm",
            isUncoded ? code.freeText || "" : concept.getString("preferredTerm"),
        );

        txApp.save(record);
    });
}

module.exports = {
    PROCEDURE_EXPAND,
    UNCODED_CONCEPT_ID,
    syncProcedureCodes,
};
