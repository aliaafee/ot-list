/// <reference path="../pb_data/types.d.ts" />

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
            throw new UnauthorizedError("Not authorized to create procedure");
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
            throw new UnauthorizedError("Not authorized to update procedure");
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
