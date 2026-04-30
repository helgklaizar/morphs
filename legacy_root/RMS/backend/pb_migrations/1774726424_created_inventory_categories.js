/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "iuw8cwr74x4uuax",
    "created": "2026-03-28 19:33:44.635Z",
    "updated": "2026-03-28 19:33:44.635Z",
    "name": "inventory_categories",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "x35jpw1p",
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
      },
      {
        "system": false,
        "id": "4oxipsrz",
        "name": "order_index",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "noDecimal": false
        }
      },
      {
        "system": false,
        "id": "rlq2dckb",
        "name": "is_visible_in_assemblies",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "noDecimal": false
        }
      },
      {
        "system": false,
        "id": "fdageexi",
        "name": "is_visible_in_recipe",
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
  const collection = dao.findCollectionByNameOrId("iuw8cwr74x4uuax");

  return dao.deleteCollection(collection);
})
