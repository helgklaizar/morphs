/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "yod59tn0c5g9c46",
    "created": "2026-03-29 17:33:24.059Z",
    "updated": "2026-03-29 17:33:24.059Z",
    "name": "stocktakes",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "acgzicgh",
        "name": "status",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "rrp15xtv",
        "name": "notes",
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
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("yod59tn0c5g9c46");

  return dao.deleteCollection(collection);
})
