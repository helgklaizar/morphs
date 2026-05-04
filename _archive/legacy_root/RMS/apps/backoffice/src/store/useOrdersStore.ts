import { create } from 'zustand';
import { pb } from '@/lib/pocketbase';
import { OrdersRepository } from '@/lib/repositories/orders';
import { LocalOrdersRepository } from '@/lib/repositories/localOrders';
import { useToastStore } from '@/store/useToastStore';

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'delivering' | 'completed' | 'cancelled' | 'pending';

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
  tableId?: string;
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

const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  isLoading: true,
  error: null,

  fetchOrders: async () => {
    set({ isLoading: true, error: null });
    try {
      const parsedOrders = isTauri 
        ? await LocalOrdersRepository.fetchAll() 
        : await OrdersRepository.fetchAll();
      set({ orders: parsedOrders, isLoading: false });
    } catch (err: any) {
      console.error("fetchOrders err:", err);
      set({ error: err.message, isLoading: false });
    }
  },

  updateOrderStatus: async (id, status) => {
    const prevOrders = get().orders;
    const targetOrder = prevOrders.find(o => o.id === id);
    try {
      set(state => ({
        orders: state.orders.map(o => o.id === id ? { ...o, status } : o)
      }));
      
      if (isTauri) {
        await LocalOrdersRepository.updateStatus(id, status);
      } else {
        await OrdersRepository.updateStatus(id, status);
      }


    } catch (err: any) {
      console.error("updateOrderStatus error:", err);
      useToastStore.getState().error("Ошибка изменения статуса заказа: " + err.message);
      set({ orders: prevOrders });
    }
  },

  updateOrder: async (id, payload) => {
    const prevOrders = get().orders;
    const targetOrder = prevOrders.find(o => o.id === id);
    try {
      set(state => ({
        orders: state.orders.map(o => o.id === id ? { ...o, ...payload } : o)
      }));
      
      if (isTauri) {
        await LocalOrdersRepository.updateFields(id, payload);
      } else {
        await OrdersRepository.updateFields(id, payload);
      }


    } catch (err: any) {
      console.error("updateOrder error:", err);
      useToastStore.getState().error("Ошибка изменения заказа: " + err.message);
      set({ orders: prevOrders });
    }
  },

  updateOrderFull: async (order) => {
    try {
      if (isTauri) {
        await LocalOrdersRepository.updateFull(order);
      } else {
        // Fallback for web is not fully implemented in OrdersRepository, but we map it:
        await OrdersRepository.updateFields(order.id, order);
      }
      get().fetchOrders();
    } catch (err: any) {
      console.error("updateOrderFull error:", err);
      useToastStore.getState().error("Ошибка сохранения заказа: " + err.message);
      get().fetchOrders();
    }
  },

  deleteOrder: async (id) => {
    const prevOrders = get().orders;
    set(state => ({ orders: state.orders.filter(o => o.id !== id) }));
    try {
      if (isTauri) {
        await LocalOrdersRepository.delete(id);
      } else {
        await OrdersRepository.delete(id);
      }
    } catch (err: any) {
      console.error(err);
      useToastStore.getState().error("Ошибка удаления заказа: " + err.message);
      set({ orders: prevOrders });
    }
  },

  archiveOrder: async (id) => {
    const prevOrders = get().orders;
    try {
      set(state => ({ orders: state.orders.filter(o => o.id !== id) }));
      if (isTauri) {
        await LocalOrdersRepository.archive(id);
      } else {
        await OrdersRepository.archive(id);
      }
    } catch (err: any) {
      console.error("archiveOrder error:", err);
      useToastStore.getState().error("Ошибка при архивировании заказа: " + err.message);
      set({ orders: prevOrders });
    }
  },

  subscribeToOrders: async () => {
    if (isTauri) {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        listen('sync-completed', () => {
          console.log("Local sync completed, refetching orders...");
          get().fetchOrders();
        });
      } catch (e) {
        console.error("Failed to subscribe to tauri events", e);
      }
      return;
    }

    pb.collection('orders').subscribe('*', function (e) {
      const { action, record } = e;

      if (action === 'delete') {
        set(s => ({ orders: s.orders.filter(o => o.id !== record.id) }));
        return;
      }

      const mapped = {
        id: record.id,
        customerName: record.customer_name || '',
        customerPhone: record.customer_phone || '',
        status: (record.status?.toLowerCase() as OrderStatus) || 'new',
        totalAmount: record.total_amount || 0,
        createdAt: record.created,
        reservationDate: record.reservation_date || '',
        paymentMethod: record.payment_method || 'cash',
        isArchived: record.is_archived === 1,
        tableId: record.table_id || undefined,
        items: get().orders.find(o => o.id === record.id)?.items || [],
      };

      if (action === 'create') {
        set(s => ({ orders: [mapped, ...s.orders] }));
        return;
      }

      if (action === 'update') {
        const exists = get().orders.some(o => o.id === record.id);
        if (exists) {
          set(s => ({ orders: s.orders.map(o => o.id === record.id ? mapped : o) }));
        } else {
          const isActive = ['new', 'preparing', 'ready', 'delivering'].includes(mapped.status);
          if (isActive && !mapped.isArchived) {
            get().fetchOrders();
          }
        }
      }
    });
  },

  unsubscribeFromOrders: () => {
    if (!isTauri) {
      pb.collection('orders').unsubscribe('*');
    }
    // For Tauri, listen returns an unlisten function, but we keep it simple for now.
  }
}));
