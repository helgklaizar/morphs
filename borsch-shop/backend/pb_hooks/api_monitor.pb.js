// Monitoring and Health Check endpoints
routerAdd("POST", "/api/monitor/logs", (c) => {
    try {
        const payload = $apis.requestInfo(c).data;
        if (!payload || !payload.error) {
            return c.json(400, { error: "Missing error data" });
        }

        // Retrieve Telegram settings implicitly from the env or settings collection
        const settingsRecords = $app.dao().findRecordsByExpr("ai_settings");
        if (!settingsRecords || settingsRecords.length === 0) {
            console.error("Monitor: No settings found for telegram notifications. Raw error:", payload.error);
            return c.json(200, { success: true, warning: "notified in console only" });
        }

        const settings = settingsRecords[0];
        const botToken = settings.getString("telegram_bot_token");
        const adminChatIds = settings.getString("telegram_chat_id").split(',').map(s => s.trim()).filter(s => s.length > 0);
        
        let deviceId = payload.deviceId || "Unknown POS";
        let message = `🚨 <b>CRASH REPORT</b>\n\n`;
        message += `🖥 <b>Device:</b> ${deviceId}\n`;
        message += `🔴 <b>Error:</b> ${payload.error}\n`;
        if (payload.componentStack) {
            message += `\n<code>${payload.componentStack}</code>`;
        }
        
        console.error("Frontend Crash from " + deviceId, payload.error, payload.componentStack);

        if (botToken && adminChatIds.length > 0) {
            adminChatIds.forEach(id => {
                try {
                    $http.send({
                        url: "https://api.telegram.org/bot" + botToken + "/sendMessage",
                        method: "POST",
                        body: JSON.stringify({ chat_id: id, text: message, parse_mode: "HTML" }),
                        headers: { "Content-Type": "application/json" },
                        timeout: 5
                    });
                } catch(e) {
                    console.error("Failed to forward crash log to TG:", e);
                }
            });
        }

        return c.json(200, { success: true });
    } catch(err) {
        console.error("Monitor log err:", err);
        return c.json(500, { error: String(err) });
    }
});

routerAdd("GET", "/api/monitor/health", (c) => {
    try {
        const deviceId = c.queryParam("device_id") || "Unknown POS";
        
        // Save the last ping time to PocketBase cache
        $app.cache().set("last_ping_" + deviceId, Date.now());
        
        return c.json(200, { success: true, timestamp: Date.now() });
    } catch(err) {
        return c.json(500, { error: String(err) });
    }
});
