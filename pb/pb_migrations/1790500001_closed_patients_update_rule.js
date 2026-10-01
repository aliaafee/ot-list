/// <reference path="../pb_data/types.d.ts" />

// Patients are edited through POST /api/update-patient only.
//
// Entering a missing date of birth or sex must rebuild the patient's today and
// future checklists in the same transaction (specs/checklists/README.md,
// section 5). A direct collection update would skip that, leaving
// age-restricted items omitted and the "not recorded" notice showing for a
// value that is now recorded. The route checks the same roles this rule did -
// doctor or admin - so who may edit a patient does not change, only the path.

const PATIENTS_ID = "pbc_1820489269";

const DOCTOR_OR_ADMIN =
  '@request.auth.id != "" && (\n  @request.auth.role = "doctor" ||\n  @request.auth.role = "admin"\n)';

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId(PATIENTS_ID);
    collection.updateRule = null;
    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId(PATIENTS_ID);
    collection.updateRule = DOCTOR_OR_ADMIN;
    return app.save(collection);
  },
);
