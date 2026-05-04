/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "tables123456789",
    "created": new Date().toISOString(),
    "updated": new Date().toISOString(),
    "name": "tables",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "tbl_num123",
        "name": "number",
        "type": "text",
        "required": true,
        "presentable": true,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "tbl_seats123",
        "name": "seats",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 1,
          "max": null,
          "noDecimal": true
        }
      },
      {
        "system": false,
        "id": "tbl_zone123",
        "name": "zone",
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
        "id": "tbl_posx123",
        "name": "position_x",
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
        "id": "tbl_posy123",
        "name": "position_y",
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
        "id": "tbl_active123",
        "name": "is_active",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
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

  const dao = new Dao(db);
  dao.saveCollection(collection);

  const ordersCollection = dao.findCollectionByNameOrId("8kzqr15vsah1pl1");
  ordersCollection.schema.addField(new SchemaField({
    "system": false,
    "id": "ord_tbl_rel",
    "name": "table_id",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "tables123456789",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }));

  return dao.saveCollection(ordersCollection);
}, (db) => {
  const dao = new Dao(db);
  const ordersCollection = dao.findCollectionByNameOrId("8kzqr15vsah1pl1");
  ordersCollection.schema.removeField("ord_tbl_rel");
  dao.saveCollection(ordersCollection);

  const tablesCollection = dao.findCollectionByNameOrId("tables123456789");
  return dao.deleteCollection(tablesCollection);
});
