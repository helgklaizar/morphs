import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface MarketingState {
  campaigns: Campaign[];
  isLoading: boolean;
  error: string | null;
  fetchCampaigns: () => Promise<void>;
  addCampaign: (name: string) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
  subscribeToCampaigns: () => void;
  unsubscribeFromCampaigns: () => void;
}

export const useMarketingStore = create<MarketingState>((set, get) => ({
  campaigns: [],
  isLoading: true,
  error: null,

  fetchCampaigns: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          set({ campaigns: [], isLoading: false });
          return;
        }
        throw error;
      }
      
      const parsed: Campaign[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name || 'Без названия',
        status: row.status === 'draft' ? 'Черновик' : (row.status || 'Черновик'),
      }));

      set({ campaigns: parsed, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addCampaign: async (name) => {
    try {
      await supabase.from('marketing_campaigns').insert({ name, status: 'draft' });
    } catch (e) { console.error(e); }
  },

  deleteCampaign: async (id) => {
    try {
      await supabase.from('marketing_campaigns').delete().eq('id', id);
    } catch (e) { console.error(e); }
  },

  subscribeToCampaigns: () => {
    supabase.channel('marketing-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketing_campaigns' }, () => get().fetchCampaigns())
      .subscribe();
  },

  unsubscribeFromCampaigns: () => {
    supabase.channel('marketing-realtime').unsubscribe();
  }
}));
