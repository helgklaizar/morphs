import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
}

interface ClientsState {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  fetchClients: () => Promise<void>;
  addClient: (payload: { name: string, phone: string, address: string }) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  subscribeToClients: () => void;
  unsubscribeFromClients: () => void;
}

export const useClientsStore = create<ClientsState>((set, get) => ({
  clients: [],
  isLoading: true,
  error: null,

  fetchClients: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // If clients table doesn't exist, we just mock empty. (Fallback for older schema)
        if (error.code === '42P01') {
          set({ clients: [], isLoading: false });
          return;
        }
        throw error;
      }
      
      const parsed: Client[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name || 'Неизвестно',
        phone: row.phone || '',
        address: row.address || ''
      }));

      set({ clients: parsed, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addClient: async (payload) => {
    try {
      await supabase.from('clients').insert({
        name: payload.name, phone: payload.phone, address: payload.address
      });
    } catch(e) { console.error(e); }
  },

  deleteClient: async (id) => {
    try {
      const prev = get().clients;
      set(state => ({ clients: state.clients.filter(c => c.id !== id) }));
      
      const { error } = await supabase.from('clients').delete().eq('id', id).select();
      if (error) {
         console.error(error);
         alert("Ошибка БД при удалении клиента: " + error.message);
         set({ clients: prev });
      }
    } catch(e: any) { 
      get().fetchClients();
      console.error(e);
    }
  },

  subscribeToClients: () => {
    supabase.channel('clients-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => get().fetchClients())
      .subscribe();
  },

  unsubscribeFromClients: () => {
    supabase.channel('clients-realtime').unsubscribe();
  }
}));
