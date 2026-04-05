/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "rt3vho4i14okl49",
    "created": "2026-03-28 19:33:44.783Z",
    "updated": "2026-03-28 19:33:44.783Z",
    "name": "assemblies",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "orltktdb",
        "name": "name",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      }
    ],
    "indexes": [],
    "": null,
    "": null,
    "": null,
    "": null,
    "": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("rt3vho4i14okl49");

  return dao.deleteCollection(collection);
})
