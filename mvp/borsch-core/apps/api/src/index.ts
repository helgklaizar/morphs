import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { initCronJobs } from './infrastructure/cron';

import eventsRoutes from './routes/events.routes';
import authRoutes from './routes/auth.routes';
import uploadRoutes from './routes/upload.routes';
import menuRoutes from './routes/menu.routes';
import inventoryRoutes from './routes/inventory.routes';
import ordersRoutes from './routes/orders.routes';
import suppliersRoutes from './routes/suppliers.routes';
import clientsRoutes from './routes/clients.routes';
import recipesRoutes from './routes/recipes.routes';
import systemRoutes from './routes/system.routes';

// Раздача статики (для загруженных картинок)
import { serveStatic } from '@hono/node-server/serve-static';

import { logger } from 'hono/logger';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({
  origin: '*', // В проде нужно ограничить
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Глобальная обработка ошибок
app.onError((err, c) => {
  console.error(`[🔥 API Error]: ${err.message}`);
  console.error(err.stack);
  
  const status = (err as any).status || 500;
  return c.json({
    success: false,
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  }, status);
});

app.use('/uploads/*', serveStatic({ root: './public' }));

app.get('/', (c) => {
  return c.json({ status: 'ok', message: 'Borsch Core V2 API is alive!' });
});


// Роуты (Controllers)
app.route('/api/events', eventsRoutes);
app.route('/api/auth', authRoutes);
app.route('/api/upload', uploadRoutes);
app.route('/api/menu', menuRoutes);
app.route('/api/inventory', inventoryRoutes);
app.route('/api/orders', ordersRoutes);
app.route('/api/suppliers', suppliersRoutes);
app.route('/api/clients', clientsRoutes);
app.route('/api/recipes', recipesRoutes);
app.route('/api/system', systemRoutes);

const port = process.env.PORT ? parseInt(process.env.PORT) : 3002;
console.log(`[🚀] Borsch API API running on http://localhost:${port}`);

initCronJobs();

serve({
  fetch: app.fetch,
  port
});
