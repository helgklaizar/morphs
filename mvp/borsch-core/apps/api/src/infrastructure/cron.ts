import cron from 'node-cron';
import { calculateDeficitAndDraftPurchases } from '../services/inventory.service';

export const initCronJobs = () => {
    // Run every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
        console.log('[Cron] Running calculateDeficitAndDraftPurchases...');
        try {
            await calculateDeficitAndDraftPurchases();
        } catch (e) {
            console.error('[Cron] Error running calculateDeficitAndDraftPurchases:', e);
        }
    });
    
    console.log('[🚀] Background Cron Jobs initialized.');
};
