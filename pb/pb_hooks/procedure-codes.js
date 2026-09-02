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
        const levels = (code.spinalLevels || []).map((levelCode) => {
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
            return level;
        });
        const levelIds = levels.map((level) => level.id);

        // The rendered level list, frozen at coding time (spec section 6), so
        // an old note keeps its level text if the level vocabulary is later
        // revised. Ordered cranio-caudally by ordinal, canonical spelling.
        const spinalLevelsSnapshot = levels
            .slice()
            .sort((a, b) => a.getInt("ordinal") - b.getInt("ordinal"))
            .map((level) => level.getString("code"))
            .join(", ");

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
        record.set("spinalLevelsSnapshot", spinalLevelsSnapshot);
        record.set("catalogueRelease", concept.getString("catalogueRelease"));
        record.set(
            "displayTerm",
            isUncoded ? code.freeText || "" : concept.getString("preferredTerm"),
        );

        txApp.save(record);
    });
}

/**
 * A procedure's codes as one line, for the generated report.
 *
 * Mirrors describeProcedureCode in src/lib/procedure-codes.js - the report and
 * the screen have to name a procedure the same way. Kept deliberately narrow:
 * the report shows the term with its laterality and levels, which is what the
 * printed list needs to identify the operation.
 */
function describeProcedureCodes(app, procedureRecord) {
    const LATERALITY = {
        left: "Left",
        right: "Right",
        bilateral: "Bilateral",
        "not-applicable": "Not applicable",
    };

    const codes = app.findRecordsByFilter(
        "procedureCodes",
        "procedure = {:procedure}",
        "position",
        0,
        0,
        { procedure: procedureRecord.id },
    );

    const lines = codes.map((code) => {
        const term = code.getString("displayTerm") || code.getString("freeText");

        const qualifiers = [];
        const laterality = code.getString("laterality");
        if (laterality) {
            qualifiers.push(LATERALITY[laterality] || laterality);
        }

        // Prefer the snapshot taken at coding time; fall back to the live
        // relation for rows written before the column existed.
        const levelSnapshot = code.getString("spinalLevelsSnapshot");
        if (levelSnapshot) {
            levelSnapshot.split(", ").forEach((levelCode) => {
                if (levelCode) qualifiers.push(levelCode);
            });
        } else {
            app.expandRecord(code, ["spinalLevels"], null);
            (code.expandedAll("spinalLevels") || []).forEach((level) => {
                qualifiers.push(level.getString("code"));
            });
        }

        return qualifiers.length
            ? `${term} (${qualifiers.join(", ")})`
            : term;
    });

    return lines.join(" + ");
}

module.exports = {
    PROCEDURE_EXPAND,
    UNCODED_CONCEPT_ID,
    describeProcedureCodes,
    syncProcedureCodes,
};
