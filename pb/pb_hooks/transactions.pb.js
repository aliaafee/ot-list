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
