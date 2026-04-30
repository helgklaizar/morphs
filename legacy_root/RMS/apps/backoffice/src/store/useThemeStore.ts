import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ModuleColors = {
  dashboard: string;
  pos: string;
  orders: string;
  menu: string;
  finance: string;
  inventory: string;
  procurement: string;
};

interface ThemeState {
  colors: ModuleColors;
  setModuleColor: (module: keyof ModuleColors, color: string) => void;
  resetColors: () => void;
}

const defaultColors: ModuleColors = {
  dashboard: '#8B5CF6', // violet-500
  pos: '#F97316', // orange-500
  orders: '#EC4899', // pink-500 (was fixed to bg-orange or default in some places)
  menu: '#3B82F6', // blue-500
  finance: '#10B981', // emerald-500
  inventory: '#F43F5E', // rose-500
  procurement: '#F59E0B', // amber-500
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      colors: { ...defaultColors },
      setModuleColor: (module, color) => set((state) => ({ colors: { ...state.colors, [module]: color } })),
      resetColors: () => set({ colors: { ...defaultColors } }),
    }),
    { 
      name: 'backoffice-theme-v1' 
    }
  )
);
