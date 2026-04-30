import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PointTransaction {
  id: string;
  clientId: string;
  amount: number; // positive = added, negative = spent
  reason: string;
  createdAt: string;
}

export interface LoyaltySettings {
  enabled: boolean;
  baseCashbackPercent: number;
}

interface LoyaltyState {
  settings: LoyaltySettings;
  transactions: PointTransaction[];
  addPoints: (clientId: string, amount: number, reason: string) => void;
  updateSettings: (settings: Partial<LoyaltySettings>) => void;
  getClientPoints: (clientId: string) => number;
}

export const useLoyaltyStore = create<LoyaltyState>()(
  persist(
    (set, get) => ({
      settings: {
        enabled: true,
        baseCashbackPercent: 5,
      },
      transactions: [],
      
      addPoints: (clientId, amount, reason) => set(state => ({
        transactions: [
          {
            id: Math.random().toString(36).substr(2, 9),
            clientId,
            amount,
            reason,
            createdAt: new Date().toISOString()
          },
          ...state.transactions
        ]
      })),

      updateSettings: (newSettings) => set(state => ({
        settings: { ...state.settings, ...newSettings }
      })),

      getClientPoints: (clientId) => {
        return get().transactions
          .filter(t => t.clientId === clientId)
          .reduce((sum, t) => sum + t.amount, 0);
      }
    }),
    {
      name: 'rms-loyalty-storage'
    }
  )
);
