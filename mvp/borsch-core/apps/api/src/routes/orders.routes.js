"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const db_1 = require("../db");
const events_1 = require("../events");
const services_1 = require("../services");
const router = new hono_1.Hono();
router.get('/', async (c) => {
    const orders = await db_1.prisma.order.findMany({
        include: { items: true },
        orderBy: { createdAt: 'desc' }
    });
    return c.json(orders);
});
router.post('/', async (c) => {
    const body = await c.req.json();
    const order = await db_1.prisma.order.create({
        data: {
            customerName: body.customerName,
            customerPhone: body.customerPhone,
            status: body.status || "new",
            totalAmount: body.totalAmount || 0,
            paymentMethod: body.paymentMethod || "cash",
            items: {
                create: body.items.map((i) => ({
                    menuItemId: i.menuItemId,
                    menuItemName: i.menuItemName,
                    quantity: i.quantity,
                    priceAtTime: i.priceAtTime
                }))
            }
        },
        include: { items: true }
    });
    // ХУК 1: ТГ уведомление в фоне (не блокирует ответ клиенту)
    (0, services_1.sendTelegramNotification)(order);
    // ХУК 2: Генерация дефицита и закупки при появлении нового резерва
    (0, services_1.calculateDeficitAndDraftPurchases)().catch(console.error);
    // ХУК 3: Отправка SSE события на фронтенд (Касса)
    events_1.sseEmitter.emit('order-created', order);
    return c.json(order);
});
router.patch('/:id/status', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const updated = await db_1.prisma.order.update({
        where: { id },
        data: { status: body.status }
    });
    // ХУК 4: Списание со склада если заказ выполнен
    if (body.status === 'completed') {
        (0, services_1.writeOffStock)(id).catch(console.error);
    }
    // ХУК 5: Отправка SSE события
    events_1.sseEmitter.emit('order-updated', updated);
    return c.json(updated);
});
router.patch('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    // Handle archiving
    if (body.isArchived) {
        const updated = await db_1.prisma.order.update({
            where: { id },
            data: { isArchived: true }
        });
        // Optionally emit event
        events_1.sseEmitter.emit('order-updated', updated);
        return c.json(updated);
    }
    const updated = await db_1.prisma.order.update({
        where: { id },
        data: body
    });
    events_1.sseEmitter.emit('order-updated', updated);
    return c.json(updated);
});
router.delete('/:id', async (c) => {
    const id = c.req.param('id');
    await db_1.prisma.order.delete({ where: { id } });
    // Maybe emit an event for delete if needed, but not strictly required
    return c.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=orders.routes.js.map