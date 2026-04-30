import { create } from 'zustand';
import { SupplierRecord, SuppliersRepository } from '@/lib/repositories/suppliers';
import { LocalSuppliersRepository } from '@/lib/repositories/localSuppliers';
import { pb } from '@/lib/pocketbase';
import { useToastStore } from '@/store/useToastStore';

const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;

export type Supplier = SupplierRecord;

interface SuppliersState {
  suppliers: Supplier[];
  isLoading: boolean;
  error: string | null;
  fetchSuppliers: () => Promise<void>;
  addSupplier: (s: Partial<Supplier>) => Promise<void>;
  updateSupplier: (id: string, s: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  subscribeToSuppliers: () => void;
  unsubscribeFromSuppliers: () => void;
}

export const useSuppliersStore = create<SuppliersState>((set, get) => ({
  suppliers: [],
  isLoading: true,
  error: null,

  fetchSuppliers: async () => {
    set({ isLoading: true, error: null });
    try {
      if (isTauri) {
        // First try local cache
        const cached = await LocalSuppliersRepository.fetchAll();
        set({ suppliers: cached, isLoading: false });
        // Try to refresh from server and re-cache
        try {
          const records = await SuppliersRepository.fetchAll();
          await LocalSuppliersRepository.cacheFromServer(records);
          set({ suppliers: records, isLoading: false });
        } catch {
          // offline — use cached
        }
      } else {
        const records = await SuppliersRepository.fetchAll();
        set({ suppliers: records, isLoading: false });
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addSupplier: async (payload) => {
    try {
      if (isTauri) {
        await LocalSuppliersRepository.add(payload);
      } else {
        await SuppliersRepository.add(payload);
      }
      get().fetchSuppliers();
    } catch (err: any) {
      useToastStore.getState().error("Ошибка при добавлении: " + err.message);
    }
  },

  updateSupplier: async (id, payload) => {
    try {
      if (isTauri) {
        await LocalSuppliersRepository.update(id, payload);
      } else {
        await SuppliersRepository.update(id, payload);
      }
      get().fetchSuppliers();
    } catch (err: any) {
      console.error(err);
    }
  },

  deleteSupplier: async (id) => {
    try {
      if (isTauri) {
        await LocalSuppliersRepository.delete(id);
      } else {
        await SuppliersRepository.delete(id);
      }
      get().fetchSuppliers();
    } catch (err: any) {
      console.error(err);
    }
  },
  subscribeToSuppliers: async () => {
    if (isTauri) {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        listen('sync-completed', () => get().fetchSuppliers());
      } catch (e) { console.error(e); }
      return;
    }
    pb.collection('suppliers').subscribe('*', () => get().fetchSuppliers());
  },
  unsubscribeFromSuppliers: () => {
    if (isTauri) return;
    pb.collection('suppliers').unsubscribe('*');
  }
}));
