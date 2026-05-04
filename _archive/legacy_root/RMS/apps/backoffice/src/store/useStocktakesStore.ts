import { create } from 'zustand';
import { StocktakeRecord, StocktakeItemRecord, StocktakesRepository } from '@/lib/repositories/stocktakes';
import { useToastStore } from '@/store/useToastStore';

export type StocktakeItem = StocktakeItemRecord;
export type Stocktake = StocktakeRecord;

interface StocktakesState {
  records: Stocktake[];
  isLoading: boolean;
  error: string | null;
  fetchStocktakes: () => Promise<void>;
  createStocktake: (items: Partial<StocktakeItem>[]) => Promise<void>;
}

export const useStocktakesStore = create<StocktakesState>((set, get) => ({
  records: [],
  isLoading: true,
  error: null,

  fetchStocktakes: async () => {
    set({ isLoading: true, error: null });
    try {
      const records = await StocktakesRepository.fetchAll();
      set({ records, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createStocktake: async (items) => {
    try {
      await StocktakesRepository.create(items);
      get().fetchStocktakes();
    } catch (err: any) {
      useToastStore.getState().error("Ошибка инвентаризации: " + err.message);
    }
  }
}));
