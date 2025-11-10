/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_431205161")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"doctor\" ||\n  @request.auth.role = \"admin\"\n)\n",
    "deleteRule": "@request.auth.id != \"\" && @request.auth.role = \"admin\"",
    "updateRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"doctor\" ||\n  @request.auth.role = \"admin\"\n)\n"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_431205161")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\" && @request.auth.role = \"doctor\"",
    "deleteRule": null,
    "updateRule": "@request.auth.id != \"\" && @request.auth.role = \"doctor\""
  }, collection)

  return app.save(collection)
})
