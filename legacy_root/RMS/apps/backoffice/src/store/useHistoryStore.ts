import { create } from 'zustand';
import { HistoryRepository } from '@/lib/repositories/history';
import { Order } from './useOrdersStore';

interface HistoryState {
  history: Order[];
  isLoading: boolean;
  error: string | null;
  fetchHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  history: [],
  isLoading: true,
  error: null,

  fetchHistory: async () => {
    set({ isLoading: true, error: null });
    try {
      const parsedOrders = await HistoryRepository.fetchHistory();
      set({ history: parsedOrders, isLoading: false });
    } catch (err: any) {
      console.error("fetchHistory err:", err);
      set({ error: err.message, isLoading: false });
    }
  },
}));
