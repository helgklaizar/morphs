import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface InventoryItem {
  id: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
  categoryId: string;
  supplier?: string;
  packSize?: number;
  recipeUnit?: string | null;
  yieldPerUnit?: number | null;
}

export interface InventoryCategory {
  id: string;
  name: string;
  isVisibleInAssemblies: boolean;
  isVisibleInRecipe: boolean;
  orderIndex: number;
  items: InventoryItem[];
}

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
      // Fetch categories
      const { data: catData, error: catError } = await supabase
        .from('inventory_categories')
        .select('*')
        .order('order_index', { ascending: true });

      if (catError) throw catError;

      // Fetch items
      const { data: itemData, error: itemError } = await supabase
        .from('inventory_items')
        .select('*');

      if (itemError) throw itemError;

      // Group items by category
      const parsedCategories: InventoryCategory[] = (catData || []).map((cat: any) => ({
        id: cat.id,
        name: cat.name || '',
        isVisibleInAssemblies: cat.is_visible_in_assemblies ?? true,
        isVisibleInRecipe: cat.is_visible_in_recipe ?? true,
        orderIndex: cat.order_index || 0,
        items: (itemData || [])
          .filter((item: any) => item.category_id === cat.id)
          .map((item: any) => ({
            id: item.id,
            name: item.name || '',
            price: item.price || 0,
            unit: item.unit || 'шт',
            quantity: item.quantity || 0,
            categoryId: item.category_id,
            supplier: item.supplier || '',
            packSize: item.pack_size || 1,
            recipeUnit: item.recipe_unit || null,
            yieldPerUnit: item.yield_per_unit || null,
          }))
          .sort((a: any, b: any) => a.name.localeCompare(b.name))
      }));

      set({ categories: parsedCategories, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addCategory: async (name: string) => {
    try {
      const maxOrder = get().categories.reduce((max, c) => Math.max(max, c.orderIndex), -1);
      const { error } = await supabase.from('inventory_categories').insert({ 
        name, 
        order_index: maxOrder + 1,
        is_visible_in_assemblies: true,
        is_visible_in_recipe: true
      });
      if (error) throw error;
      await get().fetchInventory();
    } catch (err: any) {
      alert("Ошибка при добавлении категории: " + err.message);
      throw err;
    }
  },

  deleteCategory: async (id: string) => {
    try {
      await supabase.from('inventory_categories').delete().eq('id', id);
      await get().fetchInventory();
    } catch (err) {
      console.error(err);
    }
  },

  saveItem: async (item) => {
    try {
      const payload = {
        name: item.name,
        price: item.price || 0,
        unit: item.unit || 'шт',
        quantity: item.quantity || 0,
        category_id: item.categoryId,
        supplier: item.supplier || '',
        pack_size: item.packSize || 1,
        recipe_unit: item.recipeUnit || null,
        yield_per_unit: item.yieldPerUnit || null,
      };

      if (item.id) {
        const { error } = await supabase.from('inventory_items').update(payload).eq('id', item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('inventory_items').insert(payload);
        if (error) throw error;
      }
      await get().fetchInventory();
    } catch (err: any) {
      alert("Ошибка сохранения: " + err.message);
      throw err;
    }
  },

  deleteItem: async (id) => {
    try {
      await supabase.from('inventory_items').delete().eq('id', id);
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
      await supabase.from('inventory_items').update({ quantity: newQuantity }).eq('id', id);
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
      await supabase.from('inventory_categories').update({ [field]: newValue }).eq('id', id);
    } catch (err) {
      console.error(err);
    }
  },

  subscribeToInventory: () => {
    // Subscribe to both categories and items
    supabase.channel('inventory-realtime-items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => get().fetchInventory())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_categories' }, () => get().fetchInventory())
      .subscribe();
  },

  unsubscribeFromInventory: () => {
    supabase.channel('inventory-realtime-items').unsubscribe();
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
          supabase.from('inventory_categories').update({ order_index: c.orderIndex }).eq('id', c.id)
        )
      ).catch(err => {
        console.error("Failed to save reorder", err);
      });
    } catch (err) {
      console.error(err);
    }
  }
}));
