import { create } from 'zustand';
import { InventoryCategory, InventoryItem, InventoryRepository } from '@/lib/repositories/inventory';
import { pb } from '@/lib/pocketbase';
import { useToastStore } from '@/store/useToastStore';
import { LocalInventoryRepository } from '@/lib/repositories/localInventory';

const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;

export type { InventoryCategory, InventoryItem };

interface InventoryState {
  categories: InventoryCategory[];
  isLoading: boolean;
  error: string | null;
  fetchInventory: () => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  saveItem: (item: Partial<InventoryItem> & { categoryId: string, name: string }) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  updateItemQuantity: (id: string, newQuantity: number) => Promise<void>;
  toggleCategoryVisibility: (id: string, field: 'is_visible_in_assemblies' | 'is_visible_in_recipe', newValue: boolean) => Promise<void>;
  subscribeToInventory: () => void;
  unsubscribeFromInventory: () => void;
  reorderCategories: (startIndex: number, endIndex: number) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  categories: [],
  isLoading: true,
  error: null,

  fetchInventory: async () => {
    set({ isLoading: true, error: null });
    try {
      const parsedCategories = isTauri 
        ? await LocalInventoryRepository.fetchAll()
        : await InventoryRepository.fetchAll();
      set({ categories: parsedCategories, isLoading: false });
    } catch (err: any) {
      console.error("fetchInventory err:", err);
      set({ error: err.message, isLoading: false });
    }
  },

  addCategory: async (name: string) => {
    try {
      const maxOrder = get().categories.reduce((max, c) => Math.max(max, c.orderIndex), -1);
      if (isTauri) {
        await LocalInventoryRepository.addCategory(name, maxOrder);
      } else {
        await InventoryRepository.addCategory(name, maxOrder);
      }
      await get().fetchInventory();
    } catch (err: any) {
      useToastStore.getState().error("Ошибка при добавлении категории: " + err.message);
      throw err;
    }
  },

  deleteCategory: async (id: string) => {
    try {
      if (isTauri) {
        await LocalInventoryRepository.deleteCategory(id);
      } else {
        await InventoryRepository.deleteCategory(id);
      }
      await get().fetchInventory();
    } catch (err) {
      console.error(err);
    }
  },

  saveItem: async (item) => {
    try {
      if (isTauri) {
        await LocalInventoryRepository.saveItem(item);
      } else {
        await InventoryRepository.saveItem(item);
      }
      await get().fetchInventory();
    } catch (err: any) {
      useToastStore.getState().error("Ошибка сохранения: " + err.message);
      throw err;
    }
  },

  deleteItem: async (id) => {
    try {
      if (isTauri) {
        await LocalInventoryRepository.deleteItem(id);
      } else {
        await InventoryRepository.deleteItem(id);
      }
      await get().fetchInventory();
    } catch (err) {
      console.error(err);
    }
  },

  updateItemQuantity: async (id, newQuantity) => {
    try {
      set(state => ({
        categories: state.categories.map(cat => ({
          ...cat,
          items: cat.items.map(item => item.id === id ? { ...item, quantity: newQuantity } : item)
        }))
      }));
      if (isTauri) {
        await LocalInventoryRepository.updateQuantity(id, newQuantity);
      } else {
        await InventoryRepository.updateQuantity(id, newQuantity);
      }
    } catch (err) {
      console.error(err);
    }
  },

  toggleCategoryVisibility: async (id, field, newValue) => {
    try {
      set(state => ({
        categories: state.categories.map(cat => {
          if (cat.id !== id) return cat;
          return {
            ...cat,
            isVisibleInAssemblies: field === 'is_visible_in_assemblies' ? newValue : cat.isVisibleInAssemblies,
            isVisibleInRecipe: field === 'is_visible_in_recipe' ? newValue : cat.isVisibleInRecipe,
          };
        })
      }));
      if (isTauri) {
        await LocalInventoryRepository.updateCategoryVisibility(id, field, newValue);
      } else {
        await InventoryRepository.updateCategoryVisibility(id, field, newValue);
      }
    } catch (err) {
      console.error(err);
    }
  },

  subscribeToInventory: async () => {
    if (isTauri) {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        listen('sync-completed', () => {
          get().fetchInventory();
        });
      } catch (e) {
        console.error("Failed to subscribe to tauri events", e);
      }
      return;
    }

    pb.collection('inventory_items').subscribe('*', () => get().fetchInventory());
    pb.collection('inventory_categories').subscribe('*', () => get().fetchInventory());
  },

  unsubscribeFromInventory: () => {
    if (isTauri) return;
    pb.collection('inventory_items').unsubscribe('*');
    pb.collection('inventory_categories').unsubscribe('*');
  },

  reorderCategories: async (startIndex, endIndex) => {
    try {
      const cats = [...get().categories];
      const [removed] = cats.splice(startIndex, 1);
      cats.splice(endIndex, 0, removed);
      
      const updatedCats = cats.map((c, idx) => ({ ...c, orderIndex: idx }));
      set({ categories: updatedCats });
      
      // Update in background
      Promise.all(
        updatedCats.map(c => 
          isTauri
            ? LocalInventoryRepository.updateCategoryOrder(c.id, c.orderIndex)
            : InventoryRepository.updateCategoryOrder(c.id, c.orderIndex)
        )
      ).catch(err => {
        console.error("Failed to save reorder", err);
      });
    } catch (err) {
      console.error(err);
    }
  }
}));
