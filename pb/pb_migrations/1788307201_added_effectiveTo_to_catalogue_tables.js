/// <reference path="../pb_data/types.d.ts" />

// Adds `effectiveTo` (date, nullable) to the four catalogue tables so the
// schema is RF2-shaped (coding system spec section 6): a row is current while
// `effectiveTo` is empty and closed at a release date once a later release
// retires or supersedes it.
//
// The current-state tables still hold one row per business id - the full
// row-level history lives in `catalogueRevisions`. `effectiveTo` here is the
// cheap, always-loaded "is this the live version" flag.

const TARGETS = [
  ["pbc_1509233874", "date2100000101"], // procedureConcepts
  ["pbc_3001000001", "date2100000102"], // procedureFacetValues
  ["pbc_3001000003", "date2100000103"], // procedureConceptSynonyms
  ["pbc_2604117395", "date2100000104"], // spinalLevels
];

function effectiveToField(fieldId) {
  return new Field({
    hidden: false,
    id: fieldId,
    max: "",
    min: "",
    name: "effectiveTo",
    presentable: false,
    required: false,
    system: false,
    type: "date",
  });
}

migrate(
  (app) => {
    for (const [collectionId, fieldId] of TARGETS) {
      const collection = app.findCollectionByNameOrId(collectionId);
      // Index past the end appends.
      collection.fields.addAt(99, effectiveToField(fieldId));
      app.save(collection);
    }
  },
  (app) => {
    for (const [collectionId, fieldId] of TARGETS) {
      const collection = app.findCollectionByNameOrId(collectionId);
      collection.fields.removeById(fieldId);
      app.save(collection);
    }
  },
);
