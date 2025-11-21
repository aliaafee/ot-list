/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_161176599")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_MCTaUZWavi` ON `userProfiles` (`user`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_161176599")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})
