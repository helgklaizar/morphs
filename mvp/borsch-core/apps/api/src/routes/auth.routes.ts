import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { prisma } from '../db';

const router = new Hono();
const JWT_SECRET = process.env.JWT_SECRET || 'borsch-super-secret-key-2026';

router.post('/login', async (c) => {
  const { username, password } = await c.req.json();
  const user = await prisma.user.findUnique({ where: { username } });
  
  // В проде лучше bcrypt.compare(password, user.password)
  if (user && user.password === password) { 
      const token = await sign({ id: user.id, role: user.role, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 }, JWT_SECRET);
      return c.json({ token, user: { username: user.username, role: user.role } });
  }
  return c.json({ error: 'Invalid credentials' }, 401);
});

export default router;
