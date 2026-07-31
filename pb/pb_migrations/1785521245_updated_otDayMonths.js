/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_205268119")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT \n  (strftime('%Y', date) || '-' || strftime('%m', date)) as id,\n  strftime('%Y', date) as year,\n  cast(strftime('%m', date) as integer) as month,\n  COUNT(*) as count\nFROM otDays\nGROUP BY strftime('%Y', date), strftime('%m', date)\nORDER BY year DESC, month DESC\n"
  }, collection)

  // remove field
  collection.fields.removeById("json2394296326")

  // add field
  collection.fields.addAt(2, new Field({
    "help": "",
    "hidden": false,
    "id": "number2394296326",
    "max": null,
    "min": null,
    "name": "month",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_205268119")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT \n  (strftime('%Y', date) || '-' || strftime('%m', date)) as id,\n  strftime('%Y', date) as year,\n  strftime('%m', date) as month,\n  COUNT(*) as count\nFROM otDays\nGROUP BY strftime('%Y', date), strftime('%m', date)\nORDER BY year DESC, month DESC\n"
  }, collection)

  // add field
  collection.fields.addAt(2, new Field({
    "help": "",
    "hidden": false,
    "id": "json2394296326",
    "maxSize": 1,
    "name": "month",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // remove field
  collection.fields.removeById("number2394296326")

  return app.save(collection)
})
