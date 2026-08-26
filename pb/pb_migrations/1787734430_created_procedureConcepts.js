/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text753527221",
        "max": 0,
        "min": 0,
        "name": "conceptId",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1809734659",
        "max": 0,
        "min": 0,
        "name": "fsn",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2396204979",
        "max": 0,
        "min": 0,
        "name": "preferredTerm",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text72362480",
        "max": 0,
        "min": 0,
        "name": "subspecialty",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "json991345627",
        "maxSize": 0,
        "name": "facets",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "hidden": false,
        "id": "bool1918684321",
        "name": "lateralityApplicable",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "hidden": false,
        "id": "bool4003794101",
        "name": "revisionApplicable",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "hidden": false,
        "id": "bool3141947824",
        "name": "levelApplicable",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "hidden": false,
        "id": "select3075136723",
        "maxSelect": 1,
        "name": "levelKind",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "interspace",
          "vertebra"
        ]
      },
      {
        "hidden": false,
        "id": "json4015649536",
        "maxSize": 0,
        "name": "levelRegions",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "hidden": false,
        "id": "bool212355783",
        "name": "active",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1168725839",
        "max": 0,
        "min": 0,
        "name": "inactivationReason",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text933573867",
        "max": 0,
        "min": 0,
        "name": "replacedBy",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "date3365835114",
        "max": "",
        "min": "",
        "name": "effectiveFrom",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1996770866",
        "max": 0,
        "min": 0,
        "name": "catalogueRelease",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "json3302566143",
        "maxSize": 0,
        "name": "synonyms",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_1509233874",
    "indexes": [
      "CREATE UNIQUE INDEX `idx_procedureConcepts_conceptId` ON `procedureConcepts` (`conceptId`)",
      "CREATE INDEX `idx_procedureConcepts_active` ON `procedureConcepts` (`active`)",
      "CREATE INDEX `idx_procedureConcepts_subspecialty` ON `procedureConcepts` (`subspecialty`)"
    ],
    "listRule": "@request.auth.id != \"\"",
    "name": "procedureConcepts",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": "@request.auth.id != \"\""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1509233874");

  return app.delete(collection);
})
