import { create } from 'zustand';
import { pb } from '@/lib/pocketbase';
import { useToastStore } from '@/store/useToastStore';

export interface TranslationItem {
  id: string;
  type: 'menu' | 'category' | 'general';
  key: string; // For general it's the key, for menu/category it's the original name
  originalName: string;
  originalDesc?: string;
  en: string;
  he: string;
  uk: string;
  // Aliases for the TranslationsPage
  nameEn: string;
  nameHe: string;
  nameUk: string;
  descEn: string;
  descHe: string;
  descUk: string;
}

interface TranslationsState {
  items: TranslationItem[];
  translations: TranslationItem[]; // Alias for general translations used in SettingsPage
  isLoading: boolean;
  error: string | null;
  fetchTranslations: () => Promise<void>;
  addTranslation: (item: Partial<TranslationItem>) => Promise<void>;
  updateTranslation: (id: string, typeOrUpdates: string | Partial<TranslationItem>, updates?: any) => Promise<void>;
  deleteTranslation: (id: string) => Promise<void>;
}

export const useTranslationsStore = create<TranslationsState>((set, get) => ({
  items: [],
  translations: [],
  isLoading: true,
  error: null,

  fetchTranslations: async () => {
    set({ isLoading: true, error: null });
    try {
      const [menuItems, categories, general] = await Promise.all([
        pb.collection('menu_items').getFullList({ sort: 'name' }),
        pb.collection('menu_categories').getFullList({ sort: 'name' }),
        pb.collection('translations').getFullList({ sort: 'key' }),
      ]);
      
      const mappedMenuItems: TranslationItem[] = menuItems.map(m => ({
        id: m.id,
        type: 'menu',
        key: m.name,
        originalName: m.name,
        originalDesc: m.description,
        en: m.name_en || '',
        he: m.name_he || '',
        uk: m.name_uk || '',
        nameEn: m.name_en || '',
        nameHe: m.name_he || '',
        nameUk: m.name_uk || '',
        descEn: m.desc_en || '',
        descHe: m.desc_he || '',
        descUk: m.desc_uk || '',
      }));

      const mappedCategories: TranslationItem[] = categories.map(c => ({
        id: c.id,
        type: 'category',
        key: c.name,
        originalName: c.name,
        en: c.name_en || '',
        he: c.name_he || '',
        uk: c.name_uk || '',
        nameEn: c.name_en || '',
        nameHe: c.name_he || '',
        nameUk: c.name_uk || '',
        descEn: '',
        descHe: '',
        descUk: '',
      }));

      const mappedGeneral: TranslationItem[] = general.map(g => ({
        id: g.id,
        type: 'general',
        key: g.key,
        originalName: g.key,
        en: g.en || '',
        he: g.he || '',
        uk: g.uk || '',
        nameEn: g.en || '',
        nameHe: g.he || '',
        nameUk: g.uk || '',
        descEn: '',
        descHe: '',
        descUk: '',
      }));

      const allItems = [...mappedMenuItems, ...mappedCategories, ...mappedGeneral];
      set({ 
        items: allItems, 
        translations: mappedGeneral,
        isLoading: false 
      });
    } catch (err: any) {
      console.error("fetchTranslations error", err);
      set({ error: err.message, isLoading: false });
    }
  },

  addTranslation: async (item) => {
    try {
      await pb.collection('translations').create({
        key: item.key,
        en: item.en || '',
        he: item.he || '',
        uk: item.uk || '',
      });
      get().fetchTranslations();
    } catch (err: any) {
      useToastStore.getState().error("Ошибка: " + err.message);
    }
  },

  updateTranslation: async (id, typeOrUpdates, updates) => {
    try {
      let type: string;
      let finalUpdates: any;

      if (typeof typeOrUpdates === 'string') {
        type = typeOrUpdates;
        finalUpdates = updates;
      } else {
        // Old style call: (id, updates)
        type = get().items.find(i => i.id === id)?.type || 'general';
        finalUpdates = typeOrUpdates;
      }

      if (type === 'general') {
        await pb.collection('translations').update(id, finalUpdates);
      } else {
        const collection = type === 'menu' ? 'menu_items' : 'menu_categories';
        const payload: any = {};
        
        // Map page form fields to PB fields
        if (finalUpdates.nameEn !== undefined) payload.name_en = finalUpdates.nameEn;
        if (finalUpdates.nameHe !== undefined) payload.name_he = finalUpdates.nameHe;
        if (finalUpdates.nameUk !== undefined) payload.name_uk = finalUpdates.nameUk;
        if (finalUpdates.descEn !== undefined) payload.desc_en = finalUpdates.descEn;
        if (finalUpdates.descHe !== undefined) payload.desc_he = finalUpdates.descHe;
        if (finalUpdates.descUk !== undefined) payload.desc_uk = finalUpdates.descUk;
        
        // Map alias fields (if any)
        if (finalUpdates.en !== undefined) payload.name_en = finalUpdates.en;
        if (finalUpdates.he !== undefined) payload.name_he = finalUpdates.he;
        if (finalUpdates.uk !== undefined) payload.name_uk = finalUpdates.uk;

        await pb.collection(collection).update(id, payload);
      }
      
      await get().fetchTranslations();
    } catch (err: any) {
      console.error(err);
      useToastStore.getState().error("Ошибка сохранения: " + err.message);
    }
  },

  deleteTranslation: async (id) => {
    try {
      await pb.collection('translations').delete(id);
      get().fetchTranslations();
    } catch (err: any) {
      console.error(err);
    }
  }
}));
