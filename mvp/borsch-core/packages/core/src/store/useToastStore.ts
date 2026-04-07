import { Toast, ToastType } from '@rms/types';
import { create } from 'zustand';

interface ToastState {
  toasts: Toast[];
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  toast: (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  success: (message) => useToastStore.getState().toast(message, 'success'),
  error: (message) => useToastStore.getState().toast(message, 'error'),
  warning: (message) => useToastStore.getState().toast(message, 'warning'),
  info: (message) => useToastStore.getState().toast(message, 'info'),

  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
