import { Hono } from 'hono';
import { prisma } from '../db';

const router = new Hono();

router.get('/', async (c) => {
  const suppliers = await prisma.supplier.findMany({
      include: { orders: true }
  });
  return c.json(suppliers);
});

router.post('/', async (c) => {
  const body = await c.req.json();
  const supplier = await prisma.supplier.create({ data: body });
  return c.json(supplier);
});

router.get('/orders', async (c) => {
  const orders = await prisma.supplierOrder.findMany({
      include: { supplier: true },
      orderBy: { createdAt: 'desc' }
  });
  return c.json(orders);
});

router.post('/orders', async (c) => {
  const body = await c.req.json();
  const order = await prisma.supplierOrder.create({ data: body });
  return c.json(order);
});

export default router;
