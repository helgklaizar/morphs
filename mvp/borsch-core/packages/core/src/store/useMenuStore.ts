import { MenuItem, MenuCategory } from '@rms/types';
import { create } from 'zustand';
import { pb } from '@rms/db-local';

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
      const records = await pb.collection('menu_categories').getFullList({ sort: 'order_index' });
      const categories = records.map(r => ({
         id: r.id, name: r.name, nameEn: r.name_en, nameHe: r.name_he, nameUk: r.name_uk, orderIndex: r.order_index
      })) as MenuCategory[];
      set({ categories });
    } catch (err) {
      console.error("fetchCategories err:", err);
    }
  },

  fetchMenuItems: async () => {
    set({ isLoading: true, error: null });
    try {
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
      await pb.collection('menu_items').update(id, { stock: newStockAmount });
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
      await pb.collection('menu_items').update(id, { is_active: newActive });
    } catch (err) {
      console.error(err);
    }
  },

  saveMenuItem: async (item) => {
    try {
      const formData = new FormData();
      Object.entries(item).forEach(([key, val]) => {
         if (key !== 'imageFile' && val !== undefined) {
             formData.append(key === 'isActive' ? 'is_active' : key, val as string | Blob);
         }
      });
      if (item.imageFile) formData.append('image', item.imageFile);
      if (item.id) {
          await pb.collection('menu_items').update(item.id, formData);
      } else {
          await pb.collection('menu_items').create(formData);
      }
      await get().fetchMenuItems();
    } catch (err) {
      console.error(err);
    }
  },

  saveWithRecipe: async (item, ingredients) => {
    try {
      // Not supported in Phase 1 stub
      throw new Error("Recipe saving not supported in direct pb mode yet.");
      await get().fetchMenuItems();
    } catch (err) {
      console.error(err);
      throw err;
    }
  },

  deleteMenuItem: async (id) => {
    try {
      await pb.collection('menu_items').delete(id);
      await get().fetchMenuItems();
    } catch (err) {
      console.error(err);
    }
  },

  subscribeToMenu: () => {
    pb.collection('menu_items').subscribe('*', () => get().fetchMenuItems());
    pb.collection('menu_categories').subscribe('*', () => get().fetchCategories());
  },

  unsubscribeFromMenu: () => {
    pb.collection('menu_items').unsubscribe('*');
    pb.collection('menu_categories').unsubscribe('*');
  }
}));
