"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_server_1 = require("@hono/node-server");
const hono_1 = require("hono");
const cors_1 = require("hono/cors");
const events_routes_1 = __importDefault(require("./routes/events.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const menu_routes_1 = __importDefault(require("./routes/menu.routes"));
const inventory_routes_1 = __importDefault(require("./routes/inventory.routes"));
const orders_routes_1 = __importDefault(require("./routes/orders.routes"));
const suppliers_routes_1 = __importDefault(require("./routes/suppliers.routes"));
const clients_routes_1 = __importDefault(require("./routes/clients.routes"));
const recipes_routes_1 = __importDefault(require("./routes/recipes.routes"));
const system_routes_1 = __importDefault(require("./routes/system.routes"));
// Раздача статики (для загруженных картинок)
const serve_static_1 = require("@hono/node-server/serve-static");
const app = new hono_1.Hono();
app.use('*', (0, cors_1.cors)({
    origin: '*', // В проде нужно ограничить
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use('/uploads/*', (0, serve_static_1.serveStatic)({ root: './public' }));
app.get('/', (c) => {
    return c.json({ status: 'ok', message: 'Borsch Core V2 API is alive!' });
});
// Роуты (Controllers)
app.route('/api/events', events_routes_1.default);
app.route('/api/auth', auth_routes_1.default);
app.route('/api/upload', upload_routes_1.default);
app.route('/api/menu', menu_routes_1.default);
app.route('/api/inventory', inventory_routes_1.default);
app.route('/api/orders', orders_routes_1.default);
app.route('/api/suppliers', suppliers_routes_1.default);
app.route('/api/clients', clients_routes_1.default);
app.route('/api/recipes', recipes_routes_1.default);
app.route('/api/system', system_routes_1.default);
const port = process.env.PORT ? parseInt(process.env.PORT) : 3002;
console.log(`[🚀] Borsch API API running on http://localhost:${port}`);
(0, node_server_1.serve)({
    fetch: app.fetch,
    port
});
//# sourceMappingURL=index.js.map