/// <reference path="../pb_data/types.d.ts" />

// How many checklist items are still outstanding on a procedure, denormalised
// onto the procedure itself.
//
// The list rows render one line per procedure and must not join: the checklist
// spec (section 6) deliberately keeps procedureChecklistItems out of the list
// expands, because every list query would carry items no list renders. This is
// the same trade already made for `pacStatus`, which is a copy on the
// procedure so the collapsed row can show it without a join.
//
// Maintained by pb_hooks/procedure-checklists.js and the checklist routes,
// which only write it when the number actually changes - a tick that leaves
// the count alone should not bump the procedure's `updated`.

const PROCEDURES_ID = "pbc_1747635922";
const FIELD_ID = "number5000000401";

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId(PROCEDURES_ID);
    // Index past the end appends.
    collection.fields.addAt(
      99,
      new Field({
        hidden: false,
        id: FIELD_ID,
        max: null,
        min: 0,
        name: "checklistOutstanding",
        onlyInt: true,
        presentable: false,
        required: false,
        system: false,
        type: "number",
      }),
    );

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId(PROCEDURES_ID);
    collection.fields.removeById(FIELD_ID);

    return app.save(collection);
  },
);
