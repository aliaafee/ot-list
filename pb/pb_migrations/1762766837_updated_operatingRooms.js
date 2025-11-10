/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1772500979")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\" && @request.auth.role = \"admin\"",
    "deleteRule": "@request.auth.id != \"\" && @request.auth.role = \"admin\"",
    "updateRule": "@request.auth.id != \"\" && @request.auth.role = \"admin\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1772500979")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\" && @request.auth.role = \"doctor\"",
    "deleteRule": null,
    "updateRule": "@request.auth.id != \"\" && @request.auth.role = \"doctor\""
  }, collection)

  return app.save(collection)
})
