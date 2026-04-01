import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface TranslationItem {
  id: string;
  type: 'menu' | 'category' | 'landing';
  originalName: string;
  nameEn: string;
  nameHe: string;
  nameUk: string;
  originalDesc?: string;
  descEn?: string;
  descHe?: string;
  descUk?: string;
}

interface TranslationsState {
  items: TranslationItem[];
  isLoading: boolean;
  error: string | null;
  fetchTranslations: () => Promise<void>;
  updateTranslation: (id: string, type: 'menu' | 'category' | 'landing', updates: any) => Promise<void>;
}

export const useTranslationsStore = create<TranslationsState>((set, get) => ({
  items: [],
  isLoading: true,
  error: null,

  fetchTranslations: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: menuData, error: menuErr } = await supabase.from('menu_items').select('*');
      if (menuErr) throw menuErr;

      const { data: catData, error: catErr } = await supabase.from('menu_categories').select('*');
      if (catErr && catErr.code !== '42P01') console.error(catErr); // Ignore if table missing

      const parsed: TranslationItem[] = [];
      
      (menuData || []).forEach(m => {
        parsed.push({
          id: m.id, type: 'menu', originalName: m.name || '',
          nameEn: m.name_en || '', nameHe: m.name_he || '', nameUk: m.name_uk || '',
          originalDesc: m.description || '', descEn: m.description_en || '', descHe: m.description_he || '', descUk: m.description_uk || ''
        });
      });

      (catData || []).forEach(c => {
        parsed.push({
          id: c.id, type: 'category', originalName: c.name || '',
          nameEn: c.name_en || '', nameHe: c.name_he || '', nameUk: c.name_uk || ''
        });
      });

      set({ items: parsed, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  updateTranslation: async (id, type, updates) => {
    try {
      const table = type === 'menu' ? 'menu_items' : type === 'category' ? 'menu_categories' : 'landing_settings';
      
      const dbUpdates: any = {};
      if (updates.nameEn !== undefined) dbUpdates.name_en = updates.nameEn;
      if (updates.nameHe !== undefined) dbUpdates.name_he = updates.nameHe;
      if (updates.nameUk !== undefined) dbUpdates.name_uk = updates.nameUk;
      if (updates.descEn !== undefined) dbUpdates.description_en = updates.descEn;
      if (updates.descHe !== undefined) dbUpdates.description_he = updates.descHe;
      if (updates.descUk !== undefined) dbUpdates.description_uk = updates.descUk;

      const { error } = await supabase.from(table).update(dbUpdates).eq('id', id);
      if (error) throw error;
      
      // Update local state optimistic
      set(state => ({
        items: state.items.map(i => i.id === id ? { ...i, ...updates } : i)
      }));
    } catch (err) {
      console.error(err);
    }
  }
}));
