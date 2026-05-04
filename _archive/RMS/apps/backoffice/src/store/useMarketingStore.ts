import { create } from 'zustand';
import { pb } from '@/lib/pocketbase';
import { MarketingCampaign, MarketingProvider } from '@rms/types';

interface MarketingState {
  campaigns: MarketingCampaign[];
  providers: MarketingProvider[];
  isLoading: boolean;
  error: string | null;
  fetchCampaigns: () => Promise<void>;
  fetchProviders: () => Promise<void>;
  addProvider: (data: Partial<MarketingProvider>) => Promise<void>;
  updateProvider: (id: string, data: Partial<MarketingProvider>) => Promise<void>;
  deleteProvider: (id: string) => Promise<void>;
  addCampaign: (data: Partial<MarketingCampaign>) => Promise<void>;
  updateCampaign: (id: string, data: Partial<MarketingCampaign>) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
  subscribeToAll: () => void;
  unsubscribeFromAll: () => void;
  draftMediaLink: string | null;
  setDraftMediaLink: (link: string | null) => void;
}

export const useMarketingStore = create<MarketingState>((set, get) => ({
  campaigns: [],
  providers: [],
  isLoading: true,
  error: null,
  draftMediaLink: null,

  setDraftMediaLink: (link) => set({ draftMediaLink: link }),

  fetchProviders: async () => {
     try {
       const data = await pb.collection('marketing_providers').getFullList({ sort: '-created' });
       set({ providers: data as unknown as MarketingProvider[] });
     } catch (e: any) {
       if (e.status !== 404) console.error("Error fetching providers", e);
     }
  },

  fetchCampaigns: async () => {
    set({ isLoading: true, error: null });
    try {
      try {
          const data = await pb.collection('marketing_campaigns').getFullList({
             sort: '-created',
             expand: 'provider_id'
          });
          const parsed = data.map((row: any) => ({
            id: row.id,
            name: row.name || 'Без названия',
            status: row.status === 'draft' ? 'Черновик' : (row.status || 'Черновик'),
            provider_id: row.provider_id,
            text_content: row.text_content,
            media_link: row.media_link,
            budget: row.budget,
            comments: row.comments,
            rating: row.rating,
            expand: row.expand
          }));
          set({ campaigns: parsed, isLoading: false });
      } catch (e: any) {
          if (e.status === 404) {
             set({ campaigns: [], isLoading: false });
             return;
          }
          throw e;
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addProvider: async (data) => {
    try {
      await pb.collection('marketing_providers').create(data);
      get().fetchProviders();
    } catch (e) { console.error(e); }
  },

  updateProvider: async (id, data) => {
    try {
      await pb.collection('marketing_providers').update(id, data);
      get().fetchProviders();
    } catch (e) { console.error(e); }
  },

  deleteProvider: async (id) => {
    try {
      await pb.collection('marketing_providers').delete(id);
      get().fetchProviders();
    } catch (e) { console.error(e); }
  },

  addCampaign: async (data) => {
    try {
      await pb.collection('marketing_campaigns').create({ status: 'draft', ...data });
      get().fetchCampaigns();
    } catch (e) { console.error(e); }
  },

  deleteCampaign: async (id) => {
    try {
      await pb.collection('marketing_campaigns').delete(id);
      get().fetchCampaigns();
    } catch (e) { console.error(e); }
  },

  updateCampaign: async (id, data) => {
    try {
      await pb.collection('marketing_campaigns').update(id, data);
      get().fetchCampaigns();
    } catch (e) { console.error(e); }
  },

  subscribeToAll: () => {
    try { 
      pb.collection('marketing_campaigns').subscribe('*', () => get().fetchCampaigns()); 
      pb.collection('marketing_providers').subscribe('*', () => get().fetchProviders()); 
    } catch(e){}
  },

  unsubscribeFromAll: () => {
    try { 
      pb.collection('marketing_campaigns').unsubscribe('*'); 
      pb.collection('marketing_providers').unsubscribe('*'); 
    } catch(e){}
  }
}));
