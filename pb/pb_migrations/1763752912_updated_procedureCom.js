/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3434243895")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT \n    pc.id,\n    pc.content,\n    pc.created,\n    pc.updated,\n    pc.removed,\n    pc.procedure,\n    pc.creator,\n    u.name AS creator_name,\n    u.role AS creator_role,\n    up.fullName AS creator_full_name\nFROM procedureComments pc\nLEFT JOIN users u ON pc.creator = u.id\nLEFT JOIN userProfiles up ON u.id = up.user"
  }, collection)

  // remove field
  collection.fields.removeById("_clone_g7xL")

  // remove field
  collection.fields.removeById("_clone_vXXV")

  // remove field
  collection.fields.removeById("_clone_3fRx")

  // remove field
  collection.fields.removeById("_clone_FByy")

  // remove field
  collection.fields.removeById("_clone_YPqo")

  // remove field
  collection.fields.removeById("_clone_6Xb9")

  // remove field
  collection.fields.removeById("_clone_P3vh")

  // remove field
  collection.fields.removeById("_clone_FNWM")

  // remove field
  collection.fields.removeById("_clone_RQU8")

  // remove field
  collection.fields.removeById("_clone_QyHl")

  // remove field
  collection.fields.removeById("_clone_9duy")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "_clone_5Qyf",
    "max": 0,
    "min": 0,
    "name": "content",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "hidden": false,
    "id": "_clone_BoMo",
    "name": "created",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "_clone_sW0k",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "_clone_ITjc",
    "name": "removed",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1747635922",
    "hidden": false,
    "id": "_clone_lpte",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "procedure",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "hidden": false,
    "id": "_clone_EpVu",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "creator",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "_clone_xCDm",
    "max": 255,
    "min": 0,
    "name": "creator_name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "_clone_Ku0C",
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
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "_clone_WyqE",
    "max": 0,
    "min": 0,
    "name": "creator_full_name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3434243895")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT \n    pc.id,\n    pc.content,\n    pc.created,\n    pc.updated,\n    pc.removed,\n    pc.procedure,\n    pc.creator,\n    u.name AS creator_name,\n    u.email AS creator_email,\n    u.avatar AS creator_avatar,\n    u.role AS creator_role,\n    up.fullName AS creator_full_name\nFROM procedureComments pc\nLEFT JOIN users u ON pc.creator = u.id\nLEFT JOIN userProfiles up ON u.id = up.user"
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
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
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "hidden": false,
    "id": "_clone_vXXV",
    "name": "created",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "_clone_3fRx",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "_clone_FByy",
    "name": "removed",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(5, new Field({
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
  }))

  // add field
  collection.fields.addAt(6, new Field({
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
  }))

  // add field
  collection.fields.addAt(7, new Field({
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
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "exceptDomains": null,
    "hidden": false,
    "id": "_clone_FNWM",
    "name": "creator_email",
    "onlyDomains": null,
    "presentable": false,
    "required": true,
    "system": true,
    "type": "email"
  }))

  // add field
  collection.fields.addAt(9, new Field({
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
  }))

  // add field
  collection.fields.addAt(10, new Field({
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
  }))

  // add field
  collection.fields.addAt(11, new Field({
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
  }))

  // remove field
  collection.fields.removeById("_clone_5Qyf")

  // remove field
  collection.fields.removeById("_clone_BoMo")

  // remove field
  collection.fields.removeById("_clone_sW0k")

  // remove field
  collection.fields.removeById("_clone_ITjc")

  // remove field
  collection.fields.removeById("_clone_lpte")

  // remove field
  collection.fields.removeById("_clone_EpVu")

  // remove field
  collection.fields.removeById("_clone_xCDm")

  // remove field
  collection.fields.removeById("_clone_Ku0C")

  // remove field
  collection.fields.removeById("_clone_WyqE")

  return app.save(collection)
})
