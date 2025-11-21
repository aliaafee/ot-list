/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_161176599")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\" && @request.auth.role = \"admin\"",
    "listRule": "user.id = @request.auth.id",
    "updateRule": "user.id = @request.auth.id",
    "viewRule": "user.id = @request.auth.id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_161176599")

  // update collection data
  unmarshal({
    "createRule": null,
    "listRule": null,
    "updateRule": null,
    "viewRule": null
  }, collection)

  return app.save(collection)
})
