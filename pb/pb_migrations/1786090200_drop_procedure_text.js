/// <reference path="../pb_data/types.d.ts" />

// Drop `procedures.procedure`.
//
// The name of a procedure has lived on its `procedureCodes` row since
// 1786090100 backfilled one for every record that predated coding, and
// nothing has read this column since. This removes it.
//
// THIS DESTROYS DATA AND THE DOWN MIGRATION CANNOT BRING IT BACK. The
// revert re-creates the column, empty and optional; the text itself is
// gone. Reverting is a way to restore the schema, not the content.
//
// It is safe only because every procedure's name is now stored elsewhere.
// The guard below re-checks that at migration time rather than trusting
// it: on any database where a procedure still has no code row, this stops
// instead of erasing the only copy of what was done. If it fires, apply
// 1786090100 first.
//
// ONE-WAY DOOR, worth understanding before applying: after this, running
// `migrate down` past 1786090100 destroys every procedure name in the
// database. That migration's revert deletes the backfilled code rows, and
// until now the column was there to fall back on. It will not be.

const PROCEDURES_ID = "pbc_1747635922";
const PROCEDURE_FIELD_ID = "text2621226015";

migrate(
    (app) => {
        // Every procedure that still holds text and has no code row -
        // that set must be empty, or this migration erases the only
        // record of those procedures.
        const orphans = app.findRecordsByFilter(
            "procedures",
            'procedure != "" && procedureCodes_via_procedure.id = null',
            "",
            0,
            0,
            {},
        );

        if (orphans.length > 0) {
            throw new Error(
                `Refusing to drop procedures.procedure: ${orphans.length} ` +
                    `procedure(s) still have text and no procedureCodes row ` +
                    `(e.g. ${orphans[0].id}). Apply the backfill migration ` +
                    `1786090100 first - dropping now would lose their names.`,
            );
        }

        const collection = app.findCollectionByNameOrId(PROCEDURES_ID);
        collection.fields.removeById(PROCEDURE_FIELD_ID);

        return app.save(collection);
    },
    (app) => {
        // Schema only. Re-created as optional because it has to be: every
        // existing row would fail a required check, there being nothing
        // left to put in it.
        const collection = app.findCollectionByNameOrId(PROCEDURES_ID);

        collection.fields.add(
            new Field({
                autogeneratePattern: "",
                hidden: false,
                id: PROCEDURE_FIELD_ID,
                max: 0,
                min: 0,
                name: "procedure",
                pattern: "",
                presentable: false,
                primaryKey: false,
                required: false,
                system: false,
                type: "text",
            }),
        );

        return app.save(collection);
    },
);
