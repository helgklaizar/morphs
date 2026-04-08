import { create } from 'zustand';

interface OrdersState {
  viewMode: 'regular' | 'mega' | 'kitchen' | 'clients';
  setViewMode: (mode: 'regular' | 'mega' | 'kitchen' | 'clients') => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
}

export const useOrdersStore = create<OrdersState>((set) => ({
  viewMode: 'regular',
  setViewMode: (mode) => set({ viewMode: mode }),
  statusFilter: 'all',
  setStatusFilter: (filter) => set({ statusFilter: filter }),
}));
