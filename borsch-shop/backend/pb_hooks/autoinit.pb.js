// pb_hooks/autoinit.pb.js
// Runs once on application start to ensure ai_settings exists

onAfterBootstrap((e) => {
    try {
        const records = $app.dao().findRecordsByExpr("ai_settings");
        if (!records || records.length === 0) {
            const collection = $app.dao().findCollectionByNameOrId("ai_settings");
            const record = new Record(collection);
            record.set("id", "ai_settings_idx"); // 15 chars ok
            record.set("telegram_bot_token", "8394728274:AAErRmbbtGeI0qyKgapLpStRt8efSuvez8g");
            record.set("telegram_chat_id", "235200642"); // Klaizar's ID
            record.set("sync_status", "synced");
            // Set some required properties just in case
            $app.dao().saveRecord(record);
            console.log("SUCCESS: ai_settings token automatically restored!");
        } else {
            const settings = records[0];
            const token = settings.getString("telegram_bot_token");
            if (!token) {
                settings.set("telegram_bot_token", "8394728274:AAErRmbbtGeI0qyKgapLpStRt8efSuvez8g");
                settings.set("telegram_chat_id", "235200642");
                $app.dao().saveRecord(settings);
                console.log("SUCCESS: ai_settings token automatically updated!");
            }
        }
    } catch (err) {
        console.log("Error initializing ai_settings: ", err);
    }
});
