"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const db_1 = require("../db");
const router = new hono_1.Hono();
router.get('/', async (c) => {
    const suppliers = await db_1.prisma.supplier.findMany({
        include: { orders: true }
    });
    return c.json(suppliers);
});
router.post('/', async (c) => {
    const body = await c.req.json();
    const supplier = await db_1.prisma.supplier.create({ data: body });
    return c.json(supplier);
});
router.get('/orders', async (c) => {
    const orders = await db_1.prisma.supplierOrder.findMany({
        include: { supplier: true },
        orderBy: { createdAt: 'desc' }
    });
    return c.json(orders);
});
router.post('/orders', async (c) => {
    const body = await c.req.json();
    const order = await db_1.prisma.supplierOrder.create({ data: body });
    return c.json(order);
});
exports.default = router;
//# sourceMappingURL=suppliers.routes.js.map