// pb_hooks/main.pb.js

// 1. Hook for creation
onRecordAfterCreateRequest(function(e) {
    try {
        var order = e.record;
        console.log("HOOK_CREATE Triggered for: " + order.getId());
        
        // Define locally to avoid ReferenceError across callbacks
        var notify = function(ord) {
            try {
                var st = $app.dao().findRecordById("ai_settings", "ai_settings_idx");
                // WORKER BOT:
                var tk = "8533184447:AAGDSGkuCiEMFXBLKW-4yktxkQ6T0WKw5aw"; 
                var cids = st.getString("telegram_chat_id").split(',').map(function(s){return s.trim()}).filter(function(s){return s.length>0});
                
                var shortId = ord.getId().slice(0, 6).toUpperCase();
                var rawDateStr = ord.getString("reservation_date") || ord.getString("created");
                var dateStr = rawDateStr;
                
                var paymentMethod = ord.getString("payment_method") === "cash" ? "Наличные" : "Bit / Перевод";
                var amount = ord.getFloat("total_amount");
                var nameFull = ord.getString("customer_name") || "Гость";
                var phone = ord.getString("customer_phone") || "";

                var address = "";
                var isDelivery = false;
                var matchDeliv = nameFull.match(/Доставка:\s*([^)]+)/i);
                if (matchDeliv) {
                    address = matchDeliv[1];
                    isDelivery = true;
                    nameFull = nameFull.replace(/\(Доставка:.*?\)/i, "").trim();
                } else if (nameFull.toLowerCase().includes("самовывоз")) {
                    nameFull = nameFull.replace(/\(Самовывоз\)/i, "").trim();
                    isDelivery = false;
                }

                var msg = "🔔 <b>НОВЫЙ ЗАКАЗ №" + shortId + "</b>\n\n";
                msg += "📅 На когда: <b>" + dateStr + "</b>\n";
                msg += "🚚 Тип заказа: <b>" + (isDelivery ? "Доставка" : "Самовывоз") + "</b>\n";
                msg += "💳 Оплата: <b>" + paymentMethod + "</b>\n\n";

                msg += "👤 Имя: <b>" + nameFull + "</b>\n";
                if (isDelivery && address) {
                    msg += "📍 Адрес: <b>" + address + "</b>\n";
                }
                if (phone) {
                    msg += "📞 Телефон: <b>" + phone + "</b>\n";
                }
                msg += "\n🛒 <b>ЗАКАЗ:</b>\n";

                var itemsStr = "";
                var deliveryCostStr = "";
                try {
                    // Note: items might not be available immediately if created in separate request
                    var items = $app.dao().findRecordsByExpr("order_items", $dbx.exp("order_id = {:id}", { id: ord.getId() }));
                    if (items && items.length > 0) {
                        for(var j = 0; j < items.length; j++) {
                            var itemName = items[j].getString("menu_item_name");
                            var qty = items[j].getInt("quantity");
                            var price = items[j].getFloat("price_at_time");
                            
                            if (itemName.toLowerCase().includes("доставка")) {
                                deliveryCostStr = "\n🛵 Доставка: <b>" + price + "₪</b>";
                            } else {
                                itemsStr += "▪️ " + itemName + " — " + qty + " шт. x " + price + "₪\n";
                            }
                        }
                    }
                } catch(err) {
                    console.log("Items fetch error: " + err);
                }

                if (!itemsStr) {
                    itemsStr = "(товары не найдены)\n";
                }
                
                msg += itemsStr;
                if (deliveryCostStr) {
                    msg += deliveryCostStr + "\n";
                }

                msg += "\n💰 <b>Итого: " + amount + " ₪</b>";

                var replyMarkup = { inline_keyboard: [] };
                var buttonsRow = [];

                if (phone) {
                    var cleanPhone = phone.replace(/[^0-9+]/g, "");
                    var finalPhone = cleanPhone.startsWith("+") ? cleanPhone : "+" + cleanPhone;
                    buttonsRow.push({ text: "📞 Позвонить", url: "https://borsch.shop/api/call?phone=" + encodeURIComponent(finalPhone) });
                }

                if (isDelivery && address) {
                    var mapUrl = "https://borsch.shop/api/route?address=" + encodeURIComponent(address);
                    buttonsRow.push({ text: "📍 Маршрут", url: mapUrl });
                }

                if (buttonsRow.length > 0) {
                    replyMarkup.inline_keyboard.push(buttonsRow);
                }

                cids.forEach(function(cid) {
                    try {
                        $http.send({
                            url: "https://api.telegram.org/bot" + tk + "/sendMessage",
                            method: "POST",
                            body: JSON.stringify({ 
                                chat_id: cid, 
                                text: msg, 
                                parse_mode: "HTML", 
                                reply_markup: Object.keys(replyMarkup.inline_keyboard).length > 0 ? replyMarkup : undefined 
                            }),
                            headers: { "Content-Type": "application/json" }
                        });
                    } catch(e) {}
                });
            } catch(e) { console.log("NotifyError: " + e); }
        };
        
        notify(order);
    } catch(err) { console.log("HookCreateErr: " + err); }
}, "orders");

