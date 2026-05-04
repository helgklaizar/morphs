/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "4fkkwy560msy5w4",
    "created": "2026-03-28 19:33:44.763Z",
    "updated": "2026-03-28 19:33:44.763Z",
    "name": "recipe_ingredients",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "1rk5zwy0",
        "name": "recipe_id",
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
        "id": "k89bwjls",
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
        "id": "vwb4xuyx",
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
  const collection = dao.findCollectionByNameOrId("4fkkwy560msy5w4");

  return dao.deleteCollection(collection);
})
