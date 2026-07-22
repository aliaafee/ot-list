/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "help": "",
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
        "help": "",
        "hidden": false,
        "id": "text2959423253",
        "max": 0,
        "min": 0,
        "name": "procedureName",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select605673998",
        "maxSelect": 0,
        "name": "laterality",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "right",
          "left",
          "notApplicable"
        ]
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_2837054619",
        "help": "",
        "hidden": false,
        "id": "relation949208915",
        "maxSelect": 0,
        "minSelect": 0,
        "name": "surgeon",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text3927487541",
        "max": 0,
        "min": 0,
        "name": "assistants",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text1554728713",
        "max": 0,
        "min": 0,
        "name": "anesthetist",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text1537120742",
        "max": 0,
        "min": 0,
        "name": "scrubNurse",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select3786480164",
        "maxSelect": 0,
        "name": "anesthesia",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "general",
          "local",
          "regional"
        ]
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text2126603779",
        "max": 0,
        "min": 0,
        "name": "preopDiagnosis",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text83375619",
        "max": 0,
        "min": 0,
        "name": "postopDiagnosis",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text3558032257",
        "max": 0,
        "min": 0,
        "name": "findings",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text874646130",
        "max": 0,
        "min": 0,
        "name": "steps",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text1418409065",
        "max": 0,
        "min": 0,
        "name": "implants",
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
    "id": "pbc_3186729333",
    "indexes": [],
    "listRule": null,
    "name": "ecounterProcedures",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3186729333");

  return app.delete(collection);
})
