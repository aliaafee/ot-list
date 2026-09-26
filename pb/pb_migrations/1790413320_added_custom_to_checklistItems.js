/// <reference path="../pb_data/types.d.ts" />

// Custom checklist items - one-off items added to a single procedure rather
// than coming from a template.
//
// The flag is what keeps them alive. Reconciliation deletes any item that no
// longer matches a template (spec section 7), and a custom item never matches
// one, so without this it would be swept away the first time the procedure's
// codes changed. Assembly ignores custom rows entirely; they are ordered after
// the template items inside their group.

const PROCEDURE_ITEMS_ID = "pbc_5001000003";
const CUSTOM_FIELD_ID = "bool5000000317";

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId(PROCEDURE_ITEMS_ID);
    // Index past the end appends.
    collection.fields.addAt(
      99,
      new Field({
        hidden: false,
        id: CUSTOM_FIELD_ID,
        name: "custom",
        presentable: false,
        required: false,
        system: false,
        type: "bool",
      }),
    );

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId(PROCEDURE_ITEMS_ID);
    collection.fields.removeById(CUSTOM_FIELD_ID);

    return app.save(collection);
  },
);
