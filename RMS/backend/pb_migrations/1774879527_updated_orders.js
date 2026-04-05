/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("8kzqr15vsah1pl1")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "cgntjhpv",
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
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("8kzqr15vsah1pl1")

  // remove
  collection.schema.removeField("cgntjhpv")

  return dao.saveCollection(collection)
})
