/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "",
        "help": "",
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
        "help": "",
        "hidden": false,
        "id": "json3145888567",
        "maxSize": 1,
        "name": "year",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json2394296326",
        "maxSize": 1,
        "name": "month",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number2245608546",
        "max": null,
        "min": null,
        "name": "count",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      }
    ],
    "id": "pbc_205268119",
    "indexes": [],
    "listRule": "@request.auth.id != \"\"",
    "name": "otDayMonths",
    "system": false,
    "type": "view",
    "updateRule": null,
    "viewQuery": "SELECT \n  (strftime('%Y', date) || '-' || strftime('%m', date)) as id,\n  strftime('%Y', date) as year,\n  strftime('%m', date) as month,\n  COUNT(*) as count\nFROM otDays\nGROUP BY strftime('%Y', date), strftime('%m', date)\nORDER BY year DESC, month DESC\n",
    "viewRule": "@request.auth.id != \"\""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_205268119");

  return app.delete(collection);
})
