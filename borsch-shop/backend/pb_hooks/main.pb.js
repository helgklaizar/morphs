// pb_hooks/main.pb.js
// Custom endpoint for triggering Telegram notification with full order details
routerAdd("POST", "/api/webhooks/order_submit/:id", (c) => {
    try {
        const orderId = c.pathParam("id");
        if (!orderId) return c.json(400, { error: "Missing order ID" });

        const order = $app.dao().findRecordById("orders", orderId);
        
        const settingsRecords = $app.dao().findRecordsByExpr("ai_settings");
        if (!settingsRecords || settingsRecords.length === 0) {
            console.log("No ai_settings found, skipping Telegram notification.");
            return c.json(200, { success: false, reason: "No settings" });
        }
        
        const settings = settingsRecords[0];
        const botToken = settings.getString("telegram_bot_token");
        const chatIdsStr = settings.getString("telegram_chat_id");
        
        if (!botToken || !chatIdsStr) {
            console.log("Telegram not fully configured in ai_settings");
            return c.json(200, { success: false, reason: "No token" });
        }

        const adminChatIds = chatIdsStr.split(',').map(s => s.trim()).filter(s => s.length > 0);

        const shortId = order.getId().slice(0, 6).toUpperCase();
        let nameFull = order.getString("customer_name") || "Гость";
        const customerPhone = order.getString("customer_phone") || "";
        const totalAmount = order.getFloat("total_amount") || 0;
        const paymentMethod = order.getString("payment_method") === "cash" ? "Наличные" : "Bit / Перевод";
        let rawDateStr = order.getString("reservation_date") || order.getString("created");
        let dateStr = rawDateStr;
        try {
            let d = new Date(rawDateStr);
            if (!isNaN(d.getTime())) {
                let day = String(d.getDate()).padStart(2, '0');
                let mon = String(d.getMonth() + 1).padStart(2, '0');
                let yr = d.getFullYear();
                let hh = String(d.getHours()).padStart(2, '0');
                let mm = String(d.getMinutes()).padStart(2, '0');
                dateStr = `${day}-${mon}-${yr} [ ${hh}:${mm} ]`;
            }
        } catch(e) {
            console.log("Date parsing failed for", rawDateStr, e);
        }

        let address = "";
        let isDelivery = false;
        const matchDeliv = nameFull.match(/Доставка:\s*([^)]+)/i);
        if (matchDeliv) {
            address = matchDeliv[1];
            isDelivery = true;
            nameFull = nameFull.replace(/\(Доставка:.*?\)/i, "").trim();
        } else if (nameFull.toLowerCase().includes("самовывоз")) {
            nameFull = nameFull.replace(/\(Самовывоз\)/i, "").trim();
            isDelivery = false;
        }

        let msg = `🔔 <b>НОВЫЙ ЗАКАЗ №${shortId}</b>\n\n`;
        msg += `📅 На когда: <b>${dateStr}</b>\n`;
        msg += `🚚 Тип заказа: <b>${isDelivery ? "Доставка" : "Самовывоз"}</b>\n`;
        msg += `💳 Оплата: <b>${paymentMethod}</b>\n\n`;

        msg += `👤 Имя: <b>${nameFull}</b>\n`;
        if (isDelivery && address) {
            msg += `📍 Адрес: <b>${address}</b>\n`;
        }
        if (customerPhone) {
            msg += `📞 Телефон: <b>${customerPhone}</b>\n`;
        }
        
        msg += `\n🛒 <b>ЗАКАЗ:</b>\n`;

        let itemsStr = "";
        let deliveryCostStr = "";
        try {
            // Guarantee that order_items are synced because Rust calls this AFTER batch sync!
            const items = $app.dao().findRecordsByExpr("order_items", $dbx.exp("order_id = {:id}", { id: order.getId() }));
            if (items && items.length > 0) {
                for(let j = 0; j < items.length; j++) {
                    const itemName = items[j].getString("menu_item_name");
                    const qty = items[j].getInt("quantity");
                    const price = items[j].getFloat("price_at_time");
                    
                    if (itemName.toLowerCase().includes("доставка")) {
                        deliveryCostStr = `\n🛵 Доставка: <b>${price}₪</b>`;
                    } else {
                        itemsStr += `▪️ ${itemName} — ${qty} шт. x ${price}₪\n`;
                    }
                }
            }
        } catch(err) {
            console.log("Failed to load order_items for order", order.getId(), err);
        }

        if (!itemsStr) {
            itemsStr = "(Отсутствуют товары)\n";
        }
        
        msg += itemsStr;
        if (deliveryCostStr) {
            msg += deliveryCostStr + "\n";
        }

        msg += `\n💰 <b>Итого: ${totalAmount} ₪</b>`;

        const replyMarkup = { inline_keyboard: [] };
        const buttonsRow = [];

        if (customerPhone) {
            const cleanPhone = customerPhone.replace(/[^0-9+]/g, "");
            const finalPhone = cleanPhone.startsWith("+") ? cleanPhone : "+" + cleanPhone;
            buttonsRow.push({ text: "📞 Позвонить", url: "https://borsch.shop/api/call?phone=" + encodeURIComponent(finalPhone) });
        }

        if (isDelivery && address) {
             const mapUrl = "https://borsch.shop/api/route?address=" + encodeURIComponent(address);
             buttonsRow.push({ text: "📍 Маршрут", url: mapUrl });
        }

        if (buttonsRow.length > 0) {
             replyMarkup.inline_keyboard.push(buttonsRow);
        }

        adminChatIds.forEach(id => {
            try {
                $http.send({
                    url: "https://api.telegram.org/bot" + botToken + "/sendMessage",
                    method: "POST",
                    body: JSON.stringify({
                        chat_id: id,
                        text: msg,
                        parse_mode: "HTML",
                        reply_markup: Object.keys(replyMarkup.inline_keyboard).length > 0 ? replyMarkup : undefined
                    }),
                    headers: { "Content-Type": "application/json" }
                });
            } catch (errHttp) {
                console.log("Failed to send notification to chat_id", id, errHttp);
            }
        });
        
        return c.json(200, { success: true });
    } catch (errRoot) {
        console.log("Error in Telegram hook:", errRoot);
        return c.json(500, { error: String(errRoot) });
    }
});

