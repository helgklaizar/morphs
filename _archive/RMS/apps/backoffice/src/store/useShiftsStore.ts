import { create } from 'zustand';
import { ShiftRecord, ShiftsRepository } from '@/lib/repositories/shifts';
import { LocalShiftsRepository } from '@/lib/repositories/localShifts';
import { useToastStore } from '@/store/useToastStore';

const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;

export type Shift = ShiftRecord;

interface ShiftsState {
  shifts: Shift[];
  isLoading: boolean;
  error: string | null;
  fetchShifts: () => Promise<void>;
  startShift: (workerId: string) => Promise<void>;
  endShift: (id: string, startTime: string, hourlyRate: number) => Promise<void>;
}

export const useShiftsStore = create<ShiftsState>((set, get) => ({
  shifts: [],
  isLoading: true,
  error: null,

  fetchShifts: async () => {
    set({ isLoading: true, error: null });
    try {
      const records = isTauri 
        ? await LocalShiftsRepository.fetchAll()
        : await ShiftsRepository.fetchAll();
      set({ shifts: records, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  startShift: async (workerId) => {
    try {
      if (isTauri) {
        await LocalShiftsRepository.startShift(workerId);
      } else {
        await ShiftsRepository.startShift(workerId);
      }
      get().fetchShifts();
    } catch (err: any) {
      useToastStore.getState().error("Ошибка начала смены: " + err.message);
    }
  },

  endShift: async (id, startTime, hourlyRate) => {
    try {
      if (isTauri) {
        await LocalShiftsRepository.endShift(id, startTime, hourlyRate);
      } else {
        await ShiftsRepository.endShift(id, startTime, hourlyRate);
      }
      get().fetchShifts();
    } catch (err: any) {
      useToastStore.getState().error("Ошибка завершения смены: " + err.message);
    }
  }
}));
