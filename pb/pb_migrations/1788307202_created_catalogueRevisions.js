/// <reference path="../pb_data/types.d.ts" />

// The append-only catalogue history (coding system spec section 6).
//
// One row per (catalogue record, release that changed it). Rows are never
// updated except to stamp `effectiveTo` when a later release supersedes them,
// and never deleted except to roll a release back. The current-state tables
// (`procedureConcepts`, `procedureFacetValues`, `spinalLevels`) are a fast
// projection of "the row whose effectiveTo is empty"; this table is the
// RF2-shaped log behind them.
//
// `snapshot` holds the record as the generating release wrote it - for a
// concept, its scalar fields, its facets as facetValueIds, and its whole
// synonym list. Point-in-time catalogue = per businessId, the row whose
// [effectiveFrom, effectiveTo) contains the date of interest.
//
// Synonyms have no `entity` of their own: they ride inside the concept
// snapshot, matching how a release always states a concept's whole synonym set.

const CATALOGUE_READ = '@request.auth.id != ""';

migrate(
  (app) => {
    const collection = new Collection({
      id: "pbc_4100000001",
      name: "catalogueRevisions",
      type: "base",
      system: false,
      listRule: CATALOGUE_READ,
      viewRule: CATALOGUE_READ,
      createRule: null,
      updateRule: null,
      deleteRule: null,
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
        {
          hidden: false,
          id: "select4100000101",
          maxSelect: 1,
          name: "entity",
          presentable: false,
          required: true,
          system: false,
          type: "select",
          values: ["concept", "facetValue", "spinalLevel"],
        },
        {
          autogeneratePattern: "",
          hidden: false,
          id: "text4100000102",
          max: 0,
          min: 0,
          name: "businessId",
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
          id: "text4100000103",
          max: 0,
          min: 0,
          name: "release",
          pattern: "",
          presentable: false,
          primaryKey: false,
          required: true,
          system: false,
          type: "text",
        },
        {
          hidden: false,
          id: "date4100000104",
          max: "",
          min: "",
          name: "effectiveFrom",
          presentable: false,
          required: false,
          system: false,
          type: "date",
        },
        {
          hidden: false,
          id: "date4100000105",
          max: "",
          min: "",
          name: "effectiveTo",
          presentable: false,
          required: false,
          system: false,
          type: "date",
        },
        {
          hidden: false,
          id: "bool4100000106",
          name: "active",
          presentable: false,
          required: false,
          system: false,
          type: "bool",
        },
        {
          hidden: false,
          id: "select4100000107",
          maxSelect: 1,
          name: "changeType",
          presentable: false,
          required: false,
          system: false,
          type: "select",
          values: ["add", "update", "retire", "reactivate"],
        },
        {
          hidden: false,
          id: "json4100000108",
          maxSize: 0,
          name: "snapshot",
          presentable: false,
          required: false,
          system: false,
          type: "json",
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
        "CREATE UNIQUE INDEX `idx_catalogueRevisions_key` ON `catalogueRevisions` (`entity`, `businessId`, `effectiveFrom`)",
        "CREATE INDEX `idx_catalogueRevisions_open` ON `catalogueRevisions` (`entity`, `businessId`, `effectiveTo`)",
        "CREATE INDEX `idx_catalogueRevisions_release` ON `catalogueRevisions` (`release`)",
      ],
    });

    app.save(collection);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("pbc_4100000001"));
  },
);
