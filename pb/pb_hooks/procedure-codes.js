/// <reference path="../pb_data/types.d.ts" />

/**
 * Writing the `procedureCodes` child row.
 *
 * A module rather than a function in transactions.pb.js because a route
 * handler runs in its own isolated scope and cannot see anything defined
 * beside it in the file - the same reason reports.js exists. Callers
 * `require` this from inside the handler.
 */

/**
 * Make the stored `procedureCodes` row for a procedure match `body`.
 *
 * The procedure's name lives on this row - as the coded concept, or as
 * `displayTermSnapshot` on the NSX-00000 sentinel row when it was typed
 * as free text. `procedures.procedure` is no longer written, so this is
 * not an optional extra that can be retried later: a procedure whose code
 * row failed to write has no name at all. It runs inside the caller's
 * transaction so the two either both land or neither does.
 *
 * `body` is built by the client (src/lib/procedure-codes.js), which has
 * the catalogue in hand to resolve concept, level and intent ids. A null
 * body means the procedure has no name to store, and any row already
 * there is removed.
 *
 * Only the single primary row is managed. Combined cases needing a second
 * concept are supported by the schema but not yet by the form.
 *
 * @param {Object} txApp - The transaction's app handle.
 * @param {string} procedureId - The parent `procedures` record id.
 * @param {Object|null} body - The `procedureCodes` fields to store.
 * @param {string} authId - The acting user, for creator/updater.
 */
const writeProcedureCode = (txApp, procedureId, body, authId) => {
    const existing = txApp.findRecordsByFilter(
        "procedureCodes",
        "procedure = {:id}",
        "",
        0,
        0,
        { id: procedureId },
    );

    if (!body) {
        for (let i = 0; i < existing.length; i++) txApp.delete(existing[i]);
        return null;
    }

    // Reused rather than deleted and recreated, so a procedure keeps one
    // code row - and its id - as it moves between coded and free text.
    const record =
        existing.length > 0
            ? existing[0]
            : new Record(txApp.findCollectionByNameOrId("procedureCodes"));

    for (const key in body) {
        record.set(key, body[key]);
    }
    record.set("procedure", procedureId);
    if (existing.length === 0) record.set("creator", authId);
    record.set("updater", authId);

    txApp.save(record);

    // Any surplus rows are from a state this endpoint cannot produce, but
    // leaving them would mean a procedure with two primary names.
    for (let i = 1; i < existing.length; i++) txApp.delete(existing[i]);

    return record;
};

module.exports = {
    writeProcedureCode,
};
