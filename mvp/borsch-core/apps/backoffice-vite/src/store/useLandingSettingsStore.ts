import { create } from 'zustand';

const API_URL = 'http://localhost:3002/api';

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
      const res = await fetch(`${API_URL}/system/settings`);
      const json = await res.json();
      const s = json.items?.[0];
      if (s) {
        set({
          settings: {
            id: s.id || 'default',
            is_pickup_enabled: s.is_pickup_enabled ?? s.isPickupEnabled ?? true,
            is_delivery_enabled: s.is_delivery_enabled ?? s.isDeliveryEnabled ?? true,
            is_preorder_mode: s.is_preorder_mode ?? s.isPreorderMode ?? false,
          }
        });
      }
    } catch (e) {
      console.error('[LandingSettingsStore] fetch error', e);
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: async (updates) => {
    const current = get().settings;
    if (!current) return;
    // Optimistic update
    const merged = { ...current, ...updates };
    set({ settings: merged });
    // Persist to API
    try {
      await fetch(`${API_URL}/system/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPickupEnabled: merged.is_pickup_enabled,
          isDeliveryEnabled: merged.is_delivery_enabled,
          isPreorderMode: merged.is_preorder_mode,
        }),
      });
    } catch (e) {
      console.error('[LandingSettingsStore] update error', e);
      // Rollback
      set({ settings: current });
    }
  }
}));
