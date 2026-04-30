import { create } from 'zustand';
import { SupplierProductRecord, SupplierOrderRecord, SupplierProductsRepository } from '@/lib/repositories/supplierProducts';
import { useToastStore } from '@/store/useToastStore';

export type SupplierProduct = SupplierProductRecord;
export type SupplierOrder = SupplierOrderRecord;

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

export const useSupplierProductsStore = create<SupplierProductsState>((set, get) => ({
  products: [],
  orders: [],
  isLoading: false,
  error: null,

  fetchProducts: async (supplierId) => {
    if (!supplierId) return;
    set({ isLoading: true });
    try {
      const records = await SupplierProductsRepository.fetchProducts(supplierId);
      set({ products: records, isLoading: false });
    } catch(e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  fetchOrders: async (supplierId) => {
    if (!supplierId) return;
    try {
      const records = await SupplierProductsRepository.fetchOrders(supplierId);
      set({ orders: records });
    } catch(e: any) {
      console.error(e);
    }
  },

  addProduct: async (product) => {
    try {
      await SupplierProductsRepository.addProduct(product);
      if (product.supplier_id) get().fetchProducts(product.supplier_id);
    } catch(e: any) {
      useToastStore.getState().error("Ошибка сохранения: " + e.message);
    }
  },

  deleteProduct: async (id, supplierId) => {
    try {
      await SupplierProductsRepository.deleteProduct(id);
      get().fetchProducts(supplierId);
    } catch(e) { console.error(e); }
  },

  createOrder: async (supplierId, items, via) => {
    try {
      await SupplierProductsRepository.createOrder(supplierId, items, via);
      get().fetchOrders(supplierId);
      useToastStore.getState().success('Заказ отправлен!');
    } catch(e: any) {
      useToastStore.getState().error("Ошибка: " + e.message);
    }
  }
}));
