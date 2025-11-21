/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3434243895")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\""
  }, collection)

  // remove field
  collection.fields.removeById("_clone_oY3N")

  // remove field
  collection.fields.removeById("_clone_5gsm")

  // remove field
  collection.fields.removeById("_clone_QpOq")

  // remove field
  collection.fields.removeById("_clone_hfqm")

  // remove field
  collection.fields.removeById("_clone_y1uN")

  // remove field
  collection.fields.removeById("_clone_SB3s")

  // remove field
  collection.fields.removeById("_clone_0ijW")

  // remove field
  collection.fields.removeById("_clone_qtCV")

  // add field
  collection.fields.addAt(1, new Field({
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
  }))

  // add field
  collection.fields.addAt(2, new Field({
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
  }))

  // add field
  collection.fields.addAt(3, new Field({
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
  }))

  // add field
  collection.fields.addAt(4, new Field({
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
  }))

  // add field
  collection.fields.addAt(5, new Field({
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
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "_clone_A2pE",
    "name": "removed",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "_clone_adcc",
    "name": "created",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "_clone_YVwD",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3434243895")

  // update collection data
  unmarshal({
    "listRule": null,
    "viewRule": null
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1747635922",
    "hidden": false,
    "id": "_clone_oY3N",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "procedure",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "hidden": false,
    "id": "_clone_5gsm",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "creator",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "_clone_QpOq",
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
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "_clone_hfqm",
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
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "_clone_y1uN",
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
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "_clone_SB3s",
    "name": "removed",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "_clone_0ijW",
    "name": "created",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "_clone_qtCV",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // remove field
  collection.fields.removeById("_clone_waIh")

  // remove field
  collection.fields.removeById("_clone_RZYm")

  // remove field
  collection.fields.removeById("_clone_0NZ1")

  // remove field
  collection.fields.removeById("_clone_IbHF")

  // remove field
  collection.fields.removeById("_clone_fZ3z")

  // remove field
  collection.fields.removeById("_clone_A2pE")

  // remove field
  collection.fields.removeById("_clone_adcc")

  // remove field
  collection.fields.removeById("_clone_YVwD")

  return app.save(collection)
})
