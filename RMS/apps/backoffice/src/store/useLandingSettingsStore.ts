import { create } from "zustand";
import { LandingSettings, LandingSettingsRepository } from "@/lib/repositories/landingSettings";

export type { LandingSettings };

interface LandingSettingsState {
  settings: LandingSettings | null;
  isLoading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateSettings: (updated: Partial<LandingSettings>) => Promise<void>;
}

export const useLandingSettingsStore = create<LandingSettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const record = await LandingSettingsRepository.fetch();
      set({ settings: record, isLoading: false });
    } catch (err: any) {
      console.error("fetchSettings error:", err);
      set({ settings: null, isLoading: false, error: err.message });
    }
  },

  updateSettings: async (updated: Partial<LandingSettings>) => {
    const current = get().settings;
    if (!current?.id) return;
    try {
      set({ isLoading: true, error: null });
      const record = await LandingSettingsRepository.update(current.id, updated);
      set({ settings: record, isLoading: false });
    } catch (err: any) {
      console.error("updateSettings error:", err);
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },
}));
