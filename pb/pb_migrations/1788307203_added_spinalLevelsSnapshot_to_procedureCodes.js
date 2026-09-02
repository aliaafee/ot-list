/// <reference path="../pb_data/types.d.ts" />

// Adds `spinalLevelsSnapshot` to procedureCodes: the rendered level list
// ("C4-C5, C5-C6") frozen at coding time, alongside the structured
// `spinalLevels` relation (coding system spec sections 5.1 and 6).
//
// Display and the printed report read the snapshot, so an old operative note
// keeps its level text even if the level vocabulary is later revised. The
// editor still loads the relation - editing needs structured data.

const FIELD_ID = "text4200000101";

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("pbc_3317842065");
    collection.fields.addAt(
      99,
      new Field({
        autogeneratePattern: "",
        hidden: false,
        id: FIELD_ID,
        max: 0,
        min: 0,
        name: "spinalLevelsSnapshot",
        pattern: "",
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: "text",
      }),
    );
    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("pbc_3317842065");
    collection.fields.removeById(FIELD_ID);
    app.save(collection);
  },
);
