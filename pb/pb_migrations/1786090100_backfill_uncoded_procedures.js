/// <reference path="../pb_data/types.d.ts" />

// Backfill: give every pre-coding-system procedure a `procedureCodes`
// row against the NSX-00000 sentinel, carrying the name that until now
// lived only in `procedures.procedure`.
//
// The point is uniformity. With every procedure holding its name the same
// way, readers stop needing a fallback and a name search becomes one
// filter over one relation instead of a union across two sources.
//
// Two deliberate choices:
//
//   needsReview stays FALSE. The flag is what makes the coding backlog a
//   query - "free text someone typed since coding started". These records
//   predate that expectation, and flagging several hundred of them would
//   bury the handful that genuinely need attention. They remain findable
//   as sentinel rows whenever anyone does want to work through the
//   history.
//
//   `procedures.procedure` is NOT cleared. This migration only copies.
//   Until the result has been looked at, that column is the sole record
//   of these names and the only way back if the backfill is wrong.
//   Clearing it is a separate, later decision.
//
// `catalogueRelease` is required, and these were never coded against any
// release. It records the release under which they were MIGRATED, which
// is the honest reading - not a claim that anyone coded them then.

const SENTINEL_CONCEPT_ID = "NSX-00000";

// Provenance marker, not a second copy of the name - that is what
// `displayTermSnapshot` is for. It exists so the down migration removes
// exactly the rows this created, and no row a user produced by typing
// free text, which is otherwise indistinguishable.
const BACKFILL_NOTE = "backfilled-from-procedures.procedure";

migrate(
    (app) => {
        const sentinel = app.findFirstRecordByFilter(
            "procedureConcepts",
            "conceptId = {:id}",
            { id: SENTINEL_CONCEPT_ID },
        );

        const collection = app.findCollectionByNameOrId("procedureCodes");

        // Which procedures already have a code row, in one pass rather
        // than a query per procedure.
        const alreadyCoded = {};
        for (const code of app.findAllRecords("procedureCodes")) {
            alreadyCoded[code.getString("procedure")] = true;
        }

        let created = 0;
        let skippedCoded = 0;
        let skippedEmpty = 0;

        for (const procedure of app.findAllRecords("procedures")) {
            if (alreadyCoded[procedure.id]) {
                skippedCoded++;
                continue;
            }

            const text = procedure.getString("procedure").trim();
            if (text === "") {
                skippedEmpty++;
                continue;
            }

            const record = new Record(collection);
            record.set("procedure", procedure.id);
            record.set("concept", sentinel.id);
            record.set("isPrimary", true);
            record.set("laterality", "");
            record.set("priority", "");
            record.set("revisionStatus", "primary");
            record.set("intentOverride", "");
            record.set("spinalLevels", []);
            record.set("displayTermSnapshot", text);
            record.set("spinalLevelsSnapshot", "");
            record.set("catalogueRelease", sentinel.getString("catalogueRelease"));
            record.set("needsReview", false);
            record.set("note", BACKFILL_NOTE);

            app.save(record);
            created++;
        }

        console.log(
            `[backfill-uncoded] created ${created}, ` +
                `skipped ${skippedCoded} already coded, ` +
                `${skippedEmpty} with no name`,
        );

        return null;
    },
    (app) => {
        // Removes only what the up migration made. Rows a user created by
        // typing free text carry no marker and are left alone, which
        // matters because they are otherwise identical.
        const stale = app.findRecordsByFilter(
            "procedureCodes",
            "note = {:note}",
            "",
            0,
            0,
            { note: BACKFILL_NOTE },
        );

        for (const record of stale) app.delete(record);

        console.log(`[backfill-uncoded] removed ${stale.length}`);

        return null;
    },
);
