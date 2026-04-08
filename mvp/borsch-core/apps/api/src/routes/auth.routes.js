"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const jwt_1 = require("hono/jwt");
const db_1 = require("../db");
const router = new hono_1.Hono();
const JWT_SECRET = process.env.JWT_SECRET || 'borsch-super-secret-key-2026';
router.post('/login', async (c) => {
    const { username, password } = await c.req.json();
    const user = await db_1.prisma.user.findUnique({ where: { username } });
    // В проде лучше bcrypt.compare(password, user.password)
    if (user && user.password === password) {
        const token = await (0, jwt_1.sign)({ id: user.id, role: user.role, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 }, JWT_SECRET);
        return c.json({ token, user: { username: user.username, role: user.role } });
    }
    return c.json({ error: 'Invalid credentials' }, 401);
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map