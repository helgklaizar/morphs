"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const db_1 = require("../db");
const router = new hono_1.Hono();
router.get('/', async (c) => {
    const items = await db_1.prisma.inventoryItem.findMany({
        include: { recipes: true }
    });
    return c.json(items);
});
exports.default = router;
//# sourceMappingURL=inventory.routes.js.map