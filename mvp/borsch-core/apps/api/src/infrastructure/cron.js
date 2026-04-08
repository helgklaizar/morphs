"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCronJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const inventory_service_1 = require("../services/inventory.service");
const initCronJobs = () => {
    // Run every 10 minutes
    node_cron_1.default.schedule('*/10 * * * *', async () => {
        console.log('[Cron] Running calculateDeficitAndDraftPurchases...');
        try {
            await (0, inventory_service_1.calculateDeficitAndDraftPurchases)();
        }
        catch (e) {
            console.error('[Cron] Error running calculateDeficitAndDraftPurchases:', e);
        }
    });
    console.log('[🚀] Background Cron Jobs initialized.');
};
exports.initCronJobs = initCronJobs;
//# sourceMappingURL=cron.js.map