// 2. Client Notifications
onRecordBeforeUpdateRequest(function(e) {
    try {
        var order = e.record;
        var oldRecord;
        try { oldRecord = $app.dao().findRecordById("orders", order.getId()); if (!oldRecord) return; } catch(e) { return; }
        
        var ns = order.getString("status");
        if (ns === oldRecord.getString("status")) return;
        
        var cid = order.getString("telegram_chat_id");
        if (!cid) return;
        
        // CLIENT BOT:
        var tk = "8394728274:AAErRmbbtGeI0qyKgapLpStRt8efSuvez8g";
        
        var txt = "📦 Заказ <b>#" + order.getId().slice(0,6).toUpperCase() + "</b>: " + (ns==="ready"?"Готов!":ns==="delivering"?"В пути!":ns==="completed"?"Завершен!":"Обновлен: " + ns);
        
        $http.send({
            url: "https://api.telegram.org/bot" + tk + "/sendMessage",
            method: "POST",
            body: JSON.stringify({ chat_id: cid, text: txt, parse_mode: "HTML" }),
            headers: { "Content-Type": "application/json" }
        });
    } catch(err) { console.log("PushErr: " + err); }
}, "orders");

// 3. Test/Manual Route
routerAdd("GET", "/api/test-now", function(c) {
    try {
        var records = $app.dao().findRecordsByFilter("orders", "id != '0'", "-created", 1);
        if (records.length === 0) return c.json(200, { ok: false, msg: "No orders" });
        var ord = records[0];
        
        var st = $app.dao().findRecordById("ai_settings", "ai_settings_idx");
        var tk = st.getString("admin_telegram_bot_token") || st.getString("telegram_bot_token");
        var cids = st.getString("telegram_chat_id").split(',').map(function(s){return s.trim()});
        
        var msg = "🔔 <b>ТЕСТОВЫЙ ВЫЗОВ №" + ord.getId().slice(0,6).toUpperCase() + "</b>\nУведомления работают!";

        cids.forEach(function(cid) {
            $http.send({
                url: "https://api.telegram.org/bot" + tk + "/sendMessage",
                method: "POST",
                body: JSON.stringify({ chat_id: cid, text: msg, parse_mode: "HTML" }),
                headers: { "Content-Type": "application/json" }
            });
        });
        return c.json(200, { ok: true, msg: "Test sent to " + cids.length + " admins" });
    } catch (e) { return c.json(500, { error: e.toString() }); }
});

