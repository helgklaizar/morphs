"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const db_1 = require("../db");
const router = new hono_1.Hono();
router.get('/', async (c) => {
    const items = await db_1.prisma.menuItem.findMany({
        include: { category: true },
        orderBy: { createdAt: 'desc' }
    });
    return c.json(items);
});
router.get('/categories', async (c) => {
    const categories = await db_1.prisma.menuCategory.findMany();
    return c.json(categories);
});
router.post('/', async (c) => {
    const body = await c.req.json();
    const item = await db_1.prisma.menuItem.create({ data: body });
    return c.json(item);
});
router.put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const item = await db_1.prisma.menuItem.update({ where: { id }, data: body });
    return c.json(item);
});
router.patch('/:id/stock', async (c) => {
    const id = c.req.param('id');
    const { stock } = await c.req.json();
    const item = await db_1.prisma.menuItem.update({ where: { id }, data: { stock } });
    return c.json(item);
});
router.patch('/:id/active', async (c) => {
    const id = c.req.param('id');
    const { isActive } = await c.req.json();
    const item = await db_1.prisma.menuItem.update({ where: { id }, data: { isActive } });
    return c.json(item);
});
router.delete('/:id', async (c) => {
    const id = c.req.param('id');
    await db_1.prisma.menuItem.delete({ where: { id } });
    return c.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=menu.routes.js.map