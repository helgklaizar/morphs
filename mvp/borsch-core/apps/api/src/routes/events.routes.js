"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const streaming_1 = require("hono/streaming");
const events_1 = require("../events");
const router = new hono_1.Hono();
router.get('/', async (c) => {
    return (0, streaming_1.streamSSE)(c, async (stream) => {
        const onNewOrder = (data) => stream.writeSSE({ event: 'order-created', data: JSON.stringify(data) });
        const onUpdateOrder = (data) => stream.writeSSE({ event: 'order-updated', data: JSON.stringify(data) });
        events_1.sseEmitter.on('order-created', onNewOrder);
        events_1.sseEmitter.on('order-updated', onUpdateOrder);
        const interval = setInterval(() => stream.writeSSE({ event: 'ping', data: 'ok' }), 30000);
        c.req.raw.signal.addEventListener('abort', () => {
            clearInterval(interval);
            events_1.sseEmitter.off('order-created', onNewOrder);
            events_1.sseEmitter.off('order-updated', onUpdateOrder);
        });
        // Держим соединение открытым
        await new Promise(() => { });
    });
});
exports.default = router;
//# sourceMappingURL=events.routes.js.map