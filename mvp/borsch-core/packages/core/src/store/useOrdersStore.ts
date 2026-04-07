import { create } from 'zustand';

interface OrdersState {
  viewMode: 'regular' | 'mega' | 'kitchen';
  setViewMode: (mode: 'regular' | 'mega' | 'kitchen') => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
}

export const useOrdersStore = create<OrdersState>((set) => ({
  viewMode: 'regular',
  setViewMode: (mode) => set({ viewMode: mode }),
  statusFilter: 'all',
  setStatusFilter: (filter) => set({ statusFilter: filter }),
}));
