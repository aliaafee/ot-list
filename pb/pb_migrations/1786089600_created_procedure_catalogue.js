/// <reference path="../pb_data/types.d.ts" />

// NSPC catalogue - reference data, per specs/procedure_coding_system.
//
// Four collections, created in dependency order so the relations resolve:
// facet values, then concepts (which relate to them), then synonyms
// (children of concepts). Spinal levels stand alone - they are their own
// vocabulary, referenced only from the encounter record.
//
// These hold reference data, not patient data: any authenticated user
// reads, only an admin writes. That admin is the "custodian" role the
// spec's governance section assigns concept approval to.

const CATALOGUE_READ = '@request.auth.id != ""';
const CATALOGUE_WRITE = '@request.auth.id != "" && @request.auth.role = "admin"';

const FACET_VALUES_ID = "pbc_3001000001";
const CONCEPTS_ID = "pbc_3001000002";
const SYNONYMS_ID = "pbc_3001000003";
const SPINAL_LEVELS_ID = "pbc_3001000004";

const SUBSPECIALTIES = [
    "cranial-trauma",
    "cranial-csf",
    "cranial-tumour",
    "cranial-vascular",
    "cranial-infection",
    "spine-degenerative",
    "spine-trauma",
    "spine-tumour",
    "spine-infection",
    "paediatric",
    "peripheral-nerve",
];

const LEVEL_REGIONS = [
    "craniocervical",
    "cervical",
    "cervicothoracic",
    "thoracic",
    "thoracolumbar",
    "lumbar",
    "lumbosacral",
    "sacral",
];

const idField = {
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
};

/** Plain text field. `presentable` marks the label shown in relation pickers. */
function text(id, name, { required = false, presentable = false } = {}) {
    return {
        autogeneratePattern: "",
        hidden: false,
        id: "text" + id,
        max: 0,
        min: 0,
        name,
        pattern: "",
        presentable,
        primaryKey: false,
        required,
        system: false,
        type: "text",
    };
}

/** Select field. Doubles as the schema's CHECK constraint on enum columns. */
function select(id, name, values, { required = false, maxSelect = 1 } = {}) {
    return {
        hidden: false,
        id: "select" + id,
        maxSelect,
        name,
        presentable: false,
        required,
        system: false,
        type: "select",
        values,
    };
}

function bool(id, name) {
    return {
        hidden: false,
        id: "bool" + id,
        name,
        presentable: false,
        required: false,
        system: false,
        type: "bool",
    };
}

function date(id, name) {
    return {
        hidden: false,
        id: "date" + id,
        max: "",
        min: "",
        name,
        presentable: false,
        required: false,
        system: false,
        type: "date",
    };
}

function number(id, name, { required = false } = {}) {
    return {
        hidden: false,
        id: "number" + id,
        max: null,
        min: null,
        name,
        onlyInt: true,
        presentable: false,
        required,
        system: false,
        type: "number",
    };
}

/**
 * Relation field. `cascadeDelete` stays false for every catalogue
 * reference: the spec retires concepts by clearing `active` and pointing
 * `replacedBy` at a successor, never by deleting a row that historical
 * records still resolve through.
 */
function relation(
    id,
    name,
    collectionId,
    { required = false, cascadeDelete = false, maxSelect = 1 } = {},
) {
    return {
        cascadeDelete,
        collectionId,
        hidden: false,
        id: "relation" + id,
        maxSelect,
        minSelect: 0,
        name,
        presentable: false,
        required,
        system: false,
        type: "relation",
    };
}

const timestamps = [
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
];

