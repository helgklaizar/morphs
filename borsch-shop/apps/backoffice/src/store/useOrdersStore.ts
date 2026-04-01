import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'delivering' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  menuItemName: string;
  quantity: number;
  priceAtTime?: number;
  menuItemId?: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  reservationDate?: string;
  paymentMethod: string;
  items: OrderItem[];
  isArchived: boolean;
}

interface OrdersState {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  updateOrder: (id: string, payload: Partial<Order>) => Promise<void>;
  updateOrderFull: (order: Order) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  archiveOrder: (id: string) => Promise<void>;
  subscribeToOrders: () => void;
  unsubscribeFromOrders: () => void;
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  isLoading: true,
  error: null,

  fetchOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const parsedOrders: Order[] = (data || []).map((row: any) => ({
        id: row.id,
        customerName: row.customer_name || '',
        customerPhone: row.customer_phone || '',
        status: (row.status as OrderStatus) || 'new',
        totalAmount: row.total_amount || 0,
        createdAt: row.created_at,
        reservationDate: row.reservation_date,
        paymentMethod: row.payment_method || 'cash',
        isArchived: row.is_archived || false,
        items: (row.order_items || []).map((item: any) => ({
          id: item.id,
          menuItemName: item.menu_item_name || '',
          quantity: item.quantity || 1,
          priceAtTime: item.price_at_time || 0,
          menuItemId: item.menu_item_id || null,
        }))
      }));

      set({ orders: parsedOrders, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  updateOrderStatus: async (id, status) => {
    const prevOrders = get().orders;
    try {
      set(state => ({
        orders: state.orders.map(o => o.id === id ? { ...o, status } : o)
      }));
      const { error } = await supabase.from('orders').update({ status }).eq('id', id).select();
      if (error) throw error;
    } catch (err: any) {
      console.error("updateOrderStatus error:", err);
      alert("Ошибка изменения статуса заказа: " + err.message);
      set({ orders: prevOrders });
    }
  },

  updateOrder: async (id, payload) => {
    const prevOrders = get().orders;
    try {
      set(state => ({
        orders: state.orders.map(o => o.id === id ? { ...o, ...payload } : o)
      }));
      const updateData: any = {};
      if (payload.customerName !== undefined) updateData.customer_name = payload.customerName;
      if (payload.customerPhone !== undefined) updateData.customer_phone = payload.customerPhone;
      if (payload.paymentMethod !== undefined) updateData.payment_method = payload.paymentMethod;
      if (payload.totalAmount !== undefined) updateData.total_amount = payload.totalAmount;
      if (payload.reservationDate !== undefined) updateData.reservation_date = payload.reservationDate;
      const { error } = await supabase.from('orders').update(updateData).eq('id', id);
      if (error) throw error;
    } catch (err: any) {
      console.error("updateOrder error:", err);
      alert("Ошибка изменения заказа: " + err.message);
      set({ orders: prevOrders });
    }
  },

  updateOrderFull: async (order) => {
    try {
      const updateData = {
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        payment_method: order.paymentMethod,
        total_amount: order.totalAmount,
        reservation_date: order.reservationDate,
      };
      
      const { error: updateError } = await supabase.from('orders').update(updateData).eq('id', order.id).select();
      if (updateError) throw updateError;
      
      const { error: deleteError } = await supabase.from('order_items').delete().eq('order_id', order.id).select();
      if (deleteError) throw deleteError;

      const itemsToInsert = order.items.map(item => ({
         order_id: order.id,
         menu_item_name: item.menuItemName,
         quantity: item.quantity,
         price_at_time: item.priceAtTime,
         menu_item_id: (item.menuItemId === "delivery" || !item.menuItemId) ? null : item.menuItemId,
      }));
      
      if (itemsToInsert.length > 0) {
        const { error: insertError } = await supabase.from('order_items').insert(itemsToInsert).select();
        if (insertError) throw insertError;
      }
      
      get().fetchOrders();
    } catch (err: any) {
      console.error("updateOrderFull error:", err);
      alert("Ошибка сохранения заказа: " + err.message);
      // rollback visually by re-fetching
      get().fetchOrders();
    }
  },

  deleteOrder: async (id) => {
    const prevOrders = get().orders;
    set(state => ({ orders: state.orders.filter(o => o.id !== id) }));
    try {
      await supabase.from('order_items').delete().eq('order_id', id).select();
      const { error } = await supabase.from('orders').delete().eq('id', id).select();
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      alert("Ошибка удаления заказа: " + err.message);
      set({ orders: prevOrders });
    }
  },

  archiveOrder: async (id) => {
    const prevOrders = get().orders;
    try {
      set(state => ({ orders: state.orders.filter(o => o.id !== id) }));
      const { error } = await supabase.from('orders').update({ is_archived: true }).eq('id', id).select();
      if (error) throw error;
    } catch (err: any) {
      console.error("archiveOrder error:", err);
      alert("Ошибка при архивировании заказа: " + err.message);
      set({ orders: prevOrders });
    }
  },

  subscribeToOrders: () => {
    supabase.channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          get().fetchOrders();
        }
      )
      .subscribe();
  },

  unsubscribeFromOrders: () => {
    supabase.channel('orders-realtime').unsubscribe();
  }
}));
