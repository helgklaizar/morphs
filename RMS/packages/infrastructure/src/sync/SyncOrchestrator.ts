import { NetworkState } from '../../../../../apps/backoffice/src/store/useNetworkStore';

export interface SyncStatus {
    isOnline: boolean;
    pendingOrdersCount: number;
}

export interface IConnectionManager {
    checkConnection(): Promise<boolean>;
    onStatusChange(callback: (isOnline: boolean) => void): void;
}

export class SyncOrchestrator {
    private isManuallyOffline: boolean = false;
    private currentOnlineStatus: boolean = true;

    constructor(
        private connectionManager: IConnectionManager,
        private onStatusChangeToUI: (status: NetworkState) => void
    ) {
        this.connectionManager.onStatusChange((isOnline) => {
            this.handleStatusChange(isOnline);
        });
    }

    public getCurrentStatus(): SyncStatus {
        return {
            isOnline: this.currentOnlineStatus && !this.isManuallyOffline,
            pendingOrdersCount: 0 // TODO: count from idb/sqlite
        };
    }

    private handleStatusChange(isOnline: boolean) {
        this.currentOnlineStatus = isOnline;
        if (this.isManuallyOffline && !isOnline) return;

        if (isOnline) {
            this.isManuallyOffline = false;
            this.onStatusChangeToUI('online');
            this.flushOfflineOrdersQueue();
        } else {
            this.onStatusChangeToUI('reconnecting');
        }
    }

    public forceOfflineMode() {
        this.isManuallyOffline = true;
        this.onStatusChangeToUI('offline_mode');
    }

    private async flushOfflineOrdersQueue() {
        console.log("⚡️ Network Restored. Initiating Auto-Recovery Push...");
    }
}
