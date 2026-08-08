/// <reference path="../pb_data/types.d.ts" />

// NSX-00000 "Uncoded procedure" - the sentinel concept a free-text
// procedure is stored against. See spec section 8, "The uncoded sentinel".
//
// This row is also carried by the generated seed migration, so a database
// created from scratch already has it. This exists for the databases that
// applied that seed before the sentinel was added to it: an applied
// migration never re-runs, so regenerating it in place reaches new
// installs only. Both paths upsert on conceptId, so whichever order they
// run in, the result is one row.

const UNCODED = {
    conceptId: "NSX-00000",
    fsn: "Procedure not represented in the catalogue (procedure)",
    preferredTerm: "Uncoded procedure",
    // Not a clinical grouping. The picker filters this concept out
    // entirely, so it never has to sort among the real subspecialties.
    subspecialty: "uncoded",
    effectiveFrom: "2026-08-07 00:00:00.000Z",
    catalogueRelease: "v2026.1",
};

migrate(
    (app) => {
        let record;
        try {
            record = app.findFirstRecordByFilter(
                "procedureConcepts",
                "conceptId = {:id}",
                { id: UNCODED.conceptId },
            );
        } catch {
            record = new Record(
                app.findCollectionByNameOrId("procedureConcepts"),
            );
            record.set("conceptId", UNCODED.conceptId);
        }

        record.set("fsn", UNCODED.fsn);
        record.set("preferredTerm", UNCODED.preferredTerm);
        record.set("subspecialty", UNCODED.subspecialty);
        // No facets: there is nothing to describe about a procedure that
        // has not been identified. Likewise no post-coordination - a
        // laterality or spinal level on an unidentified procedure would
        // be a qualifier with nothing to qualify.
        record.set("method", "");
        record.set("procedureSite", "");
        record.set("surgicalApproach", "");
        record.set("device", "");
        record.set("morphology", "");
        record.set("defaultIntent", "");
        record.set("lateralityApplicable", false);
        record.set("revisionApplicable", false);
        record.set("levelApplicable", false);
        record.set("levelKind", "");
        record.set("levelRegions", []);
        record.set("active", true);
        record.set("inactivationReason", "");
        record.set("effectiveFrom", UNCODED.effectiveFrom);
        record.set("effectiveTo", "");
        record.set("catalogueRelease", UNCODED.catalogueRelease);

        return app.save(record);
    },
    (app) => {
        // Refuses while any procedureCodes row still points here, which is
        // the safety net rather than an error to work around: reverting
        // this would orphan every free-text procedure recorded against it.
        try {
            const record = app.findFirstRecordByFilter(
                "procedureConcepts",
                "conceptId = {:id}",
                { id: UNCODED.conceptId },
            );
            return app.delete(record);
        } catch {
            return null;
        }
    },
);
