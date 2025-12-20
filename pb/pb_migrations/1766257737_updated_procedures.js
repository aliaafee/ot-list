/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1747635922")

  // update collection data
  unmarshal({
    "updateRule": "@request.auth.id != \"\" && ((\n  @request.auth.role = \"doctor\" ||\n  @request.auth.role = \"admin\"\n) ||  (@request.body.pacStatus:isset = true))"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1747635922")

  // update collection data
  unmarshal({
    "updateRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"doctor\" ||\n  @request.auth.role = \"admin\"\n)"
  }, collection)

  return app.save(collection)
})
