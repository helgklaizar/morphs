import { Hono } from 'hono';
import * as authService from '../services/auth.service';

const router = new Hono();

router.post('/login', async (c) => {
  try {
    const { username, password } = await c.req.json();
    const result = await authService.login(username, password);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 401);
  }
});

export default router;

