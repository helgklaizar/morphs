cronAdd("archive_today_completed_orders", "*/5 * * * *", () => {
    try {
        // Получаем текущую дату в подходящей таймзоне (или UTC)
        const now = new Date();
        now.setHours(now.getHours() + 3); // +3 UTC (Израиль летом, Москва)
        const todayDateStr = now.toISOString().substring(0, 10);
        
        // Находим все выполненные, но не заархивированные заказы
        let expr = $dbx.exp("status = 'completed' AND (is_archived = false OR is_archived = 0 OR is_archived IS NULL)");
        const orders = $app.dao().findRecordsByExpr("orders", expr);
        
        if (!orders || orders.length === 0) return;

        let archivedCount = 0;
        for (let i = 0; i < orders.length; i++) {
            const order = orders[i];
            let rawDateStr = order.getString("reservation_date") || order.getString("created");
            let orderDateStr = "";
            
            if (rawDateStr) {
                // Извлекаем YYYY-MM-DD
                orderDateStr = rawDateStr.replace("T", " ").substring(0, 10);
            }
            
            // Если дата заказа меньше или равна сегодняшней - архивируем
            // Если дата заказа больше (на завтра/другой день) - пропускаем
            if (orderDateStr && orderDateStr <= todayDateStr) {
                order.set("is_archived", true);
                $app.dao().saveRecord(order);
                archivedCount++;
            }
        }
        
        if (archivedCount > 0) {
            console.log("Cron [archive_today_completed_orders]: Архивация выполнена для " + archivedCount + " заказов.");
        }
    } catch (err) {
        console.log("Cron error in archive_today_completed_orders: ", err);
    }
});
