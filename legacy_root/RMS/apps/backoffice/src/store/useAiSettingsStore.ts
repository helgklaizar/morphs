import { create } from 'zustand';
import { AiSettings, AiSettingsRepository } from '@/lib/repositories/aiSettings';

export type { AiSettings };

interface AiSettingsState {
  settings: AiSettings | null;
  isLoading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateSettings: (updated: Partial<AiSettings>) => Promise<void>;
}

export const useAiSettingsStore = create<AiSettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const record = await AiSettingsRepository.fetch();
      set({ settings: record, isLoading: false });
    } catch (err: any) {
      console.error("fetchAiSettings error", err);
      set({ settings: null, isLoading: false, error: err.message });
    }
  },

  updateSettings: async (updated: Partial<AiSettings>) => {
    const current = get().settings;
    if (!current?.id) return;
    try {
      set({ isLoading: true, error: null });
      const record = await AiSettingsRepository.update(current.id, updated);
      set({ settings: record, isLoading: false });
    } catch (err: any) {
      console.error("updateAiSettings error", err);
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },
}));
