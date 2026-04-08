"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDeficitAndDraftPurchases = exports.writeOffStock = exports.sendTelegramNotification = void 0;
const index_1 = require("./index");
// 1. Отправка уведомления в Telegram
const sendTelegramNotification = async (order) => {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.warn("⚠️ Telegram credentials not found in ENV. Skipping notification.");
        return;
    }
    const itemsList = order.items.map((i) => `- ${i.menuItemName} x${i.quantity}`).join('\n');
    const text = `🔥 *Новый заказ!* (Сумма: ${order.totalAmount} ₪)\n👤 ${order.customerName} (${order.customerPhone})\n\n🛒 *Состав:*\n${itemsList}`;
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text,
                parse_mode: 'Markdown'
            })
        });
    }
    catch (e) {
        console.error("Ошибка отправки Telegram-уведомления:", e);
    }
};
exports.sendTelegramNotification = sendTelegramNotification;
// 2. Списание остатков
const writeOffStock = async (orderId) => {
    const order = await index_1.prisma.order.findUnique({
        where: { id: orderId },
        include: {
            items: {
                include: {
                    menuItem: {
                        include: { recipe: { include: { ingredients: true } } }
                    }
                }
            }
        }
    });
    if (!order)
        return;
    for (const item of order.items) {
        const { menuItem, quantity } = item;
        if (!menuItem)
            continue;
        if (menuItem.writeOffOnProduce && menuItem.recipe) {
            // Списываем ингредиенты со склада (InventoryItem) по тех. карте
            const yieldRatio = menuItem.recipe.yield || 1;
            for (const ingredient of menuItem.recipe.ingredients) {
                const deductionAmount = (ingredient.quantity / yieldRatio) * quantity;
                await index_1.prisma.inventoryItem.update({
                    where: { id: ingredient.inventoryItemId },
                    data: { stock: { decrement: deductionAmount } }
                });
            }
        }
        else {
            // Списываем готовый товар напрямую (Piece/Штучный)
            await index_1.prisma.menuItem.update({
                where: { id: menuItem.id },
                data: { stock: { decrement: quantity } }
            });
        }
    }
};
exports.writeOffStock = writeOffStock;
// 3. Расчет дефицита и авто-создание закупок
const calculateDeficitAndDraftPurchases = async () => {
    // Получаем текущие остатки склада
    const inventory = await index_1.prisma.inventoryItem.findMany();
    // Получаем активные заказы (не завершенные)
    const activeOrders = await index_1.prisma.order.findMany({
        where: { status: { notIn: ['completed', 'cancelled'] } },
        include: { items: { include: { menuItem: { include: { recipe: { include: { ingredients: true } } } } } } }
    });
    // Считаем сколько еще нужно сырья для активных заказов
    const reservedStock = {};
    activeOrders.forEach(order => {
        order.items.forEach(item => {
            const { menuItem, quantity } = item;
            if (menuItem?.writeOffOnProduce && menuItem.recipe) {
                const yieldRatio = menuItem.recipe.yield || 1;
                menuItem.recipe.ingredients.forEach(ing => {
                    if (!reservedStock[ing.inventoryItemId])
                        reservedStock[ing.inventoryItemId] = 0;
                    reservedStock[ing.inventoryItemId] += (ing.quantity / yieldRatio) * quantity;
                });
            }
        });
    });
    const deficitItems = [];
    inventory.forEach(inv => {
        const reserved = reservedStock[inv.id] || 0;
        // Эффективный остаток: реальный склад - резерв под открытые заказы
        const effectiveStock = inv.stock - reserved;
        if (effectiveStock < inv.minStock) {
            deficitItems.push({
                id: inv.id,
                name: inv.name,
                deficit: inv.minStock - effectiveStock
            });
        }
    });
    if (deficitItems.length > 0) {
        // Ищем дефолтного Supplier (пока берем первого, в реальности логика сложнее)
        const firstSupplier = await index_1.prisma.supplier.findFirst();
        if (firstSupplier) {
            await index_1.prisma.supplierOrder.create({
                data: {
                    supplierId: firstSupplier.id,
                    status: "draft", // генерация черновика
                    // Записываем дефицит в items
                    items: JSON.stringify(deficitItems.map(d => ({ inventoryItemId: d.id, name: d.name, quantityToBuy: d.deficit }))),
                    totalAmount: 0
                }
            });
            console.log(`[Purchasing] Generated draft for deficit: ${deficitItems.length} items`);
        }
    }
};
exports.calculateDeficitAndDraftPurchases = calculateDeficitAndDraftPurchases;
//# sourceMappingURL=services.js.map