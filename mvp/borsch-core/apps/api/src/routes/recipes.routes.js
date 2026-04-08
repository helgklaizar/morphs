"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const db_1 = require("../db");
const router = new hono_1.Hono();
router.get('/', async (c) => {
    const recipes = await db_1.prisma.recipe.findMany({
        include: { ingredients: true }
    });
    return c.json(recipes);
});
exports.default = router;
//# sourceMappingURL=recipes.routes.js.map