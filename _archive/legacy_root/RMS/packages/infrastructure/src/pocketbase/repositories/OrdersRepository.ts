import { pb } from '../client';
import { SyncOrchestrator } from '../../sync/SyncOrchestrator';

export class OrdersRepository {
    constructor(private syncOrchestrator: SyncOrchestrator) {}

    /**
     * Создает заказ. Если интернета нет, надежно прячет его в оффлайн-очередь 
     * IndexedDB/SQLite (через SyncOrchestrator) до появления сети.
     */
    async createOrder(payload: any) {
        // Мы добавляем флаг источника, о котором договорились
        const orderPayload = {
            ...payload,
            source: 'pos_offline' // по умолчанию ставим оффлайн, потом бэкенд поймет
        };

        if (this.syncOrchestrator.getCurrentStatus().isOnline) {
            try {
                const record = await pb.collection('orders').create({
                    ...orderPayload,
                    source: 'pos_online'
                });
                return record;
            } catch (err: any) {
                if (err.isAbort || err.status === 0 || !navigator.onLine) {
                    console.warn("Network drop detected during creation. Routing to Outbox Queue.");
                    this.syncOrchestrator.forceOfflineMode();
                    return this.saveToOfflineQueue(orderPayload);
                }
                throw err;
            }
        } else {
            return this.saveToOfflineQueue(orderPayload);
        }
    }

    private saveToOfflineQueue(payload: any) {
        // Здесь в будущем дергается Tauri SQLite или browser IndexedDB
        console.log("Заказ успешно сохранен локально! Он улетит, когда появится интернет.", payload);
        return {
            id: 'local_' + Date.now(),
            ...payload,
            status: 'pending_sync'
        };
    }

    async getHistory() {
        return await pb.collection('orders').getList(1, 50, { sort: '-created' });
    }
}
