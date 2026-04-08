import { Hono } from 'hono';
import { prisma } from '../db';
import { sseEmitter } from '../events';
import { sendTelegramNotification, writeOffStock, calculateDeficitAndDraftPurchases } from '../services';

const router = new Hono();

router.get('/', async (c) => {
  const orders = await prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' }
  });
  return c.json(orders);
});

router.post('/', async (c) => {
  const body = await c.req.json();
  const order = await prisma.order.create({
      data: {
          customerName: body.customerName,
          customerPhone: body.customerPhone,
          status: body.status || "new",
          totalAmount: body.totalAmount || 0,
          paymentMethod: body.paymentMethod || "cash",
          items: {
              create: body.items.map((i: any) => ({
                  menuItemId: i.menuItemId,
                  menuItemName: i.menuItemName,
                  quantity: i.quantity,
                  priceAtTime: i.priceAtTime
              }))
          }
      },
      include: { items: true }
  });
  
  // ХУК 1: ТГ уведомление в фоне (не блокирует ответ клиенту)
  sendTelegramNotification(order);
  
  // ХУК 2: Генерация дефицита и закупки при появлении нового резерва
  calculateDeficitAndDraftPurchases().catch(console.error);

  // ХУК 3: Отправка SSE события на фронтенд (Касса)
  sseEmitter.emit('order-created', order);

  return c.json(order);
});

router.patch('/:id/status', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  const updated = await prisma.order.update({
      where: { id },
      data: { status: body.status }
  });
  
  // ХУК 4: Списание со склада если заказ выполнен
  if (body.status === 'completed') {
      writeOffStock(id).catch(console.error);
  }
  
  // ХУК 5: Отправка SSE события
  sseEmitter.emit('order-updated', updated);
  
  return c.json(updated);
});

router.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  // Handle archiving
  if (body.isArchived) {
      const updated = await prisma.order.update({
          where: { id },
          data: { isArchived: true }
      });
      // Optionally emit event
      sseEmitter.emit('order-updated', updated);
      return c.json(updated);
  }

  const updated = await prisma.order.update({
      where: { id },
      data: body
  });
  sseEmitter.emit('order-updated', updated);
  return c.json(updated);
});

router.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await prisma.order.delete({ where: { id } });
  // Maybe emit an event for delete if needed, but not strictly required
  return c.json({ success: true });
});

export default router;
