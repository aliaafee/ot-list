/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1747635922")

  // add field
  collection.fields.addAt(16, new Field({
    "hidden": false,
    "id": "select2111561903",
    "maxSelect": 1,
    "name": "pacStatus",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "referred",
      "inReview",
      "cleared",
      "unfit"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1747635922")

  // remove field
  collection.fields.removeById("select2111561903")

  return app.save(collection)
})