// Send PUSH notification to client if order status changes
onRecordAfterUpdateRequest((e) => {
    try {
        const order = e.record;
        const original = e.original;
        
        // Check if status changed
        if (order.getString("status") === original.getString("status")) {
            return;
        }
        
        // Check if client is subscribed
        const clientChatId = order.getString("telegram_chat_id");
        if (!clientChatId) {
            return;
        }
        
        const settingsRecords = $app.dao().findRecordsByExpr("ai_settings");
        if (!settingsRecords || settingsRecords.length === 0) return;
        const botToken = settingsRecords[0].getString("telegram_bot_token");
        if (!botToken) return;

        const shortId = order.getId().slice(0, 6).toUpperCase();
        const status = order.getString("status");
        
        let msgStr = `📦 Важное обновление по заказу <b>№${shortId}</b>!\n\n`;
        if (status === "cooking") {
            msgStr += "👨‍🍳 <b>Начали готовить!</b>\nКухня уже приступила к вашему заказу.";
        } else if (status === "ready") {
            msgStr += "🛍 <b>Заказ готов!</b>\nОн горяченький и дожидается выдачи.";
        } else if (status === "delivering") {
            msgStr += "🚚 <b>В пути!</b>\nКурьер уже везет заказ к вам.";
        } else if (status === "completed") {
            msgStr += "✅ <b>Заказ завершен.</b>\nПриятного аппетита! Будем рады видеть вас снова.";
        } else if (status === "canceled") {
            msgStr += "❌ <b>Заказ отменен.</b>\nСвяжитесь с поддержкой для уточнения деталей.";
        } else {
            msgStr += `Текущий статус: <b>${status}</b>`;
        }

        $http.send({
            url: "https://api.telegram.org/bot" + botToken + "/sendMessage",
            method: "POST",
            body: JSON.stringify({ chat_id: clientChatId, text: msgStr, parse_mode: "HTML" }),
            headers: { "Content-Type": "application/json" }
        });
        console.log("Push notification sent to client " + clientChatId);
    } catch(err) {
        console.log("Error sending push to client", err);
    }
}, "orders");
