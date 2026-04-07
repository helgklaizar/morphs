import { create } from 'zustand';
import { pb } from '@/lib/pb';

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
  settings: null,
  isLoading: false,
  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const records = await pb.collection('landing_settings').getFullList();
      if (records.length > 0) {
        set({ settings: records[0] as unknown as LandingSettings, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      console.error('Failed to fetch settings:', e);
      set({ isLoading: false });
    }
  },
  updateSettings: async (updates) => {
    try {
      const current = get().settings;
      if (!current) return;
      
      // Optimistic upate
      set({ settings: { ...current, ...updates } });
      
      const record = await pb.collection('landing_settings').update(current.id, updates);
      set({ settings: record as unknown as LandingSettings });
    } catch (e) {
      console.error('Failed to update settings:', e);
      // rollback visually
      get().fetchSettings();
    }
  }
}));
