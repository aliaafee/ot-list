/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2837054619")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"doctor\" ||\n  @request.auth.role = \"admin\"\n)",
    "updateRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"doctor\" ||\n  @request.auth.role = \"admin\"\n)"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2837054619")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\" && @request.auth.role = \"doctor\"",
    "updateRule": "@request.auth.id != \"\" && @request.auth.role = \"doctor\""
  }, collection)

  return app.save(collection)
})
