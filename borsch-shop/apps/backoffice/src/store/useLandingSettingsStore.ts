import { create } from "zustand";
import { supabase } from "@/lib/supabase";

export interface LandingSettings {
  id: string;
  hero_title: string;
  hero_title_en: string;
  hero_title_he: string;
  hero_title_uk: string;
  hero_subtitle: string;
  hero_subtitle_en: string;
  hero_subtitle_he: string;
  hero_subtitle_uk: string;
  about_text: string;
  about_text_en: string;
  about_text_he: string;
  about_text_uk: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  address_en: string;
  address_he: string;
  address_uk: string;
  working_hours: string;
  working_hours_en: string;
  working_hours_he: string;
  working_hours_uk: string;
  is_pickup_enabled: boolean;
  is_delivery_enabled: boolean;
  is_preorder_mode: boolean;
}

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
      const { data, error } = await supabase
        .from("landing_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        set({ settings: data as LandingSettings, isLoading: false });
      } else {
        // If no settings exist yet, we could potentially create one or leave as null
        set({ settings: null, isLoading: false });
      }
    } catch (err: any) {
      console.error("fetchSettings error", err);
      set({ error: err.message, isLoading: false });
    }
  },

  updateSettings: async (updated: Partial<LandingSettings>) => {
    const current = get().settings;
    if (!current?.id) return;
    try {
      set({ isLoading: true, error: null });
      const { data, error } = await supabase
        .from("landing_settings")
        .update(updated)
        .eq("id", current.id)
        .select()
        .single();

      if (error) throw error;
      set({ settings: data as LandingSettings, isLoading: false });
    } catch (err: any) {
      console.error("updateSettings error", err);
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },
}));
