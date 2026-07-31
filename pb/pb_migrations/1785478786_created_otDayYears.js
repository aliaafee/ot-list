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
    "id": "pbc_2833983471",
    "indexes": [],
    "listRule": "@request.auth.id != \"\"",
    "name": "otDayYears",
    "system": false,
    "type": "view",
    "updateRule": null,
    "viewQuery": "SELECT \n  strftime('%Y', date) as id,\n  strftime('%Y', date) as year,\n  COUNT(*) as count\nFROM otDays\nGROUP BY strftime('%Y', date)\nORDER BY year DESC",
    "viewRule": "@request.auth.id != \"\""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2833983471");

  return app.delete(collection);
})
