/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "6fa53qwq7qp5eyq",
    "created": "2026-03-28 19:33:44.806Z",
    "updated": "2026-03-28 19:33:44.806Z",
    "name": "assembly_items",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "qp0dsuwf",
        "name": "assembly_id",
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
        "id": "8vwnkqff",
        "name": "inventory_item_id",
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
        "id": "ono4ho2f",
        "name": "quantity",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "noDecimal": false
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
  const collection = dao.findCollectionByNameOrId("6fa53qwq7qp5eyq");

  return dao.deleteCollection(collection);
})
