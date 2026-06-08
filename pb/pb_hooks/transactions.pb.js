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

                for (const key in data.procedure) {
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
            });

            // Fetch expanded procedure for response
            const expandedProcedure = $app.findRecordById(
                "procedures",
                createdProcedure.id,
            );
            $app.expandRecord(
                expandedProcedure,
                ["patient", "addedBy", "procedureDay", "creator", "updater"],
                null,
            );

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
                        record.set(key, changes[key]);
                    }
                    record.set("updater", authRecord.id);

                    txApp.save(record);
                    updated.push({ id: record.id });
                    console.log(
                        `[bulk-update-procedures] Updated procedure: ${record.id}`,
                    );
                });
            });

            return e.json(200, {
                success: true,
                updatedCount: updated.length,
                updated: updated,
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
                            `date = '${dateStr}' && otList = '${data.otListId}'`,
                            "",
                            1,
                            0,
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
