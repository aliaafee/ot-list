/// <reference path="../pb_data/types.d.ts" />

// procedureCodes - the encounter record. One row per coded procedure,
// child of a `procedures` row.
//
// A child collection rather than fields on `procedures` because combined
// cases are routine: a decompressive craniectomy plus an ICP monitor
// insertion is two rows sharing one `procedures` parent, one flagged
// primary. `procedures.procedure` stays free text and untouched - coding
// is additive and optional, and `needsReview` marks the gaps.
//
// The post-coordination qualifiers are typed columns, not a JSON blob,
// because they are exactly the audit dimensions: "every L4-L5 case in
// 2026" is only answerable if the level is structured.

const PROCEDURES_ID = "pbc_1747635922";
const USERS_ID = "_pb_users_auth_";
const CONCEPTS_ID = "pbc_3001000002";
const FACET_VALUES_ID = "pbc_3001000001";
const SPINAL_LEVELS_ID = "pbc_3001000004";
const PROCEDURE_CODES_ID = "pbc_3001000005";

// Mirrors the `procedures` collection: clinical staff write, admins delete.
const READ_RULE = '@request.auth.id != ""';
const WRITE_RULE =
    '@request.auth.id != "" && (\n  @request.auth.role = "doctor" ||\n  @request.auth.role = "admin"\n)';
const DELETE_RULE = '@request.auth.id != "" && @request.auth.role = "admin"';

// A long deformity construct can span most of the spine, so this is
// deliberately generous - the count is derived from the selection and
// never stored.
const MAX_LEVELS = 26;

