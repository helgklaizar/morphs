import { Hono } from 'hono';
import { prisma } from '../db';
import { zValidator } from '@hono/zod-validator';
import * as menuService from '../services/menu.service';
import { 
  createMenuCategorySchema, 
  updateMenuCategorySchema, 
  createMenuItemSchema, 
  updateMenuItemSchema 
} from '@rms/core';

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

router.post('/categories', zValidator('json', createMenuCategorySchema), async (c) => {
  const body = c.req.valid('json');
  const category = await menuService.createCategory(body);
  return c.json(category);
});

router.put('/categories/:id', zValidator('json', updateMenuCategorySchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');
  const category = await menuService.updateCategory(id, body);
  return c.json(category);
});

router.delete('/categories/:id', async (c) => {
  const id = c.req.param('id');
  const result = await menuService.deleteCategory(id);
  return c.json(result);
});

router.post('/', zValidator('json', createMenuItemSchema), async (c) => {
  const body = c.req.valid('json');
  const item = await menuService.createMenuItem(body);
  return c.json(item);
});

router.put('/:id', zValidator('json', updateMenuItemSchema), async (c) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');
  const item = await menuService.updateMenuItem(id, body);
  return c.json(item);
});

router.patch('/:id/stock', async (c) => {
  const id = c.req.param('id');
  const { stock } = await c.req.json();
  const item = await menuService.updateStock(id, stock);
  return c.json(item);
});

router.patch('/:id/active', async (c) => {
  const id = c.req.param('id');
  const { isActive } = await c.req.json();
  const item = await menuService.updateMenuItem(id, { isActive });
  return c.json(item);
});

router.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const result = await menuService.deleteMenuItem(id);
  return c.json(result);
});

export default router;

