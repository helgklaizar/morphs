import { Hono } from 'hono';
import { prisma } from '../db';
import * as orderService from '../services/orders.service';
import { zValidator } from '@hono/zod-validator';
import { createOrderSchema, updateOrderStatusSchema, updateOrderSchema } from '@rms/core';
import { OrderStatus } from '@rms/types';

const router = new Hono();

router.get('/', async (c) => {
  const orders = await prisma.order.findMany({
      where: { isArchived: false },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
  });
  return c.json(orders);
});

router.get('/archived', async (c) => {
  const orders = await prisma.order.findMany({
      where: { isArchived: true },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
  });
  return c.json(orders);
});

router.post('/', zValidator('json', createOrderSchema), async (c) => {
  const body = c.req.valid('json');
  const order = await orderService.createOrder(body);
  return c.json(order);
});

router.patch('/:id/status', zValidator('json', updateOrderStatusSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');
  const updated = await orderService.updateOrderStatus(id, body.status as OrderStatus);
  return c.json(updated);
});

router.patch('/:id', zValidator('json', updateOrderSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');
  const updated = await orderService.updateOrder(id, body);
  return c.json(updated);
});

router.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await orderService.deleteOrder(id);
  return c.json(result);
});

export default router;
