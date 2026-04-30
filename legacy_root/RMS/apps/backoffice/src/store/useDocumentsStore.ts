import { create } from 'zustand';
import { DocumentRecord, DocumentsRepository } from '@/lib/repositories/documents';
import { useToastStore } from '@/store/useToastStore';

export type { DocumentRecord };

interface DocumentsState {
  docs: DocumentRecord[];
  isLoading: boolean;
  error: string | null;
  fetchDocs: () => Promise<void>;
  uploadDoc: (name: string, type: string, file: File, workerId?: string, supplierId?: string) => Promise<void>;
  deleteDoc: (id: string) => Promise<void>;
}

export const useDocumentsStore = create<DocumentsState>((set, get) => ({
  docs: [],
  isLoading: true,
  error: null,

  fetchDocs: async () => {
    set({ isLoading: true, error: null });
    try {
      const records = await DocumentsRepository.fetchAll();
      set({ docs: records, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  uploadDoc: async (name, type, file, workerId, supplierId) => {
    try {
      await DocumentsRepository.upload(name, type, file, workerId, supplierId);
      get().fetchDocs();
    } catch (err: any) {
      useToastStore.getState().error("Ошибка загрузки документа: " + err.message);
    }
  },

  deleteDoc: async (id) => {
    try {
      await DocumentsRepository.delete(id);
      get().fetchDocs();
    } catch (err: any) {
      console.error(err);
    }
  }
}));
