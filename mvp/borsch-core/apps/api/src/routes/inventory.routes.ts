import { Hono } from 'hono';
import { prisma } from '../db';
import * as inventoryService from '../services/inventory.service';

const router = new Hono();

router.get('/', async (c) => {
  const items = await prisma.inventoryItem.findMany({
      include: { recipes: true, category: true },
      orderBy: { name: 'asc' }
  });
  return c.json(items);
});

router.get('/categories', async (c) => {
  const cats = await prisma.inventoryCategory.findMany({ orderBy: { orderIndex: 'asc' } });
  return c.json(cats);
});

router.post('/categories', async (c) => {
  const body = await c.req.json();
  const cat = await inventoryService.createInventoryCategory(body);
  return c.json(cat);
});

router.put('/categories/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const cat = await inventoryService.updateInventoryCategory(id, body);
  return c.json(cat);
});

router.delete('/categories/:id', async (c) => {
  const id = c.req.param('id');
  const result = await inventoryService.deleteInventoryCategory(id);
  return c.json(result);
});

router.post('/', async (c) => {
  const body = await c.req.json();
  const item = await inventoryService.createInventoryItem(body);
  return c.json(item);
});

router.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const item = await inventoryService.updateInventoryItem(id, body);
  return c.json(item);
});

router.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await inventoryService.deleteInventoryItem(id);
  return c.json(result);
});

export default router;

