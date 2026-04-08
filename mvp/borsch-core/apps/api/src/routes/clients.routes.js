"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const db_1 = require("../db");
const router = new hono_1.Hono();
router.get('/', async (c) => {
    const clients = await db_1.prisma.client.findMany({
        orderBy: { ltv: 'desc' },
        include: { orders: true }
    });
    return c.json(clients);
});
router.post('/', async (c) => {
    const body = await c.req.json();
    const client = await db_1.prisma.client.create({ data: body });
    return c.json(client);
});
exports.default = router;
//# sourceMappingURL=clients.routes.js.map