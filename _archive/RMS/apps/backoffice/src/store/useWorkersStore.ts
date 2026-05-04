import { create } from 'zustand';
import { Worker, WorkersRepository } from '@/lib/repositories/workers';
import { pb } from '@/lib/pocketbase';
import { useToastStore } from '@/store/useToastStore';
import { LocalWorkersRepository } from '@/lib/repositories/localWorkers';

const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;

export type { Worker };

interface WorkersState {
  workers: Worker[];
  isLoading: boolean;
  error: string | null;
  fetchWorkers: () => Promise<void>;
  addWorker: (worker: Partial<Worker>) => Promise<void>;
  updateWorker: (id: string, payload: Partial<Worker>) => Promise<void>;
  deleteWorker: (id: string) => Promise<void>;
  subscribeToWorkers: () => void;
  unsubscribeFromWorkers: () => void;
}

export const useWorkersStore = create<WorkersState>((set, get) => ({
  workers: [],
  isLoading: true,
  error: null,

  fetchWorkers: async () => {
    set({ isLoading: true, error: null });
    try {
      const records = isTauri 
        ? await LocalWorkersRepository.fetchAll()
        : await WorkersRepository.fetchAll();
      set({ workers: records, isLoading: false });
    } catch (err: any) {
      console.error("fetchWorkers err:", err);
      set({ error: err.message, isLoading: false });
    }
  },

  addWorker: async (worker) => {
    try {
      if (isTauri) {
        await LocalWorkersRepository.add(worker);
      } else {
        await WorkersRepository.add(worker);
      }
      get().fetchWorkers();
    } catch (err: any) {
      console.error("addWorker error:", err);
      useToastStore.getState().error("Ошибка добавления сотрудника: " + err.message);
    }
  },

  updateWorker: async (id, payload) => {
    const prevWorkers = get().workers;
    try {
      set(state => ({
        workers: state.workers.map(w => w.id === id ? { ...w, ...payload } : w)
      }));
      if (isTauri) {
        await LocalWorkersRepository.update(id, payload);
      } else {
        await WorkersRepository.update(id, payload);
      }
    } catch (err: any) {
      console.error("updateWorker error:", err);
      useToastStore.getState().error("Ошибка изменения сотрудника: " + err.message);
      set({ workers: prevWorkers });
    }
  },

  deleteWorker: async (id) => {
    const prevWorkers = get().workers;
    set(state => ({ workers: state.workers.filter(w => w.id !== id) }));
    try {
      if (isTauri) {
        await LocalWorkersRepository.delete(id);
      } else {
        await WorkersRepository.delete(id);
      }
    } catch (err: any) {
      console.error(err);
      useToastStore.getState().error("Ошибка удаления сотрудника: " + err.message);
      set({ workers: prevWorkers });
    }
  },

  subscribeToWorkers: async () => {
    if (isTauri) {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        listen('sync-completed', () => {
          get().fetchWorkers();
        });
      } catch (e) {
        console.error("Failed to subscribe to tauri events", e);
      }
      return;
    }
    pb.collection('workers').subscribe('*', () => get().fetchWorkers());
  },

  unsubscribeFromWorkers: () => {
    if (isTauri) return;
    pb.collection('workers').unsubscribe('*');
  }
}));

