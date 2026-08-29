/// <reference path="../pb_data/types.d.ts" />

// Moves the legacy free-text procedures.procedure into procedureCodes, as an
// uncoded entry, so every procedure is described the same way.
//
// The text is copied rather than cleared. procedures.procedure was kept when
// it was made optional, and nothing displays it any more, so leaving it in
// place costs nothing and means this migration can be rolled back without the
// original wording depending on the copy.
//
// Procedures that already carry codes are left alone: they were coded through
// the picker, and appending their old free text would duplicate the entry.

const UNCODED_CONCEPT_ID = "NSX-00000";

migrate(
  (app) => {
    let concept;
    try {
      concept = app.findFirstRecordByData(
        "procedureConcepts",
        "conceptId",
        UNCODED_CONCEPT_ID,
      );
    } catch (err) {
      throw new Error(
        `Cannot move procedure text: concept ${UNCODED_CONCEPT_ID} is missing. Seed the catalogue first.`,
      );
    }

    const collection = app.findCollectionByNameOrId("procedureCodes");

    const procedures = app.findRecordsByFilter(
      "procedures",
      "procedure != ''",
      "",
      0,
      0,
      {},
    );

    let created = 0;
    let alreadyCoded = 0;

    procedures.forEach((procedure) => {
      const existing = app.findRecordsByFilter(
        "procedureCodes",
        "procedure = {:procedure}",
        "",
        1,
        0,
        { procedure: procedure.id },
      );
      if (existing.length > 0) {
        alreadyCoded++;
        return;
      }

      const text = procedure.getString("procedure");

      const record = new Record(collection);
      record.set("procedure", procedure.id);
      record.set("concept", concept.id);
      record.set("freeText", text);
      // What the read-only views print, matching what the API stamps for an
      // uncoded entry saved through the picker.
      record.set("displayTerm", text);
      record.set("position", 0);
      record.set("laterality", "");
      record.set("revisionStatus", "");
      record.set("priority", "");
      record.set("intentOverride", "");
      record.set("spinalLevels", []);
      record.set("catalogueRelease", concept.getString("catalogueRelease"));

      app.save(record);
      created++;
    });

    console.log(
      "moved " +
        created +
        " free-text procedure(s) into procedureCodes; left " +
        alreadyCoded +
        " already-coded procedure(s) alone",
    );
  },
  (app) => {
    // Removes only what the up migration wrote: an uncoded entry whose free
    // text is still the procedure's own text. An entry edited since, or one
    // added through the picker, does not match and is kept.
    let concept;
    try {
      concept = app.findFirstRecordByData(
        "procedureConcepts",
        "conceptId",
        UNCODED_CONCEPT_ID,
      );
    } catch (err) {
      return;
    }

    const procedures = app.findRecordsByFilter(
      "procedures",
      "procedure != ''",
      "",
      0,
      0,
      {},
    );

    let removed = 0;

    procedures.forEach((procedure) => {
      const codes = app.findRecordsByFilter(
        "procedureCodes",
        "procedure = {:procedure} && concept = {:concept} && freeText = {:text}",
        "",
        0,
        0,
        {
          procedure: procedure.id,
          concept: concept.id,
          text: procedure.getString("procedure"),
        },
      );

      codes.forEach((code) => {
        app.delete(code);
        removed++;
      });
    });

    console.log("removed " + removed + " migrated free-text procedure code(s)");
  },
);
