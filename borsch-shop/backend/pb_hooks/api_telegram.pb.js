// pb_hooks/api_telegram.pb.js
// Custom endpoint that listens to Telegram Webhook commands

routerAdd("POST", "/api/telegram", (c) => {
    try {
        const payload = $apis.requestInfo(c).data;
        if (!payload) return c.json(200, { success: true });

        const settingsRecords = $app.dao().findRecordsByExpr("ai_settings");
        if (!settingsRecords || settingsRecords.length === 0) return c.json(200, { success: true });

        const settings = settingsRecords[0];
        const botToken = settings.getString("telegram_bot_token");
        if (!botToken) return c.json(200, { success: true });

        if (payload.callback_query) {
            const cb = payload.callback_query;
            const cbData = cb.data;
            const cbChatId = cb.message.chat.id.toString();
            
            const adminChatIds = settings.getString("telegram_chat_id").split(',').map(s => s.trim()).filter(s => s.length > 0);
            if (!adminChatIds.includes(cbChatId)) {
                return c.json(200, { success: true });
            }

            if (cbData.startsWith("approve_")) {
                const targetId = cbData.replace("approve_", "");
                if (!adminChatIds.includes(targetId)) {
                    adminChatIds.push(targetId);
                    settings.set("telegram_chat_id", adminChatIds.join(", "));
                    $app.dao().saveRecord(settings);
                    
                    $http.send({
                        url: "https://api.telegram.org/bot" + botToken + "/sendMessage",
                        method: "POST",
                        body: JSON.stringify({ chat_id: cbChatId, text: `✅ Доступ для ID ${targetId} выдан. Он добавлен в настройки.` }),
                        headers: { "Content-Type": "application/json" }
                    });

                    $http.send({
                        url: "https://api.telegram.org/bot" + botToken + "/sendMessage",
                        method: "POST",
                        body: JSON.stringify({ chat_id: targetId, text: `✅ Администратор одобрил вам доступ! Вы можете смотреть активные заказы командой /orders.` }),
                        headers: { "Content-Type": "application/json" }
                    });
                } else {
                    $http.send({
                        url: "https://api.telegram.org/bot" + botToken + "/sendMessage",
                        method: "POST",
                        body: JSON.stringify({ chat_id: cbChatId, text: `⚠️ ID ${targetId} уже есть в списке.` }),
                        headers: { "Content-Type": "application/json" }
                    });
                }
            } else if (cbData.startsWith("reject_")) {
                const targetId = cbData.replace("reject_", "");
                
                $http.send({
                    url: "https://api.telegram.org/bot" + botToken + "/sendMessage",
                    method: "POST",
                    body: JSON.stringify({ chat_id: cbChatId, text: `❌ В доступе для ID ${targetId} отказано.` }),
                    headers: { "Content-Type": "application/json" }
                });

                $http.send({
                    url: "https://api.telegram.org/bot" + botToken + "/sendMessage",
                    method: "POST",
                    body: JSON.stringify({ chat_id: targetId, text: `❌ Администратор отклонил ваш запрос на доступ.` }),
                    headers: { "Content-Type": "application/json" }
                });
            }

            try {
                $http.send({
                    url: "https://api.telegram.org/bot" + botToken + "/answerCallbackQuery",
                    method: "POST",
                    body: JSON.stringify({ callback_query_id: cb.id }),
                    headers: { "Content-Type": "application/json" }
                });
            } catch(e) {
                console.log("Failed to answer callback query", e);
            }

            return c.json(200, { success: true });
        }

        if (!payload.message || !payload.message.text) {
            return c.json(200, { success: true });
        }

        const chatId = payload.message.chat.id;
        const text = payload.message.text.trim().toLowerCase();

        const sendTgMessage = (msg, replyMarkup) => {
            $http.send({
                url: "https://api.telegram.org/bot" + botToken + "/sendMessage",
                method: "POST",
                body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML", reply_markup: replyMarkup }),
                headers: { "Content-Type": "application/json" }
            });
        };

        const chatIdStr = chatId.toString();
        const adminChatIds = settings.getString("telegram_chat_id").split(',').map(s => s.trim()).filter(s => s.length > 0);
        const isAdmin = adminChatIds.includes(chatIdStr);

        // 1. Command: ЗАКАЗЫ (Only for Admin)
        if (text === "заказы" || text === "/orders") {
            if (!isAdmin) {
                sendTgMessage("⛔ У вас нет прав. Я отправил запрос администраторам на подтверждение доступа.");
                
                const userName = payload.message.from.first_name || "Неизвестный";
                const userLogin = payload.message.from.username ? `@${payload.message.from.username}` : "";
                
                const approveMsg = `🔔 <b>ЗАПРОС ДОСТУПА</b>\n\nПользователь <b>${userName}</b> ${userLogin} (ID: <code>${chatIdStr}</code>) пытается получить доступ к заказам бота.\nОдобрить?`;
                
                const approveKeyboard = {
                    inline_keyboard: [[
                        { text: "✅ Одобрить", callback_data: `approve_${chatIdStr}` },
                        { text: "❌ Отклонить", callback_data: `reject_${chatIdStr}` }
                    ]]
                };

                adminChatIds.forEach(adminId => {
                    try {
                        $http.send({
                            url: "https://api.telegram.org/bot" + botToken + "/sendMessage",
                            method: "POST",
                            body: JSON.stringify({ chat_id: adminId, text: approveMsg, parse_mode: "HTML", reply_markup: approveKeyboard }),
                            headers: { "Content-Type": "application/json" }
                        });
                    } catch(errTg) {
                        console.log("Failed to send access request to admin", adminId, errTg);
                    }
                });

                return c.json(200, { success: true });
            }

            let allRecords = $app.dao().findRecordsByExpr("orders");
            let records = [];
            if (allRecords) {
                for(let i = 0; i < allRecords.length; i++) {
                    const st = allRecords[i].getString("status");
                    if (st === "new" || st === "cooking") {
                        records.push(allRecords[i]);
                    }
                }
            }
            if (records.length === 0) {
                sendTgMessage("🍽 Нет активных заказов на данный момент.");
            } else {
                for (let i = 0; i < records.length; i++) {
                    const r = records[i];
                    const shortId = r.getId().slice(0, 6).toUpperCase();
                    let rawDateStr = r.getString("reservation_date") || r.getString("created");
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

                    let paymentMethod = r.getString("payment_method") === "cash" ? "Наличные" : "Bit / Перевод";
                    const amount = r.getFloat("total_amount");
                    let nameFull = r.getString("customer_name") || "Гость";
                    const phone = r.getString("customer_phone") || "";

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

                    let msg = "";
                    msg += `📅 На когда: <b>${dateStr}</b>\n`;
                    msg += `🚚 Тип заказа: <b>${isDelivery ? "Доставка" : "Самовывоз"}</b>\n`;
                    msg += `💳 Оплата: <b>${paymentMethod}</b>\n\n`;

                    msg += `👤 Имя: <b>${nameFull}</b>\n`;
                    if (isDelivery && address) {
                        msg += `📍 Адрес: <b>${address}</b>\n`;
                    }
                    if (phone) {
                        msg += `📞 Телефон: <b>${phone}</b>\n`;
                    }
                    msg += `\n🛒 <b>ЗАКАЗ:</b>\n`;

                    let itemsStr = "";
                    let deliveryCostStr = "";
                    try {
                        const items = $app.dao().findRecordsByExpr("order_items", $dbx.exp("order_id = {:id}", { id: r.getId() }));
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
                        console.log("Failed to load order_items for order", r.getId(), err);
                    }

                    if (!itemsStr) {
                        itemsStr = "(товары не найдены)\n";
                    }
                    
                    msg += itemsStr;
                    if (deliveryCostStr) {
                        msg += deliveryCostStr + "\n";
                    }

                    msg += `\n💰 <b>Итого: ${amount} ₪</b>`;

                    const replyMarkup = { inline_keyboard: [] };
                    const buttonsRow = [];

                    if (phone) {
                        const cleanPhone = phone.replace(/[^0-9+]/g, "");
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

                    sendTgMessage(msg, Object.keys(replyMarkup.inline_keyboard).length > 0 ? replyMarkup : undefined);
                }
            }
        } 
        // 2. Command: Client Tracking /START <order_id> (Anyone)
        else if (text.startsWith("/start")) {
            const parts = text.split(" ");
            if (parts.length > 1) {
                const orderId = parts[1];
                try {
                    const orderItem = $app.dao().findRecordById("orders", orderId);
                    if (orderItem) {
                        try {
                            orderItem.set("telegram_chat_id", chatIdStr);
                            $app.dao().saveRecord(orderItem);
                        } catch(erx) {
                            console.log("Could not save client chat ID", erx);
                        }
                        const status = orderItem.getString("status");
                        const statusLabel = status === "new" ? "🆕 Получен и ожидает подтверждения" : status === "cooking" ? "👨‍🍳 Готовится на кухне" : status === "ready" ? "🛍 Готов к выдаче" : status === "delivering" ? "🚚 У курьера (В доставке)" : "✅ Завершен";
                        sendTgMessage(`📦 <b>Заказ №${orderId.slice(0,6).toUpperCase()}</b>\n\nТекущий статус: <b>${statusLabel}</b>\nСумма: ${orderItem.getString("total_amount")} ₪`);
                    } else {
                        sendTgMessage("⚠️ Заказ с таким ID не найден.");
                    }
                } catch(err) {
                    sendTgMessage("⚠️ Ошибка: заказ не найден в базе.");
                }
            } else {
                 if (isAdmin) {
                     sendTgMessage("👋 Привет, Админ!\n\nИспользуй команду <b>заказы</b> для просмотра всех активных заказов клиентов.");
                 } else {
                     sendTgMessage(`👋 Здравствуйте!\n\nЯ официальный бот ресторана <b>Borsch Shop</b>. 🍲\nСюда вы будете получать статусы по вашему заказу, если перешли по ссылке отслеживания после оплаты.\n\n<i>Ваш ID: ${chatIdStr}</i>`);
                 }
            }
        }
        else {
            if (!isAdmin) {
                 sendTgMessage("Пожалуйста, используйте специальную ссылку после оформления заказа для его отслеживания.");
            }
        }
    } catch (err) {
        console.log("Error handling Telegram Webhook: ", err);
    }
    return c.json(200, { success: true });
});
