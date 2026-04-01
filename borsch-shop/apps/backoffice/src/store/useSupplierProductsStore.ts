import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface SupplierProduct {
  id: string;
  supplierId: string;
  supplierName: string; // The name the supplier calls this product
  imageUrl: string;
  notes: string;
  prices: Record<string, number>; // {"кг": 10.5, "шт": 5.0}
}

export interface SupplierOrder {
  id: string;
  supplierId: string;
  status: string;
  sentVia: string;
  totalAmount: number;
  createdAt: string;
  items: any[];
}

interface SupplierProductsState {
  products: SupplierProduct[];
  orders: SupplierOrder[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: (supplierId: string) => Promise<void>;
  fetchOrders: (supplierId: string) => Promise<void>;
  addProduct: (product: Partial<SupplierProduct>) => Promise<void>;
  deleteProduct: (id: string, supplierId: string) => Promise<void>;
  createOrder: (supplierId: string, items: any[], via: string) => Promise<void>;
}

export const useSupplierProductsStore = create<SupplierProductsState>((set) => ({
  products: [],
  orders: [],
  isLoading: false,
  error: null,

  fetchProducts: async (supplierId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.from('supplier_products').select('*').eq('supplier_id', supplierId);
      if (error && error.code !== '42P01') throw error;
      const parsed = (data || []).map((r: any) => ({
        id: r.id,
        supplierId: r.supplier_id,
        supplierName: r.supplier_name,
        imageUrl: r.image_url || '',
        notes: r.notes || '',
        prices: r.prices || {}
      }));
      set({ products: parsed, isLoading: false });
    } catch(e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  fetchOrders: async (supplierId) => {
    try {
      const { data, error } = await supabase.from('supplier_orders').select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false });
      if (error && error.code !== '42P01') throw error;
      set({ orders: data || [] });
    } catch(e: any) {
      console.error(e);
    }
  },

  addProduct: async (product) => {
    try {
      const payload = {
        supplier_id: product.supplierId,
        supplier_name: product.supplierName,
        image_url: product.imageUrl || '',
        notes: product.notes || '',
        prices: product.prices || {}
      };
      await supabase.from('supplier_products').insert(payload);
      const state = useSupplierProductsStore.getState();
      if (product.supplierId) state.fetchProducts(product.supplierId);
    } catch(e) {
      alert("Error saving: " + e);
    }
  },

  deleteProduct: async (id, supplierId) => {
    try {
      await supabase.from('supplier_products').delete().eq('id', id);
      useSupplierProductsStore.getState().fetchProducts(supplierId);
    } catch(e) { console.error(e); }
  },

  createOrder: async (supplierId, items, via) => {
    try {
      const { data, error } = await supabase.from('supplier_orders').insert({
         supplier_id: supplierId,
         status: 'sent',
         sent_via: via,
         items: items
      }).select().single();
      
      if (error) throw error;
      useSupplierProductsStore.getState().fetchOrders(supplierId);
      alert('Заказ отправлен/сохранен!');
    } catch(e) {
      alert("Error: " + e);
    }
  }
}));
