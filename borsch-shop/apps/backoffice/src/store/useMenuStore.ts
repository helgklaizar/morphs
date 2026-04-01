import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

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
  saveMenuItem: (item: Partial<MenuItem>) => Promise<void>;
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
      const { data, error } = await supabase.from('menu_categories').select('*').order('order_index', { ascending: true });
      if (error) throw error;
      set({ categories: (data || []).map((row: any) => ({
        id: row.id,
        name: row.name || '',
        orderIndex: row.order_index || 0,
      })) });
    } catch (err) {
      console.error(err);
    }
  },

  fetchMenuItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const parsedItems: MenuItem[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name || '',
        price: row.price || 0,
        cost: 0, // In reality, this might be calculated from 'assembly_id'
        description: row.description || '',
        stock: row.stock || 0,
        isActive: row.is_active ?? true,
        image: row.image_url || '',
        isPoll: row.is_poll ?? false,
        recipeId: row.recipe_id,
        assemblyId: row.assembly_id,
        categoryId: row.category_id,
      }));

      set({ items: parsedItems, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  updateStock: async (id, newStockAmount) => {
    try {
      // Optimistic update
      set(state => ({
        items: state.items.map(o => o.id === id ? { ...o, stock: newStockAmount } : o)
      }));
      await supabase.from('menu_items').update({ stock: newStockAmount }).eq('id', id);
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
      await supabase.from('menu_items').update({ is_active: newActive }).eq('id', id);
    } catch (err) {
      console.error(err);
    }
  },

  saveMenuItem: async (item) => {
    try {
      const payload: any = {
        name: item.name,
        price: item.price || 0,
        description: item.description || '',
        stock: item.stock || 0,
        is_active: item.isActive ?? true,
        is_poll: item.isPoll ?? false,
        image_url: item.image || '',
        recipe_id: item.recipeId || null,
        assembly_id: item.assemblyId || null,
        category_id: item.categoryId || null,
      };

      if (item.id) {
        await supabase.from('menu_items').update(payload).eq('id', item.id);
      } else {
        await supabase.from('menu_items').insert(payload);
      }
    } catch (err) {
      console.error(err);
    }
  },

  deleteMenuItem: async (id) => {
    try {
      await supabase.from('menu_items').delete().eq('id', id);
    } catch (err) {
      console.error(err);
    }
  },

  subscribeToMenu: () => {
    supabase.channel('menu-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items' },
        () => {
          get().fetchMenuItems();
        }
      )
      .subscribe();
  },

  unsubscribeFromMenu: () => {
    supabase.channel('menu-realtime').unsubscribe();
  }
}));
