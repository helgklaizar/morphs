import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
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
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('is_archived', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const parsedOrders: Order[] = (data || []).map((row: any) => ({
        id: row.id,
        customerName: row.customer_name || '',
        customerPhone: row.customer_phone || '',
        status: row.status || 'new',
        totalAmount: row.total_amount || 0,
        createdAt: row.created_at,
        reservationDate: row.reservation_date,
        paymentMethod: row.payment_method || 'cash',
        isArchived: row.is_archived || false,
        items: (row.order_items || []).map((item: any) => ({
          id: item.id,
          menuItemName: item.menu_item_name || '',
          quantity: item.quantity || 1,
        }))
      }));

      set({ history: parsedOrders, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
}));
