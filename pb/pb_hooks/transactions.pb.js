/// <reference path="../pb_data/types.d.ts" />

console.log("Loading hooks/transactions.js");

// POST /api/add-procedure-with-patient
// Atomically creates a patient (if new) and a procedure
routerAdd(
    "POST",
    "/api/add-procedure-with-patient",
    (e) => {
        const authRecord = e.auth;
        if (!authRecord) {
            throw new UnauthorizedError("Authentication required");
        }

        const role = authRecord.getString("role");

        if (!(role === "doctor" || role === "admin")) {
            throw new ForbiddenError("Not authorized to create procedure");
        }

        const data = e.requestInfo().body;

        if (!data.procedure) {
            throw new BadRequestError("Missing required field: procedure");
        }

        if (!data.procedure.procedureDay) {
            throw new BadRequestError(
                "Missing required field: procedure.procedureDay",
            );
        }

        if (!data.procedure.operatingRoom) {
            throw new BadRequestError(
                "Missing required field: procedure.operatingRoom",
            );
        }

        // Handlers run in their own scope, so shared code is required here
        // rather than defined alongside this file's other routes.
        const { PROCEDURE_EXPAND, syncProcedureCodes } = require(
            `${__hooks}/procedure-codes.js`,
        );
        const { syncProcedureChecklist } = require(
            `${__hooks}/procedure-checklists.js`,
        );

        let createdPatient = null;
        let createdProcedure = null;

        try {
            $app.runInTransaction((txApp) => {
                // Resolve patient
                if (data.patient && data.patient.id) {
                    createdPatient = txApp.findRecordById(
                        "patients",
                        data.patient.id,
                    );
                } else if (data.patient) {
                    const patientCollection =
                        txApp.findCollectionByNameOrId("patients");
                    const patientRecord = new Record(patientCollection);

                    for (const key in data.patient) {
                        patientRecord.set(key, data.patient[key]);
                    }
                    patientRecord.set("creator", authRecord.id);
                    patientRecord.set("updater", authRecord.id);

                    txApp.save(patientRecord);
                    createdPatient = patientRecord;
                    console.log(
                        `[add-procedure-with-patient] Created patient: ${patientRecord.id}`,
                    );
                } else {
                    throw new BadRequestError(
                        "Missing required field: patient",
                    );
                }

                // Create procedure
                const procedureCollection =
                    txApp.findCollectionByNameOrId("procedures");
                const procedureRecord = new Record(procedureCollection);

                // The coded procedures are child records, not a field on the
                // procedure, so they are set aside and written after the save
                // that gives the procedure its id.
                const procedureCodes = data.procedure.procedureCodes;

                for (const key in data.procedure) {
                    if (key === "procedureCodes") continue;
                    procedureRecord.set(key, data.procedure[key]);
                }
                procedureRecord.set("patient", createdPatient.id);
                procedureRecord.set("creator", authRecord.id);
                procedureRecord.set("updater", authRecord.id);

                txApp.save(procedureRecord);
                createdProcedure = procedureRecord;
                console.log(
                    `[add-procedure-with-patient] Created procedure: ${procedureRecord.id}`,
                );

                if (procedureCodes !== undefined) {
                    syncProcedureCodes(txApp, procedureRecord, procedureCodes);
                    console.log(
                        `[add-procedure-with-patient] Wrote ${procedureCodes.length} procedure code(s)`,
                    );
                }

                // Unconditional: a procedure with no codes still gets the
                // templates scoped to everything.
                syncProcedureChecklist(txApp, procedureRecord);
                console.log(
                    `[add-procedure-with-patient] Built checklist for ${procedureRecord.id}`,
                );
            });

            // Fetch expanded procedure for response
            const expandedProcedure = $app.findRecordById(
                "procedures",
                createdProcedure.id,
            );
            $app.expandRecord(expandedProcedure, PROCEDURE_EXPAND, null);

            return e.json(200, {
                success: true,
                patient: createdPatient,
                procedure: expandedProcedure,
            });
        } catch (error) {
            console.error(
                "[add-procedure-with-patient] Transaction error:",
                error,
            );
            throw new BadRequestError(
                `Failed to add procedure with patient: ${error.message}`,
            );
        }
    },
    $apis.requireAuth(),
);

