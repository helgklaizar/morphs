import { Hono } from 'hono';
import { prisma } from '../db';
import * as clientsService from '../services/clients.service';

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

router.post('/upsert', async (c) => {
  const body = await c.req.json();
  try {
    const client = await clientsService.upsertClient(body);
    return c.json(client);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

export default router;

