routerAdd("GET", "/api/migrate_landing_blocks", (c) => {
    let collection = $app.dao().findCollectionByNameOrId("landing_settings");
    
    let needsSave = false;
    
    try {
        collection.schema.addField(new SchemaField({
            name: "show_promo_block",
            type: "bool",
            required: false,
            options: {}
        }));
        needsSave = true;
    } catch (e) {
        $app.logger().info("Field show_promo_block already exists");
    }

    try {
        collection.schema.addField(new SchemaField({
            name: "show_loyalty_block",
            type: "bool",
            required: false,
            options: {}
        }));
        needsSave = true;
    } catch (e) {
        $app.logger().info("Field show_loyalty_block already exists");
    }

    if (needsSave) {
        $app.dao().saveCollection(collection);
        return c.json(200, { "message": "Migrated landing settings successfully" });
    }
    
    return c.json(200, { "message": "Nothing to migrate" });
});
