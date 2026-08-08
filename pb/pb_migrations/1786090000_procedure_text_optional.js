/// <reference path="../pb_data/types.d.ts" />

// `procedures.procedure` becomes optional.
//
// The procedure name now lives on the `procedureCodes` row - as the
// concept for a coded procedure, or as `displayTermSnapshot` on the
// NSX-00000 sentinel row for one typed as free text. Nothing writes this
// column any more.
//
// It is kept, and kept populated, for every procedure recorded before the
// coding system existed: those rows had no code and this text was the
// only record of what was done.
//
// (Superseded by 1786090100, which gave those records code rows of their
// own. Nothing reads this column any more - it is retained as the
// original of what that migration copied, not as a live fallback.)
//
// Dropping the column outright would destroy that history, which is why
// this only relaxes the constraint.

const PROCEDURES_ID = "pbc_1747635922";
const PROCEDURE_FIELD_ID = "text2621226015";

migrate(
    (app) => {
        const collection = app.findCollectionByNameOrId(PROCEDURES_ID);
        collection.fields.getById(PROCEDURE_FIELD_ID).required = false;
        return app.save(collection);
    },
    (app) => {
        // Reverting is only safe while no procedure has been saved without
        // the text. Once one has, a required column cannot be restored
        // without inventing values, so this fails loudly rather than
        // guessing - roll forward instead.
        const collection = app.findCollectionByNameOrId(PROCEDURES_ID);
        collection.fields.getById(PROCEDURE_FIELD_ID).required = true;
        return app.save(collection);
    },
);
