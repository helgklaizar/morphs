import { create } from 'zustand';
import { ClientRecord, ClientsRepository } from '@/lib/repositories/clients';
import { pb } from '@/lib/pocketbase';
import { useToastStore } from '@/store/useToastStore';
import { LocalClientsRepository } from '@/lib/repositories/localClients';

const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;

export type Client = ClientRecord;

interface ClientsState {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  fetchClients: () => Promise<void>;
  addClient: (payload: { name: string, phone: string, address: string }) => Promise<void>;
  updateClient: (id: string, payload: Partial<ClientRecord>) => Promise<void>;
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
      const records = isTauri 
        ? await LocalClientsRepository.fetchAll()
        : await ClientsRepository.fetchAll();
      set({ clients: records, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addClient: async (payload) => {
    try {
      if (isTauri) {
        await LocalClientsRepository.add(payload);
      } else {
        await ClientsRepository.add(payload);
      }
      get().fetchClients();
    } catch(e) { console.error(e); }
  },

  updateClient: async (id, payload) => {
    try {
      if (isTauri) {
        await LocalClientsRepository.update(id, payload);
      } else {
        await ClientsRepository.update(id, payload);
      }
      get().fetchClients();
    } catch(e) { console.error(e); }
  },

  deleteClient: async (id) => {
    const prev = get().clients;
    set(state => ({ clients: state.clients.filter(c => c.id !== id) }));
    try {
      if (isTauri) {
        await LocalClientsRepository.delete(id);
      } else {
        await ClientsRepository.delete(id);
      }
    } catch(e: any) { 
      console.error(e);
      useToastStore.getState().error("Ошибка БД при удалении клиента: " + e.message);
      set({ clients: prev });
    }
  },

  subscribeToClients: async () => {
    if (isTauri) {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        listen('sync-completed', () => {
          get().fetchClients();
        });
      } catch (e) {
        console.error("Failed to subscribe to tauri events", e);
      }
      return;
    }
    pb.collection('clients').subscribe('*', () => get().fetchClients());
  },

  unsubscribeFromClients: () => {
    if (isTauri) return;
    pb.collection('clients').unsubscribe('*');
  }
}));
