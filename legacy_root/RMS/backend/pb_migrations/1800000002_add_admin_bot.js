/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const aiSettings = dao.findCollectionByNameOrId("ai_settings");

  aiSettings.schema.addField(new SchemaField({
    "system": false,
    "id": "admin_telegram_bot_token",
    "name": "admin_telegram_bot_token",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }));

  dao.saveCollection(aiSettings);

  const staffCollection = new Collection({
    "id": "tg_staff_bot_col",
    "name": "telegram_staff",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "chat_id_idx",
        "name": "chat_id",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": true,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "username_idx",
        "name": "username",
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
        "id": "role_idx",
        "name": "role",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "pending",
            "manager",
            "courier"
          ]
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

  dao.saveCollection(staffCollection);
}, (db) => {
  const dao = new Dao(db);
  
  try {
      const aiSettings = dao.findCollectionByNameOrId("ai_settings");
      aiSettings.schema.removeField("admin_telegram_bot_token");
      dao.saveCollection(aiSettings);
  } catch(e) {}
  
  try {
      const staffCollection = dao.findCollectionByNameOrId("telegram_staff");
      dao.deleteCollection(staffCollection);
  } catch(e) {}
})
