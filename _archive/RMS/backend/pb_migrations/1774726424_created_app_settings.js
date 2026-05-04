/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "wf86ekav7q1bc4h",
    "created": "2026-03-28 19:33:44.651Z",
    "updated": "2026-03-28 19:33:44.651Z",
    "name": "app_settings",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "luhtevtj",
        "name": "low_stock_threshold_percent",
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
        "id": "7mmp5eyl",
        "name": "telegram_chat_id",
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
  const collection = dao.findCollectionByNameOrId("wf86ekav7q1bc4h");

  return dao.deleteCollection(collection);
})
