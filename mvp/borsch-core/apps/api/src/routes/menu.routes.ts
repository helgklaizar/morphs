import { Hono } from 'hono';
import { prisma } from '../db';

const router = new Hono();

router.get('/', async (c) => {
  const items = await prisma.menuItem.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' }
  });
  return c.json(items);
});

router.get('/categories', async (c) => {
  const categories = await prisma.menuCategory.findMany();
  return c.json(categories);
});

router.post('/', async (c) => {
  const body = await c.req.json();
  const item = await prisma.menuItem.create({ data: body });
  return c.json(item);
});

router.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const item = await prisma.menuItem.update({ where: { id }, data: body });
  return c.json(item);
});

router.patch('/:id/stock', async (c) => {
  const id = c.req.param('id');
  const { stock } = await c.req.json();
  const item = await prisma.menuItem.update({ where: { id }, data: { stock } });
  return c.json(item);
});

router.patch('/:id/active', async (c) => {
  const id = c.req.param('id');
  const { isActive } = await c.req.json();
  const item = await prisma.menuItem.update({ where: { id }, data: { isActive } });
  return c.json(item);
});

router.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await prisma.menuItem.delete({ where: { id } });
  return c.json({ success: true });
});

export default router;
