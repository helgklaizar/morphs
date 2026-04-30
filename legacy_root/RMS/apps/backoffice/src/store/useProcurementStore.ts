import { create } from 'zustand';
import { ProcurementRepository } from '@/lib/repositories/procurement';
import { LocalProcurementRepository } from '@/lib/repositories/localProcurement';
import { pb } from '@/lib/pocketbase';
import { useToastStore } from '@/store/useToastStore';

const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;

export interface ProcurementSuggestion {
  inventoryItemId: string;
  name: string;
  supplier: string;
  currentStock: number;
  minStock: number;
  suggestedOrderQty: number;
  estimatedCost: number;
  burnPerDay?: number;
  daysLeft?: number;
}

export interface SupplierOrderDraft {
  id: string;
  supplier_id: string;
  supplierName?: string;
  status: string;
  total_amount: number;
  items: string; // JSON string
  created: string;
}

interface ProcurementState {
  suggestions: ProcurementSuggestion[];
  drafts: SupplierOrderDraft[];
  isLoading: boolean;
  error: string | null;
  fetchSuggestions: () => Promise<void>;
  fetchDrafts: () => Promise<void>;
  createDrafts: (suggestions: ProcurementSuggestion[]) => Promise<void>;
  executeDraft: (id: string) => Promise<void>;
  receiveOrder: (id: string) => Promise<void>;
  deleteDraft: (id: string) => Promise<void>;
}

export const useProcurementStore = create<ProcurementState>((set, get) => ({
  suggestions: [],
  drafts: [],
  isLoading: false,
  error: null,

  fetchSuggestions: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await ProcurementRepository.suggestPurchases();
      set({ suggestions: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createDrafts: async (suggestions) => {
    try {
      set({ isLoading: true });
      await ProcurementRepository.createDraftOrders(suggestions);
      
      // Remove created drafts from suggestions locally
      set({ suggestions: [], isLoading: false });
      useToastStore.getState().success("Драфты заказов созданы!");
      get().fetchDrafts();
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchDrafts: async () => {
    try {
      if (isTauri) {
        const local = await LocalProcurementRepository.fetchDrafts();
        set({ drafts: local });
        // Try to sync from server and cache
        try {
          const data = await pb.collection('supplier_orders').getFullList({
            sort: '-created',
            expand: 'supplier_id'
          });
          const drafts: SupplierOrderDraft[] = data.map((d: any) => ({
            id: d.id,
            supplier_id: d.supplier_id,
            supplierName: d.expand?.supplier_id?.name || 'Неизвестный поставщик',
            status: d.status,
            total_amount: d.total_amount,
            items: d.items,
            created: d.created
          }));
          await LocalProcurementRepository.cacheFromServer(drafts);
          set({ drafts });
        } catch {
          // offline — use local
        }
      } else {
        const data = await pb.collection('supplier_orders').getFullList({
          sort: '-created',
          expand: 'supplier_id'
        });
        const drafts: SupplierOrderDraft[] = data.map((d: any) => ({
          id: d.id,
          supplier_id: d.supplier_id,
          supplierName: d.expand?.supplier_id?.name || 'Неизвестный поставщик',
          status: d.status,
          total_amount: d.total_amount,
          items: d.items,
          created: d.created
        }));
        set({ drafts });
      }
    } catch (err: any) {
      console.error(err);
    }
  },

  executeDraft: async (id) => {
    try {
      if (isTauri) {
        await LocalProcurementRepository.updateStatus(id, 'ordered');
      } else {
        await pb.collection('supplier_orders').update(id, { status: 'ordered' });
      }
      get().fetchDrafts();
      useToastStore.getState().success("Статус изменён на 'Заказано'");
    } catch (e) {
      console.error(e);
    }
  },

  receiveOrder: async (id) => {
    try {
      if (isTauri) {
        // receiveOrder must update inventory stock levels — this requires server coordination.
        // Allowing offline would cause stock desync across terminals.
        useToastStore.getState().error("Приёмка товаров требует подключения к серверу. Проверьте соединение и повторите.");
        return;
      }

      const order = await pb.collection('supplier_orders').getOne(id);
      if (order.status !== 'ordered') {
        useToastStore.getState().error("Можно принять только заказанные товары");
        return;
      }

      // Add to inventory
      let itemsList: any[] = [];
      try { itemsList = JSON.parse(order.items); } catch(e){}
      
      for (const item of itemsList) {
        if (item.inventoryItemId) {
          const invItem = await pb.collection('inventory_items').getOne(item.inventoryItemId);
          await pb.collection('inventory_items').update(item.inventoryItemId, {
            stock: (invItem.stock || 0) + item.quantity
          });
        }
      }

      await pb.collection('supplier_orders').update(id, { status: 'received' });
      get().fetchDrafts();
      useToastStore.getState().success("Товары успешно приняты на склад");
    } catch (e: any) {
      console.error(e);
      useToastStore.getState().error("Ошибка приемки: " + e.message);
    }
  },

  deleteDraft: async (id) => {
    try {
      if (isTauri) {
        await LocalProcurementRepository.deleteDraft(id);
      } else {
        await pb.collection('supplier_orders').delete(id);
      }
      get().fetchDrafts();
    } catch (e) {
      console.error(e);
    }
  }
}));