// POST /api/bulk-update-procedures
// Updates multiple procedures in a single transaction
routerAdd(
    "POST",
    "/api/bulk-update-procedures",
    (e) => {
        const authRecord = e.auth;
        if (!authRecord) {
            throw new UnauthorizedError("Authentication required");
        }

        const role = authRecord.getString("role");

        if (!(role === "doctor" || role === "admin")) {
            throw new ForbiddenError("Not authorized to update procedure");
        }

        const data = e.requestInfo().body;

        if (!data.procedures || !Array.isArray(data.procedures)) {
            throw new BadRequestError(
                "Missing required field: procedures (array)",
            );
        }

        if (data.procedures.length === 0) {
            throw new BadRequestError("procedures array cannot be empty");
        }

        // Handlers run in their own scope, so shared code is required here
        // rather than defined alongside this file's other routes.
        const { PROCEDURE_EXPAND, syncProcedureCodes } = require(
            `${__hooks}/procedure-codes.js`,
        );
        const { syncProcedureChecklist } = require(
            `${__hooks}/procedure-checklists.js`,
        );

        const updated = [];

        try {
            $app.runInTransaction((txApp) => {
                data.procedures.forEach((procedureUpdate) => {
                    if (!procedureUpdate.id) {
                        throw new BadRequestError(
                            "Each procedure must have an id",
                        );
                    }

                    const { id, ...changes } = procedureUpdate;
                    const record = txApp.findRecordById("procedures", id);

                    for (const key in changes) {
                        if (key === "procedureCodes") continue;
                        record.set(key, changes[key]);
                    }
                    record.set("updater", authRecord.id);

                    txApp.save(record);

                    // Only when the client actually sent a list. Reordering,
                    // moving and removing all go through this endpoint with
                    // just the fields they touch, and must leave the codes
                    // alone rather than clearing them.
                    if (changes.procedureCodes !== undefined) {
                        syncProcedureCodes(
                            txApp,
                            record,
                            changes.procedureCodes,
                        );
                        // Same guard: the checklist only needs rebuilding
                        // when the codes it was assembled from have changed.
                        // Reconciles rather than replaces, so ticks survive.
                        syncProcedureChecklist(txApp, record);
                    }

                    updated.push(record.id);
                    console.log(
                        `[bulk-update-procedures] Updated procedure: ${record.id}`,
                    );
                });
            });

            // Read the saved rows back expanded, so the client replaces its
            // optimistic copy with what was actually stored. The codes are
            // child records, so an optimistic merge cannot know them.
            const records = updated.map((id) => {
                const record = $app.findRecordById("procedures", id);
                $app.expandRecord(record, PROCEDURE_EXPAND, null);
                return record;
            });

            return e.json(200, {
                success: true,
                updatedCount: records.length,
                updated: records,
            });
        } catch (error) {
            console.error("[bulk-update-procedures] Transaction error:", error);
            throw new BadRequestError(
                `Failed to bulk update procedures: ${error.message}`,
            );
        }
    },
    $apis.requireAuth(),
);