migrate(
    (app) => {
        // -------------------------------------------------------------
        // procedureFacetValues - the shared vocabulary every concept's
        // method/site/approach/device/morphology/intent points at.
        // -------------------------------------------------------------
        app.save(
            new Collection({
                id: FACET_VALUES_ID,
                name: "procedureFacetValues",
                type: "base",
                system: false,
                fields: [
                    idField,
                    text("1000000101", "facetValueId", { required: true }),
                    select(
                        "1000000102",
                        "facet",
                        [
                            "method",
                            "site",
                            "approach",
                            "device",
                            "morphology",
                            "intent",
                        ],
                        { required: true },
                    ),
                    text("1000000103", "term", {
                        required: true,
                        presentable: true,
                    }),
                    text("1000000104", "snomedAttribute"),
                    bool("1000000105", "active"),
                    date("1000000106", "effectiveFrom"),
                    ...timestamps,
                ],
                indexes: [
                    "CREATE UNIQUE INDEX `idx_facetValue_id` ON `procedureFacetValues` (`facetValueId`)",
                    "CREATE INDEX `idx_facetValue_facet` ON `procedureFacetValues` (`facet`, `active`)",
                ],
                listRule: CATALOGUE_READ,
                viewRule: CATALOGUE_READ,
                createRule: CATALOGUE_WRITE,
                updateRule: CATALOGUE_WRITE,
                deleteRule: CATALOGUE_WRITE,
            }),
        );

        // -------------------------------------------------------------
        // spinalLevels - the 52-row level vocabulary. `ordinal` is the
        // only correct sort key: T2 precedes T10 anatomically and
        // follows it lexically.
        // -------------------------------------------------------------
        app.save(
            new Collection({
                id: SPINAL_LEVELS_ID,
                name: "spinalLevels",
                type: "base",
                system: false,
                fields: [
                    idField,
                    text("1000000201", "spinalLevelId", { required: true }),
                    select("1000000202", "kind", ["interspace", "vertebra"], {
                        required: true,
                    }),
                    text("1000000203", "code", {
                        required: true,
                        presentable: true,
                    }),
                    text("1000000204", "longName"),
                    select("1000000205", "region", LEVEL_REGIONS),
                    number("1000000206", "ordinal", { required: true }),
                    bool("1000000207", "active"),
                    date("1000000208", "effectiveFrom"),
                    ...timestamps,
                ],
                indexes: [
                    "CREATE UNIQUE INDEX `idx_spinalLevel_id` ON `spinalLevels` (`spinalLevelId`)",
                    "CREATE INDEX `idx_spinalLevel_order` ON `spinalLevels` (`kind`, `ordinal`)",
                ],
                listRule: CATALOGUE_READ,
                viewRule: CATALOGUE_READ,
                createRule: CATALOGUE_WRITE,
                updateRule: CATALOGUE_WRITE,
                deleteRule: CATALOGUE_WRITE,
            }),
        );

        // -------------------------------------------------------------
        // procedureConcepts - the catalogue proper. `conceptId` is the
        // opaque permanent identifier; PocketBase's own record id is an
        // implementation detail and must never be treated as the code.
        // -------------------------------------------------------------
        app.save(
            new Collection({
                id: CONCEPTS_ID,
                name: "procedureConcepts",
                type: "base",
                system: false,
                fields: [
                    idField,
                    text("1000000301", "conceptId", { required: true }),
                    text("1000000302", "fsn", { required: true }),
                    text("1000000303", "preferredTerm", {
                        required: true,
                        presentable: true,
                    }),
                    select("1000000304", "subspecialty", SUBSPECIALTIES, {
                        required: true,
                    }),

                    relation("1000000305", "method", FACET_VALUES_ID),
                    relation("1000000306", "procedureSite", FACET_VALUES_ID),
                    relation("1000000307", "surgicalApproach", FACET_VALUES_ID),
                    relation("1000000308", "device", FACET_VALUES_ID),
                    relation("1000000309", "morphology", FACET_VALUES_ID),
                    relation("1000000310", "defaultIntent", FACET_VALUES_ID),

                    bool("1000000311", "lateralityApplicable"),
                    bool("1000000312", "revisionApplicable"),
                    bool("1000000313", "levelApplicable"),
                    select("1000000314", "levelKind", [
                        "interspace",
                        "vertebra",
                    ]),
                    // A picker hint, not a hard constraint - thoracic
                    // discs do get approached in unanticipated ways.
                    select("1000000315", "levelRegions", LEVEL_REGIONS, {
                        maxSelect: LEVEL_REGIONS.length,
                    }),

                    bool("1000000316", "active"),
                    select("1000000317", "inactivationReason", [
                        "duplicate",
                        "ambiguous",
                        "erroneous",
                        "outdated",
                    ]),
                    // `replacedBy` is added below, not here - a relation
                    // cannot resolve the collection it lives in until
                    // that collection exists.
                    date("1000000319", "effectiveFrom"),
                    date("1000000320", "effectiveTo"),
                    text("1000000321", "catalogueRelease", { required: true }),
                    ...timestamps,
                ],
                indexes: [
                    "CREATE UNIQUE INDEX `idx_concept_id` ON `procedureConcepts` (`conceptId`)",
                    "CREATE INDEX `idx_concept_subspecialty` ON `procedureConcepts` (`subspecialty`, `active`)",
                    "CREATE INDEX `idx_concept_active` ON `procedureConcepts` (`active`)",
                ],
                listRule: CATALOGUE_READ,
                viewRule: CATALOGUE_READ,
                createRule: CATALOGUE_WRITE,
                updateRule: CATALOGUE_WRITE,
                deleteRule: CATALOGUE_WRITE,
            }),
        );

        // Now that procedureConcepts exists, it can point at itself.
        // Retired concepts keep their identifier forever and redirect
        // here, so a record coded in 2026 still resolves after two
        // catalogue revisions.
        const concepts = app.findCollectionByNameOrId(CONCEPTS_ID);
        concepts.fields.add(
            new Field(relation("1000000318", "replacedBy", CONCEPTS_ID)),
        );
        app.save(concepts);

        // -------------------------------------------------------------
        // procedureConceptSynonyms - why search works. Department jargon
        // lives here ("crani", "VP shunt", "ACDF"), not in the formal
        // name. Deleted with their concept, unlike every other relation
        // in this migration.
        // -------------------------------------------------------------
        app.save(
            new Collection({
                id: SYNONYMS_ID,
                name: "procedureConceptSynonyms",
                type: "base",
                system: false,
                fields: [
                    idField,
                    relation("1000000401", "concept", CONCEPTS_ID, {
                        required: true,
                        cascadeDelete: true,
                    }),
                    text("1000000402", "term", {
                        required: true,
                        presentable: true,
                    }),
                    select("1000000403", "language", ["en", "dv"]),
                    bool("1000000404", "isAbbreviation"),
                    bool("1000000405", "active"),
                    date("1000000406", "effectiveFrom"),
                    ...timestamps,
                ],
                indexes: [
                    "CREATE INDEX `idx_synonym_term` ON `procedureConceptSynonyms` (`term` COLLATE NOCASE, `active`)",
                    "CREATE INDEX `idx_synonym_concept` ON `procedureConceptSynonyms` (`concept`)",
                ],
                listRule: CATALOGUE_READ,
                viewRule: CATALOGUE_READ,
                createRule: CATALOGUE_WRITE,
                updateRule: CATALOGUE_WRITE,
                deleteRule: CATALOGUE_WRITE,
            }),
        );

        return null;
    },
    (app) => {
        // Reverse creation order so relations unwind cleanly.
        for (const id of [
            SYNONYMS_ID,
            CONCEPTS_ID,
            SPINAL_LEVELS_ID,
            FACET_VALUES_ID,
        ]) {
            try {
                app.delete(app.findCollectionByNameOrId(id));
            } catch {
                // Already gone - nothing to undo.
            }
        }
        return null;
    },
);
