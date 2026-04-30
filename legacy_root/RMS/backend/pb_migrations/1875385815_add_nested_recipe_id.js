/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("4fkkwy560msy5w4");

  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nestrcpid1",
    "name": "nested_recipe_id",
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

  return dao.saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("4fkkwy560msy5w4");

  collection.schema.removeField("nestrcpid1");

  return dao.saveCollection(collection);
});
