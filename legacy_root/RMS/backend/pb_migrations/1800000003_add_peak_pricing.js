/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ai_settings")

  // add is_peak_pricing_enabled
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "peak_enabled",
    "name": "is_peak_pricing_enabled",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add peak_pricing_multiplier
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "peak_mult",
    "name": "peak_pricing_multiplier",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": 1,
      "max": 5,
      "noDecimal": false
    }
  }))

  // add low_stock_threshold
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "stock_thresh",
    "name": "low_stock_threshold",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": 0,
      "max": 100,
      "noDecimal": true
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ai_settings")

  collection.schema.removeField("peak_enabled")
  collection.schema.removeField("peak_mult")
  collection.schema.removeField("stock_thresh")

  return dao.saveCollection(collection)
})

