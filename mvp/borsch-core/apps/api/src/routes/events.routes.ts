import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { sseEmitter } from '../events';

const router = new Hono();

router.get('/', async (c) => {
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

export default router;