// POST /api/add-pac-status
// Atomically creates a PAC status record and updates the procedure's pacStatus field
routerAdd(
    "POST",
    "/api/add-pac-status",
    (e) => {
        const authRecord = e.auth;
        if (!authRecord) {
            throw new UnauthorizedError("Authentication required");
        }

        const data = e.requestInfo().body;

        if (!data.procedureId) {
            throw new BadRequestError("Missing required field: procedureId");
        }

        if (!data.pacStatus) {
            throw new BadRequestError("Missing required field: pacStatus");
        }

        const validStatuses = ["referred", "inReview", "cleared", "unfit"];
        if (!validStatuses.includes(data.pacStatus)) {
            throw new BadRequestError(
                `Invalid pacStatus. Must be one of: ${validStatuses.join(", ")}`,
            );
        }

        let createdStatus = null;
        let updatedProcedure = null;

        try {
            $app.runInTransaction((txApp) => {
                const statusCollection = txApp.findCollectionByNameOrId(
                    "procedurePacStatuses",
                );
                const statusRecord = new Record(statusCollection);

                statusRecord.set("procedure", data.procedureId);
                statusRecord.set("pacStatus", data.pacStatus);
                statusRecord.set("creator", authRecord.id);

                txApp.save(statusRecord);
                createdStatus = statusRecord;
                console.log(
                    `[add-pac-status] Created PAC status: ${statusRecord.id}`,
                );

                const procedure = txApp.findRecordById(
                    "procedures",
                    data.procedureId,
                );
                procedure.set("pacStatus", data.pacStatus);
                procedure.set("updater", authRecord.id);
                txApp.save(procedure);
                updatedProcedure = procedure;
                console.log(
                    `[add-pac-status] Updated procedure pacStatus: ${data.procedureId}`,
                );
            });

            return e.json(200, {
                success: true,
                pacStatus: createdStatus,
                procedure: updatedProcedure,
            });
        } catch (error) {
            console.error("[add-pac-status] Transaction error:", error);
            throw new BadRequestError(
                `Failed to add PAC status: ${error.message}`,
            );
        }
    },
    $apis.requireAuth(),
);

// POST /api/ot-days/bulk-create
// Create multiple OT days at once, skipping existing ones
routerAdd(
    "POST",
    "/api/ot-days/bulk-create",
    (e) => {
        const authRecord = e.auth;
        if (!authRecord) {
            throw new UnauthorizedError("Authentication required");
        }

        const role = authRecord.get("role");
        if (role !== "doctor" && role !== "admin") {
            throw new ForbiddenError(
                "Only doctors and admins can create OT days",
            );
        }

        const data = e.requestInfo().body;

        if (!data.otListId || !data.dates || !Array.isArray(data.dates)) {
            throw new BadRequestError(
                "Missing required fields: otListId, dates (array)",
            );
        }

        if (data.dates.length === 0) {
            throw new BadRequestError("dates array cannot be empty");
        }

        const created = [];
        const skipped = [];
        const errors = [];

        try {
            $app.runInTransaction((txApp) => {
                data.dates.forEach((dateStr) => {
                    try {
                        const existing = txApp.findRecordsByFilter(
                            "otDays",
                            `strftime('%Y-%m-%d', date) = {:dateStr} && otList = {:otListId}`,
                            "",
                            1,
                            0,
                            {
                                dateStr: dateStr,
                                otListId: data.otListId,
                            },
                        );

                        if (existing.length > 0) {
                            skipped.push({
                                date: dateStr,
                                reason: "Already exists",
                                existingId: existing[0].id,
                            });
                            return;
                        }

                        const collection =
                            txApp.findCollectionByNameOrId("otDays");
                        const record = new Record(collection);

                        record.set("date", dateStr);
                        record.set("otList", data.otListId);
                        record.set("disabled", data.disabled || false);
                        record.set("remarks", data.remarks || "");
                        record.set("creator", authRecord.id);
                        record.set("updater", authRecord.id);

                        txApp.save(record);

                        created.push({
                            id: record.id,
                            date: dateStr,
                        });

                        console.log(
                            `[bulk-create-ot-days] Created: ${record.id} for date: ${dateStr}`,
                        );
                    } catch (error) {
                        errors.push({
                            date: dateStr,
                            error: error.message,
                        });
                        console.error(
                            `[bulk-create-ot-days] Error for date ${dateStr}:`,
                            error,
                        );
                    }
                });
            });

            return e.json(200, {
                success: true,
                createdCount: created.length,
                skippedCount: skipped.length,
                errorCount: errors.length,
                created: created,
                skipped: skipped,
                errors: errors,
            });
        } catch (error) {
            console.error("[bulk-create-ot-days] Transaction error:", error);
            throw new BadRequestError(
                `Failed to bulk create OT days: ${error.message}`,
            );
        }
    },
    $apis.requireAuth(),
);

