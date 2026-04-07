import { create } from 'zustand';
import { pb } from '@rms/db-local';
import { InventoryItem, Supplier, SupplierProduct, SupplierOrder } from '@rms/types';

interface InventoryState {
  items: InventoryItem[];
  suppliers: Supplier[];
  supplierProducts: SupplierProduct[];
  supplierOrders: SupplierOrder[];
  categories: any[];
  isLoading: boolean;
  error: string | null;

  fetchInventory: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchSuppliers: () => Promise<void>;
  saveInventoryItem: (item: Partial<InventoryItem>) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  
  saveSupplierOrder: (order: Partial<SupplierOrder>) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  suppliers: [],
  supplierProducts: [],
  supplierOrders: [],
  categories: [],
  isLoading: true,
  error: null,

  fetchInventory: async () => {
    set({ isLoading: true });
    try {
      const records = await pb.collection('inventory_items').getFullList({ sort: '-created' });
      const items = records.map(r => ({
        id: r.id,
        name: r.name,
        price: r.price,
        unit: r.unit,
        quantity: r.quantity || r.stock,
        categoryId: r.category_id,
        supplier: r.supplier
      })) as InventoryItem[];
      set({ items, isLoading: false, error: null });
    } catch (err: any) {
      console.error(err);
      set({ isLoading: false, error: err.message });
    }
  },

  fetchCategories: async () => {
    try {
      const records = await pb.collection('inventory_categories').getFullList({ sort: 'order_index' });
      const categories = records.map(r => ({
        id: r.id, name: r.name, orderIndex: r.order_index
      }));
      set({ categories });
    } catch (err) {
      console.error(err);
    }
  },

  fetchSuppliers: async () => {
    try {
      const records = await pb.collection('suppliers').getFullList();
      const suppliers = records.map(r => ({
         id: r.id, name: r.name, phone: r.phone, address: r.address, hours: r.work_hours
      })) as Supplier[];

      const productRecords = await pb.collection('supplier_products').getFullList();
      const supplierProducts = productRecords as unknown as SupplierProduct[];

      const orderRecords = await pb.collection('supplier_orders').getFullList({ sort: '-created' });
      const supplierOrders = orderRecords.map((r: any) => ({
        id: r.id, supplierId: r.supplier_id, status: r.status, items: r.items, totalAmount: r.total_amount, createdAt: r.created
      })) as any[];

      set({ suppliers, supplierProducts, supplierOrders });
    } catch (err) {
      console.error(err);
    }
  },

  saveInventoryItem: async (item) => {
    try {
      const data = {
        name: item.name,
        price: item.price,
        unit: item.unit,
        stock: item.quantity,
        supplier: item.supplier
      };
      if (item.id) {
        await pb.collection('inventory_items').update(item.id, data);
      } else {
        await pb.collection('inventory_items').create(data);
      }
      await get().fetchInventory();
    } catch (err) {
      console.error(err);
    }
  },

  deleteInventoryItem: async (id) => {
    try {
      await pb.collection('inventory_items').delete(id);
      await get().fetchInventory();
    } catch (err) {
      console.error(err);
    }
  },

  saveSupplierOrder: async (order) => {
    try {
      const data = {
        supplier_id: order.supplierId,
        status: order.status || 'draft',
        items: order.items, 
        total_amount: order.totalAmount
      };
      if (order.id) {
         await pb.collection('supplier_orders').update(order.id, data);
      } else {
         await pb.collection('supplier_orders').create(data);
      }
      await get().fetchSuppliers();
    } catch (err) {
      console.error(err);
    }
  }
}));
