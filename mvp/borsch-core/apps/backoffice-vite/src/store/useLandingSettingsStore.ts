import { create } from 'zustand';

export interface LandingSettings {
  id: string;
  is_pickup_enabled: boolean;
  is_delivery_enabled: boolean;
  is_preorder_mode: boolean;
}

interface LandingSettingsState {
  settings: LandingSettings | null;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (updates: Partial<LandingSettings>) => Promise<void>;
}

export const useLandingSettingsStore = create<LandingSettingsState>((set, get) => ({
  settings: {
    id: "mock",
    is_pickup_enabled: true,
    is_delivery_enabled: true,
    is_preorder_mode: false,
  },
  isLoading: false,
  fetchSettings: async () => {
    // Временно замокано до миграции настроек в Prisma
  },
  updateSettings: async (updates) => {
    const current = get().settings;
    if (!current) return;
    set({ settings: { ...current, ...updates } });
  }
}));