// POST /api/set-checklist-item
// Ticks, unticks or comments on one checklist item. A route rather than a
// collection update rule so each attribution triple is written as a unit:
// a checked row without a checkedBy is a bug, not a state.
routerAdd(
    "POST",
    "/api/set-checklist-item",
    (e) => {
        const authRecord = e.auth;
        if (!authRecord) {
            throw new UnauthorizedError("Authentication required");
        }

        const role = authRecord.getString("role");
        if (!(role === "doctor" || role === "admin")) {
            throw new ForbiddenError("Not authorized to update checklist");
        }

        const data = e.requestInfo().body;

        if (!data.itemId) {
            throw new BadRequestError("Missing required field: itemId");
        }

        const hasChecked = data.checked !== undefined;
        const hasComment = data.comment !== undefined;
        if (!hasChecked && !hasComment) {
            throw new BadRequestError(
                "Nothing to set: send checked, comment, or both",
            );
        }

        let updatedItem = null;

        try {
            $app.runInTransaction((txApp) => {
                const item = txApp.findRecordById(
                    "procedureChecklistItems",
                    data.itemId,
                );

                // The two triples are independent: ticking never touches the
                // comment's attribution and commenting never touches the
                // tick's.
                if (hasChecked) {
                    if (data.checked) {
                        item.set("checked", true);
                        item.set("checkedBy", authRecord.id);
                        item.set("checkedAt", new DateTime());
                    } else {
                        item.set("checked", false);
                        item.set("checkedBy", "");
                        item.set("checkedAt", "");
                    }
                }

                if (hasComment) {
                    const comment = (data.comment || "").trim();
                    if (comment) {
                        item.set("comment", comment);
                        item.set("commentBy", authRecord.id);
                        item.set("commentAt", new DateTime());
                    } else {
                        item.set("comment", "");
                        item.set("commentBy", "");
                        item.set("commentAt", "");
                    }
                }

                txApp.save(item);
                updatedItem = item;

                // The collapsed list rows read this off the procedure rather
                // than loading the items, so it has to move with the tick.
                const { syncOutstandingCount } = require(
                    `${__hooks}/procedure-checklists.js`,
                );
                syncOutstandingCount(txApp, item.getString("procedure"));
            });

            return e.json(200, { success: true, item: updatedItem });
        } catch (error) {
            console.error("[set-checklist-item] Transaction error:", error);
            throw new BadRequestError(
                `Failed to update checklist item: ${error.message}`,
            );
        }
    },
    $apis.requireAuth(),
);

// POST /api/preview-checklist
// What a checklist would come out as for a given set of concepts, for the
// template authoring page. Read-only, and runs the same assembly the write
// paths run - a second implementation on the client would drift silently and
// keep looking authoritative.
routerAdd(
    "POST",
    "/api/preview-checklist",
    (e) => {
        const authRecord = e.auth;
        if (!authRecord) {
            throw new UnauthorizedError("Authentication required");
        }

        if (authRecord.getString("role") !== "admin") {
            throw new ForbiddenError("Not authorized to preview checklists");
        }

        const data = e.requestInfo().body;
        const conceptIds = data.conceptIds || [];

        if (!Array.isArray(conceptIds)) {
            throw new BadRequestError("conceptIds must be an array");
        }

        const { previewChecklist } = require(
            `${__hooks}/procedure-checklists.js`,
        );

        // No transaction: this reads and returns, and takes catalogue ids
        // rather than a procedure id so there is nothing in scope to mutate.
        const result = previewChecklist($app, conceptIds);

        return e.json(200, { success: true, ...result });
    },
    $apis.requireAuth(),
);

