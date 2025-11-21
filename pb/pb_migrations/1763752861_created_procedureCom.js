/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
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
        "autogeneratePattern": "",
        "hidden": false,
        "id": "_clone_g7xL",
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
        "id": "_clone_vXXV",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "_clone_3fRx",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "_clone_FByy",
        "name": "removed",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_1747635922",
        "hidden": false,
        "id": "_clone_YPqo",
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
        "id": "_clone_6Xb9",
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
        "id": "_clone_P3vh",
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
        "exceptDomains": null,
        "hidden": false,
        "id": "_clone_FNWM",
        "name": "creator_email",
        "onlyDomains": null,
        "presentable": false,
        "required": true,
        "system": true,
        "type": "email"
      },
      {
        "hidden": false,
        "id": "_clone_RQU8",
        "maxSelect": 1,
        "maxSize": 0,
        "mimeTypes": [
          "image/jpeg",
          "image/png",
          "image/svg+xml",
          "image/gif",
          "image/webp"
        ],
        "name": "creator_avatar",
        "presentable": false,
        "protected": false,
        "required": false,
        "system": false,
        "thumbs": null,
        "type": "file"
      },
      {
        "hidden": false,
        "id": "_clone_QyHl",
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
        "id": "_clone_9duy",
        "max": 0,
        "min": 0,
        "name": "creator_full_name",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      }
    ],
    "id": "pbc_3434243895",
    "indexes": [],
    "listRule": null,
    "name": "procedureCom",
    "system": false,
    "type": "view",
    "updateRule": null,
    "viewQuery": "SELECT \n    pc.id,\n    pc.content,\n    pc.created,\n    pc.updated,\n    pc.removed,\n    pc.procedure,\n    pc.creator,\n    u.name AS creator_name,\n    u.email AS creator_email,\n    u.avatar AS creator_avatar,\n    u.role AS creator_role,\n    up.fullName AS creator_full_name\nFROM procedureComments pc\nLEFT JOIN users u ON pc.creator = u.id\nLEFT JOIN userProfiles up ON u.id = up.user",
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3434243895");

  return app.delete(collection);
})
