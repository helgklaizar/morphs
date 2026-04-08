import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { PrismaClient } from '@prisma/client';

const app = new Hono();
export const prisma = new PrismaClient();

app.use('*', cors({
  origin: '*', // В проде нужно ограничить
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

import { streamSSE } from 'hono/streaming';
import { sign } from 'hono/jwt';
import { sseEmitter } from './events';
import * as fs from 'fs';
import * as path from 'path';

// Раздача статики (для загруженных картинок)
import { serveStatic } from '@hono/node-server/serve-static';
app.use('/uploads/*', serveStatic({ root: './public' }));

// 🔴 1. SSE (Реалтайм касса)
app.get('/api/events', async (c) => {
  return streamSSE(c, async (stream) => {
      const onNewOrder = (data: any) => stream.writeSSE({ event: 'order-created', data: JSON.stringify(data) });
      const onUpdateOrder = (data: any) => stream.writeSSE({ event: 'order-updated', data: JSON.stringify(data) });

      sseEmitter.on('order-created', onNewOrder);
      sseEmitter.on('order-updated', onUpdateOrder);

      const interval = setInterval(() => stream.writeSSE({ event: 'ping', data: 'ok' }), 30000);

      c.req.raw.signal.addEventListener('abort', () => {
          clearInterval(interval);
          sseEmitter.off('order-created', onNewOrder);
          sseEmitter.off('order-updated', onUpdateOrder);
      });
      // Держим соединение открытым
      await new Promise(() => {});
  });
});

// 🔴 2. Авторизация (Login + JWT)
const JWT_SECRET = process.env.JWT_SECRET || 'borsch-super-secret-key-2026';
app.post('/api/auth/login', async (c) => {
  const { username, password } = await c.req.json();
  const user = await prisma.user.findUnique({ where: { username } });
  
  // В проде лучше bcrypt.compare(password, user.password)
  if (user && user.password === password) { 
      const token = await sign({ id: user.id, role: user.role, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 }, JWT_SECRET);
      return c.json({ token, user: { username: user.username, role: user.role } });
  }
  return c.json({ error: 'Invalid credentials' }, 401);
});

// 🔴 3. Загрузка Файлов (Uploads)
app.post('/api/upload', async (c) => {
  const body = await c.req.parseBody();
  const file = body['image'];
  if (file instanceof File) {
      const buffer = await file.arrayBuffer();
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      fs.writeFileSync(path.join(uploadDir, fileName), Buffer.from(buffer));
      return c.json({ imageUrl: `/uploads/${fileName}` });
  }
  return c.json({ error: 'No valid image uploaded' }, 400);
});

app.get('/', (c) => {
  return c.json({ status: 'ok', message: 'Borsch Core V2 API is alive!' });
});

app.get('/api/menu', async (c) => {
  const items = await prisma.menuItem.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' }
  });
  return c.json(items);
});

app.get('/api/menu/categories', async (c) => {
  const categories = await prisma.menuCategory.findMany();
  return c.json(categories);
});

app.post('/api/menu', async (c) => {
  const body = await c.req.json();
  const item = await prisma.menuItem.create({ data: body });
  return c.json(item);
});

app.put('/api/menu/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const item = await prisma.menuItem.update({ where: { id }, data: body });
  return c.json(item);
});

app.patch('/api/menu/:id/stock', async (c) => {
  const id = c.req.param('id');
  const { stock } = await c.req.json();
  const item = await prisma.menuItem.update({ where: { id }, data: { stock } });
  return c.json(item);
});

app.patch('/api/menu/:id/active', async (c) => {
  const id = c.req.param('id');
  const { isActive } = await c.req.json();
  const item = await prisma.menuItem.update({ where: { id }, data: { isActive } });
  return c.json(item);
});

app.delete('/api/menu/:id', async (c) => {
  const id = c.req.param('id');
  await prisma.menuItem.delete({ where: { id } });
  return c.json({ success: true });
});


// Роуты для Инвентаря
app.get('/api/inventory', async (c) => {
  const items = await prisma.inventoryItem.findMany({
      include: { recipes: true }
  });
  return c.json(items);
});

import { sendTelegramNotification, writeOffStock, calculateDeficitAndDraftPurchases } from './services';

// Роуты для Заказов
app.get('/api/orders', async (c) => {
  const orders = await prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' }
  });
  return c.json(orders);
});

app.post('/api/orders', async (c) => {
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

app.patch('/api/orders/:id/status', async (c) => {
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

app.patch('/api/orders/:id', async (c) => {
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

app.delete('/api/orders/:id', async (c) => {
  const id = c.req.param('id');
  await prisma.order.delete({ where: { id } });
  // Maybe emit an event for delete if needed, but not strictly required
  return c.json({ success: true });
});


// Роуты для Поставщиков
app.get('/api/suppliers', async (c) => {
  const suppliers = await prisma.supplier.findMany({
      include: { orders: true }
  });
  return c.json(suppliers);
});

app.post('/api/suppliers', async (c) => {
  const body = await c.req.json();
  const supplier = await prisma.supplier.create({ data: body });
  return c.json(supplier);
});

app.get('/api/suppliers/orders', async (c) => {
  const orders = await prisma.supplierOrder.findMany({
      include: { supplier: true },
      orderBy: { createdAt: 'desc' }
  });
  return c.json(orders);
});

app.post('/api/suppliers/orders', async (c) => {
  const body = await c.req.json();
  const order = await prisma.supplierOrder.create({ data: body });
  return c.json(order);
});

// Роуты для Клиентов
app.get('/api/clients', async (c) => {
  const clients = await prisma.client.findMany({
      orderBy: { ltv: 'desc' },
      include: { orders: true }
  });
  return c.json(clients);
});

app.post('/api/clients', async (c) => {
  const body = await c.req.json();
  const client = await prisma.client.create({ data: body });
  return c.json(client);
});

// Роуты для Рецептов
app.get('/api/recipes', async (c) => {
  const recipes = await prisma.recipe.findMany({
      include: { ingredients: true }
  });
  return c.json(recipes);
});
const port = process.env.PORT ? parseInt(process.env.PORT) : 3002;
console.log(`[🚀] Borsch API API running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port
});
