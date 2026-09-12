/// <reference path="../pb_data/types.d.ts" />

// The procedure catalogue's concept side: the facet vocabulary, the concepts
// themselves, and their synonyms.
//
// Facets and synonyms are stored relationally rather than as json on the
// concept. A facet term is a controlled value shared by every concept that
// uses it, so it lives once in `procedureFacetValues` and is pointed at - one
// term mapped to SNOMED later benefits every concept using it, which a json
// blob of repeated strings could never do. Synonyms are a per-concept list
// that search reads across, so they are their own rows.
//
// `replacedBy` stays a plain conceptId string: it is a catalogue-level
// pointer, resolved by business id rather than by record.

const CATALOGUE_READ = '@request.auth.id != ""';

const FACET_VALUES_ID = "pbc_3001000001";
const CONCEPTS_ID = "pbc_1509233874";
const SYNONYMS_ID = "pbc_3001000003";

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

function json(id, name) {
  return {
    hidden: false,
    id: "json" + id,
    maxSize: 0,
    name,
    presentable: false,
    required: false,
    system: false,
    type: "json",
  };
}

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

migrate(
  (app) => {
    // The facet vocabulary. Reference data: any signed-in user reads it, and
    // only a catalogue release writes it, which is why there are no write
    // rules - the seed migration is the only author.
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
            ["method", "site", "approach", "device", "morphology", "intent"],
            { required: true },
          ),
          text("1000000103", "term", { required: true, presentable: true }),
          // The SNOMED CT Procedure attribute this facet corresponds to, so a
          // value can be mapped once and reused by every concept.
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
        createRule: null,
        updateRule: null,
        deleteRule: null,
      }),
    );

    app.save(
      new Collection({
        id: CONCEPTS_ID,
        name: "procedureConcepts",
        type: "base",
        system: false,
        fields: [
          idField,
          text("753527221", "conceptId", { required: true }),
          text("1809734659", "fsn", { required: true }),
          text("2396204979", "preferredTerm", {
            required: true,
            presentable: true,
          }),
          text("72362480", "subspecialty"),

          // The facets, each pointing at the shared vocabulary above.
          relation("1000000305", "method", FACET_VALUES_ID),
          relation("1000000306", "procedureSite", FACET_VALUES_ID),
          relation("1000000307", "surgicalApproach", FACET_VALUES_ID),
          relation("1000000308", "device", FACET_VALUES_ID),
          relation("1000000309", "morphology", FACET_VALUES_ID),
          // Named for what it is: the concept's default, which a coded
          // procedure may override.
          relation("1000000310", "defaultIntent", FACET_VALUES_ID),

          bool("1918684321", "lateralityApplicable"),
          bool("4003794101", "revisionApplicable"),
          bool("3141947824", "levelApplicable"),
          select("3075136723", "levelKind", ["interspace", "vertebra"]),
          json("4015649536", "levelRegions"),
          bool("212355783", "active"),
          text("1168725839", "inactivationReason"),
          // A catalogue-level pointer, resolved by business id.
          text("933573867", "replacedBy"),
          date("3365835114", "effectiveFrom"),
          text("1996770866", "catalogueRelease"),
          ...timestamps,
        ],
        indexes: [
          "CREATE UNIQUE INDEX `idx_procedureConcepts_conceptId` ON `procedureConcepts` (`conceptId`)",
          "CREATE INDEX `idx_procedureConcepts_active` ON `procedureConcepts` (`active`)",
          "CREATE INDEX `idx_procedureConcepts_subspecialty` ON `procedureConcepts` (`subspecialty`)",
        ],
        listRule: CATALOGUE_READ,
        viewRule: CATALOGUE_READ,
        createRule: null,
        updateRule: null,
        deleteRule: null,
      }),
    );

    // Search reads across synonyms, so they are rows with their own index
    // rather than a json array that has to be unpacked per concept.
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
          text("1000000402", "term", { required: true, presentable: true }),
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
        createRule: null,
        updateRule: null,
        deleteRule: null,
      }),
    );
  },
  (app) => {
    // Reverse dependency order: synonyms point at concepts, concepts point at
    // facet values.
    for (const id of [SYNONYMS_ID, CONCEPTS_ID, FACET_VALUES_ID]) {
      try {
        app.delete(app.findCollectionByNameOrId(id));
      } catch (err) {
        // Already gone - nothing to undo.
      }
    }
  },
);
