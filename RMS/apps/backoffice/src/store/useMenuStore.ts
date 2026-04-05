import { create } from 'zustand';
import { pb } from '@/lib/pocketbase';
import { MenuRepository } from '@/lib/repositories/menu';
import { LocalMenuRepository } from '@/lib/repositories/localMenu';

const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  cost: number;
  description: string;
  stock: number;
  isActive: boolean;
  image: string;
  isPoll: boolean;
  recipeId?: string;
  assemblyId?: string;
  categoryId?: string;
  categoryName?: string;
  calories?: number;
  kitchenDepartment?: string;
  isPrep?: boolean;
  unit?: string;
  writeOffOnProduce?: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  orderIndex: number;
}

interface MenuState {
  items: MenuItem[];
  categories: MenuCategory[];
  isLoading: boolean;
  error: string | null;
  fetchMenuItems: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  updateStock: (id: string, amount: number) => Promise<void>;
  toggleActive: (id: string, current: boolean) => Promise<void>;
  saveMenuItem: (item: Partial<MenuItem> & { imageFile?: File }) => Promise<void>;
  saveWithRecipe: (item: Partial<MenuItem> & { imageFile?: File }, ingredients: {inventoryItemId?: string, nestedRecipeId?: string, quantity: number}[]) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  subscribeToMenu: () => void;
  unsubscribeFromMenu: () => void;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  items: [],
  categories: [],
  isLoading: true,
  error: null,

  fetchCategories: async () => {
    try {
      const categories = isTauri 
        ? await LocalMenuRepository.fetchCategories() 
        : await MenuRepository.fetchCategories();
      set({ categories });
    } catch (err) {
      console.error("fetchCategories err:", err);
    }
  },

  fetchMenuItems: async () => {
    set({ isLoading: true, error: null });
    try {
      
      if (isTauri) {
        const items = await LocalMenuRepository.fetchItems();
        set({ items, isLoading: false });
        return;
      }

      const records = await pb.collection('menu_items').getFullList({
        sort: '-created',
        expand: 'category_id',
      });
      const items = records.map((row) => ({
        id: row.id,
        name: row.name,
        price: row.price,
        cost: row.cost,
        description: row.description,
        stock: row.stock,
        isActive: row.is_active,
        image: row.image_url || (row.image ? pb.files.getUrl(row, row.image) : ''),
        isPoll: row.is_poll,
        recipeId: row.recipe_id,
        assemblyId: row.assembly_id,
        categoryId: row.category_id,
        categoryName: row.expand?.category_id?.name || '',
        kitchenDepartment: row.kitchen_department || '',
        isPrep: row.is_prep || false,
        unit: row.unit || 'шт',
        writeOffOnProduce: row.write_off_on_produce || false,
      }));
      set({ items, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  updateStock: async (id, newStockAmount) => {
    try {
      set(state => ({
        items: state.items.map(o => o.id === id ? { ...o, stock: newStockAmount } : o)
      }));
      if (isTauri) {
        await LocalMenuRepository.updateStock(id, newStockAmount);
      } else {
        await MenuRepository.updateStock(id, newStockAmount);
      }
    } catch (err) {
      console.error(err);
    }
  },

  toggleActive: async (id, currentIsActive) => {
    try {
      const newActive = !currentIsActive;
      set(state => ({
        items: state.items.map(o => o.id === id ? { ...o, isActive: newActive } : o)
      }));
      if (isTauri) {
        await LocalMenuRepository.toggleActive(id, newActive);
      } else {
        await MenuRepository.toggleActive(id, newActive);
      }
    } catch (err) {
      console.error(err);
    }
  },

  saveMenuItem: async (item) => {
    try {
      if (isTauri) {
        await LocalMenuRepository.saveItem(item);
      } else {
        await MenuRepository.saveItem(item);
      }
      await get().fetchMenuItems();
    } catch (err) {
      console.error(err);
    }
  },

  saveWithRecipe: async (item, ingredients) => {
    try {
      if (isTauri) {
        await LocalMenuRepository.saveWithRecipe(item, ingredients);
      } else {
        await MenuRepository.saveWithRecipe(item, ingredients);
      }
      await get().fetchMenuItems();
    } catch (err) {
      console.error(err);
      throw err;
    }
  },

  deleteMenuItem: async (id) => {
    try {
      if (isTauri) {
        await LocalMenuRepository.delete(id);
      } else {
        await MenuRepository.delete(id);
      }
      await get().fetchMenuItems();
    } catch (err) {
      console.error(err);
    }
  },

  subscribeToMenu: async () => {
    if (isTauri) {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        listen('sync-completed', () => {
          get().fetchMenuItems();
        });
      } catch (e) {
        console.error("Failed to subscribe to tauri events", e);
      }
      return;
    }
    pb.collection('menu_items').subscribe('*', () => get().fetchMenuItems());
    pb.collection('menu_categories').subscribe('*', () => get().fetchCategories());
  },

  unsubscribeFromMenu: () => {
    if (isTauri) return;
    pb.collection('menu_items').unsubscribe('*');
    pb.collection('menu_categories').unsubscribe('*');
  }
}));
