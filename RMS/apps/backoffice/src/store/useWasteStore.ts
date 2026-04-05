import { create } from 'zustand';
import { WasteRecord, WasteRepository } from '@/lib/repositories/waste';
import { useToastStore } from '@/store/useToastStore';

export type { WasteRecord };

interface WasteState {
  records: WasteRecord[];
  isLoading: boolean;
  error: string | null;
  fetchWaste: () => Promise<void>;
  addWaste: (item: Partial<WasteRecord>) => Promise<void>;
}

export const useWasteStore = create<WasteState>((set, get) => ({
  records: [],
  isLoading: true,
  error: null,

  fetchWaste: async () => {
    set({ isLoading: true, error: null });
    try {
      const records = await WasteRepository.fetchAll();
      set({ records, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addWaste: async (item) => {
    try {
      await WasteRepository.addWaste(item);
      await get().fetchWaste();
    } catch (err: any) {
      useToastStore.getState().error("Ошибка списания: " + err.message);
      throw err;
    }
  }
}));
