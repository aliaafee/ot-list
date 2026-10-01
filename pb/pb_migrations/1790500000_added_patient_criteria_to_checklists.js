/// <reference path="../pb_data/types.d.ts" />

// Patient criteria on checklist templates - matching on patient age and sex.
// See specs/checklists/README.md, section 3.1.
//
// On checklistTemplates, three criteria that sit beside `scope` rather than
// inside it: `sexes` (empty = any sex) and an age range in whole months,
// `[ageMinMonths, ageMaxMonths)`, where 0 means no bound. Months rather than
// years because the paediatric thresholds that matter sit below one year.
//
// On procedureChecklistItems, `sourceCriteria`: the winning template's
// criteria, kept like `sourceScope` so the UI can explain why an item is there.
//
// On procedures, two fields written by every rebuild:
//   checklistMissingFacts - patient fields that are unknown and cost the
//                           checklist at least one template, e.g. ["age"]
//   checklistPatientBasis - the { dateOfBirth, sex } the checklist was built
//                           from, so a later correction can be noticed
//
// Every new criterion is blank, so no existing checklist changes. The basis is
// backfilled from each procedure's patient: those checklists were assembled
// before any template could look at the patient, so any basis is accurate,
// and an empty one would read as "details changed" on every procedure.

const TEMPLATES_ID = "pbc_5001000001";
const PROCEDURE_ITEMS_ID = "pbc_5001000003";
const PROCEDURES_ID = "pbc_1747635922";

const SEXES_ID = "select5000000501";
const AGE_MIN_ID = "number5000000502";
const AGE_MAX_ID = "number5000000503";
const SOURCE_CRITERIA_ID = "json5000000504";
const MISSING_FACTS_ID = "json5000000505";
const PATIENT_BASIS_ID = "json5000000506";

function months(id, name) {
  return new Field({
    hidden: false,
    id,
    max: null,
    min: 0,
    name,
    onlyInt: true,
    presentable: false,
    required: false,
    system: false,
    type: "number",
  });
}

function json(id, name) {
  return new Field({
    hidden: false,
    id,
    maxSize: 0,
    name,
    presentable: false,
    required: false,
    system: false,
    type: "json",
  });
}

/** "YYYY-MM-DD" from a stored date, without going through a Date. */
function datePart(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

migrate(
  (app) => {
    const templates = app.findCollectionByNameOrId(TEMPLATES_ID);
    // Index past the end appends.
    templates.fields.addAt(
      99,
      new Field({
        hidden: false,
        id: SEXES_ID,
        maxSelect: 2,
        name: "sexes",
        presentable: false,
        required: false,
        system: false,
        type: "select",
        // Same vocabulary as patients.sex.
        values: ["male", "female"],
      }),
    );
    templates.fields.addAt(99, months(AGE_MIN_ID, "ageMinMonths"));
    templates.fields.addAt(99, months(AGE_MAX_ID, "ageMaxMonths"));
    app.save(templates);

    const items = app.findCollectionByNameOrId(PROCEDURE_ITEMS_ID);
    items.fields.addAt(99, json(SOURCE_CRITERIA_ID, "sourceCriteria"));
    app.save(items);

    const procedures = app.findCollectionByNameOrId(PROCEDURES_ID);
    procedures.fields.addAt(99, json(MISSING_FACTS_ID, "checklistMissingFacts"));
    procedures.fields.addAt(99, json(PATIENT_BASIS_ID, "checklistPatientBasis"));
    app.save(procedures);

    // Raw SQL rather than app.save, so the backfill does not move every
    // procedure's `updated` - nothing about the procedures has changed.
    const rows = arrayOf(
      new DynamicModel({ id: "", dateOfBirth: "", sex: "" }),
    );
    app
      .db()
      .newQuery(
        "SELECT procedures.id AS id, " +
          "COALESCE(patients.dateOfBirth, '') AS dateOfBirth, " +
          "COALESCE(patients.sex, '') AS sex " +
          "FROM procedures LEFT JOIN patients ON patients.id = procedures.patient",
      )
      .all(rows);

    rows.forEach((row) => {
      const sex = row.sex === "male" || row.sex === "female" ? row.sex : null;
      const basis = { dateOfBirth: datePart(row.dateOfBirth), sex };
      app
        .db()
        .newQuery(
          "UPDATE procedures SET checklistPatientBasis = {:basis}, " +
            "checklistMissingFacts = '[]' WHERE id = {:id}",
        )
        .bind({ basis: JSON.stringify(basis), id: row.id })
        .execute();
    });
  },
  (app) => {
    const procedures = app.findCollectionByNameOrId(PROCEDURES_ID);
    procedures.fields.removeById(MISSING_FACTS_ID);
    procedures.fields.removeById(PATIENT_BASIS_ID);
    app.save(procedures);

    const items = app.findCollectionByNameOrId(PROCEDURE_ITEMS_ID);
    items.fields.removeById(SOURCE_CRITERIA_ID);
    app.save(items);

    const templates = app.findCollectionByNameOrId(TEMPLATES_ID);
    templates.fields.removeById(SEXES_ID);
    templates.fields.removeById(AGE_MIN_ID);
    templates.fields.removeById(AGE_MAX_ID);
    app.save(templates);
  },
);