migrate(
    (app) => {
        const collection = new Collection({
            id: PROCEDURE_CODES_ID,
            name: "procedureCodes",
            type: "base",
            system: false,
            fields: [
                {
                    autogeneratePattern: "[a-z0-9]{15}",
                    hidden: false,
                    id: "text3208210256",
                    max: 15,
                    min: 15,
                    name: "id",
                    pattern: "^[a-z0-9]+$",
                    presentable: false,
                    primaryKey: true,
                    required: true,
                    system: true,
                    type: "text",
                },

                // Deleting the OT-list row takes its codes with it...
                {
                    cascadeDelete: true,
                    collectionId: PROCEDURES_ID,
                    hidden: false,
                    id: "relation1000000501",
                    maxSelect: 1,
                    minSelect: 0,
                    name: "procedure",
                    presentable: false,
                    required: true,
                    system: false,
                    type: "relation",
                },
                // ...but a catalogue concept is never deleted out from
                // under a historical record. Concepts retire via `active`.
                {
                    cascadeDelete: false,
                    collectionId: CONCEPTS_ID,
                    hidden: false,
                    id: "relation1000000502",
                    maxSelect: 1,
                    minSelect: 0,
                    name: "concept",
                    presentable: false,
                    required: true,
                    system: false,
                    type: "relation",
                },
                {
                    hidden: false,
                    id: "bool1000000503",
                    name: "isPrimary",
                    presentable: false,
                    required: false,
                    system: false,
                    type: "bool",
                },

                // Post-coordination. Select fields stand in for the
                // schema's CHECK constraints.
                {
                    hidden: false,
                    id: "select1000000504",
                    maxSelect: 1,
                    name: "laterality",
                    presentable: false,
                    required: false,
                    system: false,
                    type: "select",
                    values: ["left", "right", "bilateral", "not-applicable"],
                },
                {
                    hidden: false,
                    id: "select1000000505",
                    maxSelect: 1,
                    name: "priority",
                    presentable: false,
                    required: false,
                    system: false,
                    type: "select",
                    values: ["elective", "urgent", "emergency"],
                },
                {
                    hidden: false,
                    id: "select1000000506",
                    maxSelect: 1,
                    name: "revisionStatus",
                    presentable: false,
                    required: false,
                    system: false,
                    type: "select",
                    values: ["primary", "revision"],
                },
                {
                    hidden: false,
                    id: "number1000000507",
                    max: null,
                    min: null,
                    name: "stagedSequence",
                    onlyInt: true,
                    presentable: false,
                    required: false,
                    system: false,
                    type: "number",
                },
                // Overrides the concept's `defaultIntent`, so it points
                // at the same vocabulary.
                {
                    cascadeDelete: false,
                    collectionId: FACET_VALUES_ID,
                    hidden: false,
                    id: "relation1000000508",
                    maxSelect: 1,
                    minSelect: 0,
                    name: "intentOverride",
                    presentable: false,
                    required: false,
                    system: false,
                    type: "relation",
                },
                // An ordered set. PocketBase preserves the stored array
                // order, which is the cranio-caudal `sequence` - write
                // it sorted by the vocabulary's `ordinal`, never by code.
                {
                    cascadeDelete: false,
                    collectionId: SPINAL_LEVELS_ID,
                    hidden: false,
                    id: "relation1000000509",
                    maxSelect: MAX_LEVELS,
                    minSelect: 0,
                    name: "spinalLevels",
                    presentable: false,
                    required: false,
                    system: false,
                    type: "relation",
                },

                // Immutable snapshots. These are what an operative note
                // renders from, so it prints the term that was on screen
                // when it was signed even after the catalogue is revised.
                // They also let the server-side report hooks render coded
                // procedures without reading the catalogue at all.
                {
                    autogeneratePattern: "",
                    hidden: false,
                    id: "text1000000510",
                    max: 0,
                    min: 0,
                    name: "displayTermSnapshot",
                    pattern: "",
                    presentable: true,
                    primaryKey: false,
                    required: true,
                    system: false,
                    type: "text",
                },
                {
                    autogeneratePattern: "",
                    hidden: false,
                    id: "text1000000511",
                    max: 0,
                    min: 0,
                    name: "spinalLevelsSnapshot",
                    pattern: "",
                    presentable: false,
                    primaryKey: false,
                    required: false,
                    system: false,
                    type: "text",
                },
                {
                    autogeneratePattern: "",
                    hidden: false,
                    id: "text1000000512",
                    max: 0,
                    min: 0,
                    name: "catalogueRelease",
                    pattern: "",
                    presentable: false,
                    primaryKey: false,
                    required: true,
                    system: false,
                    type: "text",
                },

                // Structured free text, not a coding fallback.
                {
                    autogeneratePattern: "",
                    hidden: false,
                    id: "text1000000513",
                    max: 0,
                    min: 0,
                    name: "note",
                    pattern: "",
                    presentable: false,
                    primaryKey: false,
                    required: false,
                    system: false,
                    type: "text",
                },
                // Flags coding gaps for the custodian to work through.
                {
                    hidden: false,
                    id: "bool1000000514",
                    name: "needsReview",
                    presentable: false,
                    required: false,
                    system: false,
                    type: "bool",
                },

                // Matches the creator/updater pattern auto_tracking.pb.js
                // already applies to procedures and patients.
                {
                    cascadeDelete: false,
                    collectionId: USERS_ID,
                    hidden: false,
                    id: "relation1000000515",
                    maxSelect: 1,
                    minSelect: 0,
                    name: "creator",
                    presentable: false,
                    required: false,
                    system: false,
                    type: "relation",
                },
                {
                    cascadeDelete: false,
                    collectionId: USERS_ID,
                    hidden: false,
                    id: "relation1000000516",
                    maxSelect: 1,
                    minSelect: 0,
                    name: "updater",
                    presentable: false,
                    required: false,
                    system: false,
                    type: "relation",
                },

                {
                    hidden: false,
                    id: "autodate2990389176",
                    name: "created",
                    onCreate: true,
                    onUpdate: false,
                    presentable: false,
                    system: false,
                    type: "autodate",
                },
                {
                    hidden: false,
                    id: "autodate3332085495",
                    name: "updated",
                    onCreate: true,
                    onUpdate: true,
                    presentable: false,
                    system: false,
                    type: "autodate",
                },
            ],
            indexes: [
                "CREATE INDEX `idx_procedureCode_procedure` ON `procedureCodes` (`procedure`)",
                "CREATE INDEX `idx_procedureCode_concept` ON `procedureCodes` (`concept`)",
                // Partial index - the review queue is a small slice of a
                // large table, so indexing only the flagged rows keeps it
                // cheap to maintain.
                "CREATE INDEX `idx_procedureCode_review` ON `procedureCodes` (`needsReview`) WHERE `needsReview` = TRUE",
            ],
            listRule: READ_RULE,
            viewRule: READ_RULE,
            createRule: WRITE_RULE,
            updateRule: WRITE_RULE,
            deleteRule: DELETE_RULE,
        });

        return app.save(collection);
    },
    (app) => {
        return app.delete(app.findCollectionByNameOrId(PROCEDURE_CODES_ID));
    },
);
