/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3434243895")

  // update collection data
  unmarshal({
    "name": "procedureCommentsWithUser"
  }, collection)

  // remove field
  collection.fields.removeById("_clone_IJsG")

  // remove field
  collection.fields.removeById("_clone_2skz")

  // remove field
  collection.fields.removeById("_clone_SmNW")

  // remove field
  collection.fields.removeById("_clone_3tpD")

  // remove field
  collection.fields.removeById("_clone_9pOY")

  // remove field
  collection.fields.removeById("_clone_wZBN")

  // remove field
  collection.fields.removeById("_clone_hUG4")

  // remove field
  collection.fields.removeById("_clone_TDUw")

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

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3434243895")

  // update collection data
  unmarshal({
    "name": "procedureCom"
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1747635922",
    "hidden": false,
    "id": "_clone_IJsG",
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
    "id": "_clone_2skz",
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
    "id": "_clone_SmNW",
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
    "id": "_clone_3tpD",
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
    "id": "_clone_9pOY",
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
    "id": "_clone_wZBN",
    "name": "removed",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "_clone_hUG4",
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
    "id": "_clone_TDUw",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

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

  return app.save(collection)
})
