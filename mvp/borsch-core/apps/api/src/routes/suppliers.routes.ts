import { Hono } from 'hono';
import * as suppliersService from '../services/suppliers.service';

const router = new Hono();

router.get('/', async (c) => {
  const suppliers = await suppliersService.fetchAllSuppliers();
  return c.json(suppliers);
});

router.post('/', async (c) => {
  const body = await c.req.json();
  const supplier = await suppliersService.createSupplier(body);
  return c.json(supplier);
});

router.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await suppliersService.deleteSupplier(id);
  return c.json({ success: true });
});

router.get('/orders', async (c) => {
  const orders = await suppliersService.fetchAllSupplierOrders();
  return c.json(orders);
});

router.post('/orders', async (c) => {
  const body = await c.req.json();
  const order = await suppliersService.createSupplierOrder(body);
  return c.json(order);
});

router.delete('/orders/:id', async (c) => {
  const id = c.req.param('id');
  await suppliersService.deleteSupplierOrder(id);
  return c.json({ success: true });
});

export default router;

