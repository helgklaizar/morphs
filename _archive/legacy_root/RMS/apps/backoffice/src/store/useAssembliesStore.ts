import { create } from 'zustand';
import { AssembliesRepository, AssemblyRecord, AssemblyItemRecord } from '@/lib/repositories/assemblies';
import { LocalAssembliesRepository } from '@/lib/repositories/localAssemblies';
import { pb } from '@/lib/pocketbase';
import { useToastStore } from '@/store/useToastStore';

const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;

export type Assembly = AssemblyRecord;
export type AssemblyItem = AssemblyItemRecord;

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
      const parsed = isTauri
        ? await LocalAssembliesRepository.fetchAll()
        : await AssembliesRepository.fetchAll();
      set({ assemblies: parsed, isLoading: false });
    } catch (err: any) {
      console.error("fetchAssemblies err:", err);
      set({ error: err.message, isLoading: false });
    }
  },

  addAssembly: async (name, items) => {
    try {
      if (isTauri) {
        await LocalAssembliesRepository.add(name, items);
      } else {
        await AssembliesRepository.add(name, items);
      }
      await get().fetchAssemblies();
    } catch (e: any) {
      useToastStore.getState().error("Ошибка при сохранении сборки: " + e.message);
      throw e;
    }
  },

  updateAssembly: async (id, name, items) => {
    try {
      if (isTauri) {
        await LocalAssembliesRepository.update(id, name, items);
      } else {
        await AssembliesRepository.update(id, name, items);
      }
      await get().fetchAssemblies();
    } catch (e: any) {
      useToastStore.getState().error("Ошибка при сохранении сборки: " + e.message);
      throw e;
    }
  },

  deleteAssembly: async (id) => {
    try {
      if (isTauri) {
        await LocalAssembliesRepository.delete(id);
      } else {
        await AssembliesRepository.delete(id);
      }
      await get().fetchAssemblies();
    } catch (e) {
      console.error(e);
    }
  },

  subscribeToAssemblies: async () => {
    if (isTauri) {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        listen('sync-completed', () => {
          get().fetchAssemblies();
        });
      } catch (e) {
        console.error("Failed to subscribe to tauri events", e);
      }
      return;
    }
    pb.collection('assemblies').subscribe('*', () => get().fetchAssemblies());
    pb.collection('assembly_items').subscribe('*', () => get().fetchAssemblies());
  },

  unsubscribeFromAssemblies: () => {
    if (isTauri) return;
    pb.collection('assemblies').unsubscribe('*');
    pb.collection('assembly_items').unsubscribe('*');
  }
}));
