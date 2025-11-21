/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3434243895");

  return app.delete(collection);
}, (app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 0,
        "min": 0,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_1747635922",
        "hidden": false,
        "id": "_clone_waIh",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "procedure",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "hidden": false,
        "id": "_clone_RZYm",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "creator",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "_clone_0NZ1",
        "max": 255,
        "min": 0,
        "name": "creator_name",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "_clone_IbHF",
        "maxSelect": 1,
        "name": "creator_role",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "doctor",
          "receptionist",
          "admin"
        ]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "_clone_fZ3z",
        "max": 0,
        "min": 0,
        "name": "content",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "_clone_A2pE",
        "name": "removed",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "hidden": false,
        "id": "_clone_adcc",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "_clone_YVwD",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_3434243895",
    "indexes": [],
    "listRule": "@request.auth.id != \"\"",
    "name": "procedureCommentsWithUser",
    "system": false,
    "type": "view",
    "updateRule": null,
    "viewQuery": "SELECT \n    pc.id,\n    pc.procedure,\n  pc.creator,\n    u.name AS creator_name,\n    u.role AS creator_role,\n    pc.content,\n  pc.removed,  \n  pc.created,\n    pc.updated\n    \n    \n    \nFROM procedureComments pc\nLEFT JOIN users u ON pc.creator = u.id",
    "viewRule": "@request.auth.id != \"\""
  });

  return app.save(collection);
})
