import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface AssemblyItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  inventoryItemId: string;
}

export interface Assembly {
  id: string;
  name: string;
  totalCost: number;
  items: AssemblyItem[];
}

interface AssembliesState {
  assemblies: Assembly[];
  isLoading: boolean;
  error: string | null;
  fetchAssemblies: () => Promise<void>;
  addAssembly: (name: string, items: {inventoryItemId: string, quantity: number}[]) => Promise<void>;
  updateAssembly: (id: string, name: string, items: {inventoryItemId: string, quantity: number}[]) => Promise<void>;
  deleteAssembly: (id: string) => Promise<void>;
  subscribeToAssemblies: () => void;
  unsubscribeFromAssemblies: () => void;
}

export const useAssembliesStore = create<AssembliesState>((set, get) => ({
  assemblies: [],
  isLoading: true,
  error: null,

  fetchAssemblies: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('assemblies')
        .select(`
          id, name,
          assembly_items (
            id, quantity, inventory_item_id,
            inventory_items (name, unit, price)
          )
        `);

      if (error) throw error;
      
      const parsed: Assembly[] = (data || []).map((row: any) => {
        let total = 0;
        const items = (row.assembly_items || []).map((item: any) => {
          const inv = item.inventory_items;
          if (inv && inv.price) {
            total += item.quantity * inv.price;
          }
          return {
            id: item.id,
            name: inv?.name || '?',
            quantity: item.quantity,
            unit: inv?.unit || 'шт',
            inventoryItemId: item.inventory_item_id
          };
        });

        return {
          id: row.id,
          name: row.name || '',
          totalCost: total,
          items
        };
      });

      set({ assemblies: parsed, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addAssembly: async (name, items) => {
    try {
      const { data, error } = await supabase.from('assemblies').insert({ name }).select('id').single();
      if (error || !data) throw error || new Error("No data returned");
      
      const validItems = items.filter(i => i.inventoryItemId !== "");
      if (validItems.length > 0) {
        const { error: err2 } = await supabase.from('assembly_items').insert(validItems.map(i => ({
          assembly_id: data.id,
          inventory_item_id: i.inventoryItemId,
          quantity: i.quantity
        })));
        if (err2) throw err2;
      }
    } catch (e: any) {
      alert("Ошибка при сохранении сборки: " + e.message);
      throw e;
    }
  },

  updateAssembly: async (id, name, items) => {
    try {
      const { error: err1 } = await supabase.from('assemblies').update({ name }).eq('id', id);
      if (err1) throw err1;
      
      const { error: err2 } = await supabase.from('assembly_items').delete().eq('assembly_id', id);
      if (err2) throw err2;
      
      const validItems = items.filter(i => i.inventoryItemId !== "");
      if (validItems.length > 0) {
        const { error: err3 } = await supabase.from('assembly_items').insert(validItems.map(i => ({
          assembly_id: id,
          inventory_item_id: i.inventoryItemId,
          quantity: i.quantity
        })));
        if (err3) throw err3;
      }
    } catch (e: any) {
      alert("Ошибка при сохранении сборки: " + e.message);
      throw e;
    }
  },

  deleteAssembly: async (id) => {
    try {
      await supabase.from('assemblies').delete().eq('id', id);
    } catch (e) {
      console.error(e);
    }
  },

  subscribeToAssemblies: () => {
    supabase.channel('assemblies-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assemblies' }, () => get().fetchAssemblies())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assembly_items' }, () => get().fetchAssemblies())
      .subscribe();
  },

  unsubscribeFromAssemblies: () => {
    supabase.channel('assemblies-realtime').unsubscribe();
  }
}));