// POST /api/add-checklist-item
// Adds a one-off item to a single procedure's checklist. Marked `custom`, so
// reconciliation leaves it alone: it came from no template, and its absence
// from the assembled list must not read as "no longer applies".
routerAdd(
    "POST",
    "/api/add-checklist-item",
    (e) => {
        const authRecord = e.auth;
        if (!authRecord) {
            throw new UnauthorizedError("Authentication required");
        }

        const role = authRecord.getString("role");
        if (!(role === "doctor" || role === "admin")) {
            throw new ForbiddenError("Not authorized to update checklist");
        }

        const data = e.requestInfo().body;

        if (!data.procedureId) {
            throw new BadRequestError("Missing required field: procedureId");
        }

        const label = (data.label || "").trim();
        if (!label) {
            throw new BadRequestError("Missing required field: label");
        }

        const group = data.group || "preop";
        const { GROUPS, customItemKey, syncOutstandingCount } = require(
            `${__hooks}/procedure-checklists.js`,
        );
        if (GROUPS.indexOf(group) === -1) {
            throw new BadRequestError(
                `Invalid group. Must be one of: ${GROUPS.join(", ")}`,
            );
        }

        let created = null;

        try {
            $app.runInTransaction((txApp) => {
                // Fails if the procedure does not exist, rather than orphaning
                // the item.
                const procedure = txApp.findRecordById(
                    "procedures",
                    data.procedureId,
                );

                const siblings = txApp.findRecordsByFilter(
                    "procedureChecklistItems",
                    "procedure = {:procedure}",
                    "-position",
                    1,
                    0,
                    { procedure: procedure.id },
                );
                const lastPosition = siblings.length
                    ? siblings[0].getInt("position")
                    : -1;

                const collection = txApp.findCollectionByNameOrId(
                    "procedureChecklistItems",
                );
                const record = new Record(collection);
                record.set("procedure", procedure.id);
                record.set(
                    "itemKey",
                    customItemKey(txApp, procedure.id, label),
                );
                record.set("label", label);
                record.set("hint", (data.hint || "").trim());
                record.set("required", data.required !== false);
                record.set("group", group);
                // Provisional: it lands at the end until the next sync, which
                // moves it to the end of its own group.
                record.set("position", lastPosition + 1);
                record.set("checked", false);
                record.set("applicable", true);
                record.set("custom", true);
                txApp.save(record);
                created = record;

                syncOutstandingCount(txApp, procedure.id);
            });

            return e.json(200, { success: true, item: created });
        } catch (error) {
            console.error("[add-checklist-item] Transaction error:", error);
            throw new BadRequestError(
                `Failed to add checklist item: ${error.message}`,
            );
        }
    },
    $apis.requireAuth(),
);

// POST /api/remove-checklist-item
// Deletes a custom item. Template-derived items are not deletable here: they
// are governed by their template, and removing one on a single procedure would
// come straight back on the next sync.
routerAdd(
    "POST",
    "/api/remove-checklist-item",
    (e) => {
        const authRecord = e.auth;
        if (!authRecord) {
            throw new UnauthorizedError("Authentication required");
        }

        const role = authRecord.getString("role");
        if (!(role === "doctor" || role === "admin")) {
            throw new ForbiddenError("Not authorized to update checklist");
        }

        const data = e.requestInfo().body;

        if (!data.itemId) {
            throw new BadRequestError("Missing required field: itemId");
        }

        try {
            $app.runInTransaction((txApp) => {
                const item = txApp.findRecordById(
                    "procedureChecklistItems",
                    data.itemId,
                );

                if (!item.getBool("custom")) {
                    throw new BadRequestError(
                        "Only custom items can be removed; edit the template instead",
                    );
                }

                const procedureId = item.getString("procedure");
                txApp.delete(item);

                const { syncOutstandingCount } = require(
                    `${__hooks}/procedure-checklists.js`,
                );
                syncOutstandingCount(txApp, procedureId);
            });

            return e.json(200, { success: true });
        } catch (error) {
            console.error("[remove-checklist-item] Transaction error:", error);
            throw new BadRequestError(
                `Failed to remove checklist item: ${error.message}`,
            );
        }
    },
    $apis.requireAuth(),
);
