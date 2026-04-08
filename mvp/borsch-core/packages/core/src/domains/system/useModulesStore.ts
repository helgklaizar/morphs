import { ModuleDefinition } from '@rms/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const SYSTEM_MODULES: ModuleDefinition[] = [
  { id: 'pos', label: 'Касса (POS)', description: 'Терминал для расчета и создания заказов на месте', defaultEnabled: true },
  { id: 'orders', label: 'Управление заказами', description: 'Заказы, доставка, лента кухни KDS', defaultEnabled: true },
  { id: 'tables', label: 'Посадка (Tables)', description: 'Карта столов и обслуживание зала', defaultEnabled: true },
  { id: 'crm', label: 'CRM и Клиенты', description: 'База клиентов и система лояльности (кешбэк)', defaultEnabled: true },
  { id: 'marketing', label: 'Маркетинг', description: 'Промокоды, акции, баннеры для сайта', defaultEnabled: true },
  { id: 'menu', label: 'Производство (Меню)', description: 'Управление меню, рецепты, сборки (полуфабрикаты)', defaultEnabled: true },
  { id: 'inventory', label: 'Склад', description: 'Учет остатков, инвентаризация, акты списания', defaultEnabled: true },
  { id: 'procurement', label: 'Закупки', description: 'Работа с поставщиками и накладными', defaultEnabled: true },
  { id: 'workers', label: 'Персонал', description: 'Сотрудники, смены, тайм-трекинг', defaultEnabled: true },
  { id: 'analytics', label: 'Аналитика и Дашборд', description: 'Финансовые отчеты, статистика продаж, графики', defaultEnabled: true },
];

interface ModulesState {
  enabledModules: Record<string, boolean>;
  isModuleEnabled: (id: string) => boolean;
  toggleModule: (id: string, enabled: boolean) => void;
  enableAll: () => void;
}

export const useModulesStore = create<ModulesState>()(
  persist(
    (set, get) => ({
      enabledModules: SYSTEM_MODULES.reduce((acc, m) => {
        acc[m.id] = m.defaultEnabled;
        return acc;
      }, {} as Record<string, boolean>),
      
      isModuleEnabled: (id: string) => {
        // Module might not exist in local storage yet if newly added
        const state = get().enabledModules[id];
        if (state === undefined) {
          const modDef = SYSTEM_MODULES.find(m => m.id === id);
          return modDef ? modDef.defaultEnabled : true;
        }
        return state;
      },
      
      toggleModule: (id: string, enabled: boolean) => {
        set((state) => ({
          enabledModules: {
            ...state.enabledModules,
            [id]: enabled
          }
        }));
      },
      
      enableAll: () => {
        set(() => ({
          enabledModules: SYSTEM_MODULES.reduce((acc, m) => {
            acc[m.id] = true;
            return acc;
          }, {} as Record<string, boolean>)
        }));
      }
    }),
    {
      name: 'rms-modules-storage', // key in localStorage
    }
  )
);
