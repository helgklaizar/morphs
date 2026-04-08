import { Hono } from 'hono';
import { prisma } from '../db';

const router = new Hono();

router.get('/', async (c) => {
  const items = await prisma.inventoryItem.findMany({
      include: { recipes: true }
  });
  return c.json(items);
});

export default router;
