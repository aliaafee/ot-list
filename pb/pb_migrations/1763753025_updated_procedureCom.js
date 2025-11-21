/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3434243895")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT \n    pc.id,\n    pc.procedure,\n  pc.creator,\n    u.name AS creator_name,\n    u.role AS creator_role,\n    pc.content,\n  pc.removed,  \n  pc.created,\n    pc.updated\n    \n    \n    \nFROM procedureComments pc\nLEFT JOIN users u ON pc.creator = u.id"
  }, collection)

  // remove field
  collection.fields.removeById("_clone_oWNM")

  // remove field
  collection.fields.removeById("_clone_jxHC")

  // remove field
  collection.fields.removeById("_clone_nNoE")

  // remove field
  collection.fields.removeById("_clone_sECA")

  // remove field
  collection.fields.removeById("_clone_Tp8o")

  // remove field
  collection.fields.removeById("_clone_5kcr")

  // remove field
  collection.fields.removeById("_clone_ovIs")

  // remove field
  collection.fields.removeById("_clone_xMBh")

  // remove field
  collection.fields.removeById("_clone_1Q6o")

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

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3434243895")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT \n    pc.id,\n    pc.procedure,\n  pc.creator,\n    u.name AS creator_name,\n    u.role AS creator_role,\n    up.fullName AS creator_full_name,\n    pc.content,\n  pc.removed,  \n  pc.created,\n    pc.updated\n    \n    \n    \nFROM procedureComments pc\nLEFT JOIN users u ON pc.creator = u.id\nLEFT JOIN userProfiles up ON u.id = up.user"
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1747635922",
    "hidden": false,
    "id": "_clone_oWNM",
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
    "id": "_clone_jxHC",
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
    "id": "_clone_nNoE",
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
    "id": "_clone_sECA",
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
    "id": "_clone_Tp8o",
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

  // add field
  collection.fields.addAt(6, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "_clone_5kcr",
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
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "_clone_ovIs",
    "name": "removed",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "_clone_xMBh",
    "name": "created",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "hidden": false,
    "id": "_clone_1Q6o",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

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

  return app.save(collection)
})
