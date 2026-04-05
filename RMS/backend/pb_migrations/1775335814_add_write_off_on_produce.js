/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("menu_items");
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "writeoffonprod",
    "name": "write_off_on_produce",
    "type": "bool",
    "required": false,
    "unique": false,
    "options": {}
  }));
  return dao.saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("menu_items");
  collection.schema.removeField("writeoffonprod");
  return dao.saveCollection(collection);
})