// 4. Stock management (Automatic write-off on Order completion)
onRecordBeforeUpdateRequest(function(e) {
    try {
        var order = e.record;
        if (order.getString("status") !== "completed") return;
        
        var oldRecord;
        try { oldRecord = $app.dao().findRecordById("orders", order.getId()); } catch(e) { return; }
        if (oldRecord.getString("status") === "completed") return; // already deducted
        
        console.log("ORDER COMPLETED: Deducting stock for " + order.getId());

        var items = $app.dao().findRecordsByExpr("order_items", $dbx.exp("order_id = {:id}", { id: order.getId() }));
        if (!items || items.length === 0) return;

        for (var idx = 0; idx < items.length; idx++) {
            var item = items[idx];
            var menuId = item.getString("menu_item_id");
            var qty = item.getFloat("quantity");
            
            if (menuId && qty > 0) {
                try {
                    var menuItem = $app.dao().findRecordById("menu_items", menuId);
                    if (!menuItem) continue;
                    
                    // a) Legacy Menu Item Stock deduction
                    var currentMenuStock = menuItem.getFloat("stock");
                    menuItem.set("stock", currentMenuStock - qty);
                    $app.dao().saveRecord(menuItem);
                    
                    // b) Deep Recipes Recursion
                    var recipeId = menuItem.getString("recipe_id");
                    if (recipeId) {
                        var writeOff = function(rid, multiplier) {
                            var ingredients = $app.dao().findRecordsByExpr("recipe_ingredients", $dbx.exp("recipe_id = {:id}", { id: rid }));
                            if (!ingredients) return;
                            
                            for (var i = 0; i < ingredients.length; i++) {
                                var ing = ingredients[i];
                                var invId = ing.getString("inventory_item_id");
                                var nestedId = ing.getString("nested_recipe_id");
                                var ingQty = ing.getFloat("quantity");
                                
                                if (invId && ingQty > 0) {
                                    var invItem = $app.dao().findRecordById("inventory_items", invId);
                                    if (invItem) {
                                        var oldStock = invItem.getFloat("stock");
                                        var newStock = oldStock - (ingQty * multiplier);
                                        invItem.set("stock", newStock);
                                        $app.dao().saveRecord(invItem);
                                        console.log("RECIPE_WRITE_OFF: Item " + invItem.getString("name") + " decreased by " + (ingQty * multiplier));
                                        
                                        var minStock = invItem.getFloat("min_stock");
                                        if (newStock <= minStock && oldStock > minStock && minStock > 0) {
                                            try {
                                                var st = $app.dao().findRecordById("ai_settings", "ai_settings_idx");
                                                var tk = st.getString("admin_telegram_bot_token") || st.getString("telegram_bot_token");
                                                var cids = st.getString("telegram_chat_id").split(',').map(function(s){return s.trim()});
                                                var msg = "⚠️ <b>АВТО-УВЕДОМЛЕНИЕ О ЗАКУПКЕ</b>\nТовар <b>" + invItem.getString("name") + "</b> подошел к концу (Остаток: " + newStock + ").";
                                                cids.forEach(function(cid) {
                                                    $http.send({url: "https://api.telegram.org/bot" + tk + "/sendMessage", method: "POST", body: JSON.stringify({ chat_id: cid, text: msg, parse_mode: "HTML" }), headers: { "Content-Type": "application/json" }});
                                                });
                                            } catch(e){}
                                        }
                                    }
                                } else if (nestedId && ingQty > 0) {
                                    try {
                                        var nestedRecipe = $app.dao().findRecordById("recipes", nestedId);
                                        var nPortions = nestedRecipe.getFloat("portions") || 1;
                                        
                                        var prepItems = $app.dao().findRecordsByExpr("menu_items", $dbx.exp("recipe_id = {:rid}", { rid: nestedId }));
                                        var isPrep = false;
                                        var prepItem = null;
                                        if (prepItems && prepItems.length > 0) {
                                            prepItem = prepItems[0];
                                            isPrep = prepItem.getBool("write_off_on_produce");
                                        }
                                        
                                        if (isPrep && prepItem) {
                                            var pStock = prepItem.getFloat("stock");
                                            prepItem.set("stock", pStock - (ingQty * multiplier));
                                            $app.dao().saveRecord(prepItem);
                                            console.log("PREP_WRITE_OFF: " + prepItem.getString("name") + " decreased by " + (ingQty * multiplier));
                                        } else {
                                            writeOff(nestedId, (ingQty * multiplier) / nPortions);
                                        }
                                    } catch(e) { }
                                }
                            }
                        };
                        try {
                            var recipe = $app.dao().findRecordById("recipes", recipeId);
                            var ratio = qty / (recipe.getFloat("portions") || 1);
                            writeOff(recipeId, ratio);
                        } catch(e) {}
                    }
                    
                    // c) Assemblies write-off
                    var assemblyId = menuItem.getString("assembly_id");
                    if (assemblyId) {
                        var components = $app.dao().findRecordsByExpr("assembly_items", $dbx.exp("assembly_id = {:id}", { id: assemblyId }));
                        if (components) {
                            for (var k = 0; k < components.length; k++) {
                                var comp = components[k];
                                var cInvId = comp.getString("inventory_item_id");
                                var compQty = comp.getFloat("quantity");
                                if (cInvId && compQty > 0) {
                                    var cInvItem = $app.dao().findRecordById("inventory_items", cInvId);
                                    if (cInvItem) {
                                        var cOldStock = cInvItem.getFloat("stock");
                                        var cNewStock = cOldStock - (compQty * qty);
                                        cInvItem.set("stock", cNewStock);
                                        $app.dao().saveRecord(cInvItem);
                                        console.log("ASSEMBLY_WRITE_OFF: " + cInvItem.getString("name") + " decr by " + (compQty * qty));
                                        
                                        var cMinStock = cInvItem.getFloat("min_stock");
                                        if (cNewStock <= cMinStock && cOldStock > cMinStock && cMinStock > 0) {
                                            try {
                                                var ast = $app.dao().findRecordById("ai_settings", "ai_settings_idx");
                                                var atk = ast.getString("admin_telegram_bot_token") || ast.getString("telegram_bot_token");
                                                var acids = ast.getString("telegram_chat_id").split(',').map(function(s){return s.trim()});
                                                var amsg = "⚠️ <b>АВТО-УВЕДОМЛЕНИЕ О ЗАКУПКЕ</b>\nУпаковка <b>" + cInvItem.getString("name") + "</b> подходит к концу (Остаток: " + cNewStock + ").";
                                                acids.forEach(function(cid) {
                                                    $http.send({url: "https://api.telegram.org/bot" + atk + "/sendMessage", method: "POST", body: JSON.stringify({ chat_id: cid, text: amsg, parse_mode: "HTML" }), headers: { "Content-Type": "application/json" }});
                                                });
                                            } catch(e){}
                                        }
                                    }
                                }
                            }
                        }
                    }

                } catch(er) { console.log("StockUpdateError for menu " + menuId + ": " + er); }
            }
        }
    } catch(err) { console.log("OrderCompletedHookErr: " + err); }
}, "orders");

// 5. Telegram Bot Commands Hook

// Telegram routes have been moved to telegram_bots.pb.js
