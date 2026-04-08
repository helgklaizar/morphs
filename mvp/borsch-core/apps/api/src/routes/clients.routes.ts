import { Hono } from 'hono';
import { prisma } from '../db';

const router = new Hono();

router.get('/', async (c) => {
  const clients = await prisma.client.findMany({
      orderBy: { ltv: 'desc' },
      include: { orders: true }
  });
  return c.json(clients);
});

router.post('/', async (c) => {
  const body = await c.req.json();
  const client = await prisma.client.create({ data: body });
  return c.json(client);
});

export default router;
