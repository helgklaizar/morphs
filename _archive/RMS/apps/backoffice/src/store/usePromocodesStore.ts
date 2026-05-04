import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Promocode {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isActive: boolean;
  uses: number;
  maxUses: number | null;
  createdAt: string;
}

interface PromocodesState {
  promocodes: Promocode[];
  addCode: (code: Omit<Promocode, 'id' | 'createdAt' | 'uses'>) => void;
  toggleStatus: (id: string) => void;
  deleteCode: (id: string) => void;
  incrementUse: (codeString: string) => void;
}

export const usePromocodesStore = create<PromocodesState>()(
  persist(
    (set, get) => ({
      promocodes: [
        {
          id: '1',
          code: 'WELCOME10',
          discountType: 'percentage',
          discountValue: 10,
          isActive: true,
          uses: 45,
          maxUses: 100,
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          code: 'MINUS50',
          discountType: 'fixed',
          discountValue: 50,
          isActive: false,
          uses: 10,
          maxUses: null,
          createdAt: new Date().toISOString()
        }
      ],
      
      addCode: (payload) => set((state) => ({
        promocodes: [
          {
            ...payload,
            id: Math.random().toString(36).substr(2, 9),
            createdAt: new Date().toISOString(),
            uses: 0
          },
          ...state.promocodes
        ]
      })),

      toggleStatus: (id) => set((state) => ({
        promocodes: state.promocodes.map(p => 
          p.id === id ? { ...p, isActive: !p.isActive } : p
        )
      })),

      deleteCode: (id) => set((state) => ({
        promocodes: state.promocodes.filter(p => p.id !== id)
      })),

      incrementUse: (codeString) => set((state) => ({
        promocodes: state.promocodes.map(p => 
          p.code === codeString ? { ...p, uses: p.uses + 1 } : p
        )
      }))
    }),
    {
      name: 'rms-promocodes-storage'
    }
  )
);
