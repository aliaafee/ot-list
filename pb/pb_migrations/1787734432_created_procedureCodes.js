/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"doctor\" ||\n  @request.auth.role = \"admin\"\n)",
    "deleteRule": "@request.auth.id != \"\" && @request.auth.role = \"admin\"",
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
        "cascadeDelete": true,
        "collectionId": "pbc_1747635922",
        "hidden": false,
        "id": "relation3902929230",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "procedure",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_1509233874",
        "hidden": false,
        "id": "relation473918883",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "concept",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2130100625",
        "max": 0,
        "min": 0,
        "name": "freeText",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "number3413972831",
        "max": null,
        "min": 0,
        "name": "position",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "select1211059786",
        "maxSelect": 1,
        "name": "laterality",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "left",
          "right",
          "bilateral",
          "not-applicable"
        ]
      },
      {
        "hidden": false,
        "id": "select2341887370",
        "maxSelect": 1,
        "name": "revisionStatus",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "primary",
          "revision"
        ]
      },
      {
        "hidden": false,
        "id": "select1757521151",
        "maxSelect": 1,
        "name": "priority",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "elective",
          "urgent",
          "emergency"
        ]
      },
      {
        "hidden": false,
        "id": "number1452140761",
        "max": null,
        "min": null,
        "name": "stagedSequence",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text391077376",
        "max": 0,
        "min": 0,
        "name": "intentOverride",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_2604117395",
        "hidden": false,
        "id": "relation670551983",
        "maxSelect": 52,
        "minSelect": 0,
        "name": "spinalLevels",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
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
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2655155276",
        "max": 0,
        "min": 0,
        "name": "displayTerm",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
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
    "id": "pbc_3317842065",
    "indexes": [
      "CREATE INDEX `idx_procedureCodes_procedure_position` ON `procedureCodes` (`procedure`, `position`)",
      "CREATE INDEX `idx_procedureCodes_concept` ON `procedureCodes` (`concept`)"
    ],
    "listRule": "@request.auth.id != \"\"",
    "name": "procedureCodes",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"doctor\" ||\n  @request.auth.role = \"admin\"\n)",
    "viewRule": "@request.auth.id != \"\""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3317842065");

  return app.delete(collection);
})
