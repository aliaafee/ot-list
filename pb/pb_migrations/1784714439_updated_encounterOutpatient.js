/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3268399475")

  // update field
  collection.fields.addAt(1, new Field({
    "help": "",
    "hidden": false,
    "id": "select1502994497",
    "maxSelect": 0,
    "name": "visitType",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "new",
      "followUp"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3268399475")

  // update field
  collection.fields.addAt(1, new Field({
    "help": "",
    "hidden": false,
    "id": "select1502994497",
    "maxSelect": 0,
    "name": "visitType",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "new",
      "follow_up"
    ]
  }))

  return app.save(collection)
})
