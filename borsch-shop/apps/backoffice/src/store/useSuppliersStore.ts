import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  hours: string;
  address: string;
}

interface SuppliersState {
  suppliers: Supplier[];
  isLoading: boolean;
  error: string | null;
  fetchSuppliers: () => Promise<void>;
  addSupplier: (payload: Partial<Supplier>) => Promise<void>;
  updateSupplier: (id: string, payload: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  subscribeToSuppliers: () => void;
  unsubscribeFromSuppliers: () => void;
}

export const useSuppliersStore = create<SuppliersState>((set, get) => ({
  suppliers: [],
  isLoading: true,
  error: null,

  fetchSuppliers: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const parsed: Supplier[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name || '',
        phone: (row.phone && row.phone.length > 0) ? row.phone[0] : '',
        hours: row.work_hours || '',
        address: row.address || ''
      }));

      set({ suppliers: parsed, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addSupplier: async (p) => {
    try {
      await supabase.from('suppliers').insert({
        name: p.name,
        phone: p.phone ? [p.phone] : [],
        work_hours: p.hours || '',
        address: p.address || '',
      });
    } catch (e) {
      console.error(e);
    }
  },

  updateSupplier: async (id, p) => {
    try {
      await supabase.from('suppliers').update({
        name: p.name,
        phone: p.phone ? [p.phone] : [],
        work_hours: p.hours || '',
        address: p.address || '',
      }).eq('id', id);
    } catch (e) {
      console.error(e);
    }
  },

  deleteSupplier: async (id) => {
    try {
      await supabase.from('suppliers').delete().eq('id', id);
    } catch (e) {
      console.error(e);
    }
  },

  subscribeToSuppliers: () => {
    supabase.channel('suppliers-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => get().fetchSuppliers())
      .subscribe();
  },

  unsubscribeFromSuppliers: () => {
    supabase.channel('suppliers-realtime').unsubscribe();
  }
}));
