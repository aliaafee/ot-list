/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3034971429")

  // add field
  collection.fields.addAt(7, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3034971429",
    "help": "",
    "hidden": false,
    "id": "relation1032740943",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "parent",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3034971429")

  // remove field
  collection.fields.removeById("relation1032740943")

  return app.save(collection)
})
