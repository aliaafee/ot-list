/// <reference path="../pb_data/types.d.ts" />

// Checklist templates can be narrowed by priority - specs/checklists/README.md,
// section 3.2.
//
// `priorities` lists the priorities a template applies at: elective, urgent,
// emergency, any combination, or none for "all priorities". It is a criterion
// beside `scope`, like `sexes` and the age range, but tested against something
// different: the `priority` recorded on a procedure's code rows, which is a
// post-coordination qualifier and so never part of the catalogue.
//
// The values are `procedureCodes.priority`'s, and must stay that way - a
// template cannot ask for a priority a code cannot carry.
//
// Blank on every existing template, so no checklist changes and nothing is
// backfilled.

const TEMPLATES_ID = "pbc_5001000001";
const PRIORITIES_ID = "select5000000507";

/** Same vocabulary as procedureCodes.priority. */
const PRIORITIES = ["elective", "urgent", "emergency"];

migrate(
  (app) => {
    const templates = app.findCollectionByNameOrId(TEMPLATES_ID);
    // Index past the end appends.
    templates.fields.addAt(
      99,
      new Field({
        hidden: false,
        id: PRIORITIES_ID,
        maxSelect: PRIORITIES.length,
        name: "priorities",
        presentable: false,
        required: false,
        system: false,
        type: "select",
        values: PRIORITIES,
      }),
    );
    app.save(templates);
  },
  (app) => {
    const templates = app.findCollectionByNameOrId(TEMPLATES_ID);
    templates.fields.removeById(PRIORITIES_ID);
    app.save(templates);
  },
);
